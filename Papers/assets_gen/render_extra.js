const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { pathToFileURL } = require('url');

const papersDir = path.resolve(__dirname, '..');
const assetsDir = path.join(papersDir, 'assets_gen');
const mediaDir = path.join(papersDir, 'vulnix_temp', 'word', 'media');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

// 1. GitHub Actions PR Security Gate
const htmlCI = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  body { background: #0d1117; color: #c9d1d9; padding: 25px; display: flex; justify-content: center; align-items: center; height: 100vh; }
  .box { width: 100%; max-width: 1100px; background: #161b22; border: 1.5px solid #30363d; border-radius: 8px; box-shadow: 0 12px 36px rgba(0,0,0,0.6); overflow: hidden; }
  .header { background: #21262d; padding: 14px 20px; border-bottom: 1px solid #30363d; display: flex; align-items: center; gap: 12px; }
  .status-icon { width: 24px; height: 24px; border-radius: 50%; background: #da3633; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #fff; font-size: 14px; }
  .title { font-size: 15px; font-weight: 700; color: #f0f6fc; }
  .content { padding: 20px; font-size: 13px; line-height: 1.6; }
  .check-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #0d1117; border: 1px solid #30363d; border-radius: 6px; margin-bottom: 10px; }
  .badge-fail { background: rgba(248,81,73,0.15); color: #f85149; border: 1px solid #da3633; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 11px; }
  .badge-pass { background: rgba(56,139,253,0.15); color: #58a6ff; border: 1px solid #388bfd; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 11px; }
  .sarif-alert { background: rgba(248,81,73,0.1); border-left: 4px solid #f85149; padding: 12px; border-radius: 4px; margin-top: 15px; font-family: monospace; font-size: 11.5px; color: #ff7b72; }
</style>
</head>
<body>
  <div class="box">
    <div class="header">
      <div class="status-icon">✕</div>
      <div class="title">GitHub Actions / offat-x-security-gate (pull_request #14) — Merge Blocked</div>
    </div>
    <div class="content">
      <p style="margin-bottom: 15px; color: #8b949e;">Pipeline completed in 14s. Evaluated 248 security assertions against base branch <code>main</code>.</p>
      
      <div class="check-item">
        <div>
          <strong style="color:#f0f6fc;">OFFAT-X Specification Normalization & Scope Check</strong>
          <div style="font-size:11px; color:#8b949e;">Verified OpenAPI 3.0 schema and strict scope allowlist</div>
        </div>
        <span class="badge-pass">PASS</span>
      </div>

      <div class="check-item">
        <div>
          <strong style="color:#f0f6fc;">Role-Differential Authorization Gating (fail-on: high-new)</strong>
          <div style="font-size:11px; color:#8b949e;">Detected 2 new Critical and 1 new High vulnerability not present in baseline</div>
        </div>
        <span class="badge-fail">FAILED</span>
      </div>

      <div class="check-item">
        <div>
          <strong style="color:#f0f6fc;">SARIF 2.1.0 Artifact Upload to GitHub Advanced Security</strong>
          <div style="font-size:11px; color:#8b949e;">Uploaded results.sarif (3 alert annotations created)</div>
        </div>
        <span class="badge-pass">UPLOADED</span>
      </div>

      <div class="sarif-alert">
        [ERROR] Security Gate Failure: Rule 'offat-x/BOLA-API1' triggered on endpoint 'GET /api/v1/orders/{id}'<br>
        CVSS Base Score: 8.8 (Critical) | Fingerprint: 8f4a21b8c4d29e<br>
        Pull request merge blocked until authorization filter is committed.
      </div>
    </div>
  </div>
</body>
</html>`;
fs.writeFileSync(path.join(assetsDir, 'figb1_ci.html'), htmlCI);

// 2. Rate Limit Probing Console
const htmlRL = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Consolas', monospace; }
  body { background: #0a0d14; padding: 25px; display: flex; justify-content: center; align-items: center; height: 100vh; }
  .box { width: 100%; max-width: 1100px; background: #0d1117; border: 1.5px solid #30363d; border-radius: 8px; box-shadow: 0 12px 36px rgba(0,0,0,0.6); overflow: hidden; font-size: 12px; }
  .header { background: #161b22; padding: 10px 16px; border-bottom: 1px solid #30363d; display: flex; justify-content: space-between; align-items: center; }
  .content { padding: 20px; color: #c9d1d9; line-height: 1.5; white-space: pre-wrap; height: 600px; }
  .c-green { color: #3fb950; font-weight: bold; }
  .c-yellow { color: #d29922; }
  .c-red { color: #f85149; font-weight: bold; }
  .c-cyan { color: #58a6ff; }
</style>
</head>
<body>
  <div class="box">
    <div class="header">
      <div style="color:#58a6ff; font-weight:bold;">⚡ OFFAT-X Rate-Limit Prober & Header Bypass Engine (OWASP API4:2023)</div>
      <div style="font-size:11px; color:#8b949e;">Endpoint: POST /api/v1/auth/login • Probe Limit: 50 requests</div>
    </div>
    <div class="content">$ offat-x -f ./openapi.json -b https://api.target.com -rl -rl-probes 50

<span class="c-cyan">[*] Commencing Baseline Rate-Limit Stress Probe (50 concurrent requests)...</span>
    • Requests 1 to 15:    <span class="c-green">200 OK</span> (Normal throughput)
    • Request 16:          <span class="c-yellow">429 Too Many Requests (Rate limit triggered at 15 req/window)</span>
    • Retry-After Header:  60 seconds

<span class="c-cyan">[*] Launching Autonomous Header-Based Rate-Limit Bypass Battery:</span>

<span class="c-red">[BYPASS DETECTED] Header: X-Forwarded-For: 198.51.100.42</span>
    • Flooded 35 additional requests with spoofed client IP
    • Server Response:     <span class="c-red">200 OK (Rate limit completely bypassed!)</span>
    • CVSS v3.1:           <span class="c-red">5.3 MEDIUM (CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:L/A:L)</span>
    • Root Cause:          Backend trusts client-supplied X-Forwarded-For header without proxy validation.

<span class="c-red">[BYPASS DETECTED] Header: X-Real-IP: 203.0.113.99</span>
    • Injected unique IP per burst
    • Server Response:     <span class="c-red">200 OK (Continuous unthrottled requests accepted)</span>

<span class="c-cyan">[REMEDIATION GUIDANCE]</span>
    Enforce rate limiting at the API gateway layer or extract client IP strictly from socket connection.</div>
  </div>
</body>
</html>`;
fs.writeFileSync(path.join(assetsDir, 'figb3_rl.html'), htmlRL);

// 3. GraphQL Security Testing Console
const htmlGQL = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Consolas', monospace; }
  body { background: #0a0d14; padding: 25px; display: flex; justify-content: center; align-items: center; height: 100vh; }
  .box { width: 100%; max-width: 1100px; background: #0d1117; border: 1.5px solid #30363d; border-radius: 8px; box-shadow: 0 12px 36px rgba(0,0,0,0.6); overflow: hidden; font-size: 12px; }
  .header { background: #161b22; padding: 10px 16px; border-bottom: 1px solid #30363d; display: flex; justify-content: space-between; align-items: center; }
  .content { padding: 20px; color: #c9d1d9; line-height: 1.5; white-space: pre-wrap; height: 600px; }
  .c-green { color: #3fb950; font-weight: bold; }
  .c-yellow { color: #d29922; }
  .c-red { color: #f85149; font-weight: bold; }
  .c-cyan { color: #58a6ff; }
</style>
</head>
<body>
  <div class="box">
    <div class="header">
      <div style="color:#58a6ff; font-weight:bold;">🔮 OFFAT-X GraphQL Advanced Vulnerability Testing Suite</div>
      <div style="font-size:11px; color:#8b949e;">Endpoint: POST /graphql • Target: Juice Shop / crAPI</div>
    </div>
    <div class="content">$ offat-x --graphql --graphql-url https://api.target.com/graphql -H "Authorization: Bearer <tok>"

<span class="c-cyan">[*] Probing GraphQL Endpoint Architecture...</span>

<span class="c-red">[VULN] 1. Full Schema Introspection Enabled (OWASP API8)</span>
    • Query:   {"query": "{ __schema { types { name fields { name } } } }"}
    • Result:  <span class="c-red">200 OK (Full schema extracted: 48 types, 114 queries, 32 mutations revealed)</span>
    • CVSS:    <span class="c-yellow">5.3 MEDIUM</span> (Information Disclosure)

<span class="c-red">[VULN] 2. Batch Query Resource Exhaustion (DoS Attack)</span>
    • Payload: Array of 150 aliased user queries in single HTTP POST request
    • Result:  <span class="c-red">200 OK (Server processed all 150 queries in 4200ms without rate limiting)</span>
    • CVSS:    <span class="c-red">7.5 HIGH</span> (Denial of Service)

<span class="c-red">[VULN] 3. Circular Deep Nesting Attack (Query Depth Fuzzing)</span>
    • Depth:   author { books { author { books { author { books ... } } } } } (Depth: 25)
    • Result:  <span class="c-red">500 Internal Server Error (Call stack exhaustion; no query depth limit)</span>
    • CVSS:    <span class="c-red">7.5 HIGH</span>

<span class="c-green">[✔] Introspection AST exported to: offat-x-graphql-schema.json</span></div>
  </div>
</body>
</html>`;
fs.writeFileSync(path.join(assetsDir, 'figb4_gql.html'), htmlGQL);

// 4. SARIF 2.1.0 JSON & IDE Integration
const htmlSARIF = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Consolas', monospace; }
  body { background: #0a0d14; padding: 25px; display: flex; justify-content: center; align-items: center; height: 100vh; }
  .box { width: 100%; max-width: 1100px; background: #0d1117; border: 1.5px solid #30363d; border-radius: 8px; box-shadow: 0 12px 36px rgba(0,0,0,0.6); overflow: hidden; font-size: 11.5px; }
  .header { background: #161b22; padding: 10px 16px; border-bottom: 1px solid #30363d; display: flex; justify-content: space-between; align-items: center; }
  .content { padding: 20px; color: #c9d1d9; line-height: 1.5; white-space: pre-wrap; height: 600px; }
  .c-green { color: #3fb950; }
  .c-yellow { color: #d29922; }
  .c-red { color: #f85149; }
  .c-cyan { color: #58a6ff; }
</style>
</head>
<body>
  <div class="box">
    <div class="header">
      <div style="color:#58a6ff; font-weight:bold;">📋 OFFAT-X OASIS SARIF 2.1.0 Standard Export (results.sarif)</div>
      <div style="font-size:11px; color:#8b949e;">Interoperable with GitHub Code Scanning, GitLab SAST, & VS Code</div>
    </div>
    <div class="content">{
  <span class="c-cyan">"$schema"</span>: <span class="c-green">"https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json"</span>,
  <span class="c-cyan">"version"</span>: <span class="c-green">"2.1.0"</span>,
  <span class="c-cyan">"runs"</span>: [
    {
      <span class="c-cyan">"tool"</span>: {
        <span class="c-cyan">"driver"</span>: {
          <span class="c-cyan">"name"</span>: <span class="c-green">"OFFAT-X"</span>,
          <span class="c-cyan">"version"</span>: <span class="c-green">"1.0.0"</span>,
          <span class="c-cyan">"informationUri"</span>: <span class="c-green">"https://github.com/offat-x/offat-x"</span>,
          <span class="c-cyan">"rules"</span>: [
            {
              <span class="c-cyan">"id"</span>: <span class="c-green">"OFFATX001"</span>,
              <span class="c-cyan">"name"</span>: <span class="c-green">"BrokenObjectLevelAuthorization"</span>,
              <span class="c-cyan">"shortDescription"</span>: { <span class="c-cyan">"text"</span>: <span class="c-green">"OWASP API1:2023 BOLA Improper Authorization"</span> },
              <span class="c-cyan">"defaultConfiguration"</span>: { <span class="c-cyan">"level"</span>: <span class="c-red">"error"</span> }
            }
          ]
        }
      },
      <span class="c-cyan">"results"</span>: [
        {
          <span class="c-cyan">"ruleId"</span>: <span class="c-green">"OFFATX001"</span>,
          <span class="c-cyan">"level"</span>: <span class="c-red">"error"</span>,
          <span class="c-cyan">"message"</span>: {
            <span class="c-cyan">"text"</span>: <span class="c-green">"BOLA verified: User 'Bob' retrieved order belonging to 'Alice' on GET /api/v1/orders/1042 with Semantic Diff D=1.00."</span>
          },
          <span class="c-cyan">"locations"</span>: [
            {
              <span class="c-cyan">"physicalLocation"</span>: {
                <span class="c-cyan">"artifactLocation"</span>: { <span class="c-cyan">"uri"</span>: <span class="c-green">"openapi.json#/paths/~1api~1v1~1orders~1{id}/get"</span> }
              }
            }
          ]
        }
      ]
    }
  ]
}</div>
  </div>
</body>
</html>`;
fs.writeFileSync(path.join(assetsDir, 'figb5_sarif.html'), htmlSARIF);

function capture(htmlFilename, outputFilename, width = 1150, height = 750) {
  const fullHtml = path.join(assetsDir, htmlFilename);
  const fullOut = path.join(mediaDir, outputFilename);
  const fileUrl = pathToFileURL(fullHtml).href;
  console.log(`Rendering ${outputFilename}...`);
  execFileSync(chromePath, [
    '--headless',
    '--no-sandbox',
    '--disable-gpu',
    '--force-device-scale-factor=1.5',
    `--window-size=${width},${height}`,
    `--screenshot=${fullOut}`,
    fileUrl
  ]);
  console.log(`✔ Rendered ${outputFilename} (${fs.statSync(fullOut).size} bytes)`);
}

capture('figb1_ci.html', 'image12.png');
capture('figb3_rl.html', 'image15.png');
capture('figb4_gql.html', 'image17.png');
capture('figb5_sarif.html', 'image19.png');

console.log('All companion screenshots successfully created!');
