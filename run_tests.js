#!/usr/bin/env node

/**
 * OFFAT-X Goal-Based Automated Test Runner
 * 
 * Allows researchers and developers to execute targeted security audits
 * based on specific evaluation goals.
 *
 * Usage:
 *   node run_tests.js --goal=full        # Run full 8-stage autonomous scan
 *   node run_tests.js --goal=bola        # Stateful BOLA / IDOR dependency chaining
 *   node run_tests.js --goal=bfla        # BFLA administrative privilege escalation
 *   node run_tests.js --goal=dirb        # Shadow API discovery (live vs spec)
 *   node run_tests.js --goal=jwt         # JWT algorithm 'none' and key confusion
 *   node run_tests.js --goal=ratelimit   # Rate limiting & header spoofing bypass
 *   node run_tests.js --goal=graphql     # GraphQL introspection & query abuse
 *   node run_tests.js --goal=ci          # DevSecOps CI/CD PR merge gate simulation
 *   node run_tests.js --goal=report      # Rebuild & verify Phase-1 DOCX report
 *   node run_tests.js                    # Interactive goal selection menu
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync, spawn } = require('child_process');

const ROOT_DIR = __dirname;
const OFFAT_DIR = path.join(ROOT_DIR, 'offat-x');
const PAPERS_DIR = path.join(ROOT_DIR, 'Papers');
const SANDBOX_DIR = path.join(OFFAT_DIR, 'sandbox', 'vulnerable-api');
const SPEC_PATH = path.join(SANDBOX_DIR, 'openapi.json');
const SCOPE_PATH = path.join(OFFAT_DIR, 'offat-x.yml');

// ANSI Color Utilities
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
  bgBlue: '\x1b[44m\x1b[37m',
};

function banner() {
  console.log(`
${C.cyan}${C.bold}   ___  _________  ___  _____  _  __
  / _ \\/ __/ __/ |/ / |/ / _ \\/ |/ /
 / // / _// _//    /   / __ /    / 
/____/_/ /_/ /_/|_/_/|_/_/ |_/_/|_/ 
       OFFensive API Tester X
${C.reset}${C.dim}  Automated Goal-Based Evaluation Runner${C.reset}
`);
}

const GOALS = [
  {
    id: 'full',
    num: '1',
    name: 'Full 8-Stage Autonomous Scan',
    desc: 'Runs the complete pipeline: Scope Validation, OAS Ingestion, Sandboxed DIRB, DAG Chaining, 4-Tier Matrix, Semantic Diff Eq(2), SARIF, and HTML Reports.',
    action: runFullScan
  },
  {
    id: 'bola',
    num: '2',
    name: 'BOLA / IDOR Stateful Chaining Test',
    desc: 'Evaluates Broken Object Level Authorization using BFS setup sequences (L ≤ 4) to eliminate 404 dead-ends and tests cross-tenant exfiltration (Alice vs Bob).',
    action: runBolaTest
  },
  {
    id: 'bfla',
    num: '3',
    name: 'BFLA Privilege Escalation Test',
    desc: 'Tests Broken Function Level Authorization by replaying low-privileged and guest credentials against administrative endpoints against offat-x.yml policy.',
    action: runBflaTest
  },
  {
    id: 'dirb',
    num: '4',
    name: 'DIRB Shadow API & Route Discovery',
    desc: 'Brute-forces backend paths against common API wordlists, diffs active routes against the OpenAPI contract, and flags unmanaged shadow routes (OWASP API9).',
    action: runDirbTest
  },
  {
    id: 'jwt',
    num: '5',
    name: 'JWT Cryptographic Attack Battery',
    desc: 'Attempts algorithm "none" stripping, RS256-to-HS256 public key confusion, signature truncation, and expired token replays on bearer authentication endpoints.',
    action: runJwtTest
  },
  {
    id: 'ratelimit',
    num: '6',
    name: 'Rate Limiting & Header Bypass Test',
    desc: 'Sends high-frequency request bursts (30+ probes) to detect HTTP 429 throttling and tests header spoofing bypasses using rotating X-Forwarded-For IPs.',
    action: runRateLimitTest
  },
  {
    id: 'graphql',
    num: '7',
    name: 'GraphQL Introspection & DoS Abuse',
    desc: 'Extracts full GraphQL schemas via introspection, tests batch query amplification (DoS), and checks object depth limits for resource exhaustion.',
    action: runGraphqlTest
  },
  {
    id: 'ci',
    num: '8',
    name: 'DevSecOps CI/CD PR Merge Gate Simulation',
    desc: 'Simulates a GitHub Actions pull request scan, compares findings against a baseline report using structural fingerprints (Method:Path:CWE), and gates PR merges.',
    action: runCiGateTest
  },
  {
    id: 'report',
    num: '9',
    name: 'Reconstruct & Validate Phase-1 DOCX Report',
    desc: 'Compiles the full 263-element OpenXML document, verifies tag nesting integrity, packages OFFAT-X_Phase_1_Report.docx, and verifies archive validity.',
    action: runReportRebuild
  }
];

// Helper to check if Go compiler is available
function checkGoInstalled() {
  try {
    const out = execSync('go version', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return out.trim();
  } catch (e) {
    return null;
  }
}

// Import Live Autonomous Engine
const scanner = require('./scanner');

// ─────────────────────────────────────────────────────────────────────────────
// GOAL 1: Full Autonomous Scan
// ─────────────────────────────────────────────────────────────────────────────
async function runFullScan() {
  const goVer = checkGoInstalled();
  if (goVer) {
    try {
      execSync(`go run ./cmd/offat-x -f "${SPEC_PATH}" -scope "${SCOPE_PATH}" -chain -rolediff --dirb -jwt -bfla -rl`, {
        cwd: OFFAT_DIR,
        stdio: 'inherit'
      });
      return;
    } catch (_) {
      console.log(`${C.yellow}Switching to Node.js Autonomous Engine...${C.reset}`);
    }
  }
  return await scanner.runScan(process.env.TARGET_URL, 'full');
}

// ─────────────────────────────────────────────────────────────────────────────
// GOAL 2: BOLA / IDOR Stateful Chaining
// ─────────────────────────────────────────────────────────────────────────────
async function runBolaTest() {
  return await scanner.runScan(process.env.TARGET_URL, 'bola');
}

// ─────────────────────────────────────────────────────────────────────────────
// GOAL 3: BFLA Administrative Privilege Escalation
// ─────────────────────────────────────────────────────────────────────────────
async function runBflaTest() {
  return await scanner.runScan(process.env.TARGET_URL, 'bfla');
}

// ─────────────────────────────────────────────────────────────────────────────
// GOAL 4: DIRB Shadow API & Route Discovery
// ─────────────────────────────────────────────────────────────────────────────
async function runDirbTest() {
  return await scanner.runScan(process.env.TARGET_URL, 'dirb');
}

// ─────────────────────────────────────────────────────────────────────────────
// GOAL 5: JWT Cryptographic Attacks
// ─────────────────────────────────────────────────────────────────────────────
async function runJwtTest() {
  return await scanner.runScan(process.env.TARGET_URL, 'jwt');
}

// ─────────────────────────────────────────────────────────────────────────────
// GOAL 6: Rate Limiting & Bypass
// ─────────────────────────────────────────────────────────────────────────────
async function runRateLimitTest() {
  return await scanner.runScan(process.env.TARGET_URL, 'ratelimit');
}

// ─────────────────────────────────────────────────────────────────────────────
// GOAL 7: GraphQL Security Testing
// ─────────────────────────────────────────────────────────────────────────────
async function runGraphqlTest() {
  return await scanner.runScan(process.env.TARGET_URL, 'graphql');
}

// ─────────────────────────────────────────────────────────────────────────────
// GOAL 8: DevSecOps CI/CD PR Merge Gate Simulation
// ─────────────────────────────────────────────────────────────────────────────
async function runCiGateTest() {
  return await scanner.runScan(process.env.TARGET_URL, 'ci');
}

// ─────────────────────────────────────────────────────────────────────────────
// GOAL 9: Reconstruct & Validate Phase-1 DOCX Report
// ─────────────────────────────────────────────────────────────────────────────
function runReportRebuild() {
  console.log(`\n${C.bgBlue} GOAL 9: RECONSTRUCT & VALIDATE PHASE-1 DOCX REPORT ${C.reset}\n`);
  console.log(`${C.bold}Execution Sequence:${C.reset}`);
  console.log(`1. Compiles OpenXML document via build_perfect_offatx_report.js.`);
  console.log(`2. Validates OpenXML tag balance via validate_xml.js.`);
  console.log(`3. Packages vulnix_original into OFFAT-X_Phase_1_Report.docx via pack_docx.js.`);
  console.log(`4. Verifies uncompressed archive integrity via verify_docx.js.\n`);

  try {
    console.log(`${C.cyan}Step 1: Compiling OpenXML document.xml...${C.reset}`);
    const buildOut = execSync('node build_perfect_offatx_report.js', { cwd: PAPERS_DIR, encoding: 'utf8' });
    console.log(buildOut.trim());

    console.log(`\n${C.cyan}Step 2: Validating XML tag balance...${C.reset}`);
    const valOut = execSync('node validate_xml.js', { cwd: PAPERS_DIR, encoding: 'utf8' });
    console.log(valOut.trim());

    console.log(`\n${C.cyan}Step 3: Packaging and verifying DOCX archive...${C.reset}`);
    const packOut = execSync('node pack_docx.js', { cwd: PAPERS_DIR, encoding: 'utf8' });
    console.log(packOut.trim());

    console.log(`\n${C.green}${C.bold}Report Rebuild & Verification: 100% SUCCESS!${C.reset}`);
    console.log(`Output Artifact: ${path.join(PAPERS_DIR, 'OFFAT-X_Phase_1_Report.docx')}`);
  } catch (e) {
    console.error(`${C.red}Error executing report build:${C.reset}`, e.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI Parser & Interactive Menu
// ─────────────────────────────────────────────────────────────────────────────
function showMenu() {
  banner();
  console.log(`${C.bold}Select a testing goal to execute:${C.reset}\n`);
  GOALS.forEach(g => {
    console.log(`  ${C.cyan}[${g.num}]${C.reset} ${C.bold}${g.name}${C.reset}`);
    console.log(`      ${C.dim}${g.desc}${C.reset}`);
  });
  console.log(`  ${C.yellow}[0] Exit${C.reset}\n`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question(`${C.bold}Enter choice [1-9, or 0]: ${C.reset}`, async (answer) => {
    rl.close();
    const clean = answer.trim();
    if (clean === '0') {
      console.log('Exiting.');
      process.exit(0);
    }
    const matched = GOALS.find(g => g.num === clean || g.id === clean.toLowerCase());
    if (matched) {
      try {
        await matched.action();
      } catch (e) {
        console.error(`${C.red}Test error:${C.reset}`, e.message);
      }
    } else {
      console.log(`${C.red}Invalid selection. Please choose a number from 1 to 9.${C.reset}`);
      showMenu();
    }
  });
}

// Parse command line arguments
const args = process.argv.slice(2);
const goalArg = args.find(a => a.startsWith('--goal=') || a.startsWith('-g='));

if (goalArg) {
  banner();
  const val = goalArg.split('=')[1].toLowerCase().trim();
  const matched = GOALS.find(g => g.id === val || g.num === val);
  if (matched) {
    Promise.resolve(matched.action()).catch(e => {
      console.error(`${C.red}Execution failed:${C.reset}`, e);
      process.exit(1);
    });
  } else {
    console.error(`${C.red}Unknown goal '${val}'. Available goals: ${GOALS.map(g => g.id).join(', ')}${C.reset}`);
    process.exit(1);
  }
} else if (args.includes('-h') || args.includes('--help')) {
  banner();
  console.log(`Usage: node run_tests.js [options]\n`);
  console.log(`Options:`);
  console.log(`  --goal=<id>    Run a specific test goal directly`);
  console.log(`  --help, -h     Show this help screen\n`);
  console.log(`Available Goals:`);
  GOALS.forEach(g => console.log(`  --goal=${g.id.padEnd(10)} [${g.num}] ${g.name}`));
} else {
  showMenu();
}
