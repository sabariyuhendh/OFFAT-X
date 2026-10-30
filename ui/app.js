/* ── OFFAT-X Web UI — app.js ── */
'use strict';

// ─── State ────────────────────────────────────────────────────────────────────
let currentGoal = null;
let sse         = null;
let findings    = [];

// ─── Nav ──────────────────────────────────────────────────────────────────────
function navigate(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tabs a').forEach(a => a.classList.remove('active'));
  const page = document.getElementById('page-' + id);
  if (page) page.classList.add('active');
  const link = document.querySelector(`.tabs a[data-tab="${id}"]`);
  if (link) link.classList.add('active');

  if (id === 'report') loadReport();
  if (id === 'config') loadConfig();
}

// ─── Console helpers ──────────────────────────────────────────────────────────
function classifyLine(text) {
  const t = text.replace(/\x1b\[[0-9;]*m/g, '');   // strip ANSI
  if (/CONFIRMED|CRITICAL|BLOCKED|FAIL/i.test(t))    return 'err';
  if (/PASSED|SUCCESS|✓|completed/i.test(t))         return 'ok';
  if (/Warning|Detected|Shadow|BOLA|BFLA|VERDICT/i.test(t)) return 'warn';
  if (/Executing|Stage|Running|Probed|Ingested|Evaluat/i.test(t)) return 'accent';
  if (/^[\s─│├└]/i.test(t))                          return 'dim';
  return '';
}

function stripAnsi(t) { return t.replace(/\x1b\[[0-9;]*m/g, ''); }

function appendConsoleLine(text, cls) {
  const body = document.getElementById('console-body');
  const ln   = document.createElement('span');
  ln.className = 'ln ' + (cls || classifyLine(text));
  ln.textContent = stripAnsi(text);
  body.appendChild(ln);
  body.scrollTop = body.scrollHeight;
}

function clearConsole() {
  document.getElementById('console-body').innerHTML = '';
}

// ─── Finding parser ───────────────────────────────────────────────────────────
function parseFinding(text) {
  const t = stripAnsi(text);
  let f = null;

  if (/CONFIRMED BOLA/i.test(t)) {
    const ep  = t.match(/:\s*(GET|POST|PUT|DELETE|PATCH)\s+(\S+)/i);
    const sc  = t.match(/D\s*=\s*([\d.]+)/);
    f = {
      verdict: 'BOLA', severity: 'Critical',
      endpoint: ep ? `${ep[1]} ${ep[2]}` : 'Unknown',
      score:    sc ? sc[1] : '1.00',
      cwe:      'CWE-639', cvss: '8.6',
      remed: 'const row = await prisma.resource.findFirst({\n  where: { id: req.params.id, tenantId: req.user.tenantId }\n});\nif (!row) return res.status(404).json({ error: "Not found" });',
    };
  } else if (/CONFIRMED BFLA/i.test(t)) {
    const ep = t.match(/:\s*(GET|POST|PUT|DELETE|PATCH)\s+(\S+)/i);
    f = {
      verdict: 'BFLA', severity: 'High',
      endpoint: ep ? `${ep[1]} ${ep[2]}` : 'Admin endpoint',
      score: 'N/A', cwe: 'CWE-285', cvss: '8.5',
      remed: "router.use('/admin', (req, res, next) => {\n  if (!req.user || req.user.role !== 'ADMIN')\n    return res.status(403).json({ error: 'Forbidden' });\n  next();\n});",
    };
  } else if (/Shadow API Detected/i.test(t)) {
    const ep = t.match(/:\s*(\/\S+)/);
    f = {
      verdict: 'INFO', severity: 'Medium',
      endpoint: ep ? ep[1] : '/unknown',
      score: 'N/A', cwe: 'CWE-200', cvss: '5.3',
      remed: '// Remove or auth-guard the undocumented route.\n// Add it to the OpenAPI spec if intentional.',
    };
  }

  if (f) findings.push(f);
}

// ─── Results tab ──────────────────────────────────────────────────────────────
function renderResults() {
  const tbody = document.getElementById('results-tbody');
  tbody.innerHTML = '';

  if (!findings.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text2);padding:2rem;">No findings yet — run a scan first.</td></tr>';
    return;
  }

  findings.forEach((f, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="verdict-chip ${f.verdict}">${f.verdict}</span></td>
      <td><code class="mono">${escHtml(f.endpoint)}</code></td>
      <td><code class="mono">${escHtml(f.cwe)}</code></td>
      <td>${escHtml(f.severity)}</td>
      <td>${escHtml(f.cvss)}</td>
      <td>
        <div class="remed">${escHtml(f.remed)}</div>
      </td>`;
    tbody.appendChild(tr);
  });

  document.getElementById('finding-count').textContent = findings.length;
}

function escHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

// ─── Run goal ─────────────────────────────────────────────────────────────────
function runGoal(id) {
  if (sse) { sse.close(); sse = null; }
  currentGoal = id;
  findings    = [];

  // Switch to Run Scan tab and clear console
  navigate('scan');
  clearConsole();

  // Update dot
  setStatus('running', 'Running — ' + id);
  appendConsoleLine('► Starting goal: ' + id, 'accent');

  // Mark active card
  document.querySelectorAll('.goal-card').forEach(c => c.classList.remove('running'));
  const card = document.querySelector(`.goal-card[data-id="${id}"]`);
  if (card) card.classList.add('running');

  sse = new EventSource('/api/run?goal=' + encodeURIComponent(id));

  sse.onmessage = function (e) {
    const msg = JSON.parse(e.data);

    if (msg.type === 'line' || msg.type === 'err') {
      appendConsoleLine(msg.text, msg.type === 'err' ? 'err' : '');
      parseFinding(msg.text);
    }

    if (msg.type === 'done') {
      sse.close(); sse = null;
      const ok = msg.code === 0;
      appendConsoleLine(
        ok ? '\n✓ Scan completed successfully.' : '\n✗ Scan exited with code ' + msg.code,
        ok ? 'ok' : 'err'
      );
      setStatus('idle', ok ? 'Scan complete' : 'Scan errored');
      if (card) card.classList.remove('running');
      renderResults();
      updateDashboardStats();
      // Auto-open results if findings found
      if (findings.length) {
        setTimeout(() => navigate('results'), 800);
      }
    }
  };

  sse.onerror = function () {
    appendConsoleLine('Connection error.', 'err');
    setStatus('idle', 'Error');
    sse.close(); sse = null;
  };
}

// ─── Status dot ───────────────────────────────────────────────────────────────
function setStatus(state, label) {
  const dot  = document.getElementById('status-dot');
  const lbl  = document.getElementById('status-label');
  dot.className  = 'dot ' + state;
  lbl.textContent = label;
}

// ─── Config tab ───────────────────────────────────────────────────────────────
async function loadConfig() {
  try {
    const r   = await fetch('/api/config');
    const cfg = await r.json();

    document.getElementById('cfg-yml').value = cfg.yml || '';

    if (cfg.spec) {
      document.getElementById('cfg-target').value =
        (cfg.spec.servers && cfg.spec.servers[0] && cfg.spec.servers[0].url) || 'http://localhost:8000';

      const paths = cfg.spec.paths ? Object.keys(cfg.spec.paths).join('\n') : '';
      document.getElementById('cfg-paths').value = paths;
    }
  } catch (e) {
    console.error('Config load error', e);
  }
}

// ─── Report tab ───────────────────────────────────────────────────────────────
async function loadReport() {
  const container = document.getElementById('report-container');
  try {
    const r = await fetch('/api/report-exists');
    const d = await r.json();
    if (d.exists) {
      container.innerHTML = '<iframe class="report-iframe" src="/reports/offat-x-report.html"></iframe>';
    } else {
      container.innerHTML = `
        <div class="empty-state">
          <div class="icon">📋</div>
          <p>No report generated yet.</p>
          <p style="margin-top:.5rem">Run the <strong>Full 8-Stage Scan</strong> goal first.</p>
          <button class="btn-primary" style="margin-top:1.5rem" onclick="runGoal('full')">Run Full Scan Now</button>
        </div>`;
    }
  } catch (e) {
    container.innerHTML = '<div class="empty-state"><p>Could not load report.</p></div>';
  }
}

// ─── Dashboard stats ──────────────────────────────────────────────────────────
function updateDashboardStats() {
  document.getElementById('stat-findings').textContent = findings.length;
  const crit = findings.filter(f => f.severity === 'Critical').length;
  document.getElementById('stat-critical').textContent = crit;
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
async function boot() {
  // Build goal grid
  try {
    const r    = await fetch('/api/goals');
    const data = await r.json();
    const grid = document.getElementById('goal-grid');
    grid.innerHTML = '';
    data.goals.forEach(g => {
      const div = document.createElement('div');
      div.className  = 'goal-card';
      div.dataset.id = g.id;
      div.innerHTML  = `
        <span class="badge ${g.sev}">${g.sev}</span>
        <h3>${g.num}. ${g.name}</h3>
        <p>${g.desc}</p>
        <button class="run-btn" onclick="runGoal('${g.id}')">▶ Run</button>`;
      grid.appendChild(div);
    });
  } catch (e) { console.error('Goals load error', e); }

  // Server health
  try {
    await fetch('/api/status');
    setStatus('idle', 'Server ready');
  } catch (_) {
    setStatus('idle', 'Server offline');
  }

  // Default tab
  navigate('dashboard');
}

document.addEventListener('DOMContentLoaded', boot);
