'use strict';
const express   = require('express');
const path      = require('path');
const fs        = require('fs');
const http      = require('http');
const https     = require('https');
const { spawn } = require('child_process');

const app  = express();
const PORT = 4000;
const ROOT = __dirname;

let runtimeCfg = null;

app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(ROOT, 'ui')));
app.use('/reports', express.static(ROOT));

// ── Health ──────────────────────────────────────────────────────────
app.get('/api/status', function(_, res) { res.json({ ok: true, version: '2.0.0' }); });

// ── Goals ──────────────────────────────────────────────────────────
app.get('/api/goals', function(_, res) {
  res.json({ goals: [
    { id:'full',      num:'1', name:'Full 8-Stage Scan',         sev:'critical', desc:'Complete pipeline: scope, OAS, DIRB, DAG, role-matrix, semantic diff, remediation, reports.' },
    { id:'bola',      num:'2', name:'BOLA / IDOR Test',          sev:'critical', desc:'BFS chaining (L<=4) to provision resources; cross-tenant exfiltration replay.' },
    { id:'bfla',      num:'3', name:'BFLA Privilege Escalation', sev:'high',     desc:'4-tier role matrix testing against admin-only endpoints.' },
    { id:'dirb',      num:'4', name:'Shadow API Discovery',      sev:'high',     desc:'Dictionary brute-force; diffs live routes vs OpenAPI spec.' },
    { id:'jwt',       num:'5', name:'JWT Attack Battery',        sev:'critical', desc:'Algorithm none, RS256 to HS256 confusion, expired token replay.' },
    { id:'ratelimit', num:'6', name:'Rate Limit Bypass',         sev:'medium',   desc:'30-probe burst; X-Forwarded-For header spoofing bypass.' },
    { id:'graphql',   num:'7', name:'GraphQL Security',          sev:'medium',   desc:'Introspection extraction, batch amplification, nested DoS.' },
    { id:'ci',        num:'8', name:'CI/CD PR Gate Simulation',  sev:'info',     desc:'Structural fingerprint diff (Method:Path:CWE) for PR merge gate.' },
    { id:'report',    num:'9', name:'Rebuild DOCX Report',       sev:'info',     desc:'Compile OpenXML + validate + package OFFAT-X Phase 1 Report.' },
  ]});
});

// ── Presets ──────────────────────────────────────────────────────────
app.get('/api/presets', function(_, res) {
  res.json({ presets: [
    { id:'sandbox',         name:'Local Sandbox (built-in)',    url:'http://localhost:8000',                authType:'bearer', specUrl:null,                                                                                              desc:'Built-in deliberately vulnerable FastAPI sandbox.' },
    { id:'jsonplaceholder', name:'JSONPlaceholder (public)',    url:'https://jsonplaceholder.typicode.com', authType:'none',   specUrl:null,                                                                                              desc:'Free public REST API with fake posts, users, todos.' },
    { id:'reqres',          name:'ReqRes.in (public)',          url:'https://reqres.in',                    authType:'bearer', specUrl:null,                                                                                              desc:'Hosted REST API for testing with fake user data and auth.' },
    { id:'petstore',        name:'Swagger PetStore 3.0',        url:'https://petstore3.swagger.io/api/v3', authType:'bearer', specUrl:'https://petstore3.swagger.io/api/v3/openapi.json',                                               desc:'Official Swagger sample API with full OpenAPI 3.0 spec.' },
    { id:'crapi',           name:'OWASP crAPI spec',            url:'http://localhost:8888',                authType:'bearer', specUrl:'https://raw.githubusercontent.com/OWASP/crAPI/main/services/community/openapi.yaml',            desc:'OWASP deliberately vulnerable car API spec (no Docker run needed).' },
    { id:'vapi',            name:'vAPI spec',                   url:'http://localhost:5000',                authType:'bearer', specUrl:'https://raw.githubusercontent.com/roottusk/vapi/master/openapi/vAPI.yaml',                      desc:'Vulnerable Adversely Programmed Interface - OWASP API Top 10.' },
  ]});
});

// ── Save runtime config ──────────────────────────────────────────────
app.post('/api/config', function(req, res) { runtimeCfg = req.body; res.json({ ok: true }); });

// ── Fetch spec from URL ──────────────────────────────────────────────
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

// ── Get default config ───────────────────────────────────────────────
app.get('/api/config', function(_, res) {
  try {
    var yml  = fs.readFileSync(path.join(ROOT, 'offat-x', 'offat-x.yml'), 'utf8');
    var spec = JSON.parse(fs.readFileSync(path.join(ROOT, 'offat-x', 'sandbox', 'vulnerable-api', 'openapi.json'), 'utf8'));
    res.json({ yml: yml, spec: spec, runtime: runtimeCfg });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Run goal - SSE stream ────────────────────────────────────────────
app.get('/api/run', function(req, res) {
  var goal = (req.query.goal || 'full').toLowerCase().trim();
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' });
  var send = function(obj) { res.write('data: ' + JSON.stringify(obj) + '\n\n'); };
  send({ type: 'start', goal: goal, ts: Date.now(), target: runtimeCfg ? runtimeCfg.targetUrl : 'http://localhost:8000' });
  var env = Object.assign({}, process.env);
  if (runtimeCfg) {
    if (runtimeCfg.bearerLow)     env.LOW_TOKEN     = runtimeCfg.bearerLow;
    if (runtimeCfg.bearerAdmin)   env.ADMIN_TOKEN   = runtimeCfg.bearerAdmin;
    if (runtimeCfg.bearerPremium) env.PREMIUM_TOKEN = runtimeCfg.bearerPremium;
  }
  var child = spawn('node', ['run_tests.js', '--goal=' + goal], { cwd: ROOT, env: env });
  child.stdout.on('data', function(buf) { buf.toString().split('\n').filter(function(l) { return l.trim(); }).forEach(function(line) { send({ type: 'line', text: line }); }); });
  child.stderr.on('data', function(buf) { buf.toString().split('\n').filter(function(l) { return l.trim(); }).forEach(function(line) { send({ type: 'err',  text: line }); }); });
  child.on('close', function(code) { send({ type: 'done', code: code, ts: Date.now() }); res.end(); });
  req.on('close', function() { try { child.kill(); } catch (_) {} });
});

// ── Report ───────────────────────────────────────────────────────────
app.get('/api/report-exists', function(_, res) { res.json({ exists: fs.existsSync(path.join(ROOT, 'offat-x-report.html')) }); });
app.get('/api/download/json', function(req, res) {
  var p = path.join(ROOT, 'offat-x-output.json');
  if (fs.existsSync(p)) { res.download(p, 'offat-x-findings.json'); }
  else { res.status(404).json({ error: 'Run a scan first.' }); }
});

app.listen(PORT, function() {
  console.log('');
  console.log('  OFFAT-X Web UI  v2.0  |  http://localhost:' + PORT);
  console.log('');
});