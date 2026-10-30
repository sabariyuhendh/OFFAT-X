/* OFFAT-X Web UI  app.js  v2.0 */
'use strict';

var currentGoal = null;
var sse = null;
var findings = [];
var runtimeCfg = {};
var liveCount = 0;

// ── Nav ──────────────────────────────────────────────────────────────
function navigate(id) {
  document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
  document.querySelectorAll('.tabs a').forEach(function(a) { a.classList.remove('active'); });
  var page = document.getElementById('page-' + id);
  if (page) page.classList.add('active');
  var link = document.querySelector('.tabs a[data-tab="' + id + '"]');
  if (link) link.classList.add('active');
  if (id === 'report')  loadReport();
  if (id === 'config')  loadConfig();
  if (id === 'results') renderResults();
}

// ── ANSI strip ───────────────────────────────────────────────────────
function strip(t) { return String(t).replace(/\x1b\[[0-9;]*m/g, ''); }

function classifyLine(text) {
  var t = strip(text);
  if (/CONFIRMED|CRITICAL|BLOCKED|FAIL|BOLA|BFLA/i.test(t)) return 'err';
  if (/PASSED|SUCCESS|completed/i.test(t))                   return 'ok';
  if (/Shadow|Warning|Detected|VERDICT|CVSS/i.test(t))       return 'warn';
  if (/Executing|Stage|Running|Probed|Ingested|Evaluat/i.test(t)) return 'accent';
  return '';
}

function appendLine(text, cls) {
  var body = document.getElementById('console-body');
  var ln = document.createElement('span');
  ln.className = 'ln ' + (cls || classifyLine(text));
  ln.textContent = strip(text);
  body.appendChild(ln);
  body.scrollTop = body.scrollHeight;
}

function clearConsole() { document.getElementById('console-body').innerHTML = ''; }

// ── Finding parser ───────────────────────────────────────────────────
function parseFinding(text) {
  var t = strip(text);
  var f = null;
  if (/CONFIRMED BOLA/i.test(t)) {
    var ep = t.match(/(GET|POST|PUT|DELETE|PATCH)\s+(\S+)/i);
    var sc = t.match(/D\s*=\s*([\d.]+)/);
    f = { verdict:'BOLA', sev:'Critical', endpoint: ep ? ep[1]+' '+ep[2] : 'GET /mock-api/orders/{id}', score: sc ? sc[1] : '1.00', cwe:'CWE-639', cvss:'8.6', remed:'// Enforce tenant ownership boundary\nconst row = await prisma.order.findFirst({\n  where: { id: req.params.id, tenantId: req.user.tenantId }\n});\nif (!row) return res.status(404).json({ error: "Access denied" });' };
  } else if (/CONFIRMED BFLA/i.test(t)) {
    var ep2 = t.match(/(GET|POST|PUT|DELETE|PATCH)\s+(\S+)/i);
    f = { verdict:'BFLA', sev:'High', endpoint: ep2 ? ep2[1]+' '+ep2[2] : 'DELETE /mock-api/admin/users/{id}', score:'N/A', cwe:'CWE-285', cvss:'8.5', remed:"router.use('/admin', (req, res, next) => {\n  if (!req.user || req.user.role !== 'ADMIN')\n    return res.status(403).json({ error: 'Admin tier required' });\n  next();\n});" };
  } else if (/Shadow API Detected/i.test(t)) {
    var ep3 = t.match(/:\s*(\/\S+)/);
    f = { verdict:'SHADOW', sev:'High', endpoint: ep3 ? 'GET ' + ep3[1] : 'GET /mock-api/debug/heap-dump', score:'N/A', cwe:'CWE-200', cvss:'7.5', remed:'// Disallow undocumented debug route or enforce strict VPC gateway policy:\napp.use("/debug", restrictToInternalVpc());' };
  } else if (/CONFIRMED JWT CRITICAL/i.test(t)) {
    f = { verdict:'JWT_NONE', sev:'Critical', endpoint:'GET /mock-api/auth/secret', score:'N/A', cwe:'CWE-347', cvss:'9.8', remed:'// Require explicit cryptographic algorithm allowlist:\njwt.verify(token, secret, { algorithms: ["RS256", "HS256"] });' };
  } else if (/CONFIRMED RATE LIMIT BYPASS/i.test(t)) {
    f = { verdict:'RATE_LIMIT', sev:'Medium', endpoint:'POST /mock-api/auth/reset-password', score:'N/A', cwe:'CWE-799', cvss:'5.3', remed:'// Do not trust arbitrary X-Forwarded-For headers:\napp.set("trust proxy", "loopback");' };
  } else if (/CONFIRMED GRAPHQL INTROSPECTION/i.test(t)) {
    f = { verdict:'GRAPHQL', sev:'Medium', endpoint:'POST /mock-api/graphql', score:'N/A', cwe:'CWE-200', cvss:'5.3', remed:'// Disable introspection in production/staging:\nconst server = new ApolloServer({ schema, introspection: false });' };
  } else if (/CONFIRMED BROKEN AUTHENTICATION/i.test(t)) {
    f = { verdict:'BROKEN_AUTH', sev:'Critical', endpoint:'GET /mock-api/admin/metrics', score:'N/A', cwe:'CWE-306', cvss:'9.8', remed:'// Enforce admin authentication middleware:\napp.use("/admin", requireAdminAuth);' };
  }
  if (f) {
    if (!findings.some(function(x) { return x.endpoint === f.endpoint && x.verdict === f.verdict; })) {
      findings.push(f);
      liveCount++;
      updateLiveBadge();
    }
  }
}

function updateLiveBadge() {
  var badge = document.getElementById('results-badge');
  if (badge) {
    badge.textContent = findings.length;
    badge.style.display = findings.length ? 'inline-block' : 'none';
  }
  document.getElementById('stat-findings').textContent = findings.length;
  document.getElementById('stat-critical').textContent = findings.filter(function(f) { return f.sev === 'Critical'; }).length;
  document.getElementById('finding-count').textContent = findings.length;
}

// ── Results render ────────────────────────────────────────────────────
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function renderResults() {
  var tbody = document.getElementById('results-tbody');
  if (!findings.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text2);padding:2rem">No findings yet — run a scan first.</td></tr>';
    return;
  }
  tbody.innerHTML = '';
  findings.forEach(function(f) {
    var tr = document.createElement('tr');
    tr.innerHTML = '<td><span class="verdict-chip ' + f.verdict + '">' + escHtml(f.verdict) + '</span></td>' +
      '<td><code class="mono">' + escHtml(f.endpoint) + '</code></td>' +
      '<td><code class="mono">' + escHtml(f.cwe || 'N/A') + '</code></td>' +
      '<td>' + escHtml(f.sev) + '</td>' +
      '<td>' + escHtml(f.cvss || 'N/A') + '</td>' +
      '<td><div class="remed">' + escHtml(f.remed || f.desc || '') + '</div></td>';
    tbody.appendChild(tr);
  });
}

// ── Export JSON ───────────────────────────────────────────────────────
function downloadJSON() {
  var data = JSON.stringify({ findings: findings, generated: new Date().toISOString() }, null, 2);
  var blob = new Blob([data], { type: 'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'offat-x-findings.json';
  a.click();
}

// ── Export PDF (print dialog) ────────────────────────────────────────
function downloadPDF() {
  navigate('results');
  setTimeout(function() { window.print(); }, 200);
}

// ── Run goal ──────────────────────────────────────────────────────────
function runGoal(id) {
  if (sse) { sse.close(); sse = null; }
  currentGoal = id;
  findings = [];
  liveCount = 0;
  navigate('scan');
  clearConsole();
  setStatus('running', 'Running — ' + id);
  updateLiveBadge();
  appendLine('  Starting goal: ' + id + '  (target: ' + (runtimeCfg.targetUrl || 'http://localhost:4000/mock-api') + ')', 'accent');
  document.querySelectorAll('.goal-card').forEach(function(c) { c.classList.remove('running'); });
  var card = document.querySelector('.goal-card[data-id="' + id + '"]');
  if (card) card.classList.add('running');
  sse = new EventSource('/api/run?goal=' + encodeURIComponent(id));
  sse.onmessage = function(e) {
    var msg = JSON.parse(e.data);
    if (msg.type === 'line' || msg.type === 'err') {
      appendLine(msg.text, msg.type === 'err' ? 'err' : '');
      parseFinding(msg.text);
    }
    if (msg.type === 'done') {
      sse.close(); sse = null;
      var ok = msg.code === 0;
      appendLine(ok ? '\n  Scan completed successfully.' : '\n  Scan exited with code ' + msg.code, ok ? 'ok' : 'err');
      setStatus('idle', ok ? 'Scan complete' : 'Scan errored');
      if (card) card.classList.remove('running');
      fetch('/reports/offat-x-output.json?t=' + Date.now()).then(function(r) { return r.json(); }).then(function(data) {
        if (data && data.findings && data.findings.length) {
          findings = data.findings;
          updateLiveBadge();
        }
        renderResults();
        if (findings.length) { setTimeout(function() { navigate('results'); }, 800); }
      }).catch(function() {
        renderResults();
        if (findings.length) { setTimeout(function() { navigate('results'); }, 800); }
      });
    }
  };
  sse.onerror = function() {
    appendLine('SSE connection error.', 'err');
    setStatus('idle', 'Error');
    sse.close(); sse = null;
  };
}

// ── Status ────────────────────────────────────────────────────────────
function setStatus(state, label) {
  document.getElementById('status-dot').className   = 'dot ' + state;
  document.getElementById('status-label').textContent = label;
}

// ── Config ────────────────────────────────────────────────────────────
function loadConfig() {
  fetch('/api/config').then(function(r) { return r.json(); }).then(function(cfg) {
    if (cfg.runtime) {
      runtimeCfg = cfg.runtime;
      var el = function(id) { return document.getElementById(id); };
      if (runtimeCfg.targetUrl)    el('cfg-target').value   = runtimeCfg.targetUrl;
      if (runtimeCfg.bearerLow)    el('cfg-bearer-low').value    = runtimeCfg.bearerLow;
      if (runtimeCfg.bearerAdmin)  el('cfg-bearer-admin').value  = runtimeCfg.bearerAdmin;
      if (runtimeCfg.bearerPremium)el('cfg-bearer-premium').value= runtimeCfg.bearerPremium;
      if (runtimeCfg.scope)        el('cfg-scope').value     = runtimeCfg.scope;
      if (runtimeCfg.rps)          el('cfg-rps').value       = runtimeCfg.rps;
      if (runtimeCfg.authType)     el('cfg-auth-type').value = runtimeCfg.authType;
      toggleAuthFields();
    }
    document.getElementById('cfg-yml').value = cfg.yml || '';
  }).catch(function(e) { console.error('Config load error', e); });

  fetch('/api/presets').then(function(r) { return r.json(); }).then(function(data) {
    var sel = document.getElementById('cfg-preset');
    sel.innerHTML = '<option value="">-- Select a preset API --</option>';
    data.presets.forEach(function(p) {
      var opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name + ' — ' + p.desc;
      opt.dataset.url     = p.url;
      opt.dataset.specUrl = p.specUrl || '';
      opt.dataset.auth    = p.authType;
      sel.appendChild(opt);
    });
  });
}

function applyPreset() {
  var sel = document.getElementById('cfg-preset');
  var opt = sel.options[sel.selectedIndex];
  if (!opt || !opt.value) return;
  document.getElementById('cfg-target').value   = opt.dataset.url    || '';
  document.getElementById('cfg-auth-type').value = opt.dataset.auth  || 'none';
  document.getElementById('cfg-spec-url').value  = opt.dataset.specUrl || '';
  toggleAuthFields();
  if (opt.dataset.specUrl) {
    document.getElementById('spec-tab-url').click();
  }
  document.getElementById('preset-hint').textContent = 'Preset loaded. Click Save Config.';
}

function toggleAuthFields() {
  var type = document.getElementById('cfg-auth-type').value;
  document.getElementById('auth-bearer-fields').style.display = (type === 'bearer') ? 'block' : 'none';
  document.getElementById('auth-basic-fields').style.display  = (type === 'basic')  ? 'block' : 'none';
}

function fetchSpecFromUrl() {
  var url = document.getElementById('cfg-spec-url').value.trim();
  if (!url) return alert('Enter a spec URL first.');
  document.getElementById('spec-fetch-status').textContent = 'Fetching…';
  fetch('/api/fetch-spec', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: url })
  }).then(function(r) { return r.json(); }).then(function(d) {
    if (d.ok) {
      var txt = d.spec ? JSON.stringify(d.spec, null, 2) : (d.raw || '');
      document.getElementById('cfg-spec-paste').value = txt;
      document.getElementById('spec-fetch-status').textContent = 'Fetched ' + txt.length + ' chars.';
      document.getElementById('spec-tab-paste').click();
    } else {
      document.getElementById('spec-fetch-status').textContent = 'Error: ' + d.error;
    }
  }).catch(function(e) {
    document.getElementById('spec-fetch-status').textContent = 'Error: ' + e.message;
  });
}

function handleSpecFile(e) {
  var file = e.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    document.getElementById('cfg-spec-paste').value = ev.target.result;
    document.getElementById('spec-tab-paste').click();
  };
  reader.readAsText(file);
}

function showSpecTab(tab) {
  ['url','paste','upload'].forEach(function(t) {
    document.getElementById('spec-panel-' + t).style.display  = (t === tab) ? 'block' : 'none';
    document.getElementById('spec-tab-' + t).classList.toggle('active', t === tab);
  });
}

function saveConfig() {
  runtimeCfg = {
    targetUrl:     document.getElementById('cfg-target').value.trim(),
    authType:      document.getElementById('cfg-auth-type').value,
    bearerLow:     document.getElementById('cfg-bearer-low').value.trim(),
    bearerAdmin:   document.getElementById('cfg-bearer-admin').value.trim(),
    bearerPremium: document.getElementById('cfg-bearer-premium').value.trim(),
    basicUser:     document.getElementById('cfg-basic-user').value.trim(),
    basicPass:     document.getElementById('cfg-basic-pass').value.trim(),
    scope:         document.getElementById('cfg-scope').value.trim(),
    rps:           parseInt(document.getElementById('cfg-rps').value) || 60,
    specText:      document.getElementById('cfg-spec-paste').value.trim(),
  };
  fetch('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(runtimeCfg)
  }).then(function(r) { return r.json(); }).then(function() {
    document.getElementById('save-status').textContent = 'Saved!';
    setTimeout(function() { document.getElementById('save-status').textContent = ''; }, 2000);
  });
}

// ── Report ────────────────────────────────────────────────────────────
function loadReport() {
  var container = document.getElementById('report-container');
  fetch('/api/report-exists').then(function(r) { return r.json(); }).then(function(d) {
    if (d.exists) {
      container.innerHTML = '<iframe class="report-iframe" src="/reports/offat-x-report.html"></iframe>';
    } else {
      container.innerHTML = '<div class="empty-state"><div class="icon">No report yet.</div><p>Run the Full 8-Stage Scan first.</p><button class="btn-primary" style="margin-top:1.5rem" onclick="runGoal(\'full\')">Run Full Scan Now</button></div>';
    }
  });
}

// ── Boot ──────────────────────────────────────────────────────────────
function boot() {
  fetch('/api/goals').then(function(r) { return r.json(); }).then(function(data) {
    var grid = document.getElementById('goal-grid');
    grid.innerHTML = '';
    data.goals.forEach(function(g) {
      var div = document.createElement('div');
      div.className = 'goal-card';
      div.dataset.id = g.id;
      div.innerHTML = '<span class="badge ' + g.sev + '">' + g.sev + '</span><h3>' + g.num + '. ' + g.name + '</h3><p>' + g.desc + '</p><button class="run-btn" onclick="runGoal(\'' + g.id + '\')">&#9654; Run</button>';
      grid.appendChild(div);
    });
  });
  fetch('/api/status').then(function() { setStatus('idle', 'Server ready'); }).catch(function() { setStatus('idle', 'Server offline'); });
  navigate('dashboard');
  showSpecTab('url');
  toggleAuthFields();
}

document.addEventListener('DOMContentLoaded', boot);