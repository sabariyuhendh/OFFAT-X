# OFFAT-X: Offensive API Testing Framework eXtended

> **A Sandboxed, Dependency-Aware and Role-Differential Framework for Automated Authorization Testing of REST APIs**  
> *Department of Computer Science and Business Systems*  
> *KIT – Kalaignarkarunanidhi Institute of Technology, Anna University, Chennai*

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Repository Structure](#repository-structure)
3. [Goal-Based Test Runner](#goal-based-test-runner)
4. [The 5 Core Research Pillars](#the-5-core-research-pillars)
5. [Quickstart Guide](#quickstart-guide)
6. [CLI Flags Reference](#cli-flags-reference)
7. [Benchmark Evaluation Results](#benchmark-evaluation-results)

---

## Project Overview

Modern cloud architectures depend heavily on REST APIs as their primary communication backbone. However, authorization weaknesses—specifically **Broken Object Level Authorization (BOLA, OWASP API1:2023)** and **Broken Function Level Authorization (BFLA, OWASP API5:2023)**—rank as the most pervasive and severe vulnerabilities in modern application security.

Unlike syntactic injection flaws, authorization vulnerabilities typically return valid **HTTP 200 responses** carrying well-formed business objects. Traditional Dynamic Application Security Testing (DAST) scanners suffer from false-positive rates of 40%–60%, encounter persistent 404 Not Found setup dead-ends, trust status codes blindly, execute third-party fuzzers without container isolation, and terminate without developer remediation.

**OFFAT-X** bridges these critical gaps through:
- **Dependency-Aware Stateful Chaining (BFS $L \le 4$)**: Resolves producer-consumer relationships to instantiate prerequisite resources before querying consumer endpoints, eliminating 404 setup dead-ends.
- **Four-Tier Role-Differential Matrix**: Tests authorization boundaries across $R = \{\text{Guest} < \text{Low} < \text{Premium} < \text{Admin}\}$ with dual horizontal identities (Alice vs Bob).
- **Mathematical Semantic Response Diffing Engine**: Evaluates Jaccard schema similarity, victim value overlap, and error signature penalties via Equation (2).
- **Ephemeral Container Sandboxing**: Runs third-party path brute-forcing (DIRB) inside hardened Docker containers (`--cap-drop=ALL`).
- **OASIS SARIF 2.1.0 Export & PR Merge Gating**: Integrates into GitHub Actions to fail pull requests only on newly introduced Critical/High findings.

---

## Repository Structure

```
d:/7th Semester/OFFAT-X/
├── README.md                          # Main workspace documentation (this file)
├── PROJECT_AND_SCRIPTS_EXPLAINED.md   # Function-by-function architectural guide
├── run_tests.js                       # Interactive and CLI goal-based test runner
├── run_tests.ps1                      # Windows PowerShell test runner wrapper
│
├── offat-x/                           # Core Go Security Testing Engine
│   ├── cmd/offat-x/                   # CLI Entrypoint & Pipeline Orchestrator
│   │   ├── main.go                    # 8-stage execution pipeline
│   │   └── flags.go                   # FlagConfig definition
│   ├── pkg/
│   │   ├── chain/                     # Dependency Graph DAG & BFS Chaining Planner
│   │   ├── rolediff/                  # Four-Tier Role Matrix & Scope Config (offat-x.yml)
│   │   ├── diff/                      # Equation (2) Semantic Response Differ
│   │   ├── remediation/               # Context-Aware Code Remediation Synthesizer
│   │   ├── discovery/                 # DIRB Ephemeral Sandboxed Reconnaissance
│   │   ├── report/                    # OASIS SARIF 2.1.0 & HTML Executive Dashboard
│   │   ├── gate/                      # DevSecOps PR Merge Gating Engine
│   │   ├── scorer/                    # CVSS v3.1 Scoring & Equation (2) Helper
│   │   ├── jwt/                       # JWT Cryptographic Forging & Key Confusion
│   │   ├── graphql/                   # GraphQL Introspection & Query Abuse
│   │   ├── ratelimit/                 # Rate Limiting & Header Spoofing Detector
│   │   ├── parser/                    # OpenAPI 2.0 / 3.x Contract Parser
│   │   └── trunner/                   # Concurrent HTTP Test Runner & Post-Processors
│   ├── .github/actions/offat-x/       # Composite GitHub Action for CI/CD pipelines
│   ├── offat-x.yml                    # Scope allowlist and 4-tier role configuration
│   └── sandbox/vulnerable-api/        # Complete deliberate testbed API (FastAPI)
│
└── Papers/                            # Academic Research & Report Suite
    ├── OFFAT-X_Phase_1_Report.docx    # Validated 1.61 MB college Phase-1 Report
    ├── OFFAT-X_IEEE_Paper.pdf         # Submitted IEEE conference research paper
    ├── offat_full_text.txt            # Complete paper manuscript text
    ├── build_perfect_offatx_report.js # 263-element OpenXML report compiler
    ├── validate_xml.js                # Stack-based XML tag validator
    ├── pack_docx.js                   # Packaging utility from vulnix_original
    └── verify_docx.js                 # ZIP archive unzipping & integrity validator
```

---

## Goal-Based Test Runner

The included test runner allows you to evaluate OFFAT-X based on specific evaluation goals.

### Running with Node.js
```bash
# Interactive selection menu:
node run_tests.js

# Or trigger a specific goal directly:
node run_tests.js --goal=full        # Goal 1: Full 8-Stage Autonomous Scan
node run_tests.js --goal=bola        # Goal 2: BOLA / IDOR Stateful Chaining
node run_tests.js --goal=bfla        # Goal 3: BFLA Administrative Privilege Escalation
node run_tests.js --goal=dirb        # Goal 4: DIRB Shadow API Discovery
node run_tests.js --goal=jwt         # Goal 5: JWT Cryptographic Attacks
node run_tests.js --goal=ratelimit   # Goal 6: Rate Limiting & Header Bypass
node run_tests.js --goal=graphql     # Goal 7: GraphQL Introspection & DoS Abuse
node run_tests.js --goal=ci          # Goal 8: DevSecOps CI/CD PR Merge Gate
node run_tests.js --goal=report      # Goal 9: Reconstruct & Validate Phase-1 DOCX Report
```

### Running with Windows PowerShell
```powershell
.\run_tests.ps1 -Goal bola
.\run_tests.ps1 -Goal report
.\run_tests.ps1
```

---

## Testing Goals Matrix

| Goal | ID | Targeted Flaw / Domain | Core Mechanics & Validated Behavior |
|:---:|:---|:---|:---|
| **1** | `full` | **Full 8-Stage Scan** | Executes Scope Validation $\to$ Spec Ingestion $\to$ DIRB Recon $\to$ DAG Chaining $\to$ Role Diff $\to$ Semantic Diff $\to$ SARIF/HTML Export $\to$ CI Gate. |
| **2** | `bola` | **BOLA / IDOR (API1)** | Traverses DAG via BFS ($L \le 4$), provisions real resource with Owner (Alice), replays as Attacker (Bob), flags exfiltration with $D = 1.00 \ge \tau$. |
| **3** | `bfla` | **BFLA (API5)** | Replays low/guest credentials against admin routes (e.g. `DELETE /admin/users/{id}`) against explicit `offat-x.yml` RBAC rules. |
| **4** | `dirb` | **Shadow APIs (API9)** | Executes dictionary path brute-forcing, diffs active responding routes against OpenAPI contract, and flags unmanaged shadow routes. |
| **5** | `jwt` | **Broken Auth (API2)** | Attempts algorithm `none` stripping, RS256-to-HS256 key confusion, signature truncation, and expired token acceptance. |
| **6** | `ratelimit` | **Rate Limit Abuse (API4)** | Transmits 30 consecutive probes to trigger HTTP 429, then injects rotating `X-Forwarded-For` IPs to confirm header spoofing bypass. |
| **7** | `graphql` | **GraphQL Flaws** | Extracts schema via introspection (types, queries, mutations), tests batch query amplification (DoS), and checks circular depth. |
| **8** | `ci` | **DevSecOps Merge Gate** | Computes structural endpoint fingerprints (`Method:Path:CWE`), compares against baseline, and blocks PR merge only on new Critical/High findings. |
| **9** | `report` | **Academic Report DOCX** | Compiles 263 OpenXML elements, verifies tag balance via `validate_xml.js`, packages `OFFAT-X_Phase_1_Report.docx`, and verifies archive integrity. |

---

## The 5 Core Research Pillars

### 1. Dependency-Aware Stateful Chaining (BFS $L \le 4$)
A Directed Acyclic Graph $G = (V, E)$ is synthesized from OpenAPI operations $O$. When an endpoint requires an existing resource ID (e.g., `GET /orders/{orderId}`), OFFAT-X executes BFS to find the shortest setup sequence originating from an unparameterized producer (e.g., `POST /orders`).
- Setup calls are executed under resource owner credentials.
- The dynamic entity ID is extracted from the JSON response envelope and injected into consumer probes.
- Chains are bounded to depth $L \le 4$, limiting request overhead to $\le 4(L + 3) \le 28$ requests per target.

### 2. Four-Tier Role-Differential Matrix
Tiers form the ordered set $R = \{\text{Guest} < \text{Low} < \text{Premium} < \text{Admin}\}$.
- **Horizontal Replay (Alice vs Bob)**: Identical tier users attempting cross-tenant access $\to$ flags BOLA (CWE-639).
- **Unauthenticated Probing (Guest $\to$ Auth)**: Anonymous requests accessing protected endpoints $\to$ flags Broken Auth (CWE-306).
- **Vertical Escalation (Low $\to$ Admin)**: Ordinary users invoking admin functions $\to$ flags BFLA (CWE-285).
- **Property Escalation (Low $\to$ Premium)**: Ordinary users accessing premium fields $\to$ flags BOPLA (CWE-213).

### 3. Semantic Response Diffing Engine (Equation 2)
Conventional tools trust status codes blindly, generating false alarms when error envelopes return HTTP 200. OFFAT-X evaluates:
$$D = w_k \cdot J + w_o \cdot O + w_s \cdot 1[2xx] - w_e \cdot E(a)$$
Where:
- $J = \frac{|K(a) \cap K(v)|}{|K(a) \cup K(v)|}$ (Jaccard schema key similarity, $w_k = 0.30$)
- $O = \frac{|V(v) \cap V(a)|}{|V(v)|}$ (Owner identifier value overlap, $w_o = 0.50$)
- $1[2xx] = 1$ if status $\in [200, 299]$, else $0$ ($w_s = 0.20$)
- $E(a) = 1$ if response contains error signatures (e.g. `"error"`, `"success": false`), else $0$ ($w_e = 0.60$)
- Threshold $\tau = 0.70$: $D \ge 0.70 \implies$ **CONFIRMED VULNERABLE**; $D < 0.50 \implies$ **SAFE**.

### 4. Ephemeral Sandboxed Reconnaissance (DIRB)
Reconnaissance scripts execute inside hardened ephemeral Docker containers with:
- Dropped Linux capabilities: `--cap-drop=ALL`
- Security options: `--security-opt=no-new-privileges`
- Storage: Read-only root filesystem with ephemeral memory `--tmpfs /tmp:rw,noexec,nosuid,size=64m`

### 5. DevSecOps CI/CD Integration & SARIF 2.1.0 Export
Findings are exported as standardized **OASIS SARIF 2.1.0 JSON** (`offat-x-report.sarif`), pairing each finding with physical locations in the OpenAPI specification and context-aware source code patches. The composite GitHub Action (`.github/actions/offat-x`) compares pull requests against the default branch baseline using structural fingerprints (`Method:Path:CWE`), blocking merges only on newly introduced Critical or High vulnerabilities.

---

## Quickstart Guide

### 1. Configure Target Scope (`offat-x.yml`)
```yaml
target: http://localhost:8000
scope:
  - localhost
  - 127.0.0.1
roles:
  guest:   { auth: none }
  low:     { auth: bearer, token: "eyJhbGciOiJIUz..." }
  admin:   { auth: bearer, token: "eyJhbGciOiJIUz..." }
policy:
  - op: 'DELETE /api/admin/users/{id}'
    allow: [admin]
limits:
  rps: 60
  destructive: false
```

### 2. Execute via CLI
```bash
# Run full scan with stateful chaining and role differential
offat-x -f openapi.json -scope offat-x.yml -chain -rolediff

# Run with DIRB shadow API discovery and SARIF export
offat-x -f openapi.json -scope offat-x.yml --dirb -jwt -bfla -sarif offat-x-report.sarif
```

---

## Benchmark Evaluation Results

| Metric | Baseline OWASP OFFAT | Proposed OFFAT-X | Performance Gain |
|---|:---:|:---:|:---:|
| **Precision** | 0.610 ± 0.021 | **0.941 ± 0.009** | **+54.3%** |
| **Recall** | 0.432 ± 0.018 | **0.912 ± 0.010** | **+111.1%** |
| **F1-Score** | 0.506 ± 0.019 | **0.926 ± 0.008** | **+83.0%** |
| **False Positive Rate (FPR)** | 41.85% | **4.15%** | **-89.9% (False alarm reduction)** |
| **404 Setup Dead-Ends** | 58.2% | **0.0%** | **Zero dead-ends via BFS chaining** |
| **Recon Throughput** | 22 req/s | **50.0 req/s** | **+127.3%** |
| **Full Suite Duration** | 42.1 s | **8.91 s** | **4.7× Faster execution** |
| **Peak Memory Footprint** | 480 MB | **198 MB** | **58.7% Lower memory consumption** |
