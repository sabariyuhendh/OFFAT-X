'use strict';
const express   = require('express');
const { spawn } = require('child_process');
const path      = require('path');
const fs        = require('fs');

const app  = express();
const PORT = 4000;
const ROOT = __dirname;

app.use(express.json());
app.use(express.static(path.join(ROOT, 'ui')));
app.use('/reports', express.static(ROOT));

// Health
app.get('/api/status', (_, res) => res.json({ ok: true, version: '1.0.0' }));

// Config
app.get('/api/config', (_, res) => {
  try {
    const yml  = fs.readFileSync(path.join(ROOT, 'offat-x', 'offat-x.yml'), 'utf8');
    const spec = JSON.parse(fs.readFileSync(path.join(ROOT, 'offat-x', 'sandbox', 'vulnerable-api', 'openapi.json'), 'utf8'));
    res.json({ yml, spec });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Goals list
app.get('/api/goals', (_, res) => {
  res.json({ goals: [
    { id:'full',      num:'1', name:'Full 8-Stage Scan',         sev:'critical', desc:'Complete pipeline: scope → OAS → DIRB → DAG → matrix → diff → remediation → reports.' },
    { id:'bola',      num:'2', name:'BOLA / IDOR Test',          sev:'critical', desc:'BFS chaining (L≤4) to provision resources; cross-tenant exfiltration replay.' },
    { id:'bfla',      num:'3', name:'BFLA Privilege Escalation', sev:'high',     desc:'4-tier role matrix testing against admin-only endpoints.' },
    { id:'dirb',      num:'4', name:'Shadow API Discovery',      sev:'high',     desc:'Dictionary brute-force; diffs live routes vs OpenAPI spec.' },
    { id:'jwt',       num:'5', name:'JWT Attack Battery',        sev:'critical', desc:'Algorithm none, RS256→HS256 confusion, expired token replay.' },
    { id:'ratelimit', num:'6', name:'Rate Limit Bypass',         sev:'medium',   desc:'30-probe burst; X-Forwarded-For header spoofing bypass.' },
    { id:'graphql',   num:'7', name:'GraphQL Security',          sev:'medium',   desc:'Introspection extraction, batch amplification, nested DoS.' },
    { id:'ci',        num:'8', name:'CI/CD PR Gate Simulation',  sev:'info',     desc:'Structural fingerprint diff (Method:Path:CWE) for PR merge gate.' },
    { id:'report',    num:'9', name:'Rebuild DOCX Report',       sev:'info',     desc:'Compile OpenXML + validate + package OFFAT-X_Phase_1_Report.docx.' },
  ]});
});

// Run goal – SSE stream
app.get('/api/run', (req, res) => {
  const goal = (req.query.goal || 'full').toLowerCase().trim();

  res.writeHead(200, {
    'Content-Type':      'text/event-stream',
    'Cache-Control':     'no-cache',
    'Connection':        'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const send = obj => res.write('data: ' + JSON.stringify(obj) + '\n\n');
  send({ type: 'start', goal, ts: Date.now() });

  const child = spawn('node', ['run_tests.js', '--goal=' + goal], { cwd: ROOT });

  child.stdout.on('data', buf =>
    buf.toString().split('\n').filter(l => l.trim()).forEach(line => send({ type: 'line', text: line })));

  child.stderr.on('data', buf =>
    buf.toString().split('\n').filter(l => l.trim()).forEach(line => send({ type: 'err', text: line })));

  child.on('close', code => { send({ type: 'done', code, ts: Date.now() }); res.end(); });
  req.on('close', () => { try { child.kill(); } catch (_) {} });
});

// Report exists?
app.get('/api/report-exists', (_, res) => {
  res.json({ exists: fs.existsSync(path.join(ROOT, 'offat-x-report.html')) });
});

app.listen(PORT, () => {
  console.log('\n  ╔══════════════════════════════════════╗');
  console.log('  ║   OFFAT-X Web UI  ·  v1.0.0          ║');
  console.log('  ╠══════════════════════════════════════╣');
  console.log('  ║   http://localhost:' + PORT + '              ║');
  console.log('  ╚══════════════════════════════════════╝\n');
});
