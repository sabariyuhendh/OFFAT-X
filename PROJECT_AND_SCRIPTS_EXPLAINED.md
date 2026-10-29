# OFFAT-X: Detailed Function-Wise Architecture & Script Guide

> **A Comprehensive Reference Explaining What the Project Does and How Every Script and Function Works**  
> *Author: Sabari Yuhendhran M, Sadhana M, Jegan S, Dr. Priya A*  
> *Department of Computer Science and Business Systems, KIT – Kalaignarkarunanidhi Institute of Technology*

---

## Table of Contents
1. [Project Overview & Core Problem Statement](#1-project-overview--core-problem-statement)
2. [High-Level Architecture & The 8-Stage Pipeline](#2-high-level-architecture--the-8-stage-pipeline)
3. [Function-by-Function Guide: Core Engine (`offat-x/pkg/`)](#3-function-by-function-guide-core-engine-offat-xpkg)
   - [3.1 Semantic Response Differ (`pkg/diff/differ.go`)](#31-semantic-response-differ-pkgdiffdiffergo)
   - [3.2 Four-Tier Role Matrix & Scope Config (`pkg/rolediff/`)](#32-four-tier-role-matrix--scope-config-pkgrolediff)
   - [3.3 Stateful Dependency Chaining (`pkg/chain/`)](#33-stateful-dependency-chaining-pkgchain)
   - [3.4 Source Code Remediation Synthesizer (`pkg/remediation/remediation.go`)](#34-source-code-remediation-synthesizer-pkgremediationremediationgo)
   - [3.5 Sandboxed Reconnaissance & DIRB Discovery (`pkg/discovery/`)](#35-sandboxed-reconnaissance--dirb-discovery-pkgdiscovery)
   - [3.6 CVSS Scorer & Mathematical Diff Helper (`pkg/scorer/scorer.go`)](#36-cvss-scorer--mathematical-diff-helper-pkgscorerscorergo)
   - [3.7 OASIS SARIF 2.1.0 Standard Exporter (`pkg/report/sarif.go`)](#37-oasis-sarif-210-standard-exporter-pkgreportsarifgo)
   - [3.8 HTML Dashboard & Reporting (`pkg/report/report.go`)](#38-html-dashboard--reporting-pkgreportreportgo)
   - [3.9 DevSecOps CI/CD PR Merge Gating (`pkg/gate/gate.go`)](#39-devsecops-cicd-pr-merge-gating-pkggategatego)
   - [3.10 CLI Orchestrator (`cmd/offat-x/main.go`)](#310-cli-orchestrator-cmdoffat-xmaingo)
4. [Function-by-Function Guide: Report & Paper Suite (`Papers/`)](#4-function-by-function-guide-report--paper-suite-papers)
   - [4.1 Perfect Report Compiler (`build_perfect_offatx_report.js`)](#41-perfect-report-compiler-build_perfect_offatx_reportjs)
   - [4.2 Tag Hierarchy Validator (`validate_xml.js`)](#42-tag-hierarchy-validator-validate_xmljs)
   - [4.3 DOCX Packaging Automation (`pack_docx.js`)](#43-docx-packaging-automation-pack_docxjs)
   - [4.4 DOCX Archive Integrity Verifier (`verify_docx.js`)](#44-docx-archive-integrity-verifier-verify_docxjs)
5. [Function-by-Function Guide: Goal-Based Test Runner (`run_tests.js`)](#5-function-by-function-guide-goal-based-test-runner-run_testsjs)
6. [Summary Checklist of Completed Deliverables](#6-summary-checklist-of-completed-deliverables)

---

## 1. Project Overview & Core Problem Statement

### Why Was OFFAT-X Created?
In modern cloud and microservice architectures, REST APIs handle the vast majority of sensitive business transactions. The OWASP API Security Top 10 (2023) ranks:
1. **BOLA (Broken Object Level Authorization / OWASP API1:2023 / CWE-639)** as the #1 threat.
2. **BFLA (Broken Function Level Authorization / OWASP API5:2023 / CWE-285)** as the #5 threat.

Conventional security testing tools fail when assessing authorization vulnerabilities because:
1. **Status Code Deception**: Unlike syntactic injection bugs (SQLi/XSS) that trigger crashes or 500 errors, authorization bugs return valid **HTTP 200 OK** containing well-formed business objects. Worse, modern frameworks often return `HTTP 200` alongside an error envelope like `{"error": "Unauthorized"}`. Conventional scanners that rely on status codes alone suffer from **40%–60% false-positive rates**.
2. **Stateful 404 Setup Dead-Ends**: A single-request scanner querying `/api/v1/orders/{orderId}` with a random numeric identifier receives `404 Not Found` and learns nothing. Authorization flaws are only visible when an entity has been provisioned first.
3. **Single-Identity Blind Spots**: Single-token scanners cannot detect when low-privileged user Bob can read Alice's data or execute administrative deletion routes.
4. **Host Contamination**: Running third-party brute-force fuzzers directly on CI test runners exposes host environments to compromise.
5. **No Automated Remediation**: Scanners report vulnerabilities without actionable code patches, overwhelming developers with alert fatigue.

### What Does OFFAT-X Do?
OFFAT-X solves these problems by creating a unified, contract-driven testing platform featuring:
- **OpenAPI Directed Graph (DAG) & Breadth-First Search (BFS) Chaining (depth $L \le 4$)** to provision resources before querying consumer routes.
- **Four-Tier Role-Differential Matrix ($R = \{\text{Guest} < \text{Low} < \text{Premium} < \text{Admin}\}$)** to evaluate horizontal and vertical boundaries.
- **Mathematical Semantic Response Diffing (Equation 2)** that evaluates schema keys, identifier values, and error penalties ($D \ge 0.70$).
- **Ephemeral Container Sandboxing** that isolates external utilities inside capability-dropped Docker containers (`--cap-drop=ALL`).
- **OASIS SARIF 2.1.0 Export and GitHub Actions Merge Gating** that blocks pull requests only on new Critical/High findings using structural fingerprints (`Method:Path:CWE`).

---

## 2. High-Level Architecture & The 8-Stage Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            OFFAT-X SCANNING PIPELINE                        │
└─────────────────────────────────────────────────────────────────────────────┘
  [Stage 1] Scope Validation & Role Ingestion (offat-x.yml allowlist)
     │
     ▼
  [Stage 2] OpenAPI Contract Ingestion & Schema Normalization (Kin-OpenAPI)
     │
     ▼
  [Stage 3] Ephemeral Sandboxed Reconnaissance (DIRB in Docker --cap-drop=ALL)
     │
     ▼
  [Stage 4] Dependency Graph Construction G=(V,E) & BFS Chain Planning (L ≤ 4)
     │
     ▼
  [Stage 5] Four-Tier Role Matrix Replay (Guest < Low < Premium < Admin)
     │
     ▼
  [Stage 6] Semantic Response Diffing Engine (Equation 2: D = wk·J + wo·O + ws·1 - we·E)
     │
     ▼
  [Stage 7] CVSS v3.1 Scoring & Context-Aware Code Remediation Synthesis
     │
     ▼
  [Stage 8] DevSecOps Gating: SARIF 2.1.0, HTML Dashboard & PR Merge Gate
```

---

## 3. Function-by-Function Guide: Core Engine (`offat-x/pkg/`)

### 3.1 Semantic Response Differ (`pkg/diff/differ.go`)

This package implements the mathematical diffing engine formulated in Section 4.3.4 of the IEEE Paper and Chapter 4 of the Phase-1 Report.

#### Mathematical Foundation (Equation 2)
$$J = \frac{|K(a) \cap K(v)|}{|K(a) \cup K(v)|} \quad (\text{Jaccard schema key similarity})$$
$$O = \frac{|V(v) \cap V(a)|}{|V(v)|} \quad (\text{Owner identifier value overlap})$$
$$D = w_k \cdot J + w_o \cdot O + w_s \cdot 1[2xx] - w_e \cdot E(a) \quad (\text{Composite Semantic Diff Score})$$

Calibrated weights: $w_k = 0.30, w_o = 0.50, w_s = 0.20, w_e = 0.60$, with decision threshold $\tau = 0.70$.

#### Functions:

- `DefaultWeights() Weights`
  - **Purpose**: Returns the empirically calibrated weights ($w_k=0.30, w_o=0.50, w_s=0.20, w_e=0.60, \tau=0.70$) established across multi-target benchmarks.
  - **Inputs**: None.
  - **Outputs**: `Weights` struct.

- `NewDiffer(w Weights) *Differ`
  - **Purpose**: Initializes a new Differ instance. If invalid weights or zero threshold are passed, automatically falls back to `DefaultWeights()`.
  - **Inputs**: `w Weights`.
  - **Outputs**: `*Differ` pointer.

- `(d *Differ) Evaluate(baselineBody string, attackerBody string, attackerStatus int) DiffResult`
  - **Purpose**: Core evaluation function comparing an attacker's response against the owner's baseline response.
  - **Step 1**: Tests attacker body for error signatures via `DetectErrorSignature()`. Sets $E(a) = 1$ if present.
  - **Step 2**: Extracts recursive schema keys $K(v)$ and $K(a)$ via `extractJSONKeys()`. Computes Jaccard key similarity $J$.
  - **Step 3**: Extracts identifying values $V(v)$ and $V(a)$ via `extractIdentifyingValues()`. Computes owner value overlap ratio $O$.
  - **Step 4**: Computes composite score $D = (w_k \cdot J) + (w_o \cdot O) + (w_s \cdot 1[2xx]) - (w_e \cdot E(a))$.
  - **Step 5**: Classifies verdict:
    - If $D \ge \tau$ (0.70): `CONFIRMED VULNERABLE` (`IsVulnerable = true`).
    - If $0.50 \le D < \tau$: `SUSPECTED VULNERABLE` (`IsVulnerable = true`).
    - If $D < 0.50$: `SAFE / NOT VULNERABLE` (`IsVulnerable = false`).
  - **Outputs**: `DiffResult` struct with full analytical metrics.

- `DetectErrorSignature(body string) bool`
  - **Purpose**: Scans response text against a compiled array of regexes detecting error envelopes inside HTTP 200 responses (e.g. `"success": false`, `"error": "Unauthorized"`, `"access denied"`).
  - **Inputs**: `body string`.
  - **Outputs**: `true` if an error envelope is detected, triggering the penalty $w_e$.

- `extractJSONKeys(body string) map[string]bool`
  - **Purpose**: Unmarshals JSON and recursively traverses nested objects and arrays to extract flattened key paths (e.g. `user.address.zipcode`).
  - **Inputs**: `body string`.
  - **Outputs**: Set of string key paths.

- `collectKeys(prefix string, val interface{}, keys map[string]bool)`
  - **Purpose**: Recursive traversal helper for `extractJSONKeys()`. Handles maps and arrays.

- `extractIdentifyingValues(body string) map[string]bool`
  - **Purpose**: Recursively searches JSON payloads for sensitive identifying properties (keys containing `id`, `uuid`, `key`, `email`, `user`, `order`) and string/numeric scalars.
  - **Inputs**: `body string`.
  - **Outputs**: Set of identifier values belonging to the owner.

- `collectIdentifyingValues(keyName string, val interface{}, vals map[string]bool)`
  - **Purpose**: Recursive traversal helper for `extractIdentifyingValues()`.

---

### 3.2 Four-Tier Role Matrix & Scope Config (`pkg/rolediff/`)

Implements the privilege hierarchy $R = \{\text{Guest} < \text{Low} < \text{Premium} < \text{Admin}\}$ and Table II decision path.

#### Files:
- [`config.go`](file:///d:/7th%20Semester/OFFAT-X/offat-x/pkg/rolediff/config.go)
- [`matrix.go`](file:///d:/7th%20Semester/OFFAT-X/offat-x/pkg/rolediff/matrix.go)

#### Functions in `config.go`:

- `LoadScopeConfig(filePath string) (*ScopeConfig, error)`
  - **Purpose**: Reads and parses `offat-x.yml` (YAML format), loading target URLs, scope allowlist arrays, role tokens, explicit RBAC policies, and rate limits.
  - **Validation**: Automatically invokes `ValidateScope()`. If the target host violates scope boundaries, halts immediately to protect unauthorized networks.

- `(cfg *ScopeConfig) ValidateScope() error`
  - **Purpose**: Parses the target hostname and verifies that it exists in the `scope` allowlist array (or matches a subdomain).
  - **Outputs**: `nil` if permitted; error if target is out-of-scope.

- `(ra *RoleAuth) GetHeader() (string, string)`
  - **Purpose**: Converts a role's authentication specification into an HTTP header key-value pair.
  - **Logic**: If `auth: bearer`, reads `token` directly or pulls from the environment variable specified in `env` (e.g. `LOW_TOKEN`), prepending `Bearer ` if needed.
  - **Outputs**: `("Authorization", "Bearer <token>")`.

- `(cfg *ScopeConfig) IsAllowedByPolicy(method, path, roleName string) (explicitMatch bool, isAllowed bool)`
  - **Purpose**: Evaluates whether an explicit policy rule in `offat-x.yml` (e.g. `- { op: 'DELETE /api/admin/users/{id}', allow: [admin] }`) authorizes `roleName`.
  - **Supports**: Exact operation matches (`DELETE /path`), wildcard paths (`/api/admin/*`), and path-only matches.

#### Functions in `matrix.go`:

- `NewEvaluator(cfg *ScopeConfig) *Evaluator`
  - **Purpose**: Creates a matrix evaluator coupled with the `offat-x.yml` policies and the Equation (2) Semantic Differ.

- `(e *Evaluator) EvaluateComparison(...) RoleDifferentialResult`
  - **Purpose**: Executes the classification rules of Table II:
    1. **Unauthenticated Check**: If `attackerRole == "guest"` and target is an authenticated resource, flags **Broken Authentication (OWASP API2 / CWE-306)** with CVSS 9.8.
    2. **Vertical Escalation Check (BFLA)**: If Low or Guest role invokes an administrative route denied by explicit policy (or inferred provisional policy) and receives HTTP 2xx with valid data, flags **Confirmed/Suspected BFLA (OWASP API5 / CWE-285)** with CVSS 8.5.
    3. **Horizontal Cross-Tenant Check (BOLA)**: If Low-tier attacker Bob requests Low-tier owner Alice's resource and receives Alice's data ($D \ge \tau$), flags **Confirmed BOLA (OWASP API1 / CWE-639)** with CVSS 8.6.
    4. **Property Escalation Check (BOPLA)**: If Low-tier user receives premium-only fields, flags **BOPLA (OWASP API3 / CWE-213)** with CVSS 5.3.

- `GenerateRoleTestPairs(...)`
  - **Purpose**: Generates pairwise test combinations across available roles (Horizontal: `low` vs `low_secondary`; Unauthenticated: `low` vs `guest`; Vertical: `admin` vs `low`).

---

### 3.3 Stateful Dependency Chaining (`pkg/chain/`)

Implements Algorithm 1 from the IEEE paper, synthesizing a Directed Acyclic Graph $G = (V, E)$ to eliminate 404 setup dead-ends.

#### Files:
- [`dag.go`](file:///d:/7th%20Semester/OFFAT-X/offat-x/pkg/chain/dag.go)
- [`planner.go`](file:///d:/7th%20Semester/OFFAT-X/offat-x/pkg/chain/planner.go)
- [`executor.go`](file:///d:/7th%20Semester/OFFAT-X/offat-x/pkg/chain/executor.go)

#### Functions in `dag.go`:

- `BuildDependencyGraph(docParams []*parser.DocHttpParams) *DependencyGraph`
  - **Purpose**: Synthesizes $G = (V, E)$ where vertices $V$ are API operations and directed edges $(p, c) \in E$ connect producer operations to consumer operations.
  - **Producer Detection**: POST operations on resource routes (e.g. `POST /api/v1/orders`) produce entities of type `order`.
  - **Consumer Detection**: Operations with path templates containing parameters (e.g. `/api/v1/orders/{orderId}`) consume entity of type `order`.
  - **Prioritization**: Edge weights prioritize `POST` (weight 1) over `PUT`/`PATCH` (weight 2) to ensure fresh entities are created.

- `inferResourceType(paramName, path string) ResourceType`
  - **Purpose**: Maps parameter names (`orderId`, `vehicle_id`, `id`) and preceding path segments to normalized resource types (e.g. `"order"`, `"vehicle"`, `"user"`).

- `inferProducedResourceType(path string) ResourceType`
  - **Purpose**: Derives the resource type produced by a creation endpoint by singularizing the collection path segment (e.g. `/orders` $\to$ `"order"`).

#### Functions in `planner.go`:

- `NewPlanner(g *DependencyGraph, maxDepth int) *Planner`
  - **Purpose**: Initializes the BFS planner. Automatically bounds search depth to $L \le 4$ steps to strictly constrain request complexity to $\le 4(L + 3) \le 28$ requests per target.

- `(p *Planner) FindSetupChain(target *OperationNode) ExecutionChain`
  - **Purpose**: Executes Breadth-First Search (BFS) starting from target consumer $t$ backwards to find the shortest prerequisite sequence originating from an unparameterized producer.
  - **Outputs**: `ExecutionChain` struct containing the ordered prerequisite steps.

- `(p *Planner) PlanAllChains() []ExecutionChain`
  - **Purpose**: Iterates over all consumer nodes in $G$ and computes setup chains for every endpoint requiring resource IDs.

- `(c *ExecutionChain) SummaryString() string`
  - **Purpose**: Formats a readable chain summary (e.g. `Chain [Depth 1]: POST /api/orders → GET /api/orders/{id}`).

#### Functions in `executor.go`:

- `NewChainExecutor(baseURL string, scopeCfg *rolediff.ScopeConfig) *ChainExecutor`
  - **Purpose**: Creates an executor with zero-allocation `fasthttp` client, configured role tokens, and Equation (2) diffing engine.

- `(ce *ChainExecutor) ExecuteStatefulBOLA(chain ExecutionChain, ownerRole, attackerRole string) ChainedTestResult`
  - **Purpose**: Executes the 5-step stateful BOLA evaluation sequence:
    1. Executes prerequisite setup steps using **owner credentials** (e.g. Alice).
    2. Extracts the newly assigned dynamic resource ID from the JSON response envelope via `extractIDFromJSON()`.
    3. Replaces parameter placeholders in the consumer target URL (e.g. `/orders/{id}` $\to$ `/orders/1042`).
    4. Queries target as **owner** (Alice) to capture owner baseline response $v$.
    5. Replays target as **attacker** (Bob) to capture attacker response $a$.
    6. Submits $(v, a)$ to the Semantic Differ. If $D \ge 0.70$, flags Confirmed BOLA with CVSS 8.6.
  - **Fault Tolerance**: If setup fails (e.g. 400 Bad Request), marks test `INCONCLUSIVE` rather than `Negative`, preventing false assurance.

- `extractIDFromJSON(body string) string`
  - **Purpose**: Inspects JSON response envelopes for primary entity keys (`id`, `orderId`, `userId`, `vehicleId`, `uuid`, `token`) at both top-level and nested `data` wrappers.

- `injectParamIntoPath(templatePath, idVal string) string`
  - **Purpose**: Replaces `{id}`, `{orderId}`, etc., in the URL template with the extracted live ID value.

---

### 3.4 Source Code Remediation Synthesizer (`pkg/remediation/remediation.go`)

Synthesizes context-aware before-and-after source code patches for detected vulnerabilities (Listing 2 of the paper).

#### Functions:

- `GenerateDirective(cwe, owaspCategory, endpoint, method string) Directive`
  - **Purpose**: Analyzes vulnerability metadata and synthesizes a concrete, language-appropriate code patch:
    - **BOLA (CWE-639 / OWASP API1)**: Generates Prisma/SQL query patch enforcing tenant isolation (`where: { id: req.params.id, userId: currentUser.id }`).
    - **BFLA (CWE-285 / OWASP API5)**: Generates Express.js RBAC route middleware checking user tier (`router.use('/admin', requireRole('ADMIN'))`).
    - **JWT (CWE-347 / OWASP API2)**: Generates strict algorithm allowlist patch (`jwt.verify(token, key, { algorithms: ['RS256'] })`) to defeat `none` algorithm stripping.
    - **Missing Auth (CWE-306 / OWASP API2)**: Generates authentication middleware attachment.
    - **Rate Limiting (CWE-799 / OWASP API4)**: Generates socket IP-based rate limiter configuration (`express-rate-limit`).
    - **Shadow API (CWE-200 / OWASP API9)**: Generates OpenAPI specification schema registration snippet and API gateway block directive.
  - **Outputs**: `Directive` struct with `VulnerableSnippet`, `FixedSnippet`, and `Rationale`.

---

### 3.5 Sandboxed Reconnaissance & DIRB Discovery (`pkg/discovery/`)

Discovers undocumented routes and Shadow APIs (OWASP API9:2023) by brute-forcing dictionary paths inside hardened Docker containers.

#### Files:
- [`dirb.go`](file:///d:/7th%20Semester/OFFAT-X/offat-x/pkg/discovery/dirb.go)
- [`compare.go`](file:///d:/7th%20Semester/OFFAT-X/offat-x/pkg/discovery/compare.go)

#### Functions:

- `RunSandboxedDirb(targetURL string, wordlistPath string) ([]string, error)`
  - **Purpose**: Formally implements Section 4.3.5 and Appendix A.5. Executes DIRB inside an ephemeral Docker container with:
    - `--cap-drop=ALL` (drops all Linux root capabilities)
    - `--security-opt=no-new-privileges` (prevents privilege escalation)
    - `--read-only` (read-only root filesystem prevents persistence)
    - `--tmpfs /tmp:rw,noexec,nosuid,size=64m` (in-memory temporary storage)
  - **Outputs**: String array of discovered live endpoints.

- `(s Scanner) Run() DirbResult`
  - **Purpose**: High-throughput concurrent probe runner. If Docker is unavailable, seamlessly falls back to Go-native concurrent HTTP probes with rate limiting.

- `BuildComparisonReport(knownPaths []string, discovered []DiscoveredEndpoint) ComparisonReport`
  - **Purpose**: Compares discovered responding routes against the OpenAPI specification paths.
  - **Classification**: Responding routes that are absent from the OpenAPI contract are flagged as **Undocumented Shadow APIs (CWE-200 / API9)**.

- `PrintComparisonSummary(report ComparisonReport)`
  - **Purpose**: Outputs an ANSI-formatted discovery summary displaying documented vs undocumented routes and overall Shadow API risk level.

---

### 3.6 CVSS Scorer & Mathematical Diff Helper (`pkg/scorer/scorer.go`)

Calculates CVSS v3.1 base scores, maps findings to OWASP API Top 10 categories, and exposes the mathematical diffing function.

#### Functions:

- `ComputeSemanticDiff(schemaOverlap float64, valueOverlap float64, is2xx bool, hasError bool) (float64, bool)`
  - **Purpose**: Direct mathematical implementation of Equation (2) matching Appendix A.4 of the research paper:
    $$D = 0.30 \cdot \text{schemaOverlap} + 0.50 \cdot \text{valueOverlap} + 0.20 \cdot 1[2xx] - 0.60 \cdot \text{errorPenalty}$$
  - **Outputs**: `(D float64, isVulnerable bool)` where `isVulnerable = (D >= 0.70)`.

- `ScoreFinding(testName string) VulnScore`
  - **Purpose**: Returns baseline CVSS v3.1 scores, severity strings, CWE IDs, and OWASP Top 10 tags for any test name.

- `SeverityFromCVSS(cvss float64) string`
  - **Purpose**: Maps numeric CVSS scores to qualitative ratings: $\ge 9.0 \to \text{CRITICAL}$, $\ge 7.0 \to \text{HIGH}$, $\ge 4.0 \to \text{MEDIUM}$, $> 0 \to \text{LOW}$.

- `SortBySeverity(severity string) int`
  - **Purpose**: Provides numeric sorting priority (`CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4`) for reports.

---

### 3.7 OASIS SARIF 2.1.0 Standard Exporter (`pkg/report/sarif.go`)

Generates official OASIS SARIF 2.1.0 JSON format reports (`offat-x-report.sarif`) for GitHub Code Scanning and IDE integration.

#### Functions:

- `GenerateSARIF(tests []*tgen.ApiTest, specPath, version string) ([]byte, error)`
  - **Purpose**: Transforms raw test findings into valid OASIS SARIF 2.1.0 JSON:
    - **Rules Array**: Registers tool rules (`OFFATX-639`, `OFFATX-285`, etc.) with full markdown descriptions, CWE help links, and CVSS metadata.
    - **Results Array**: Populates findings with level (`error`, `warning`, `note`), exact physical file URI (`openapi.json`), structural endpoint fingerprints, and inline code remediation snippets.
  - **Outputs**: Formatted SARIF JSON byte slice.

---

### 3.8 HTML Dashboard & Reporting (`pkg/report/report.go`)

Generates executive web dashboards, terminal ASCII tables, and JSON reports.

#### Functions:

- `Report(tests []*tgen.ApiTest) ([]byte, error)`
  - **Purpose**: Serializes all test results into indented JSON (`offat-x-output.json`).

- `BuildSummary(tests []*tgen.ApiTest) Summary`
  - **Purpose**: Aggregates total assertions, vulnerable count, data leaks, and counts across Critical, High, Medium, and Low severity tiers.

- `Table(tests []*tgen.ApiTest, _ interface{})`
  - **Purpose**: Renders an ANSI color-coded summary table directly in the terminal sorted by severity descending.

- `HTMLReport(tests []*tgen.ApiTest, toolVersion string) []byte`
  - **Purpose**: Generates a self-contained, responsive HTML5 executive security report (`offat-x-report.html`) featuring six summary metric cards, colored severity badges, endpoint tables, and source code remediation guidance.

- `DiscoveryReport(dirbResult interface{}, comparison interface{}) ([]byte, error)`
  - **Purpose**: Serializes DIRB Shadow API discovery results and contract comparison metrics into `offat-x-discovery.json`.

---

### 3.9 DevSecOps CI/CD PR Merge Gating (`pkg/gate/gate.go`)

Provides automated pull request merge gating for GitHub Actions and CI pipelines.

#### Functions:

- `Fingerprint(t *tgen.ApiTest) string`
  - **Purpose**: Calculates a stable structural endpoint fingerprint: `Method:Path:CWE` (e.g. `GET:/api/v1/orders/{id}:CWE-639`).
  - **Benefit**: Ensures renames or payload variations do not cause alert fatigue by matching findings structurally.

- `EvaluateGate(currentTests []*tgen.ApiTest, baselineFilePath string, failCondition string) GateSummary`
  - **Purpose**: Evaluates pull request findings against a default-branch baseline report:
    1. Loads baseline fingerprints from `baselineFilePath`.
    2. Identifies newly introduced findings not present in baseline.
    3. Evaluates `failCondition`:
       - `high-new`: Fails PR only if **new** Critical or High vulnerabilities are introduced.
       - `critical-new`: Fails PR only if **new** Critical vulnerabilities are introduced.
       - `any-new`: Fails PR if any new vulnerability is introduced.
  - **Outputs**: `GateSummary` struct with `Passed` boolean and failure reasons.

- `PrintGateReport(summary GateSummary)`
  - **Purpose**: Prints an ANSI-formatted CI gate summary box in terminal logs showing baseline vs new vulnerabilities and status (`[PASSED]` / `[BLOCKED]`).

---

### 3.10 CLI Orchestrator (`cmd/offat-x/main.go`)

Connects all 8 sequential stages into an autonomous executable.

#### Functions:

- `banner()`: Prints the ASCII banner displaying active testing suites.
- `main()`:
  - **Stage 1**: Parses CLI flags, validates scope against `offat-x.yml`, and extracts role tokens.
  - **Stage 2**: Ingests and normalizes OpenAPI 2.0 / 3.x contract via Kin-OpenAPI.
  - **Stage 3**: Deploys ephemeral DIRB container sandbox and detects Shadow APIs.
  - **Stage 4**: Synthesizes DAG $G=(V, E)$ and computes BFS setup chains ($L \le 4$).
  - **Stage 5**: Replays stateful chains across the 4-tier role matrix ($R$).
  - **Stage 6**: Executes specialized attack batteries (JWT, BFLA, Injection, Rate Limit, GraphQL).
  - **Stage 7**: Scores all responses via Equation (2) Semantic Differ and generates code remediation.
  - **Stage 8**: Exports JSON, HTML, and SARIF reports; evaluates CI merge gate (`os.Exit(1)` on block).
- `runGraphQLTests(endpoint string, headers map[string]string)`: Executes GraphQL introspection and batching abuse tests.
- `runRateLimitTests(...)`: Probes endpoints with high-frequency request bursts to detect HTTP 429 and header bypasses.

---

## 4. Function-by-Function Guide: Report & Paper Suite (`Papers/`)

### 4.1 Perfect Report Compiler (`build_perfect_offatx_report.js`)

Compiles the complete 263-element OpenXML document for `OFFAT-X_Phase_1_Report.docx`.

#### Functions:

- `esc(str)`
  - **Purpose**: Escapes special XML characters (`&` $\to$ `&amp;`, `<` $\to$ `&lt;`, `>` $\to$ `&gt;`, `"` $\to$ `&quot;`, `'` $\to$ `&apos;`).
  - **Inputs**: Raw text string.
  - **Outputs**: Escaped XML-safe string.

- `makePara(text, options)`
  - **Purpose**: Constructs a complete OpenXML `<w:p>` paragraph with typography options:
    - Alignment: `align: 'both'` (100% justified), `'center'`, `'left'`.
    - Font Family: `fontFamily: 'Times New Roman'` or `'Consolas'` for code.
    - Font Size: `fontSize: 24` (12pt body), `28` (14pt chapter headings), `19` (9.5pt code).
    - Line Spacing: `lineSpacing: 360` (1.5 line spacing), `240` (1.0 single spacing).
    - Paragraph Spacing: `spaceBefore`, `spaceAfter`.
    - Page Breaks: `pageBreakBefore: true`.
    - Section Breaks: `sectPr` embedding.
  - **Outputs**: Valid `<w:p>...</w:p>` XML string.

- `makeTable(data, colWidths)`
  - **Purpose**: Constructs a centered OpenXML table matching Anna University thesis styling:
    - Inserts `<w:tblPr>`, single borders, and 120/160 dxa cell padding.
    - Sets `<w:gridCol>` column widths.
    - Formats header row with `<w:tblHeader/>` and bold 11pt centered text.
    - Formats alternating data rows with 10.5pt justified/left text.
  - **Outputs**: Valid `<w:tbl>...</w:tbl>` XML string.

- **Assembly & Section Break Management**:
  - Extracts the 3 authentic section properties from `vulnix_pristine/word/document.xml`:
    - `sectPr1`: Applied after Declaration (ends Roman numeral front matter section 1).
    - `sectPr2`: Applied after Abbreviations (ends Roman numeral front matter section 2).
    - `sectPr3`: Final document section break.
  - Assembles all chapters: Cover page, Bonafide certificate, Declaration, Acknowledgement, Abstract, Table of Contents, List of Figures, List of Tables, Abbreviations, Chapters 1–7, References, Publications, Appendix A, Appendix B.
  - Recombines with `<w:body>` head and tail into `vulnix_original/word/document.xml`.

---

### 4.2 Tag Hierarchy Validator (`validate_xml.js`)

#### Functions & Logic:
- Reads `vulnix_original/word/document.xml`.
- Implements a stack-based XML tag validator using regex: `/<\/?([a-zA-Z0-9_:]+)(?:\s[^>]*)?(\/?)>/g`.
- Skips self-closing tags (`<w:br/>`).
- Pushes opening tags to the validation stack.
- On encountering a closing tag `</tag>`, pops stack and verifies exact matching.
- **Result**: Confirms 0 errors, 0 unclosed tags, and 100% valid XML across all 629,600 characters.

---

### 4.3 DOCX Packaging Automation (`pack_docx.js`)

#### Functions & Logic:
- Unlinks any existing `OFFAT-X_Phase_1_Report.docx`.
- Calls Windows PowerShell `.NET System.IO.Compression.ZipFile::CreateFromDirectory()` to compress `vulnix_original/` into a pristine DOCX archive.
- Automatically triggers `verify_docx.js` to confirm archive integrity.

---

### 4.4 DOCX Archive Integrity Verifier (`verify_docx.js`)

#### Functions & Logic:
- Checks file existence and verifies size (~1.61 MB).
- Unzips the DOCX archive to a temporary folder `temp_verify/`.
- Verifies that `temp_verify/word/document.xml` can be extracted and read without corruption.
- Cleans up temporary files and logs confirmation.

---

## 5. Function-by-Function Guide: Goal-Based Test Runner (`run_tests.js`)

`run_tests.js` provides an interactive and CLI-driven test runner allowing researchers and developers to evaluate specific testing goals.

### Functions:

- `banner()`: Prints the CLI header.
- `checkGoInstalled()`: Detects if Go is available on PATH.
- `runFullScan()` (**Goal 1**):
  - Ingests `openapi.json`, validates scope against `offat-x.yml`, and triggers the full 8-stage autonomous pipeline.
- `runBolaTest()` (**Goal 2**):
  - Traverses the OpenAPI DAG, provisions order #1042 with owner Alice, replays request with attacker Bob, computes Equation (2) score $D = 1.00 \ge \tau$, and outputs the synthesized Prisma code fix.
- `runBflaTest()` (**Goal 3**):
  - Replays Low and Guest tokens against administrative routes (`DELETE /admin/users/{id}`), verifies violations against `offat-x.yml` policies, and generates the Express RBAC patch.
- `runDirbTest()` (**Goal 4**):
  - Brute-forces dictionary paths, compares responding routes against the OpenAPI contract, and flags unmanaged Shadow APIs (e.g. `/api/v1/debug/heap-dump`).
- `runJwtTest()` (**Goal 5**):
  - Executes algorithm "none" stripping, RS256/HS256 key confusion, and expired token acceptance attacks against bearer auth routes.
- `runRateLimitTest()` (**Goal 6**):
  - Transmits 30 consecutive requests, triggers HTTP 429, and injects rotating `X-Forwarded-For` IPs to confirm client-side header spoofing bypasses.
- `runGraphqlTest()` (**Goal 7**):
  - Executes `__schema` introspection, batch query amplification, and circular recursive depth fuzzing.
- `runCiGateTest()` (**Goal 8**):
  - Simulates a GitHub Actions pull request scan, compares findings against a baseline report using structural fingerprints (`Method:Path:CWE`), and verifies gating logic (`fail-on: high-new`).
- `runReportRebuild()` (**Goal 9**):
  - Compiles OpenXML via `build_perfect_offatx_report.js`, validates tag balance via `validate_xml.js`, packages DOCX via `pack_docx.js`, and verifies archive integrity via `verify_docx.js`.
- `showMenu()`:
  - Renders an interactive command-line selection menu prompting the user to select any goal from `[1-9]` or exit `[0]`.

---

## 6. Summary Checklist of Completed Deliverables

| Deliverable | Path | Status | Verification |
|---|---|:---:|---|
| **Root Workspace Documentation** | [`README.md`](file:///d:/7th%20Semester/OFFAT-X/README.md) | ✅ Complete | Formatted with project overview, runner guide, 5 pillars, and benchmarks. |
| **Architectural Function Guide** | [`PROJECT_AND_SCRIPTS_EXPLAINED.md`](file:///d:/7th%20Semester/OFFAT-X/PROJECT_AND_SCRIPTS_EXPLAINED.md) | ✅ Complete | Exhaustive function-by-function guide covering every engine package and script. |
| **Goal-Based Node.js Runner** | [`run_tests.js`](file:///d:/7th%20Semester/OFFAT-X/run_tests.js) | ✅ Verified | Tested with `--goal=report` and `--goal=bola` (100% exit code 0). |
| **Goal-Based PowerShell Runner** | [`run_tests.ps1`](file:///d:/7th%20Semester/OFFAT-X/run_tests.ps1) | ✅ Verified | Native Windows terminal wrapper for goal-based testing. |
| **Stateful Chaining Engine** | [`pkg/chain/`](file:///d:/7th%20Semester/OFFAT-X/offat-x/pkg/chain/) | ✅ Complete | DAG synthesis, BFS planner ($L \le 4$), stateful setup executor. |
| **4-Tier Role Matrix Engine** | [`pkg/rolediff/`](file:///d:/7th%20Semester/OFFAT-X/offat-x/pkg/rolediff/) | ✅ Complete | Scope config, target allowlisting, Table II classification rules. |
| **Semantic Response Differ** | [`pkg/diff/`](file:///d:/7th%20Semester/OFFAT-X/offat-x/pkg/diff/) | ✅ Complete | Equation (2) implementation and unit tests in `differ_test.go`. |
| **Code Remediation Synthesizer** | [`pkg/remediation/`](file:///d:/7th%20Semester/OFFAT-X/offat-x/pkg/remediation/) | ✅ Complete | Context-aware before-and-after source code patches. |
| **OASIS SARIF 2.1.0 Exporter** | [`pkg/report/sarif.go`](file:///d:/7th%20Semester/OFFAT-X/offat-x/pkg/report/sarif.go) | ✅ Complete | Export format for GitHub Code Scanning and IDEs. |
| **DevSecOps PR Merge Gate** | [`pkg/gate/`](file:///d:/7th%20Semester/OFFAT-X/offat-x/pkg/gate/) | ✅ Complete | Structural endpoint fingerprinting and baseline diff gating. |
| **Composite GitHub Action** | [`.github/actions/offat-x/`](file:///d:/7th%20Semester/OFFAT-X/offat-x/.github/actions/offat-x/) | ✅ Complete | Reusable CI action implementing Listing 3 from the paper. |
| **Scope Configuration File** | [`offat-x.yml`](file:///d:/7th%20Semester/OFFAT-X/offat-x/offat-x.yml) | ✅ Complete | Ready-to-use template implementing Listing 1. |
| **Academic Phase-1 DOCX Report** | [`Papers/OFFAT-X_Phase_1_Report.docx`](file:///d:/7th%20Semester/OFFAT-X/Papers/OFFAT-X_Phase_1_Report.docx) | ✅ Verified | 1.61 MB archive, 100% valid XML tags, uncorrupted and verified. |
