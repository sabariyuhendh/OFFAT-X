'use strict';
const express   = require('express');
const path      = require('path');
const fs        = require('fs');
const http      = require('http');
const https     = require('https');
const { spawn } = require('child_process');
const mockApi   = require('./mock-api');

const app  = express();
const PORT = 4000;
const ROOT = __dirname;

let runtimeCfg = {
  targetUrl: 'http://localhost:4000/mock-api',
  authType: 'bearer',
  bearerLow: 'demo_token_low_role',
  bearerAdmin: 'demo_token_admin_role',
  scope: 'localhost\n127.0.0.1\njsonplaceholder.typicode.com\nreqres.in\npetstore3.swagger.io'
};

app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(ROOT, 'ui')));
app.use('/reports', express.static(ROOT));

// ── Mount Built-in Vulnerable Mock API Service (Zero Docker) ─────────
app.use('/mock-api', mockApi);

// ── Health & Status ──────────────────────────────────────────────────
app.get('/api/status', function(_, res) {
  res.json({
    ok: true,
    version: '2.1.0',
    mockApiUrl: 'http://localhost:' + PORT + '/mock-api',
    mockApiSpec: 'http://localhost:' + PORT + '/mock-api/openapi.json'
  });
});

// ── Evaluation Goals ─────────────────────────────────────────────────
app.get('/api/goals', function(_, res) {
  res.json({ goals: [
    { id:'full',      num:'1', name:'Full 8-Stage Scan',         sev:'critical', desc:'Complete pipeline: Scope, OAS contract, DIRB recon, DAG BFS, 4-tier matrix, semantic diff, remediation, reports.' },
    { id:'bola',      num:'2', name:'BOLA / IDOR Test',          sev:'critical', desc:'BFS chaining to setup entity; cross-tenant exfiltration replay and Equation (2) semantic diffing.' },
    { id:'bfla',      num:'3', name:'BFLA Privilege Escalation', sev:'high',     desc:'4-tier role matrix testing against administrative endpoints (DELETE /admin/users/{id}).' },
    { id:'dirb',      num:'4', name:'Shadow API Discovery',      sev:'high',     desc:'Live dictionary probe against backend; diffs active routes vs OpenAPI spec to uncover shadow APIs.' },
    { id:'jwt',       num:'5', name:'JWT Attack Battery',        sev:'critical', desc:'Algorithm "none" signature stripping, key confusion, and expired token acceptance replay.' },
    { id:'ratelimit', num:'6', name:'Rate Limit Bypass',         sev:'medium',   desc:'Burst probes to trigger 429 throttling; header spoofing bypass using rotating X-Forwarded-For.' },
    { id:'graphql',   num:'7', name:'GraphQL Security',          sev:'medium',   desc:'Schema reconstruction via introspection query, batch query amplification DoS test.' },
    { id:'ci',        num:'8', name:'CI/CD PR Gate Simulation',  sev:'info',     desc:'Structural fingerprint diff (Method:Path:CWE) baseline comparison for GitHub Actions PR merge gate.' },
    { id:'report',    num:'9', name:'Rebuild DOCX Report',       sev:'info',     desc:'Compile OpenXML document.xml, validate XML tag balance, and package Phase 1 DOCX archive.' },
  ]});
});

// ── Target Presets (Includes Live Mock API & Public Test APIs) ────────
app.get('/api/presets', function(_, res) {
  res.json({ presets: [
    {
      id: 'mock-api',
      name: 'Built-in Vulnerable Mock API (Live - Zero Docker)',
      url: 'http://localhost:4000/mock-api',
      authType: 'bearer',
      specUrl: 'http://localhost:4000/mock-api/openapi.json',
      desc: 'Live embedded OWASP API Top 10 target: BOLA (/users, /orders), BFLA (/admin), JWT alg none, Rate limit bypass, Shadow API.'
    },
    {
      id: 'jsonplaceholder',
      name: 'JSONPlaceholder (Public Read-Only)',
      url: 'https://jsonplaceholder.typicode.com',
      authType: 'none',
      specUrl: null,
      desc: 'Free public REST API with fake posts, users, comments, todos. Safe for live external reconnaissance.'
    },
    {
      id: 'reqres',
      name: 'ReqRes.in (Public Test API)',
      url: 'https://reqres.in',
      authType: 'bearer',
      specUrl: null,
      desc: 'Hosted REST API for testing client requests with realistic responses and bearer token auth.'
    },
    {
      id: 'petstore',
      name: 'Swagger PetStore 3.0',
      url: 'https://petstore3.swagger.io/api/v3',
      authType: 'bearer',
      specUrl: 'https://petstore3.swagger.io/api/v3/openapi.json',
      desc: 'Official Swagger sample API with complete OpenAPI 3.0 contract and multi-resource endpoints.'
    },
    {
      id: 'crapi',
      name: 'OWASP crAPI Contract (Spec only)',
      url: 'http://localhost:8888',
      authType: 'bearer',
      specUrl: 'https://raw.githubusercontent.com/OWASP/crAPI/main/services/community/openapi.yaml',
      desc: 'OWASP completely ridiculous Automobile API specification (for contract and schema analysis).'
    },
    {
      id: 'vapi',
      name: 'vAPI Specification',
      url: 'http://localhost:5000',
      authType: 'bearer',
      specUrl: 'https://raw.githubusercontent.com/roottusk/vapi/master/openapi/vAPI.yaml',
      desc: 'Vulnerable Adversely Programmed Interface - OWASP API Top 10 OpenAPI schema.'
    }
  ]});
});

// ── Save Runtime Configuration ───────────────────────────────────────
app.post('/api/config', function(req, res) {
  runtimeCfg = Object.assign({}, runtimeCfg, req.body);
  res.json({ ok: true, config: runtimeCfg });
});

// ── Fetch Specification from Remote URL ──────────────────────────────
app.post('/api/fetch-spec', function(req, res) {
  var url = req.body.url;
  if (!url) return res.status(400).json({ error: 'url required' });
  var lib = url.startsWith('https') ? https : http;
  var data = '';
  var request = lib.get(url, { headers: { Accept: 'application/json,text/yaml,*/*' } }, function(r) {
    r.on('data', function(c) { data += c; });
    r.on('end', function() {
      try { res.json({ ok: true, spec: JSON.parse(data) }); }
      catch (_) { res.json({ ok: true, spec: null, raw: data }); }
    });
  });
  request.on('error', function(e) { res.status(500).json({ error: e.message }); });
  request.setTimeout(10000, function() { request.destroy(); res.status(504).json({ error: 'Timeout' }); });
});

// ── Get Configuration ────────────────────────────────────────────────
app.get('/api/config', function(_, res) {
  try {
    var yml  = fs.existsSync(path.join(ROOT, 'offat-x', 'offat-x.yml'))
      ? fs.readFileSync(path.join(ROOT, 'offat-x', 'offat-x.yml'), 'utf8') : '';
    res.json({ yml: yml, runtime: runtimeCfg });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Run Goal (SSE Live Streaming) ────────────────────────────────────
app.get('/api/run', function(req, res) {
  var goal = (req.query.goal || 'full').toLowerCase().trim();
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  
  var send = function(obj) { res.write('data: ' + JSON.stringify(obj) + '\n\n'); };
  var targetUrl = (runtimeCfg && runtimeCfg.targetUrl) ? runtimeCfg.targetUrl : 'http://localhost:4000/mock-api';
  
  send({ type: 'start', goal: goal, ts: Date.now(), target: targetUrl });
  
  var env = Object.assign({}, process.env);
  env.TARGET_URL = targetUrl;
  if (runtimeCfg) {
    if (runtimeCfg.bearerLow)     env.LOW_TOKEN     = runtimeCfg.bearerLow;
    if (runtimeCfg.bearerAdmin)   env.ADMIN_TOKEN   = runtimeCfg.bearerAdmin;
    if (runtimeCfg.bearerPremium) env.PREMIUM_TOKEN = runtimeCfg.bearerPremium;
    if (runtimeCfg.scope)         env.SCOPE_ALLOW   = runtimeCfg.scope;
  }

  var child = spawn('node', ['run_tests.js', '--goal=' + goal], { cwd: ROOT, env: env });
  child.stdout.on('data', function(buf) {
    buf.toString().split('\n').filter(function(l) { return l.trim(); }).forEach(function(line) {
      send({ type: 'line', text: line });
    });
  });
  child.stderr.on('data', function(buf) {
    buf.toString().split('\n').filter(function(l) { return l.trim(); }).forEach(function(line) {
      send({ type: 'err', text: line });
    });
  });
  child.on('close', function(code) {
    send({ type: 'done', code: code, ts: Date.now() });
    res.end();
  });
  req.on('close', function() {
    try { child.kill(); } catch (_) {}
  });
});

// ── Report & Export Endpoints ────────────────────────────────────────
app.get('/api/report-exists', function(_, res) {
  res.json({ exists: fs.existsSync(path.join(ROOT, 'offat-x-report.html')) });
});

app.get('/api/download/json', function(req, res) {
  var p = path.join(ROOT, 'offat-x-output.json');
  if (fs.existsSync(p)) {
    res.download(p, 'offat-x-findings.json');
  } else {
    res.status(404).json({ error: 'Run a scan first.' });
  }
});

app.listen(PORT, function() {
  console.log('');
  console.log('  OFFAT-X Security Dashboard  |  http://localhost:' + PORT);
  console.log('  Built-in Vulnerable Mock API |  http://localhost:' + PORT + '/mock-api');
  console.log('  OpenAPI 3.0 Contract         |  http://localhost:' + PORT + '/mock-api/openapi.json');
  console.log('');
});