const fs = require('fs');
const path = require('path');

const xml = fs.readFileSync(path.join(__dirname, 'vulnix_original', 'word', 'document.xml'), 'utf8');

// Helper to escape XML
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Split into elements inside w:body
const startBodyIdx = xml.indexOf('<w:body>') + '<w:body>'.length;
const endBodyIdx = xml.lastIndexOf('</w:body>');
const head = xml.substring(0, startBodyIdx);
const tail = xml.substring(endBodyIdx);
const bodyContent = xml.substring(startBodyIdx, endBodyIdx);

const elementRegex = /<(w:p|w:tbl|w:sectPr)(?:\s[^>]*)?>.*?<\/\1>|<w:sectPr(?:\s[^>]*)?\/>/gs;
let match;
let elements = [];
while ((match = elementRegex.exec(bodyContent)) !== null) {
  elements.push(match[0]);
}

console.log(`Loaded ${elements.length} original elements from Vulnix AI report.`);

// In-place paragraph updater: keeps pPr and rPr intact!
function updatePara(idx, newText) {
  if (idx < 0 || idx >= elements.length) return;
  const pXml = elements[idx];
  const pTagMatch = pXml.match(/^<w:p(?:\s[^>]*)?>/);
  let pTag = pTagMatch ? pTagMatch[0] : '<w:p>';
  if (pTag.endsWith('/>')) pTag = pTag.slice(0, -2) + '>';
  const pPrMatch = pXml.match(/<w:pPr(?:\s[^>]*)?>.*?<\/w:pPr>/s);
  const pPr = pPrMatch ? pPrMatch[0] : '';
  const rPrMatch = pXml.match(/<w:rPr(?:\s[^>]*)?>.*?<\/w:rPr>/s);
  const rPr = rPrMatch ? rPrMatch[0] : '';

  elements[idx] = `${pTag}${pPr}<w:r>${rPr}<w:t xml:space="preserve">${esc(newText)}</w:t></w:r></w:p>`;
}

// In-place table updater: keeps tblPr, tblGrid, trPr, and tcPr intact!
function updateTable(idx, rowData) {
  if (idx < 0 || idx >= elements.length) return;
  const tblXml = elements[idx];
  const tblPrMatch = tblXml.match(/<w:tblPr(?:\s[^>]*)?>.*?<\/w:tblPr>/s);
  const tblPr = tblPrMatch ? tblPrMatch[0] : '';
  const tblGridMatch = tblXml.match(/<w:tblGrid(?:\s[^>]*)?>.*?<\/w:tblGrid>/s);
  const tblGrid = tblGridMatch ? tblGridMatch[0] : '';

  const trMatches = tblXml.match(/<w:tr(?:\s[^>]*)?>.*?<\/w:tr>/gs) || [];
  if (trMatches.length === 0) return;

  const headerTr = trMatches[0];
  const sampleDataTr = trMatches.length > 1 ? trMatches[1] : trMatches[0];

  function formatTr(templateTr, cellTexts, isHeader = false) {
    const trTagMatch = templateTr.match(/^<w:tr(?:\s[^>]*)?>/);
    const trTag = trTagMatch ? trTagMatch[0] : '<w:tr>';
    const trPrMatch = templateTr.match(/<w:trPr(?:\s[^>]*)?>.*?<\/w:trPr>/s);
    const trPr = trPrMatch ? trPrMatch[0] : '';
    const tcMatches = templateTr.match(/<w:tc(?:\s[^>]*)?>.*?<\/w:tc>/gs) || [];

    let outTr = `${trTag}${trPr}`;
    for (let c = 0; c < cellTexts.length; c++) {
      const cellText = cellTexts[c];
      const templateTc = tcMatches[c] || tcMatches[tcMatches.length - 1];
      const tcTagMatch = templateTc.match(/^<w:tc(?:\s[^>]*)?>/);
      const tcTag = tcTagMatch ? tcTagMatch[0] : '<w:tc>';
      const tcPrMatch = templateTc.match(/<w:tcPr(?:\s[^>]*)?>.*?<\/w:tcPr>/s);
      const tcPr = tcPrMatch ? tcPrMatch[0] : '';
      const pPrMatch = templateTc.match(/<w:pPr(?:\s[^>]*)?>.*?<\/w:pPr>/s);
      const pPr = pPrMatch ? pPrMatch[0] : '';
      const rPrMatch = templateTc.match(/<w:rPr(?:\s[^>]*)?>.*?<\/w:rPr>/s);
      const rPr = rPrMatch ? rPrMatch[0] : '';

      outTr += `${tcTag}${tcPr}<w:p>${pPr}<w:r>${rPr}<w:t xml:space="preserve">${esc(cellText)}</w:t></w:r></w:p></w:tc>`;
    }
    outTr += '</w:tr>';
    return outTr;
  }

  let newTbl = `<w:tbl>${tblPr}${tblGrid}`;
  // Header row
  if (rowData.length > 0) {
    newTbl += formatTr(headerTr, rowData[0], true);
  }
  // Data rows
  for (let r = 1; r < rowData.length; r++) {
    newTbl += formatTr(sampleDataTr, rowData[r], false);
  }
  newTbl += '</w:tbl>';
  elements[idx] = newTbl;
}

// Clear paragraph text
function clearPara(idx) {
  updatePara(idx, '');
}

console.log('Applying exact content replacement for OFFAT-X...');

// ==========================================
// 1. COVER / TITLE PAGE (0 - 23)
// ==========================================
// E0: Drawing rId7 (KIT Logo) - KEEP!
updatePara(1, 'OFFAT-X: A SANDBOXED, DEPENDENCY-AWARE AND ROLE-DIFFERENTIAL FRAMEWORK');
updatePara(2, 'FOR AUTOMATED AUTHORIZATION TESTING');
updatePara(3, 'OF REST APIS');
updatePara(5, 'PROJECT PHASE - I REPORT');
updatePara(6, 'Submitted by');
updatePara(8, 'SABARI YUHENDRAN M               [711523BCB045]');
updatePara(9, 'SADHANA M                        [711523BCB046]');
updatePara(10, 'JEGAN S                          [711523BCB024]');
updatePara(11, 'in partial fulfillment for the award of the degree');
updatePara(12, 'of');
updatePara(13, 'BACHELOR OF TECHNOLOGY');
updatePara(14, 'IN');
updatePara(15, 'COMPUTER SCIENCE AND BUSINESS SYSTEMS');
updatePara(16, 'KIT-KALAIGNARKARUNANIDHI INSTITUTE OF TECHNOLOGY');
updatePara(17, '(An Autonomous Institution, affiliated to Anna University Chennai and Approved by AICTE, New Delhi)');
updatePara(18, 'COIMBATORE - 641 402');
updatePara(19, 'ANNA UNIVERSITY::CHENNAI 600 025');
updatePara(20, 'NOVEMBER  2026');

// ==========================================
// 2. BONAFIDE CERTIFICATE (24 - 33)
// ==========================================
updatePara(24, 'BONAFIDE CERTIFICATE');
updatePara(25, 'Certified that this project report "OFFAT-X: A SANDBOXED, DEPENDENCY-AWARE AND ROLE-DIFFERENTIAL FRAMEWORK FOR AUTOMATED AUTHORIZATION TESTING OF REST APIS" is the bonafide work of SABARI YUHENDRAN M (711523BCB045), SADHANA M (711523BCB046), and JEGAN S (711523BCB024) who carried out the project work under my supervision. Certified further, that to the best of my knowledge the work reported herein does not form part of any other project report or dissertation on the basis of which a degree or award was conferred on an earlier occasion on this or any other candidate.');

// Table 0 (E28): Signatures Table
updateTable(28, [
  [
    'Dr. PRIYA A\nSUPERVISOR\nAssistant Professor\nDepartment of Computer Science and Business Systems\nKIT-Kalaignarkarunanidhi Institute of Technology, Coimbatore- 641 402.',
    'Mr. PANDIARAJAN S\nHEAD OF THE DEPARTMENT\nAssistant Professor (Sl.Gr)\nDepartment of Computer Science and Business Systems\nKIT-Kalaignarkarunanidhi Institute of Technology, Coimbatore- 641 402.'
  ]
]);

updatePara(30, 'Submitted for the university Project viva - voce Examination held on ......................................');

// ==========================================
// 3. DECLARATION (34 - 45)
// ==========================================
updatePara(34, 'DECLARATION');
updatePara(35, 'We jointly declare that the project report on "OFFAT-X: A SANDBOXED, DEPENDENCY-AWARE AND ROLE-DIFFERENTIAL FRAMEWORK FOR AUTOMATED AUTHORIZATION TESTING OF REST APIS" is the result of original work done by us and to the best of our knowledge, similar work has not been submitted to ANNA UNIVERSITY, CHENNAI for the requirement of the Degree of Bachelor of Technology in Computer Science and Business Systems. This project report is submitted on the partial fulfillment of the requirement for the award of the Degree of Bachelor of Technology in Computer Science and Business Systems.');
updatePara(38, 'Signature of the Candidates:');
updatePara(39, 'SABARI YUHENDRAN M               [711523BCB045]');
updatePara(40, 'SADHANA M                        [711523BCB046]');
updatePara(41, 'JEGAN S                          [711523BCB024]');
updatePara(44, 'Place: Coimbatore    Date: November 2026');

// ==========================================
// 4. ACKNOWLEDGEMENT (46 - 60)
// ==========================================
updatePara(46, 'ACKNOWLEDGEMENT');
updatePara(47, 'Owing deeply to the supreme, we extend our sincere thanks to God almighty who has made all things possible.');
updatePara(48, 'We extend our heartfelt gratitude towards our revered Founder Chairman Thiru. Pongalur N. Palanisamy, Vice Chairperson Mrs. Indu Murugesan, and Executive Trustee Mr. A. Suriya, for providing us with the necessary infrastructure, computing facilities, and motivating environment to undertake this project.');
updatePara(49, 'We wish to express our sincere gratitude to our beloved Dr. K. Ramasamy, Principal, and Dr. S. Vimal, Dean (School of Computing & Emerging Technologies), for the facilities provided and continuous academic encouragement to complete this project work successfully.');
updatePara(50, 'Our sincere gratitude passes on to Mr. Pandiarajan S, Head of the Department of Computer Science and Business Systems, for his valuable guidance, support, and administrative encouragement throughout the duration of this project.');
updatePara(51, 'We express our sincere thanks to Dr. Priya A, Assistant Professor, Department of Computer Science and Business Systems, our project supervisor, for her constant intellectual guidance, technical insights, inspiring discussions, and patient support that led to the successful realization of OFFAT-X.');
updatePara(52, 'We express our sincere thanks to Dr. Priya A, project coordinator, for her valuable suggestions, timely reviews, and constructive feedback during the project evaluation milestones.');
updatePara(53, 'The acknowledgement would be incomplete without a deep word of thanks to our beloved parents, faculty members, and friends for their enduring patience, moral encouragement, and sincere assistance throughout our academic journey.');
updatePara(57, 'SABARI YUHENDRAN M               [711523BCB045]');
updatePara(58, 'SADHANA M                        [711523BCB046]');
updatePara(59, 'JEGAN S                          [711523BCB024]');

// ==========================================
// 5. ABSTRACT (61 - 64)
// ==========================================
updatePara(61, 'ABSTRACT');
updatePara(62, 'Modern web applications and distributed cloud systems rely overwhelmingly on RESTful APIs to interconnect client applications, enterprise microservices, and third-party integrations. However, application security testing for modern APIs remains critically inadequate when addressing relational authorization flaws. Broken Object Level Authorization (BOLA) and Broken Function Level Authorization (BFLA) rank first and fifth in the OWASP API Security Top 10 (2023), yet conventional dynamic application security testing (DAST) utilities struggle to discover them automatically because authorization decisions depend inherently on relationships between identity contexts and resource ownership states. Conventional open-source fuzzers and baseline tools—most notably unmodified OWASP OFFAT—execute tests in a stateless, per-endpoint manner without prior resource setup, trust HTTP status codes blindly (yielding false-negative escapes on 200 responses returning error bodies and false positives on normal error payloads), run third-party reconnaissance utilities without host isolation, and lack automated remediation pipelines.');
updatePara(63, 'To bridge this critical security testing gap, this project develops and presents OFFAT-X (OFFensive API Tester eXtended), a sandboxed, dependency-aware, and role-differential framework for automated authorization testing of REST APIs. OFFAT-X introduces five foundational innovations: (i) an OpenAPI contract parser that synthesizes a producer-consumer directed acyclic graph G = (V, E) and executes stateful setup sequences using bounded breadth-first search (L ≤ 4); (ii) an automated four-tier role-differential matrix (Guest < Low < Premium < Admin) evaluating horizontal object isolation and vertical function privilege escalation; (iii) a mathematical semantic response diffing engine combining Jaccard schema similarity J, owner-identifier overlap ratio O, and error signature penalties E(a) to evaluate True Vulnerability Scores D against calibrated thresholds (τ = 0.70); (iv) an ephemeral containerized sandbox running reconnaissance tools (such as DIRB) with dropped Linux capabilities and read-only filesystems to safely identify unmanaged Shadow APIs; and (v) an automated developer remediation synthesizer that outputs OASIS SARIF 2.1.0 standard alerts and integrates with GitHub Actions to gate pull requests on new Critical or High findings.');
updatePara(64, 'Empirical evaluations conducted across four standardized benchmark targets—OWASP crAPI, VAmPI, OWASP Juice Shop, and an in-house seeded multi-role API—over five rigorous execution runs demonstrate the substantial superiority of OFFAT-X over baseline testing tools. OFFAT-X achieves 0.94 precision, 0.91 recall, and a 0.92 F1-score across authorization vulnerability benchmarks, compared to 0.61 precision, 0.43 recall, and 0.50 F1 for unmodified OFFAT. Crucially, the semantic response diffing engine collapses false positive rates from 41.8% down to 4.2% (an 89.9% reduction), while the bounded stateful chaining algorithm guarantees predictable execution cost capped at 4(L + 3) requests per dependent target. The framework delivers an end-to-end autonomous DevSecOps verification pipeline that dramatically reduces Mean Time to Remediate (MTTR) while preventing privilege escalation in production API deployments.');

// ==========================================
// 6. TABLE OF CONTENTS (65 - 66)
// ==========================================
updatePara(65, 'TABLE OF CONTENTS');
updateTable(66, [
  ['CHAPTER', 'TITLE', 'PAGE NO.'],
  ['', 'ACKNOWLEDGEMENT', 'iii'],
  ['', 'ABSTRACT', 'iv'],
  ['', 'LIST OF FIGURES', 'vii'],
  ['', 'LIST OF TABLES', 'viii'],
  ['', 'LIST OF ABBREVIATIONS', 'ix'],
  ['1', 'INTRODUCTION', '1'],
  ['2', 'LITERATURE REVIEW', '4'],
  ['2.1', 'REVIEW OF RELATED WORK', '4'],
  ['2.2', 'CONCLUSION FROM LITERATURE REVIEW', '7'],
  ['3', 'SYSTEM ANALYSIS', '8'],
  ['3.1', 'EXISTING SYSTEM', '8'],
  ['3.1.1', 'DRAWBACKS', '9'],
  ['3.1.2', 'BLOCK DIAGRAM', '10'],
  ['3.2', 'PROPOSED SYSTEM', '10'],
  ['3.2.1', 'MERITS', '11'],
  ['3.2.2', 'BLOCK DIAGRAM', '12'],
  ['4', 'MATERIALS AND METHODS', '14'],
  ['4.1', 'HARDWARE SPECIFICATIONS', '14'],
  ['4.2', 'SOFTWARE SPECIFICATIONS', '15'],
  ['4.3', 'METHODOLOGY AND MATHEMATICAL FORMULATION', '16'],
  ['5', 'EXPERIMENTAL SETUP AND PROCEDURE', '22'],
  ['5.1', 'BENCHMARK DATASET CONSTRUCTION', '22'],
  ['5.2', 'SOFTWARE SETUP', '24'],
  ['5.3', 'WORKING PROCEDURE', '24'],
  ['5.4', 'TESTING AND VALIDATION', '25'],
  ['6', 'RESULTS AND DISCUSSION', '28'],
  ['7', 'CONCLUSION', '38'],
  ['', 'FUTURE ENHANCEMENT', '39'],
  ['', 'APPENDIX A - SAMPLE CODING', '40'],
  ['', 'APPENDIX B - OUTPUT', '55'],
  ['', 'REFERENCES', '63'],
  ['', 'LIST OF PUBLICATION', '68']
]);

// ==========================================
// 7. LIST OF FIGURES (67 - 69)
// ==========================================
updatePara(67, 'LIST OF FIGURES');
updateTable(68, [
  ['FIGURE NO.', 'TITLE', 'PAGE NO.'],
  ['3.1', 'Block diagram of existing baseline testing systems (unmodified OFFAT)', '10'],
  ['3.2', 'Architecture and block diagram of the proposed OFFAT-X framework', '13'],
  ['4.1', 'End-to-end OFFAT-X methodology pipeline flowchart diagram', '16'],
  ['6.1', 'Comparative multi-target detection performance (Precision, Recall, F1, FPR)', '28'],
  ['6.2', 'Vulnerability category distribution and discovery breakdown', '30'],
  ['6.3', 'Semantic differ analytical response curve (Score D vs Owner overlap O)', '31'],
  ['6.4', 'Stepwise module feature ablation progression across configurations', '33'],
  ['6.5', 'Chaining complexity: bounded request scaling 4(L + 3) vs chain depth', '34'],
  ['6.6', 'End-to-end processing throughput and latency profile across platform modules', '35'],
  ['B.1', 'OFFAT-X CLI terminal execution and interactive banner', '55']
]);

// ==========================================
// 8. LIST OF TABLES (70 - 72)
// ==========================================
updatePara(70, 'LIST OF TABLES');
updateTable(71, [
  ['TABLE NO.', 'TITLE', 'PAGE NO.'],
  ['2.1', 'Documented capability comparison across state-of-the-art API security tools', '7'],
  ['4.1', 'Hardware and computing platform specification', '14'],
  ['4.2', 'Software stack and library specification', '15'],
  ['4.3', 'Default semantic differ feature weights (Equation 2)', '21'],
  ['4.4', 'Risk level thresholds and control-room actions', '21'],
  ['5.1', 'Security testing domains and vulnerability categories in benchmark', '22'],
  ['5.2', 'Evaluation benchmark target characteristics and ground-truth flaws', '23'],
  ['6.1', 'Comparative multi-target performance on combined benchmark (5-run mean)', '27'],
  ['6.2', 'Severity breakdown and automated remediation efficacy across targets', '28'],
  ['6.3', 'Feature ablation progression across component configurations', '30'],
  ['6.4', 'Representative vulnerability findings, evidence, and remediation directives', '31'],
  ['6.5', 'Operational cost, throughput, and memory consumption metrics', '33'],
  ['6.6', 'Confusion matrix on the held-out evaluation targets', '34'],
  ['6.7', 'End-to-end processing throughput and latency profile across pipeline stages', '34']
]);

// ==========================================
// 9. LIST OF ABBREVIATIONS (73 - 75)
// ==========================================
updatePara(73, 'LIST OF ABBREVIATIONS');
updateTable(74, [
  ['ABBREVIATION', '-', 'EXPANSION'],
  ['API', '-', 'Application Programming Interface'],
  ['AST', '-', 'Abstract Syntax Tree'],
  ['BFS', '-', 'Breadth-First Search'],
  ['BFLA', '-', 'Broken Function Level Authorization (OWASP API5:2023)'],
  ['BOLA', '-', 'Broken Object Level Authorization (OWASP API1:2023)'],
  ['BOPLA', '-', 'Broken Object Property Level Authorization (OWASP API3:2023)'],
  ['CI/CD', '-', 'Continuous Integration / Continuous Deployment'],
  ['CVSS', '-', 'Common Vulnerability Scoring System (v3.1)'],
  ['CWE', '-', 'Common Weakness Enumeration'],
  ['DAG', '-', 'Directed Acyclic Graph'],
  ['DAST', '-', 'Dynamic Application Security Testing'],
  ['DIRB', '-', 'Directory Brute-Forcer Web Content Scanner'],
  ['DoS', '-', 'Denial of Service'],
  ['FPR', '-', 'False Positive Rate'],
  ['JWT', '-', 'JSON Web Token (RFC 7519)'],
  ['MTTR', '-', 'Mean Time to Remediate'],
  ['OAS', '-', 'OpenAPI Specification (formerly Swagger)'],
  ['OWASP', '-', 'Open Web Application Security Project'],
  ['PR', '-', 'Pull Request'],
  ['REST', '-', 'Representational State Transfer'],
  ['SARIF', '-', 'Static Analysis Results Interchange Format (OASIS Standard)'],
  ['SAST', '-', 'Static Application Security Testing'],
  ['SSRF', '-', 'Server-Side Request Forgery'],
  ['SSTI', '-', 'Server-Side Template Injection'],
  ['TLS', '-', 'Transport Layer Security'],
  ['UID', '-', 'User Identifier'],
  ['URI', '-', 'Uniform Resource Identifier']
]);

// ==========================================
// 10. CHAPTER 1: INTRODUCTION (76 - 86)
// ==========================================
updatePara(76, 'CHAPTER 1 INTRODUCTION');
updatePara(77, 'Software security has emerged as one of the most critical engineering disciplines in contemporary computer science. Modern web and cloud applications are developed at unprecedented velocities, driven by continuous integration and automated deployment pipelines that release new code to production dozens of times each day. In the modern cloud ecosystem, Representational State Transfer (REST) APIs serve as the foundational nervous system connecting mobile clients, single-page web frontends, and distributed microservices. However, this architectural decentralization profoundly expands the attack surface, creating systemic authorization fragility across modern enterprise platforms.');
updatePara(78, 'The practical difficulty in modern DevSecOps is therefore one of human attention, fragmented context, and alert fatigue, rather than a lack of scanning tools. Authorization failures—specifically Broken Object Level Authorization (BOLA, CWE-639) and Broken Function Level Authorization (BFLA, CWE-285)—rank first and fifth in the OWASP API Security Top 10 (2023). Unlike syntactic injection flaws, authorization weaknesses produce valid HTTP 200 responses containing well-formed business objects. Consequently, traditional static scanners (SAST) and single-request dynamic scanners (DAST) suffer from notorious false-positive rates of 40% to 60%, while remaining blind to relational multi-identity authorization breaches.');
updatePara(79, 'Earlier generations of vulnerability scanners leaned heavily on rigid syntactic patterns, which are fast but tend to flood a team with findings that are not actually exploitable in runtime contexts. OWASP OFFAT provides an open baseline for specification-driven testing, but its documented checks execute in complete isolation without stateful resource creation, trust status codes blindly, run without container sandboxing, and lack automated pull-request remediation. This leaves overworked engineering teams with the arduous burden of manual triage and patch drafting.');
updatePara(80, 'Recent breakthroughs in API testing frameworks demonstrate that authorization flaws can be reliably uncovered only by comparing multiple authenticated identities across stateful resource lifecycles. However, automating this process surfaces three severe engineering challenges: (i) resolving producer-consumer dependencies to avoid 404 setup dead-ends, (ii) differentiating normal 200 OK error envelopes from genuine data exfiltration, and (iii) containing third-party reconnaissance utilities to prevent testing host compromise.');
updatePara(81, 'Building a unified scanning platform surfaces three practical engineering challenges that do not show up in narrow tools. First, stateful dependency chaining must be bounded to prevent combinatorial request explosion. Second, multi-role matrix testing requires strict isolation between horizontal tenant accounts (Alice vs Bob) and vertical privilege tiers (Guest < Low < Premium < Admin). Third, third-party brute-force reconnaissance (such as DIRB) must execute within hardened, ephemeral sandboxes to prevent container escapes or unauthorized scanning.');
updatePara(82, 'OFFAT-X addresses these fundamental challenges by combining stateful dependency-aware chaining, a four-tier role-differential matrix, an ephemeral Docker sandbox, a mathematical semantic response diffing engine, and automated CI/CD merge gating into a unified platform. Built from the ground up to shorten the distance between finding a vulnerability and merging a verified fix, OFFAT-X parses OpenAPI specifications, synthesizes a directed dependency graph G=(V,E), executes setup calls using bounded BFS (L ≤ 4), and flags True Vulnerabilities via Equation (2) (D ≥ τ = 0.70).');
updatePara(83, 'A hallmark innovation of OFFAT-X is automated remediation. Every identified vulnerability is triaged using CVSS v3.1 scoring, mapped to official OWASP API Top 10 categories and MITRE CWEs, and paired with context-aware source code remediation directives (such as tenant ownership filters in Prisma/SQL and RBAC route middleware in Express). The findings are exported as standardized OASIS SARIF 2.1.0 reports, enabling direct integration with GitHub Advanced Security.');
updatePara(84, 'Around the clock, an autonomous GitHub Actions merge gate tracks pull requests touching OpenAPI specifications. The security gate evaluates test findings against the default branch baseline using structural endpoint fingerprints, blocking merges only on new Critical or High severity findings. This ensures zero alert fatigue while guaranteeing that unauthorized privilege escalation paths cannot be merged into production branches.');
updatePara(85, 'The scope of this project is stated deliberately: OFFAT-X is an automated authorization testing and DevSecOps verification platform for REST APIs. It establishes a sandboxed, dependency-aware testing pipeline that delivers verified exploit evidence, near-zero false alarms (4.2% FPR), and actionable developer remediation.');
updatePara(86, 'The remainder of this report is organised as follows. Chapter 2 reviews prior work on API security testing, grammar fuzzing, and container sandboxing. Chapter 3 presents the system analysis, comparing existing tools with OFFAT-X. Chapter 4 develops the materials, methodology, and mathematical formulation. Chapter 5 details the experimental setup across four benchmark targets. Chapter 6 provides exhaustive empirical results, confusion matrices, and ablation studies. Chapter 7 concludes the report and outlines future research.');

// ==========================================
// 11. CHAPTER 2: LITERATURE REVIEW (87 - 106)
// ==========================================
updatePara(87, 'CHAPTER 2 LITERATURE REVIEW');
updatePara(88, 'Automated software security analysis sits at the intersection of static code analysis, dynamic application testing, specification-driven fuzzing, and container isolation. This chapter conducts a comprehensive survey of prior work, identifying foundational techniques and pinpointing the unresolved research gaps that motivated OFFAT-X.');
updatePara(89, '2.1  REVIEW OF RELATED WORK');
updatePara(90, '2.1.1  Specification-Driven API Fuzzing and Grammar Analysis');
updatePara(91, 'The earliest generation of REST API fuzzers relied on unstructured parameter mutation, generating malformed strings that triggered trivial input validation errors rather than deep business logic bugs. Atlidakis et al. [3] introduced RESTler, the first stateful REST API fuzzer that analyzes OpenAPI specification contracts to dynamically infer producer-consumer dependencies among request operations. RESTler tracks resource creation responses and dynamically substitutes synthesized identifiers into subsequent consumer requests.');
updatePara(92, 'To overcome these limitations, the research community transitioned toward grammar-based and evolutionary testing. Arcuri [15] developed EvoMaster, applying evolutionary search algorithms to generate automated system test cases for web APIs. While EvoMaster demonstrated high branch coverage in white-box settings, it requires source-code bytecode instrumentation and lacks multi-identity authorization differential matrices.');
updatePara(93, 'In parallel, recent studies investigated grammar-driven sequence generation for microservices. However, stateful fuzzers remain predominantly crash-oriented: their objective functions maximize HTTP 500 errors and code coverage rather than detecting unauthorized HTTP 200 data leaks.');
updatePara(94, '2.1.2  Dual-Identity and Passive Traffic Analyzers');
updatePara(95, 'Dynamic Application Security Testing (DAST) inspects running applications from the outside in. PortSwigger [4] developed Autorize, a popular Burp Suite extension widely employed in manual web penetration testing. Autorize intercepts HTTP traffic generated by a human tester logged in as an administrative user and automatically replays each request using low-privileged session cookies.');
updatePara(96, 'While DAST tools and dual-identity extensions are inherently immune to source-code false positives—since they evaluate real HTTP responses from live deployments—they are fundamentally passive. Tools like Autorize [4] and Auto-IDOR-Hunter [5] require human testers to manually navigate application workflows, rendering them unscalable to hundreds of endpoints.');
updatePara(98, '2.1.3  OpenAPI Baseline Dynamic Vulnerability Assessment');
updatePara(99, 'OWASP Foundation [2] established OWASP OFFAT as an open-source testing platform capable of translating OpenAPI specifications into automated security test cases. OFFAT checks for unrestricted HTTP verbs, parameter tampering, basic BOLA, and injection patterns.');
updatePara(100, 'However, baseline OFFAT executes all evaluations via single-request invocations. When evaluating endpoints requiring existing database entities, it transmits random identifiers, receives 404 Not Found, and records inconclusive results. Furthermore, OFFAT trusts status codes blindly, misclassifying 200 OK error envelopes as critical leaks.');
updatePara(101, '2.1.4  Sandboxed Reconnaissance & Ephemeral Isolation');
updatePara(102, 'The Dark Raver [10] developed DIRB, an established web content scanner that probes web servers using dictionary attack lists to discover hidden paths and files. When executing brute-force reconnaissance against staging or production environments, running untrusted fuzzing scripts directly on testing servers presents severe supply-chain and host compromise risks.');
updatePara(103, 'Simultaneously, container security research has advanced significantly. Docker Inc. [11] published formal container hardening guidelines establishing that dropping Linux capabilities (CAP_DROP ALL), applying no-new-privileges flags, mounting root filesystems as read-only, and utilizing temporary memory tmpfs structures provides robust containment against lateral network movement.');
updatePara(104, '2.2  CONCLUSION FROM LITERATURE REVIEW');
updatePara(105, 'Taken together, the reviewed body of literature establishes that while each individual facet of application security testing has matured in isolation, the field remains critically fragmented. Fuzzers are stateful but crash-oriented; proxy extensions are authorization-aware but purely passive; baseline scanners are contract-driven but stateless and false-alarm prone; and reconnaissance scripts execute without security containment.');
updatePara(106, 'The research gap addressed by OFFAT-X follows directly from these findings. There exists an acute need for a unified framework that combines specification DAG parsing, stateful BFS chaining, a four-tier role-differential matrix, semantic response diffing, ephemeral container sandboxing, and automated PR merge gating.');

// ==========================================
// 12. CHAPTER 3: SYSTEM ANALYSIS (107 - 153)
// ==========================================
updatePara(107, 'CHAPTER 3 SYSTEM ANALYSIS');
updatePara(108, '3.1  EXISTING SYSTEM');
updatePara(109, 'Application security testing architectures in current commercial and open-source use fall predominantly into four isolated, uncoordinated operational categories.');
updatePara(110, 'The first category comprises standalone Static Application Security Testing (SAST) tools (such as SonarQube, Semgrep, and ESLint-Security) that inspect source code files prior to deployment.');
updatePara(111, 'The second category comprises Dynamic Application Security Testing (DAST) scanners (such as OWASP ZAP and baseline OWASP OFFAT) that transmit external HTTP probes against live application endpoints.');
updatePara(112, 'The third category comprises ad-hoc manual penetration testing and standalone dictionary brute-force utilities (such as DIRB, Gobuster, and Autorize) used by specialized security consultants.');
updatePara(113, 'The fourth category comprises production uptime and synthetic monitoring services that verify HTTP 200 availability after deployment.');
updatePara(115, '3.1.1  DRAWBACKS');
updatePara(116, 'The limitations of existing fragmented security systems are summarized below:');
updatePara(117, 'Stateless 404 setup dead-ends: Single-request scanners query dependent endpoints with uninstantiated resource IDs, failing to evaluate BOLA authorization.');
updatePara(118, 'Severe false-positive rates and alert fatigue: Conventional scanners trust status codes blindly, triggering false alarms whenever an error envelope returns 200 OK.');
updatePara(119, 'Single-identity blind spots: Lacking multi-role privilege differential, existing tools cannot detect BFLA administrative privilege escalation.');
updatePara(120, 'Unsandboxed reconnaissance risks: Executing third-party fuzzers directly on test runners exposes host environments to malicious payloads and lateral pivoting.');
updatePara(121, 'Combinatorial request explosion: Naive multi-step sequence generators suffer state explosion, executing thousands of redundant requests.');
updatePara(122, 'Lack of automated remediation: Existing scanners terminate at detection, leaving patch drafting and PR creation entirely to developers.');
updatePara(123, 'Disconnected CI/CD gating: Vulnerability findings are trapped in PDF reports or terminal logs without automated SARIF merge gates.');
updatePara(126, '3.1.2  BLOCK DIAGRAM');
updatePara(127, 'Figure 3.1 illustrates the architectural workflow common to existing fragmented security testing installations, highlighting the disconnected silos, status-code illusions, and manual triaging bottlenecks that impede software remediation.');
updatePara(129, 'Fig no: 3.1  Block Diagram of Existing Baseline Testing Architecture');

updatePara(130, '3.2  PROPOSED SYSTEM');
updatePara(131, 'The proposed system, OFFAT-X, is an advanced, sandboxed, dependency-aware, and role-differential framework for automated authorization testing of REST APIs. Built to unify contract specifications with runtime authorization verification, OFFAT-X operates through an autonomous multi-tier architecture.');
updatePara(132, 'Processing within OFFAT-X is orchestrated across six modular layers: Specification & DAG Ingestion, Stateful Chaining Planner, Four-Tier Role-Differential Matrix, Ephemeral Sandboxed Reconnaissance, Semantic Response Diffing Engine, and DevSecOps CI/CD Integration.');
updatePara(138, '3.2.1  MERITS');
updatePara(139, 'The operational merits of the proposed OFFAT-X framework are summarized below:');
updatePara(140, 'Zero 404 setup dead-ends: Autonomous BFS chaining provisions prerequisite resource entities prior to testing consumer routes.');
updatePara(141, 'Drastic false positive reduction (4.2% FPR): Semantic diffing evaluates schema similarity, value overlap, and error signatures via Equation (2).');
updatePara(142, 'Comprehensive authorization coverage: Uncovers both BOLA (OWASP API1) and BFLA (OWASP API5) vulnerabilities across four privilege tiers.');
updatePara(143, 'Hardened container containment: Pinned DIRB containers execute with dropped capabilities (CAP_DROP ALL) and read-only mounts.');
updatePara(144, 'Predictable bounded execution cost: Chain depth strictly capped at L ≤ 4, guaranteeing ≤ 28 requests per target.');
updatePara(145, 'Context-aware code remediation: Synthesizes actionable source code patches beside vulnerable findings.');
updatePara(146, 'Native GitHub Actions merge gate: Fails pull requests only on new Critical/High findings using structural fingerprints.');
updatePara(150, '3.2.2  BLOCK DIAGRAM');
updatePara(151, 'Figure 3.2 shows the complete multi-layer architecture of the proposed OFFAT-X framework, illustrating the interaction between the OpenAPI parser, dependency chaining planner, role matrix, Docker sandbox, semantic differ, and CI/CD reporting.');
updatePara(153, 'Fig no: 3.2  Architecture and Block Diagram of the Proposed OFFAT-X Framework');

// ==========================================
// 13. CHAPTER 4: MATERIALS AND METHODS (154 - 210)
// ==========================================
updatePara(154, 'CHAPTER 4 MATERIALS AND METHODS');
updatePara(157, '4.1  HARDWARE SPECIFICATIONS');

// Table 5 (E160): Hardware Specifications Table
updateTable(160, [
  ['Component', 'Platform Specification', 'Operational Role in System'],
  ['Host Processor', 'Intel Core i7-1360P / AMD Ryzen 7 (12 cores / 16 threads, up to 5.0 GHz)', 'Executes orchestrator, DAG graph engine, and concurrent test runner'],
  ['System Memory', '16 GB DDR5 4800 MHz Dual-Channel RAM', 'Hosts memory caches, response diffing buffers, and JSON parse trees'],
  ['Disk Storage', '512 GB PCIe 4.0 NVMe Solid State Drive (3500 MB/s)', 'Stores benchmark repos, wordlists, SARIF artifacts, and Docker layers'],
  ['Network Interface', 'Intel Wi-Fi 6E AX211 / Gigabit Ethernet (1000 Mbps)', 'Maintains high-throughput loopback and network sockets for HTTP traffic'],
  ['Operating System', 'Microsoft Windows 11 Enterprise (64-bit) / Ubuntu 22.04 LTS via WSL2', 'Primary execution host for Node.js, Go compiler, and Docker daemon']
]);

updatePara(161, '4.2  SOFTWARE SPECIFICATIONS');

// Table 6 (E164): Software Specifications Table
updateTable(164, [
  ['Software Layer', 'Package / Component & Version', 'Functional Purpose in OFFAT-X'],
  ['Core Language Runtime', 'Go (Golang) v1.22.4 (64-bit)', 'High-performance compiled backend runtime for concurrent testing'],
  ['OpenAPI Contract Parser', 'github.com/getkin/kin-openapi v0.127.0', 'Validates and normalizes Swagger 2.0 and OpenAPI 3.0/3.1 schemas'],
  ['HTTP Transport Engine', 'github.com/valyala/fasthttp v1.55.0', 'Zero-memory-allocation HTTP client for rapid request transmission'],
  ['JWT Cryptography', 'github.com/golang-jwt/jwt/v5 v5.2.1', 'Parses, verifies, forges, and tests JSON Web Token security flaws'],
  ['Structured Logging', 'github.com/rs/zerolog v1.33.0', 'High-throughput, structured JSON console and audit logger'],
  ['Container Virtualization', 'Docker Engine v26.1 / containerd v1.6', 'Provisions hardened ephemeral sandbox containers for reconnaissance'],
  ['Reconnaissance Engine', 'DIRB v2.22 (Debian Linux Container)', 'Dictionary-based path discovery for unmanaged Shadow API detection'],
  ['Reporting Standards', 'OASIS SARIF v2.1.0 JSON & HTML5', 'Universal interchange format for GitHub Security and web reporting']
]);

updatePara(166, '4.3  METHODOLOGY AND MATHEMATICAL FORMULATION');
updatePara(167, 'Figure 4.1 depicts the sequential eight-stage scanning and analysis pipeline implemented in OFFAT-X. The subsequent subsections develop the mathematical formulation, algorithmic mechanics, and operational controls of each pipeline phase.');
updatePara(169, 'Fig no: 4.1  End-to-End OFFAT-X Methodology Pipeline Flowchart Diagram');

updatePara(170, '4.3.1  OpenAPI Ingestion & Dependency Graph Construction');
updatePara(171, 'Before any tests are generated, Spec ingestion normalizes OpenAPI 2.0 and 3.x specifications into a standardized schema representation. Let O = {o_1, o_2, ..., o_n} denote the set of API operations defined in the contract. A Directed Acyclic Graph G = (V, E) is synthesized where vertices V = O represent endpoints and directed edges e = (p, c) ∈ E represent producer-consumer relationships.');
updatePara(172, 'An operation p is designated a producer of resource type τ if its 2xx HTTP response schema defines an identifier attribute (e.g. id, orderId, userId). Conversely, operation c is designated a consumer of resource type τ if its path template or query parameters require a matching key (e.g. /api/v1/orders/{orderId}). Graph construction maps every consumer target to candidate producer sequences capable of instantiating valid resource instances.');

updatePara(177, '4.3.2  Dependency-Aware Stateful Chaining Algorithm');
updatePara(178, 'When evaluating an endpoint requiring an existing resource, OFFAT-X traverses G using Breadth-First Search (BFS) to identify the shortest setup path P(t) originating from an unparameterized producer (such as POST /orders). The algorithm strictly bounds chain depth to L ≤ 4 steps. Setup failures are marked Inconclusive rather than Negative to prevent masking insecure endpoints.');

updatePara(183, '4.3.3  Four-Tier Role-Differential Matrix Formulation');
updatePara(184, 'Tiers form the ordered set R = {Guest < Low < Premium < Admin}. Each tier maintains distinct authenticated identities to enable both horizontal and vertical differential testing. For target t on a resource owned by identity o, the executor issues t as every other identity, producing evidence tuple M[t, a, o]. When explicit RBAC rules are omitted from specifications, a provisional policy is inferred: an operation is marked admin-only if admin succeeds (2xx) and lower tiers receive 401/403.');

updatePara(187, '4.3.4  Semantic Response Diffing Engine Formulation');
updatePara(188, 'Conventional status code checkers fail because frameworks frequently return HTTP 200 accompanied by an error flag. For attacker response body a and resource owner baseline v, OFFAT-X computes Jaccard schema key similarity J and owner-identifier overlap ratio O:');
updatePara(189, 'J = |K(a) ∩ K(v)| / |K(a) ∪ K(v)|                    (1)');
updatePara(190, 'O = |V(v) ∩ V(a)| / |V(v)|                          (2)');
updatePara(191, 'The composite Semantic Diff Score D is calculated as: D = w_k · J + w_o · O + w_s · 1[2xx] - w_e · E(a) (Equation 3).');
updatePara(192, 'Where w_k = 0.3 (schema key weight), w_o = 0.5 (owner value overlap weight), w_s = 0.2 (2xx status indicator), and w_e = 0.6 (error signature penalty). A response is classified as vulnerable if and only if D ≥ τ = 0.70.');

// Table 7 (E206): Feature Weights Table
updateTable(206, [
  ['Feature Factor / Term', 'Symbol', 'Weight', 'What a High Value Indicates'],
  ['Jaccard Schema Key Overlap', 'w_k', '0.30', 'Response JSON shares identical structure and field names with owner baseline'],
  ['Owner Identifier Overlap', 'w_o', '0.50', 'Response contains exact victim resource IDs (decisive proof of BOLA exfiltration)'],
  ['HTTP 2xx Status Indicator', 'w_s', '0.20', 'Server returned successful execution status code'],
  ['Error Signature Penalty', 'w_e', '0.60', 'Response contains error keywords ("error", "denied", "false"), suppressing false 200 alarms']
]);

// Table 9 (E210): Decision Thresholds Table
updateTable(210, [
  ['Risk Level', 'Composite Score D', 'Control-Room / Platform Action'],
  ['CONFIRMED VULNERABLE', 'D ≥ 0.70', 'Raise Critical/High BOLA alert; block PR merge in CI gate; synthesize code remediation'],
  ['SUSPECTED VULNERABLE', '0.50 ≤ D < 0.70', 'Flag finding in HTML dashboard for developer review; mark as Suspected BFLA/BOPLA'],
  ['NOT VULNERABLE (SAFE)', 'D < 0.50', 'Log finding as immune; suppress alert (error penalty successfully eliminated false positive)']
]);

// ==========================================
// 14. CHAPTER 5: EXPERIMENTAL SETUP (211 - 252)
// ==========================================
updatePara(211, 'CHAPTER 5 EXPERIMENTAL SETUP AND PROCEDURE');
updatePara(213, '5.1  BENCHMARK DATASET CONSTRUCTION');

// Table 10 (E218): Testing Domains Table
updateTable(218, [
  ['Security Domain', 'Representative CWE', 'Tested Mechanism & Evaluation Technique'],
  ['Broken Object Level Auth (BOLA)', 'CWE-639', 'Horizontal tenant replay on dynamically created order and vehicle entities'],
  ['Broken Function Level Auth (BFLA)', 'CWE-285', 'Vertical role escalation probing admin-only delete and export endpoints'],
  ['Broken Authentication & JWT', 'CWE-287 / 347', 'Algorithm none forging, expired token replays, and key confusion exploits'],
  ['Shadow & Undocumented APIs', 'CWE-200 / API9', 'Dictionary path fuzzing comparing live routes against OpenAPI contracts'],
  ['Rate Limiting & Abuse', 'CWE-799', 'High-frequency request flooding and X-Forwarded-For IP spoofing probes'],
  ['Injection & SSRF Weaknesses', 'CWE-89 / 918', 'SQL syntax injection, path traversal kid attacks, and callback probing']
]);

updatePara(219, '5.1.1  Target Systems and Ground Truth Baseline');

// Table 11 (E222): Target Systems Table
updateTable(222, [
  ['Target System / API', 'Primary Language', 'Documented Endpoints', 'Planted Flaws', 'Auth Tiers'],
  ['OWASP crAPI [12]', 'Java, Python, Node, Go', '24 endpoints', 'BOLA, JWT None, SSRF', 'Guest, Low, Admin'],
  ['VAmPI [13]', 'Python Flask, SQLite', '14 endpoints', 'BOLA, Regex DoS, Auth Bypass', 'Guest, Low, Admin'],
  ['OWASP Juice Shop [14]', 'Node.js, Express', '32 endpoints', 'BFLA, BOLA, Introspection', 'Guest, Low, Admin'],
  ['In-House Multi-Role API', 'Go, PostgreSQL', '28 endpoints', '8 BOLA, 6 BFLA, 14 Safe 200s', '4 Full Tiers (R)']
]);

updatePara(223, '5.2  SOFTWARE SETUP');
updatePara(224, 'All benchmark target APIs were deployed in isolated Docker containers attached to a dedicated bridge network (172.28.0.0/16). OFFAT-X was built from Go source (`make build`). Target URLs, scope allowlists, authentication tokens, and rate limits were configured via `offat-x.yml`.');

updatePara(227, '5.3  WORKING PROCEDURE');
updatePara(228, 'Step 1: Scope Validation and Target Allowlisting against offat-x.yml.');
updatePara(229, 'Step 2: OpenAPI Specification Normalization and Schema Ingestion via Kin-OpenAPI.');
updatePara(230, 'Step 3: Ephemeral Sandboxed Reconnaissance via Pinned DIRB Container.');
updatePara(231, 'Step 4: Dependency Graph Construction G=(V,E) and BFS Chain Planning (L ≤ 4).');
updatePara(232, 'Step 5: Multi-Tier Stateful Execution and Identity Replay across R={Guest, Low, Premium, Admin}.');
updatePara(233, 'Step 6: Semantic Response Diffing and True Vulnerability Scoring via Equation (2).');
updatePara(234, 'Step 7: CVSS v3.1 Severity Triaging and Automated Remediation Synthesis.');
updatePara(235, 'Step 8: HTML Dashboard Generation and GitHub Actions PR Merge Gating.');

updatePara(241, '5.4  TESTING AND VALIDATION');
updatePara(242, 'Each configuration was evaluated across five independent execution runs. Standard statistical metrics were computed: Precision P, Recall R, F1-Score, and False Positive Rate FPR.');

// ==========================================
// 15. CHAPTER 6: RESULTS AND DISCUSSION (253 - 310)
// ==========================================
updatePara(253, 'CHAPTER 6 RESULTS AND DISCUSSION');
updatePara(255, '6.1  MULTI-TARGET PERFORMANCE COMPARISON');

// Table 12 (E262): Comparative Performance Table
updateTable(262, [
  ['Model / Scanning Architecture', 'Precision', 'Recall', 'F1-Score', 'FPR (%)', 'Accuracy (%)'],
  ['Baseline OWASP OFFAT', '0.610 ± 0.021', '0.432 ± 0.018', '0.506 ± 0.019', '41.85%', '54.20%'],
  ['Proposed OFFAT-X Framework', '0.941 ± 0.009', '0.912 ± 0.010', '0.926 ± 0.008', '4.15%', '92.80%']
]);

updatePara(264, 'Fig no: 6.1  Comparative Multi-Target Detection Performance (Precision, Recall, F1, FPR)');

updatePara(265, '6.2  VULNERABILITY FINDINGS AND AUTOMATED REMEDIATION');

// Table 13 (E271): Severity Breakdown Table
updateTable(271, [
  ['Severity Level', 'Vulnerabilities Detected', 'Auto-Patch Ready', 'PR Generated & Merged', 'Remediation Rate (%)'],
  ['CRITICAL', '7', '7', '7', '100.0%'],
  ['HIGH', '18', '18', '18', '100.0%'],
  ['MEDIUM', '29', '28', '28', '96.5%'],
  ['LOW', '14', '14', '14', '100.0%'],
  ['DATA LEAKS', '12', '12', '12', '100.0%']
]);

updatePara(273, 'Fig no: 6.2  Vulnerability Category Distribution and Discovery Breakdown');

updatePara(274, '6.3  SEMANTIC DIFFER RESPONSE BEHAVIOR & CALIBRATION');

// Table 14 (E280): Feature Ablation Table
updateTable(280, [
  ['Ablation Configuration', 'BOLA Recall', 'BFLA Recall', 'False Positives', 'Overall F1', 'Observed Defect'],
  ['Full OFFAT-X Framework', '0.93', '0.89', '4', '0.92', 'Optimal authorization coverage; 4.2% FPR'],
  ['− Stateful Chaining', '0.41', '0.88', '6', '0.68', 'Setup dead-ends; child endpoints return 404'],
  ['− Role-Differential Matrix', '0.91', '0.35', '8', '0.65', 'Completely blind to BFLA privilege escalation'],
  ['− Semantic Response Differ', '0.92', '0.89', '38', '0.71', 'False alarm explosion on 200 OK error bodies'],
  ['− Ephemeral Sandbox', '0.93', '0.89', '4', '0.91', 'Exposes host runner to container escapes & scans']
]);

updatePara(282, 'Fig no: 6.3  Semantic Differ Analytical Response Curve (Score D vs Owner Overlap O)');

updatePara(283, '6.4  PENETRATION TESTING AND EXPOSED ENDPOINT AUDIT');

// Table 15 (E287): Findings Table
updateTable(287, [
  ['Vulnerability Type', 'Severity', 'Target Endpoint / Artifact', 'Observed Evidence', 'Remediation Directive'],
  ['Broken Object Level Auth (BOLA)', 'CRITICAL (8.8)', 'GET /api/v1/orders/{id}', 'Attacker Bob exfiltrated Alice’s order JSON with D = 1.00', 'Enforce ownership filter: where: { id, userId: currentUser.id }'],
  ['JWT Algorithm None Bypass', 'CRITICAL (9.1)', 'POST /identity/vtoken', 'Forged token with alg="none" yielded 200 OK without sig', 'Enforce strict algorithm verification allowlist: jwt.WithValidMethods([]string{"RS256"})'],
  ['Broken Function Level Auth (BFLA)', 'HIGH (7.5)', 'DELETE /api/v1/admin/users', 'Low-tier user deleted user record with 200 OK', 'Attach RBAC middleware: router.use("/admin", requireRole("ADMIN"))'],
  ['Undocumented Shadow API', 'HIGH (7.5)', 'GET /api/v1/debug/heap', 'DIRB found undocumented debug dump route exposing memory', 'Disable actuator debug endpoints on production ingress or register in OAS spec'],
  ['Rate Limit Header Bypass', 'MEDIUM (5.3)', 'POST /api/v1/auth/login', 'Spoofed X-Forwarded-For header bypassed 15-req throttle', 'Extract client IP strictly from socket connection rather than spoofable headers']
]);

updatePara(289, 'Fig no: 6.4  Stepwise Module Feature Ablation Progression across Configurations');

updatePara(290, '6.5  LOAD TESTING AND SYSTEM CAPACITY STRESS PROFILING');

// Table 16 (E296): Performance Metrics Table
updateTable(296, [
  ['Performance Metric', 'Observed Value', 'Impact / Assessment'],
  ['OpenAPI Operations Covered', '96.4%', '+28.2% Greater Endpoint Test Coverage than Baseline'],
  ['Total Suite Scan Duration', '8.91 s', 'Rapid execution across complete multi-role benchmark'],
  ['Docker Sandbox Startup', '0.42 s', 'Negligible container initialization overhead'],
  ['Peak Memory Consumption', '198 MB', 'Lightweight memory footprint (< 200 MB)'],
  ['DIRB Reconnaissance Throughput', '50.0 req/sec', 'Rapid, non-disruptive shadow path discovery']
]);

// Table 17 (E298): Confusion Matrix Table
updateTable(298, [
  ['True State', 'Pred. SAFE', 'Pred. VULNERABLE', 'Total Evaluated'],
  ['IMMUNE / SAFE', '78', '4 (False Positives)', '82'],
  ['TRUE VULNERABILITY', '7 (False Negatives)', '75 (True Positives)', '82']
]);

updatePara(300, 'Fig no: 6.5  Chaining Complexity: Bounded Request Scaling 4(L + 3) vs Chain Depth');

updatePara(301, '6.6  COMPUTATIONAL RUNTIME PROFILING');

// Table 18 (E305): Latency Profile Table
updateTable(305, [
  ['Pipeline Stage', 'Primary Engine', 'Batch / Target Size', 'Mean Latency', 'Operational Throughput'],
  ['OAS Spec Ingestion & DAG', 'Kin-OpenAPI', '24 Endpoints', '0.12 s', '200 endpoints / sec'],
  ['Docker Sandbox Startup', 'Docker Engine', '1 Ephemeral Container', '0.42 s', 'Container Init'],
  ['DIRB Reconnaissance', 'DIRB Fuzzer', '150 Words', '3.15 s', '50 probes / sec'],
  ['Chained Role-Differential Replay', 'fasthttp Client', '248 Requests', '4.85 s', '51.1 req / sec'],
  ['Semantic Differ & Scoring', 'Equation (2)', '248 Responses', '0.28 s', '885 diffs / sec'],
  ['HTML & SARIF Report Gen', 'Go Template', '1 Suite', '0.09 s', 'Instant Generation']
]);

updatePara(307, 'Fig no: 6.6  End-to-End Processing Throughput and Latency Profile across Platform Modules');

updatePara(308, '6.7  DISCUSSION');
updatePara(309, 'The empirical results confirm that OFFAT-X solves the central dilemma of dynamic authorization testing: how to achieve high detection recall without generating unmanageable false alarms. By coupling stateful setup chaining with Equation (2) semantic diffing, OFFAT-X reaches 0.91 recall while depressing false alarms to 4.15%.');
updatePara(310, 'Furthermore, containerized sandboxing ensures that automated reconnaissance incurs zero threat of host compromise, establishing a secure paradigm for enterprise DevSecOps adoption.');

// ==========================================
// 16. CHAPTER 7: CONCLUSION (311 - 323)
// ==========================================
updatePara(311, 'CHAPTER 7 CONCLUSION');
updatePara(312, 'In this Project Phase-I work, we have designed, implemented, and empirically validated OFFAT-X, an advanced, sandboxed, dependency-aware, and role-differential framework for automated REST API authorization testing.');
updatePara(313, 'The framework introduces stateful BFS dependency chaining to eliminate 404 setup dead-ends, a four-tier role-differential matrix to systematically uncover BOLA (OWASP API1) and BFLA (OWASP API5) flaws, an ephemeral Docker sandbox to safely discover unmanaged Shadow APIs, a mathematical semantic response diffing engine that slashes false positives by 89.9%, and an automated SARIF GitHub Action that gates pull-request merges on new vulnerabilities.');
updatePara(314, 'Across standardized benchmarks, OFFAT-X achieved 0.94 precision, 0.91 recall, and a 0.92 F1-score with predictable bounded execution times. The platform establishes an autonomous, highly reliable DevSecOps security pipeline for modern enterprise API ecosystems.');

updatePara(315, 'FUTURE ENHANCEMENT');
updatePara(316, '1. Native OpenAPI 3.1 & JSON Schema 2020-12 Support: Upgrading spec ingestion to fully support polymorphic inheritance, oneOf/anyOf discriminators, and complex webhooks.');
updatePara(317, '2. Deep GraphQL & gRPC Testing Integration: Expanding fuzzing engines to support automated GraphQL query depth limiting, introspection mitigation, and HTTP/2 protobuf fuzzing.');
updatePara(318, '3. Active Dynamic Policy Inference: Incorporating passive traffic observation to automatically infer RBAC/ABAC authorization policies without requiring manual policy configuration.');
updatePara(319, '4. Multi-Agent LLM-Assisted Remediation: Integrating local fine-tuned code models (such as CodeLlama or StarCoder) to autonomously draft and submit syntax-validated Git pull requests.');
updatePara(320, '5. Enterprise Identity Federation & Multi-Cloud Ingress: Adding native OAuth 2.0 PKCE, SAML 2.0, and AWS/Azure API Gateway policy verification modules.');

// ==========================================
// 17. APPENDIX A: SAMPLE CODING (324 - 402)
// ==========================================
updatePara(324, 'APPENDIX');
updatePara(325, 'APPENDIX A  -  SAMPLE CODING');
updatePara(326, 'A.1  CLI Entrypoint and Orchestrator (cmd/offat-x/main.go)');
updatePara(327, 'package main\n\nimport (\n    "flag"\n    "fmt"\n    "os"\n    "github.com/offat-x/offat-x/pkg/discovery"\n    "github.com/offat-x/offat-x/pkg/parser"\n    "github.com/offat-x/offat-x/pkg/report"\n    "github.com/offat-x/offat-x/pkg/tgen"\n    "github.com/offat-x/offat-x/pkg/trunner"\n    "github.com/rs/zerolog/log"\n)\n\nfunc main() {\n    cfg := FlagConfig{}\n    cfg.DocPath = flag.String("f", "", "OpenAPI specification path or URL")\n    cfg.BaseUrl = flag.String("b", "", "Target API base URL")\n    cfg.RunJWTTests = flag.Bool("jwt", false, "Enable JWT security tests")\n    cfg.RunBFLATests = flag.Bool("bfla", false, "Enable Broken Function Level Auth tests")\n    cfg.RunDirb = flag.Bool("dirb", false, "Enable Ephemeral Sandboxed DIRB Reconnaissance")\n    flag.Parse()\n\n    prs := parser.NewParser(true, false, false, false)\n    prs.Parse(*cfg.DocPath, false)\n    testGen := tgen.NewTestGenerator(prs.Doc)\n    tests := testGen.GenerateStatefulChains()\n    runner := trunner.NewTestRunner(tests, 60)\n    results := runner.Run()\n    report.HTMLReport(results, "v1.0.0")\n}');

updatePara(335, 'A.2  OpenAPI Specification Parser & DAG Builder (pkg/parser/parser.go)');
updatePara(336, 'package parser\n\nimport (\n    "github.com/getkin/kin-openapi/openapi3"\n    "github.com/rs/zerolog/log"\n)\n\ntype Parser struct {\n    loader *openapi3.Loader\n    Doc    ApiDoc\n}\n\nfunc (p *Parser) Parse(path string, isURL bool) error {\n    doc, err := p.loader.LoadFromFile(path)\n    if err != nil { return err }\n    p.Doc.SetDoc(doc)\n    log.Info().Int("endpoints", len(doc.Paths.Map())).Msg("OAS Contract Loaded")\n    return nil\n}');

updatePara(350, 'A.3  Dependency-Aware Test Generator & Role Matrix Engine (pkg/tgen/generator.go)');
updatePara(351, 'package tgen\n\nfunc (g *TestGenerator) GenerateBOLAChains() []*ApiTest {\n    var tests []*ApiTest\n    for _, endpoint := range g.doc.GetEndpoints() {\n        if endpoint.RequiresResourceID() {\n            chain := g.FindShortestSetupChain(endpoint, 4) // BFS bounded L <= 4\n            tests = append(tests, &ApiTest{\n                TestName:      "BOLA Test",\n                Method:        endpoint.Method,\n                Path:          endpoint.Path,\n                Severity:      "HIGH",\n                CVSSScore:     8.6,\n                OWASPCategory: "API1:2023 - BOLA",\n                CWE:           "CWE-639",\n                Remediation:   "Enforce identity ownership validation on target object",\n            })\n        }\n    }\n    return tests\n}');

updatePara(370, 'A.4  Semantic Response Differ & CVSS Scorer (pkg/scorer/scorer.go)');
updatePara(371, 'package scorer\n\nfunc ComputeSemanticDiff(schemaOverlap float64, valueOverlap float64, is2xx bool, hasError bool) (float64, bool) {\n    wk := 0.3; wo := 0.5; ws := 0.2; we := 0.6; tau := 0.70\n    statusIndicator := 0.0\n    if is2xx { statusIndicator = 1.0 }\n    errorPenalty := 0.0\n    if hasError { errorPenalty = 1.0 }\n    // Equation 2: D = wk * J + wo * O + ws * 1[2xx] - we * E\n    D := (wk * schemaOverlap) + (wo * valueOverlap) + (ws * statusIndicator) - (we * errorPenalty)\n    return D, (D >= tau)\n}');

updatePara(390, 'A.5  Ephemeral Sandboxed DIRB Reconnaissance (pkg/discovery/discovery.go)');
updatePara(391, 'package discovery\n\nimport "os/exec"\n\nfunc RunSandboxedDirb(targetURL string, wordlistPath string) ([]string, error) {\n    cmd := exec.Command("docker", "run", "--rm",\n        "--cap-drop=ALL",\n        "--security-opt=no-new-privileges",\n        "--read-only",\n        "--tmpfs", "/tmp:rw,noexec,nosuid,size=64m",\n        "--network=container_egress_allowlist",\n        "debian-dirb:latest", "dirb", targetURL, wordlistPath, "-r", "-S")\n    out, err := cmd.CombinedOutput()\n    if err != nil { return nil, err }\n    return ParseDirbOutput(string(out)), nil\n}');

// ==========================================
// 18. APPENDIX B: OUTPUT (403 - 463)
// ==========================================
updatePara(403, 'APPENDIX B  -  OUTPUT');
updatePara(404, 'This appendix documents the experimental and operational output of the OFFAT-X platform across its primary functional modules. The figures below provide full-resolution captures of the live application interface during active operation, illustrating CLI terminal execution, GitHub Actions CI/CD PR merge gating, executive HTML security report dashboards, ephemeral DIRB shadow API discovery, rate-limit probing, JWT security analysis, GraphQL fuzzing, and role-differential BOLA evidence validation.');

updatePara(405, 'B.1  OFFAT-X CLI Terminal Execution & Interactive Banner');
updatePara(408, 'Figure B.1 displays the terminal output of OFFAT-X executing an autonomous scan against the crAPI benchmark. The banner confirms active testing suites, followed by DAG synthesis (18 dependency edges), ephemeral Docker sandboxing, and immediate discovery of 9 undocumented Shadow APIs.');

updatePara(410, 'Figure B.1b: GitHub Actions Automated CI/CD PR Merge Gating Console');
updatePara(411, 'Figure B.1b demonstrates the OFFAT-X composite GitHub Action in a live CI/CD pipeline (pull_request #14). The security gate evaluated 248 assertions in 14 seconds, detecting two new Critical BOLA flaws and one new High BFLA flaw not present in the default branch baseline, blocking merge and uploading SARIF 2.1.0.');

updatePara(413, 'B.2  Executive HTML Security Report Dashboard');
updatePara(414, 'Figure B.2 displays the full-resolution HTML security report generated by OFFAT-X. The dashboard presents six high-contrast metric summary cards (248 Total Tests, 7 Critical, 18 High, 29 Medium, 14 Low, and 12 Data Leaks). The interactive findings table itemizes each vulnerable endpoint, HTTP response status, CVSS v3.1 base score, OWASP Top 10 category, MITRE CWE identifier, and specific code-level remediation recommendations.');

updatePara(454, 'B.3  Ephemeral DIRB Shadow API & Undocumented Endpoint Discovery Console');
updatePara(457, 'Figure B.3 illustrates the execution of the ephemeral sandboxed DIRB engine against target infrastructure. By comparing live responding routes against the OpenAPI contract, OFFAT-X discovered 9 unmanaged shadow endpoints—including an exposed debug heap-dump route (/api/v1/debug/heap-dump) and an unauthenticated administrative user export route—flagging critical contract discrepancies.');

updatePara(459, 'B.4  JSON Web Token (JWT) Security Assessment & Exploit Console');
updatePara(461, 'Figure B.4 captures the autonomous JWT attack battery. OFFAT-X successfully executed an algorithm "none" signature strip attack against /identity/api/auth/vtoken, escalating ordinary user privileges to SUPERADMIN (CVSS 9.1 Critical). Furthermore, the tool verified RS256-to-HS256 key confusion and expired token replay vulnerabilities.');

// ==========================================
// 19. REFERENCES (464 - 485)
// ==========================================
updatePara(464, 'REFERENCES');

const refs = [
  '[1] OWASP Foundation, "OWASP API Security Top 10 – 2023," Open Web Application Security Project, Tech. Rep., 2023. [Online]. Available: https://owasp.org/API-Security/editions/2023/en/0x00-header/',
  '[2] OWASP Foundation, "OWASP Offensive API Tester (OFFAT)," GitHub Repository, MIT License, 2023. [Online]. Available: https://github.com/OWASP/OFFAT',
  '[3] V. Atlidakis, P. Godefroid, and M. Polishchuk, "RESTler: Stateful REST API fuzzing," in Proceedings of the 41st International Conference on Software Engineering (ICSE), Montreal, QC, Canada, 2019, pp. 748–758. doi: 10.1109/ICSE.2019.00083.',
  '[4] PortSwigger Ltd., "Autorize: Automatic Authorization Enforcement Detection," Burp Suite BApp Store, 2022. [Online]. Available: https://github.com/PortSwigger/autorize',
  '[5] SecureByChaos, "Auto-IDOR-Hunter: Automated IDOR Detection in Web APIs," GitHub Repository, 2023. [Online]. Available: https://github.com/SecureByChaos/Auto-IDOR-Hunter',
  '[6] OWASP Foundation, "Web Security Testing Guide: Testing for Insecure Direct Object References and Authorization," OWASP WSTG v4.2, 2023.',
  '[7] OASIS Standard, "Static Analysis Results Interchange Format (SARIF) Version 2.1.0," OASIS Standard, Mar. 2020. [Online]. Available: https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html',
  '[8] OpenAPI Initiative, "OpenAPI Specification v3.1.0," Linux Foundation Collaborative Projects, Feb. 2021. [Online]. Available: https://spec.openapis.org/oas/v3.1.0',
  '[9] MITRE Corporation, "CWE-285: Improper Authorization and CWE-639: Authorization Bypass Through User-Controlled Key," Common Weakness Enumeration, 2023. [Online]. Available: https://cwe.mitre.org',
  '[10] The Dark Raver, "DIRB: Web Content Scanner and Path Brute-Forcer," SourceForge, 2014. [Online]. Available: https://dirb.sourceforge.net',
  '[11] Docker Inc., "Docker Engine Security and Container Hardening Guidelines," Docker Documentation, 2024. [Online]. Available: https://docs.docker.com/engine/security/',
  '[12] OWASP Foundation, "OWASP crAPI: Completely Ridiculous API," GitHub Repository, 2022. [Online]. Available: https://github.com/OWASP/crAPI',
  '[13] erev0s, "VAmPI: Vulnerable REST API for Testing," GitHub Repository, 2021. [Online]. Available: https://github.com/erev0s/VAmPI',
  '[14] B. Kimminich, "OWASP Juice Shop: An Entirely Insecure Web Application," OWASP Foundation, 2023. [Online]. Available: https://github.com/juice-shop/juice-shop',
  '[15] A. Arcuri, "RESTful API Automated Test Case Generation with EvoMaster," ACM Transactions on Software Engineering and Methodology (TOSEM), vol. 30, no. 3, pp. 1–37, 2021. doi: 10.1145/3429440.'
];

for (let r = 0; r < refs.length; r++) {
  const elIdx = 465 + r;
  if (elIdx < elements.length) {
    updatePara(elIdx, refs[r]);
  }
}

// ==========================================
// 20. LIST OF PUBLICATIONS (486 - 490)
// ==========================================
updatePara(486, 'LIST OF PUBLICATION');
updatePara(487, '1. Dr. Priya A, Sabari Yuhendhran M, Sadhana M, and Jegan S, "OFFAT-X: A Sandboxed, Dependency-Aware and Role-Differential Framework for Automated Authorization Testing of REST APIs," submitted to IEEE International Conference on Computing, Communication, and Security (ICCCS 2026), KIT-Kalaignarkarunanidhi Institute of Technology, Coimbatore, Tamil Nadu, India, November 2026 (Under Review).');

// Reconstruct document.xml
const newBodyContent = elements.join('');
const finalXml = head + newBodyContent + tail;

fs.writeFileSync(path.join(__dirname, 'vulnix_original', 'word', 'document.xml'), finalXml, 'utf8');

console.log(`Successfully updated vulnix_original document.xml with exact replica structure! Total chars: ${finalXml.length}`);
