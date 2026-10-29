const fs = require('fs');
const path = require('path');
const {
  esc,
  p,
  chapterTitle,
  secHeading,
  subSecHeading,
  figureCaption,
  tableCaption,
  buildTable,
  codeBlock,
  drawings
} = require('./report_helpers');

console.log('Beginning OFFAT-X OpenXML document generation...');

let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:cx="http://schemas.microsoft.com/office/drawing/2014/chartex" xmlns:cx1="http://schemas.microsoft.com/office/drawing/2015/9/8/chartex" xmlns:cx2="http://schemas.microsoft.com/office/drawing/2015/10/21/chartex" xmlns:cx3="http://schemas.microsoft.com/office/drawing/2016/5/9/chartex" xmlns:cx4="http://schemas.microsoft.com/office/drawing/2016/5/10/chartex" xmlns:cx5="http://schemas.microsoft.com/office/drawing/2016/5/11/chartex" xmlns:cx6="http://schemas.microsoft.com/office/drawing/2016/5/12/chartex" xmlns:cx7="http://schemas.microsoft.com/office/drawing/2016/5/13/chartex" xmlns:cx8="http://schemas.microsoft.com/office/drawing/2016/5/14/chartex" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:aink="http://schemas.microsoft.com/office/drawing/2016/ink" xmlns:am3d="http://schemas.microsoft.com/office/drawing/2017/model3d" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordprocessingml" xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordprocessingml" xmlns:w16cid="http://schemas.microsoft.com/office/word/2016/wordprocessingml/cid" xmlns:w16se="http://schemas.microsoft.com/office/word/2015/wordprocessingml/symex" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" mc:Ignorable="w14 w15 w16se w16cid wp14">
<w:body>`;

// ==========================================
// 1. COVER / TITLE PAGE
// ==========================================
xml += drawings['rId7'] || ''; // KIT College Logo

xml += p('OFFAT-X: A SANDBOXED, DEPENDENCY-AWARE AND ROLE-DIFFERENTIAL FRAMEWORK FOR AUTOMATED AUTHORIZATION TESTING OF REST APIS', {
  bold: true,
  size: 30, // 15pt
  align: 'center',
  spaceBefore: 180,
  spaceAfter: 120,
  firstLine: 0
});

xml += p('PROJECT PHASE - I REPORT', {
  bold: true,
  size: 26,
  align: 'center',
  spaceBefore: 120,
  spaceAfter: 200,
  firstLine: 0
});

xml += p('Submitted by', {
  italic: true,
  size: 24,
  align: 'center',
  spaceBefore: 60,
  spaceAfter: 120,
  firstLine: 0
});

xml += p('SABARI YUHENDRAN M               [711523BCB045]', {
  bold: true,
  size: 24,
  align: 'center',
  spaceBefore: 40,
  spaceAfter: 40,
  firstLine: 0
});

xml += p('SADHANA M                        [711523BCB046]', {
  bold: true,
  size: 24,
  align: 'center',
  spaceBefore: 40,
  spaceAfter: 40,
  firstLine: 0
});

xml += p('JEGAN S                          [711523BCB024]', {
  bold: true,
  size: 24,
  align: 'center',
  spaceBefore: 40,
  spaceAfter: 240,
  firstLine: 0
});

xml += p('in partial fulfillment for the award of the degree\nof', {
  size: 22,
  align: 'center',
  spaceBefore: 60,
  spaceAfter: 60,
  firstLine: 0
});

xml += p('BACHELOR OF TECHNOLOGY', {
  bold: true,
  size: 26,
  align: 'center',
  spaceBefore: 60,
  spaceAfter: 40,
  firstLine: 0
});

xml += p('IN', {
  bold: true,
  size: 22,
  align: 'center',
  spaceBefore: 20,
  spaceAfter: 20,
  firstLine: 0
});

xml += p('COMPUTER SCIENCE AND BUSINESS SYSTEMS', {
  bold: true,
  size: 26,
  align: 'center',
  spaceBefore: 40,
  spaceAfter: 240,
  firstLine: 0
});

xml += p('KIT-KALAIGNARKARUNANIDHI INSTITUTE OF TECHNOLOGY', {
  bold: true,
  size: 24,
  align: 'center',
  spaceBefore: 60,
  spaceAfter: 40,
  firstLine: 0
});

xml += p('(An Autonomous Institution, affiliated to Anna University Chennai and Approved by AICTE, New Delhi)\nCOIMBATORE - 641 402', {
  size: 20,
  align: 'center',
  spaceBefore: 20,
  spaceAfter: 60,
  firstLine: 0
});

xml += p('ANNA UNIVERSITY::CHENNAI 600 025', {
  bold: true,
  size: 24,
  align: 'center',
  spaceBefore: 40,
  spaceAfter: 60,
  firstLine: 0
});

xml += p('NOVEMBER  2026', {
  bold: true,
  size: 24,
  align: 'center',
  spaceBefore: 40,
  spaceAfter: 200,
  firstLine: 0
});

// Section Break 1 (Cover Page Section)
xml += `<w:p><w:pPr><w:sectPr w:rsidR="0015618F"><w:footerReference w:type="even" r:id="rId8"/><w:footerReference w:type="default" r:id="rId9"/><w:footerReference w:type="first" r:id="rId10"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1439" w:right="1443" w:bottom="1877" w:left="2162" w:header="720" w:footer="720" w:gutter="0"/><w:cols w:space="720"/></w:sectPr></w:pPr></w:p>`;

// ==========================================
// 2. BONAFIDE CERTIFICATE
// ==========================================
xml += p('KIT-KALAIGNARKARUNANIDHI INSTITUTE OF TECHNOLOGY\nCOIMBATORE - 641 402', {
  bold: true,
  size: 24,
  align: 'center',
  spaceBefore: 120,
  spaceAfter: 40,
  firstLine: 0
});

xml += p('ANNA UNIVERSITY::CHENNAI 600 025', {
  bold: true,
  size: 22,
  align: 'center',
  spaceBefore: 20,
  spaceAfter: 160,
  firstLine: 0
});

xml += p('BONAFIDE CERTIFICATE', {
  bold: true,
  size: 26,
  align: 'center',
  spaceBefore: 60,
  spaceAfter: 180,
  firstLine: 0
});

xml += p('Certified that this project report "OFFAT-X: A SANDBOXED, DEPENDENCY-AWARE AND ROLE-DIFFERENTIAL FRAMEWORK FOR AUTOMATED AUTHORIZATION TESTING OF REST APIS" is the bonafide work of SABARI YUHENDRAN M (711523BCB045), SADHANA M (711523BCB046), and JEGAN S (711523BCB024) who carried out the project work under my supervision. Certified further, that to the best of my knowledge the work reported herein does not form part of any other project report or dissertation on the basis of which a degree or award was conferred on an earlier occasion on this or any other candidate.', {
  size: 24,
  align: 'both',
  line: 360,
  firstLine: 720,
  spaceBefore: 80,
  spaceAfter: 240
});

// Signatures Table
xml += buildTable(
  ['SUPERVISOR', 'HEAD OF THE DEPARTMENT'],
  [
    [
      'Dr. PRIYA A\nAssistant Professor\nDepartment of Computer Science and Business Systems\nKIT-Kalaignarkarunanidhi Institute of Technology\nCoimbatore - 641 402',
      'Mr. PANDIARAJAN S\nAssistant Professor (Sl.Gr) & Head\nDepartment of Computer Science and Business Systems\nKIT-Kalaignarkarunanidhi Institute of Technology\nCoimbatore - 641 402'
    ]
  ],
  [4680, 4680]
);

xml += p('Submitted for the university Project viva-voce Examination held on ......................................', {
  size: 22,
  align: 'left',
  spaceBefore: 300,
  spaceAfter: 180,
  firstLine: 0
});

xml += buildTable(
  ['INTERNAL EXAMINER', 'EXTERNAL EXAMINER'],
  [['\n\n........................................................', '\n\n........................................................']],
  [4680, 4680]
);

// ==========================================
// 3. DECLARATION
// ==========================================
xml += p('DECLARATION', {
  bold: true,
  size: 26,
  align: 'center',
  spaceBefore: 300,
  spaceAfter: 180,
  firstLine: 0
});

xml += p('We jointly declare that the project report on "OFFAT-X: A SANDBOXED, DEPENDENCY-AWARE AND ROLE-DIFFERENTIAL FRAMEWORK FOR AUTOMATED AUTHORIZATION TESTING OF REST APIS" is the result of original work done by us and to the best of our knowledge, similar work has not been submitted to ANNA UNIVERSITY, CHENNAI for the requirement of the Degree of Bachelor of Technology in Computer Science and Business Systems. This project report is submitted in partial fulfillment of the requirement for the award of the Degree of Bachelor of Technology in Computer Science and Business Systems.', {
  size: 24,
  align: 'both',
  line: 360,
  firstLine: 720,
  spaceBefore: 80,
  spaceAfter: 200
});

xml += p('Signature of Candidates:\n\n1. SABARI YUHENDRAN M  [711523BCB045]  ........................................................\n\n2. SADHANA M           [711523BCB046]  ........................................................\n\n3. JEGAN S             [711523BCB024]  ........................................................', {
  size: 22,
  align: 'left',
  spaceBefore: 120,
  spaceAfter: 160,
  firstLine: 0
});

xml += p('Place: Coimbatore\nDate:  November 2026', {
  size: 22,
  align: 'left',
  spaceBefore: 60,
  spaceAfter: 200,
  firstLine: 0
});

// ==========================================
// 4. ACKNOWLEDGEMENT
// ==========================================
xml += p('ACKNOWLEDGEMENT', {
  bold: true,
  size: 26,
  align: 'center',
  spaceBefore: 240,
  spaceAfter: 160,
  firstLine: 0
});

xml += p('Owing deeply to the supreme, we extend our sincere thanks to God almighty who has made all things possible.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 40,
  spaceAfter: 80
});

xml += p('We extend our heartfelt gratitude towards our revered Founder Chairman Thiru. Pongalur N. Palanisamy, Vice Chairperson Mrs. Indu Murugesan, and Executive Trustee Mr. A. Suriya, for providing us with the necessary state-of-the-art infrastructure, computing laboratories, and motivating academic atmosphere to undertake this project.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 40,
  spaceAfter: 80
});

xml += p('We wish to express our sincere gratitude to our beloved Principal Dr. K. Ramasamy, and Dr. S. Vimal, Dean (School of Computing & Emerging Technologies), for the excellent facilities and continuous academic encouragement provided to complete this project work successfully.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 40,
  spaceAfter: 80
});

xml += p('Our profound gratitude passes on to Mr. Pandiarajan S, Assistant Professor (Sl.Gr) & Head of the Department of Computer Science and Business Systems, for his valuable guidance, support, and administrative encouragement throughout the duration of this project.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 40,
  spaceAfter: 80
});

xml += p('We are exceedingly grateful to our project supervisor Dr. Priya A, Assistant Professor, Department of Computer Science and Business Systems, for her constant intellectual guidance, technical insights, inspiring discussions, and patient support that led to the successful realization of OFFAT-X.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 40,
  spaceAfter: 80
});

xml += p('The acknowledgement would be incomplete without a deep word of thanks to our beloved parents, faculty members, and friends for their enduring patience, moral encouragement, and sincere assistance throughout our academic journey.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 40,
  spaceAfter: 160
});

xml += p('SABARI YUHENDRAN M               [711523BCB045]\nSADHANA M                        [711523BCB046]\nJEGAN S                          [711523BCB024]', {
  bold: true,
  size: 22,
  align: 'right',
  spaceBefore: 60,
  spaceAfter: 200,
  firstLine: 0
});

// ==========================================
// 5. ABSTRACT
// ==========================================
xml += p('ABSTRACT', {
  bold: true,
  size: 26,
  align: 'center',
  spaceBefore: 240,
  spaceAfter: 160,
  firstLine: 0
});

xml += p('Modern web applications and distributed cloud systems rely overwhelmingly on RESTful APIs to interconnect client applications, enterprise microservices, and third-party integrations. However, application security testing for modern APIs remains critically inadequate when addressing relational authorization flaws. Broken Object Level Authorization (BOLA) and Broken Function Level Authorization (BFLA) rank first and fifth in the OWASP API Security Top 10 (2023), yet conventional dynamic application security testing (DAST) utilities struggle to discover them automatically because authorization decisions depend inherently on relationships between identity contexts and resource ownership states. Conventional open-source fuzzers and baseline tools—most notably unmodified OWASP OFFAT—execute tests in a stateless, per-endpoint manner without prior resource setup, trust HTTP status codes blindly (yielding false-negative escapes on 200 responses returning error bodies and false positives on normal error payloads), run third-party reconnaissance utilities without host isolation, and lack automated remediation pipelines.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 60,
  spaceAfter: 100
});

xml += p('To bridge this critical security testing gap, this project develops and presents OFFAT-X (OFFensive API Tester eXtended), a sandboxed, dependency-aware, and role-differential framework for automated authorization testing of REST APIs. OFFAT-X introduces five foundational innovations: (i) an OpenAPI contract parser that synthesizes a producer-consumer directed acyclic graph G = (V, E) and executes stateful setup sequences using bounded breadth-first search (L ≤ 4); (ii) an automated four-tier role-differential matrix (Guest < Low < Premium < Admin) evaluating horizontal object isolation and vertical function privilege escalation; (iii) a mathematical semantic response diffing engine combining Jaccard schema similarity J, owner-identifier overlap ratio O, and error signature penalties E(a) to evaluate True Vulnerability Scores D against calibrated thresholds (τ = 0.70); (iv) an ephemeral containerized sandbox running reconnaissance tools (such as DIRB) with dropped Linux capabilities and read-only filesystems to safely identify unmanaged Shadow APIs; and (v) an automated developer remediation synthesizer that outputs OASIS SARIF 2.1.0 standard alerts and integrates with GitHub Actions to gate pull requests on new Critical or High findings.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 60,
  spaceAfter: 100
});

xml += p('Empirical evaluations conducted across four standardized benchmark targets—OWASP crAPI, VAmPI, OWASP Juice Shop, and an in-house seeded multi-role API—over five rigorous execution runs demonstrate the substantial superiority of OFFAT-X over baseline testing tools. OFFAT-X achieves 0.94 precision, 0.91 recall, and a 0.92 F1-score across authorization vulnerability benchmarks, compared to 0.61 precision, 0.43 recall, and 0.50 F1 for unmodified OFFAT. Crucially, the semantic response diffing engine collapses false positive rates from 41.8% down to 4.2% (an 89.9% reduction), while the bounded stateful chaining algorithm guarantees predictable execution cost capped at 4(L + 3) requests per dependent target. The framework delivers an end-to-end autonomous DevSecOps verification pipeline that dramatically reduces Mean Time to Remediate (MTTR) while preventing privilege escalation in production API deployments.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 60,
  spaceAfter: 200
});

// ==========================================
// 6. TABLE OF CONTENTS
// ==========================================
xml += p('TABLE OF CONTENTS', {
  bold: true,
  size: 26,
  align: 'center',
  spaceBefore: 240,
  spaceAfter: 160,
  firstLine: 0
});

xml += buildTable(
  ['CHAPTER NO.', 'TITLE', 'PAGE NO.'],
  [
    ['', 'ACKNOWLEDGEMENT', 'iii'],
    ['', 'ABSTRACT', 'iv'],
    ['', 'LIST OF FIGURES', 'vii'],
    ['', 'LIST OF TABLES', 'viii'],
    ['', 'LIST OF ABBREVIATIONS', 'ix'],
    ['1', 'INTRODUCTION', '1'],
    ['', '1.1  OVERVIEW AND BACKGROUND', '1'],
    ['', '1.2  PROBLEM STATEMENT & AUTHORIZATION VULNERABILITIES', '2'],
    ['', '1.3  BASELINE LIMITATIONS OF OWASP OFFAT', '4'],
    ['', '1.4  OBJECTIVES AND CONTRIBUTIONS OF OFFAT-X', '5'],
    ['', '1.5  ORGANIZATION OF THE REPORT', '6'],
    ['2', 'LITERATURE REVIEW', '7'],
    ['', '2.1  REVIEW OF RELATED WORK', '7'],
    ['', '2.1.1  Specification-Driven API Fuzzing & Grammar Testing', '7'],
    ['', '2.1.2  Dual-Identity and Passive Traffic Analyzers', '8'],
    ['', '2.1.3  OpenAPI Baseline Dynamic Vulnerability Assessment', '9'],
    ['', '2.1.4  Sandboxed Reconnaissance & Ephemeral Tool Isolation', '10'],
    ['', '2.1.5  DevSecOps Integration, SARIF & Security Merge Gates', '11'],
    ['', '2.2  CONCLUSION FROM LITERATURE REVIEW & RESEARCH GAP', '12'],
    ['3', 'SYSTEM ANALYSIS', '13'],
    ['', '3.1  EXISTING SYSTEM', '13'],
    ['', '3.1.1  DRAWBACKS OF EXISTING SYSTEM', '14'],
    ['', '3.1.2  BLOCK DIAGRAM OF EXISTING SYSTEM', '15'],
    ['', '3.2  PROPOSED SYSTEM', '16'],
    ['', '3.2.1  MERITS OF PROPOSED SYSTEM', '17'],
    ['', '3.2.2  BLOCK DIAGRAM OF PROPOSED SYSTEM', '18'],
    ['4', 'MATERIALS AND METHODS', '19'],
    ['', '4.1  HARDWARE SPECIFICATIONS', '19'],
    ['', '4.2  SOFTWARE SPECIFICATIONS', '20'],
    ['', '4.3  METHODOLOGY AND MATHEMATICAL FORMULATION', '21'],
    ['', '4.3.1  OpenAPI Ingestion & Dependency Graph Construction', '21'],
    ['', '4.3.2  Dependency-Aware Stateful Chaining Algorithm', '23'],
    ['', '4.3.3  Four-Tier Role-Differential Matrix Formulation', '25'],
    ['', '4.3.4  Semantic Response Diffing Engine Formulation', '27'],
    ['', '4.3.5  Ephemeral Sandboxed Reconnaissance & Security Controls', '29'],
    ['', '4.3.6  Composite CVSS Scoring & Remediation Synthesis', '31'],
    ['', '4.3.7  CI/CD SARIF Security Gating Engine', '33'],
    ['5', 'EXPERIMENTAL SETUP AND PROCEDURE', '35'],
    ['', '5.1  BENCHMARK DATASET CONSTRUCTION', '35'],
    ['', '5.2  SOFTWARE SETUP & ENVIRONMENT CONFIGURATION', '37'],
    ['', '5.3  WORKING PROCEDURE', '38'],
    ['', '5.4  TESTING AND VALIDATION METHODOLOGY', '40'],
    ['6', 'RESULTS AND DISCUSSION', '41'],
    ['', '6.1  MULTI-TARGET PERFORMANCE COMPARISON', '41'],
    ['', '6.2  VULNERABILITY FINDINGS AND REMEDIATION ANALYSIS', '44'],
    ['', '6.3  SEMANTIC DIFFER RESPONSE BEHAVIOR & CALIBRATION', '47'],
    ['', '6.4  FEATURE ABLATION STUDY', '50'],
    ['', '6.5  OPERATIONAL PERFORMANCE AND SANDBOX OVERHEAD', '53'],
    ['', '6.6  COMPREHENSIVE FINDINGS EVIDENCE & REMEDIATION', '56'],
    ['', '6.7  DISCUSSION, TRADE-OFFS & THREATS TO VALIDITY', '59'],
    ['7', 'CONCLUSION AND FUTURE ENHANCEMENT', '61'],
    ['', '7.1  CONCLUSION', '61'],
    ['', '7.2  FUTURE ENHANCEMENT', '62'],
    ['', 'APPENDIX A - SAMPLE CODING', '63'],
    ['', 'APPENDIX B - OUTPUT (PROJECT SCREENSHOTS)', '75'],
    ['', 'REFERENCES', '85'],
    ['', 'LIST OF PUBLICATIONS', '88']
  ],
  [1800, 6360, 1200]
);

// ==========================================
// 7. LIST OF FIGURES
// ==========================================
xml += p('LIST OF FIGURES', {
  bold: true,
  size: 26,
  align: 'center',
  spaceBefore: 300,
  spaceAfter: 160,
  firstLine: 0
});

xml += buildTable(
  ['FIGURE NO.', 'TITLE', 'PAGE NO.'],
  [
    ['3.1', 'Block diagram of existing baseline testing systems (unmodified OFFAT)', '15'],
    ['3.2', 'Architecture and block diagram of the proposed OFFAT-X framework', '18'],
    ['4.1', 'End-to-end OFFAT-X methodology pipeline flowchart', '22'],
    ['6.1', 'Comparative multi-target detection performance (Precision, Recall, F1, FPR)', '43'],
    ['6.2', 'Vulnerability category distribution and discovery breakdown', '46'],
    ['6.3', 'Semantic differ analytical response curve (Score D vs Owner overlap O)', '49'],
    ['6.4', 'Stepwise module ablation progression', '52'],
    ['6.5', 'Chaining complexity: bounded request scaling 4(L + 3) vs chain depth', '54'],
    ['6.6', 'Computational latency profile and ephemeral container overhead', '55'],
    ['B.1', 'OFFAT-X CLI terminal execution and interactive banner', '75'],
    ['B.1b', 'GitHub Actions automated CI/CD PR merge gating console', '76'],
    ['B.2', 'Executive HTML security report dashboard', '77'],
    ['B.3', 'Ephemeral DIRB shadow API & undocumented endpoint discovery console', '79'],
    ['B.3b', 'Rate-limit probing and header bypass console', '80'],
    ['B.4', 'JSON Web Token (JWT) security analysis & exploitation proof-of-concept', '81'],
    ['B.4b', 'GraphQL advanced security testing console', '82'],
    ['B.5', 'Role-differential BOLA/BFLA comparison table and semantic diff evidence', '83'],
    ['B.5b', 'OASIS SARIF 2.1.0 standard export and code scanning integration', '84']
  ],
  [1800, 6360, 1200]
);

// ==========================================
// 8. LIST OF TABLES
// ==========================================
xml += p('LIST OF TABLES', {
  bold: true,
  size: 26,
  align: 'center',
  spaceBefore: 300,
  spaceAfter: 160,
  firstLine: 0
});

xml += buildTable(
  ['TABLE NO.', 'TITLE', 'PAGE NO.'],
  [
    ['2.1', 'Documented capability comparison across state-of-the-art API security tools', '12'],
    ['4.1', 'Hardware and computing platform specification', '19'],
    ['4.2', 'Software stack and library specification', '20'],
    ['4.3', 'Container security controls for ephemeral sandboxed tools', '30'],
    ['4.4', 'Role-differential authorization classification rules and decision paths', '26'],
    ['4.5', 'Verdicts and scoring thresholds of the semantic response differ (Eq. 2)', '28'],
    ['5.1', 'Security testing domains and vulnerability categories in benchmark', '36'],
    ['5.2', 'Evaluation benchmark target characteristics and ground-truth flaws', '37'],
    ['6.1', 'Comparative multi-target performance on combined benchmark (5-run mean)', '42'],
    ['6.2', 'Severity breakdown and automated remediation efficacy across targets', '45'],
    ['6.3', 'Feature ablation progression across component configurations', '51'],
    ['6.4', 'Representative vulnerability findings, evidence, and remediation directives', '57'],
    ['6.5', 'Operational cost, throughput, and memory consumption metrics', '53'],
    ['6.6', 'Confusion matrix on the held-out evaluation targets', '58'],
    ['6.7', 'End-to-end processing throughput and latency profile across pipeline stages', '56']
  ],
  [1800, 6360, 1200]
);

// ==========================================
// 9. LIST OF ABBREVIATIONS
// ==========================================
xml += p('LIST OF ABBREVIATIONS', {
  bold: true,
  size: 26,
  align: 'center',
  spaceBefore: 300,
  spaceAfter: 160,
  firstLine: 0
});

xml += buildTable(
  ['ABBREVIATION', '', 'EXPANSION'],
  [
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
    ['GraphQL', '-', 'Graph Query Language API Standard'],
    ['HTTP', '-', 'Hypertext Transfer Protocol'],
    ['IDOR', '-', 'Insecure Direct Object Reference'],
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
    ['URI', '-', 'Uniform Resource Identifier'],
    ['XSS', '-', 'Cross-Site Scripting']
  ],
  [2200, 600, 6560]
);

// Section Break 2 (Front Matter -> Main Chapters)
xml += `<w:p><w:pPr><w:sectPr w:rsidR="0015618F"><w:footerReference w:type="even" r:id="rId11"/><w:footerReference w:type="default" r:id="rId12"/><w:footerReference w:type="first" r:id="rId13"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1453" w:right="1438" w:bottom="2533" w:left="2162" w:header="720" w:footer="864" w:gutter="0"/><w:pgNumType w:fmt="lowerRoman" w:start="3"/><w:cols w:space="720"/></w:sectPr></w:pPr></w:p>`;

// ==========================================
// CHAPTER 1: INTRODUCTION
// ==========================================
xml += chapterTitle(1, 'INTRODUCTION');

xml += secHeading('1.1  OVERVIEW AND BACKGROUND');
xml += p('In the contemporary software engineering landscape, Representational State Transfer (REST) Application Programming Interfaces (APIs) serve as the ubiquitous nervous system of the digital economy. RESTful microservices and API gateways interconnect heterogeneous client platforms—including single-page web applications, native mobile clients, Internet-of-Things (IoT) ecosystems, and partner integration middleware. Modern software architectures have shifted decisively from monolithic backends toward decoupled, API-first distributed topologies. Consequently, the vast majority of enterprise business transactions, customer authentication tokens, proprietary corporate records, and personally identifiable information (PII) transit through public and partner-facing REST endpoints on a continuous basis.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 60,
  spaceAfter: 100
});

xml += p('While this API-centric paradigm accelerates feature deployment velocity, it has expanded the software attack surface by an order of magnitude. In traditional monolithic web applications, user authorization and access control logic were frequently encapsulated within server-side template rendering frameworks or monolithic controllers. In contrast, REST APIs decouple interface presentation from raw business data, delegating the responsibility of object filtering, attribute redaction, and tenant boundary enforcement directly to individual endpoint routing handlers. This architectural decentralization introduces systemic authorization fragility across modern enterprise systems.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 60,
  spaceAfter: 120
});

xml += secHeading('1.2  PROBLEM STATEMENT & AUTHORIZATION VULNERABILITIES');
xml += p('Authorization failures represent the most critical, prevalent, and damaging threat category facing contemporary cloud APIs. The Open Web Application Security Project (OWASP) API Security Top 10 (2023) ranks Broken Object Level Authorization (BOLA, formerly termed Insecure Direct Object Reference or IDOR) as the number-one API threat (API1:2023), while Broken Function Level Authorization (BFLA) ranks fifth (API5:2023). Both vulnerabilities belong to the family of improper authorization weaknesses formally classified under MITRE Common Weakness Enumeration CWE-285 and CWE-639.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 60,
  spaceAfter: 100
});

xml += p('BOLA occurs when an API endpoint accepts a user-controlled object identifier in an HTTP request path, query string, or payload (such as GET /api/v1/orders/{orderId} or PATCH /api/v1/users/{userId}) and returns or modifies the underlying resource without rigorously validating that the authenticated requesting identity possesses legitimate ownership rights over that specific record. When exploited, BOLA allows an unauthorized low-privileged user to exfiltrate or manipulate records belonging to arbitrary other tenants simply by enumerating or forging resource keys.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 60,
  spaceAfter: 100
});

xml += p('Similarly, BFLA occurs when an API fails to enforce role-based access control (RBAC) or attribute-based access control (ABAC) policies across administrative or privileged operations. As a result, an ordinary consumer account can invoke administrative functions—such as DELETE /api/v1/admin/users/{id} or POST /api/v1/system/maintenance—merely by guessing or discovering the privileged URI.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 60,
  spaceAfter: 100
});

xml += p('Automated security testing tools struggle severely to identify BOLA and BFLA vulnerabilities. Unlike injection weaknesses (such as SQL Injection CWE-89 or Cross-Site Scripting CWE-79) which produce distinctive syntax errors, database exceptions, or reflection payloads that can be detected through pattern matching, authorization flaws do not corrupt execution syntax. A BOLA flaw produces perfectly valid HTTP 200 OK responses containing structurally sound business JSON payloads. A vulnerability scanner can detect BOLA only by synthesizing the exact relationship between multiple distinct identities and stateful resource ownership.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 60,
  spaceAfter: 120
});

xml += secHeading('1.3  BASELINE LIMITATIONS OF OWASP OFFAT');
xml += p('OWASP OFFAT (OFFensive Api Tester) is a widely recognized open-source fuzzing utility that parses OpenAPI specification contracts to automatically generate API security tests. While OFFAT provides an open, extensible baseline, an exhaustive technical analysis reveals five critical architectural limitations that severely restrict its efficacy in enterprise environments:', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 60,
  spaceAfter: 100
});

xml += p('1. Stateless Single-Request Generation: Baseline OFFAT generates tests for individual endpoints in complete isolation. When testing an operation such as GET /api/v1/orders/{orderId}, OFFAT issues requests using random synthetic integers or placeholder strings. Because the referenced order was never created in the database, the server predictably responds with HTTP 404 Not Found. OFFAT cannot differentiate a secure endpoint from an uninstantiated resource, leading to massive blind spots.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 40,
  spaceAfter: 60
});

xml += p('2. Lack of Multi-Role Privilege Differentiation: Baseline OFFAT operates under a single security credential context. It does not model horizontal tenancy (Alice vs Bob) or vertical privilege hierarchies (Guest vs Low vs Admin). Consequently, OFFAT cannot evaluate BFLA administrative privilege escalation.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 40,
  spaceAfter: 60
});

xml += p('3. Status Code Illusion and False Positives: Conventional scanners rely simplistically on HTTP status codes. However, modern microservices frequently return HTTP 200 OK accompanied by an error body (e.g. {"status": 200, "success": false, "error": "Access Denied"}), which baseline tools misclassify as a critical data leak. Conversely, endpoints that return HTTP 200 while leaking sensitive owner attributes beside generic metadata escape detection entirely.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 40,
  spaceAfter: 60
});

xml += p('4. Unsandboxed Host Execution: Baseline reconnaissance relies on invoking host-level brute-force scripts or system packages directly on the scanner operating system. This architecture exposes testing nodes to container escape, local socket sniffing, and unauthorized pivoting into private staging networks.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 40,
  spaceAfter: 60
});

xml += p('5. Absence of DevSecOps Remediation and Merge Gates: Baseline tools terminate their workflow with static terminal logs or disconnected spreadsheets. They provide no context-aware source code remediation hints and cannot enforce automated pull request gates in modern CI/CD pipelines.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 40,
  spaceAfter: 120
});

xml += secHeading('1.4  OBJECTIVES AND CONTRIBUTIONS OF OFFAT-X');
xml += p('To overcome the fundamental limitations of existing dynamic API security scanners, this project designs, implements, and evaluates OFFAT-X (OFFensive API Tester eXtended). The core objectives and scientific contributions of this research are formulated as follows:', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 60,
  spaceAfter: 100
});

xml += p('• Contribution 1 (Dependency-Aware Stateful Chaining): Formulating a schema-driven directed graph G = (V, E) of producer-consumer dependencies derived from the OpenAPI specification, executing bounded breadth-first search (BFS, L ≤ 4) to automatically instantiate requisite parent resources before testing dependent endpoints.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 40,
  spaceAfter: 60
});

xml += p('• Contribution 2 (Four-Tier Role-Differential Matrix): Constructing an automated authorization matrix across four ordered privilege tiers R = {Guest < Low < Premium < Admin} with multi-identity horizontal tenant isolation to systematically isolate and verify BOLA and BFLA flaw classes.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 40,
  spaceAfter: 60
});

xml += p('• Contribution 3 (Semantic Response Diffing Engine): Developing a mathematical multi-term diffing metric D = w_k · J + w_o · O + w_s · 1[2xx] - w_e · E(a) combining Jaccard schema similarity J, owner-identifier overlap ratio O, and error penalties E(a) to eliminate false positives arising from 200 OK error bodies.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 40,
  spaceAfter: 60
});

xml += p('• Contribution 4 (Ephemeral Containerized Reconnaissance): Integrating an isolated Docker container sandbox with dropped Linux capabilities, read-only root filesystems, and strict network egress allowlisting to execute DIRB path fuzzing and discover undocumented Shadow APIs without host compromise.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 40,
  spaceAfter: 60
});

xml += p('• Contribution 5 (Actionable Remediation & GitHub Actions Gating): Synthesizing context-aware code remediation directives, emitting OASIS SARIF 2.1.0 standard results, and deploying a native composite GitHub Action that gates pull-request merges exclusively on new High or Critical vulnerabilities.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 40,
  spaceAfter: 120
});

xml += secHeading('1.5  ORGANIZATION OF THE REPORT');
xml += p('The remainder of this Project Phase-I Report is organized as follows: Chapter 2 conducts a comprehensive literature survey of state-of-the-art API security testing frameworks, DAST scanners, grammar-based fuzzers, and container sandboxing techniques, concluding with a capability gap analysis. Chapter 3 presents the system analysis, detailing the existing baseline testing architecture, its drawbacks, and the proposed OFFAT-X framework architecture with block diagrams. Chapter 4 elaborates on the materials, software stack, mathematical formulation, and algorithmic mechanics of stateful chaining, the role matrix, the semantic differ, and the sandbox. Chapter 5 details the experimental benchmark setup, vulnerable target environments, and testing protocols. Chapter 6 presents exhaustive empirical results, confusion matrices, ablation studies, runtime performance profiling, and in-depth vulnerability evidence. Finally, Chapter 7 concludes the report and highlights future research directions. Appendix A provides complete sample source code implementations, and Appendix B exhibits full-resolution live operational screenshots.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 60,
  spaceAfter: 200
});

// ==========================================
// CHAPTER 2: LITERATURE REVIEW
// ==========================================
xml += chapterTitle(2, 'LITERATURE REVIEW');

xml += secHeading('2.1  REVIEW OF RELATED WORK');
xml += p('Automated security auditing of modern distributed application interfaces has emerged as a premier focus area in software engineering and cyber-security research. This section reviews relevant literature across five foundational research domains directly informing the development of OFFAT-X.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 60,
  spaceAfter: 100
});

xml += subSecHeading('2.1.1  Specification-Driven API Fuzzing & Grammar Testing');
xml += p('Atlidakis et al. [3] introduced RESTler, the first stateful REST API fuzzer that analyzes OpenAPI specification contracts to dynamically infer producer-consumer dependencies among request operations. RESTler tracks resource creation responses and dynamically substitutes synthesized identifiers into subsequent consumer requests. While RESTler demonstrated the utility of specification-guided request sequence generation, its primary optimization objective is detecting server crashes (HTTP 500 Internal Server Errors) and memory leaks rather than multi-identity authorization flaws. Arcuri [15] developed EvoMaster, applying evolutionary algorithms to generate automated system-level test cases for web APIs. However, EvoMaster requires white-box instrumentation of the target source code and lacks multi-role differential execution matrices.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 40,
  spaceAfter: 100
});

xml += subSecHeading('2.1.2  Dual-Identity and Passive Traffic Analyzers');
xml += p('PortSwigger [4] developed Autorize, a popular Burp Suite extension widely employed in manual web penetration testing. Autorize intercepts HTTP traffic generated by a human tester logged in as an administrative user and automatically replays each request using low-privileged session cookies. While effective for interactive proxy auditing, Autorize is fundamentally passive: it cannot synthesize tests autonomously from OpenAPI contracts and requires human testers to manually navigate every workflow. Similarly, SecureByChaos [5] released Auto-IDOR-Hunter, which mutates numeric identifiers in observed HTTP traffic streams. However, neither utility generates stateful setup sequences, nor do they support automated CI/CD pipeline gating.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 40,
  spaceAfter: 100
});

xml += subSecHeading('2.1.3  OpenAPI Baseline Dynamic Vulnerability Assessment');
xml += p('OWASP Foundation [2] established OWASP OFFAT as an open-source testing platform capable of translating OpenAPI specifications into automated security test cases. OFFAT checks for unrestricted HTTP verbs, parameter tampering, basic BOLA, and injection patterns. Nevertheless, OFFAT conducts all evaluations via single-request invocations, lacks stateful object provisioning, treats HTTP 200 responses as unconditionally secure, and lacks cross-role differential authorization capabilities.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 40,
  spaceAfter: 100
});

xml += subSecHeading('2.1.4  Sandboxed Reconnaissance & Ephemeral Tool Isolation');
xml += p('The Dark Raver [10] developed DIRB, an established web content scanner that probes web servers using dictionary attack lists to discover hidden paths and files. When executing brute-force reconnaissance against staging or production environments, running untrusted fuzzing scripts directly on testing servers presents severe supply-chain and host compromise risks. Docker Inc. [11] published formal container hardening guidelines establishing that dropping Linux capabilities (CAP_DROP ALL), applying no-new-privileges flags, mounting root filesystems as read-only, and utilizing temporary memory tmpfs structures provides robust containment against lateral network movement.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 40,
  spaceAfter: 100
});

xml += subSecHeading('2.1.5  DevSecOps Integration, SARIF & Security Merge Gates');
xml += p('OASIS Standard [7] ratified the Static Analysis Results Interchange Format (SARIF 2.1.0) as the universal JSON-based schema for sharing vulnerability findings between security analyzers and software engineering platforms. Modern code-hosting environments, notably GitHub Advanced Security and GitLab CI/CD, natively ingest SARIF reports to display interactive inline annotations in code review dashboards. Establishing automated security merge gates that fail builds only on new High or Critical vulnerabilities prevents alert fatigue while enforcing security baselines.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 40,
  spaceAfter: 120
});

xml += secHeading('2.2  CONCLUSION FROM LITERATURE REVIEW & RESEARCH GAP');
xml += p('A comparative synthesis of existing tools reveals a pronounced research gap: existing fuzzers lack authorization awareness, dual-identity proxy extensions cannot generate autonomous tests from specifications, baseline scanners produce rampant false alarms on 200 OK error bodies, and none provide ephemeral tool sandboxing combined with SARIF merge gating. Table 2.1 summarizes this capability matrix, confirming that OFFAT-X occupies a unique, unified niche in the API security landscape.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 60,
  spaceAfter: 100
});

xml += tableCaption('2.1', 'Documented capability comparison across state-of-the-art API security tools');
xml += buildTable(
  ['Capability / Feature', 'RESTler [3]', 'Autorize [4]', 'OFFAT [2]', 'OFFAT-X (Proposed)'],
  [
    ['Spec-Driven Contract Ingestion', 'Yes', 'No', 'Yes', 'Yes (OpenAPI 2.0 & 3.x)'],
    ['Stateful Dependency Chaining', 'Yes', 'No', 'No', 'Yes (BFS Bounded L ≤ 4)'],
    ['Multi-Role Privilege Matrix', 'No', 'Partial (2 Tiers)', 'No', 'Yes (4 Privilege Tiers)'],
    ['BOLA & BFLA Detection Classes', 'No', 'Partial', 'Partial', 'Yes (Full CWE-285/639)'],
    ['Semantic Response Diffing', 'No', 'No', 'No', 'Yes (Equation 2)'],
    ['Sandboxed Reconnaissance', 'No', 'No', 'No', 'Yes (Hardened Container)'],
    ['Automated Remediation Hints', 'No', 'No', 'No', 'Yes (Contextual Patches)'],
    ['SARIF & CI/CD Merge Gate', 'No', 'No', 'Partial', 'Yes (GitHub Actions Gate)']
  ],
  [2800, 1800, 2000, 1800, 2560]
);

// ==========================================
// CHAPTER 3: SYSTEM ANALYSIS
// ==========================================
xml += chapterTitle(3, 'SYSTEM ANALYSIS');

xml += secHeading('3.1  EXISTING SYSTEM');
xml += p('Conventional dynamic API vulnerability testing relies predominantly on single-request fuzzing tools, proxy-based interceptors, and unmodified baseline scanners. In existing workflows, an OpenAPI specification document is ingested by a fuzzer that parses routes and parameters into a flat list of endpoints. The fuzzer then iterates through endpoints sequentially, transmitting individual HTTP requests containing fuzzed or placeholder parameter values under a single static authentication token.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 60,
  spaceAfter: 100
});

xml += subSecHeading('3.1.1  Drawbacks of Existing System');
xml += p('The existing paradigm suffers from five catastrophic architectural shortcomings:', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 40,
  spaceAfter: 80
});

xml += p('1. 404 Setup Failures: Because child endpoints require pre-existing database entities, single-request scanners fail on dependent endpoints, producing 404 responses that conceal authorization weaknesses.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 40,
  spaceAfter: 60
});

xml += p('2. Single-Identity Blindness: Without multi-user execution contexts, existing tools cannot verify whether Alice can manipulate Bob’s records or whether a low-privileged account can invoke administrative routes.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 40,
  spaceAfter: 60
});

xml += p('3. False Positive Deluge: Relying strictly on HTTP status codes causes existing tools to trigger high-volume false alarms whenever servers respond with 200 OK error envelopes, creating severe alert fatigue.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 40,
  spaceAfter: 60
});

xml += p('4. Unsandboxed Security Exposure: Running third-party recon scripts directly on host environments exposes test runners to command injection, credential leaks, and lateral network compromise.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 40,
  spaceAfter: 60
});

xml += p('5. High Remediation MTTR: Disconnected scanning reports leave developers with no guidance on code patches, resulting in extended Mean Time to Remediate.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 40,
  spaceAfter: 120
});

xml += subSecHeading('3.1.2  Block Diagram of Existing System');
xml += p('Figure 3.1 illustrates the architectural workflow common to existing fragmented security testing installations, highlighting the disconnected silos, status-code illusions, and manual triaging bottlenecks that impede enterprise remediation.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 60,
  spaceAfter: 100
});

xml += drawings['rId14'] || ''; // Figure 3.1 (image2.jpg)
xml += figureCaption('3.1', 'Block Diagram of Existing Baseline Testing Architecture');

xml += secHeading('3.2  PROPOSED SYSTEM');
xml += p('To fundamentally resolve the drawbacks of conventional scanners, this project proposes and implements the OFFAT-X framework. OFFAT-X introduces a six-layer architecture designed for comprehensive, deterministic, and automated API authorization auditing:', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 60,
  spaceAfter: 100
});

xml += p('1. Specification & DAG Ingestion Layer: Parses OpenAPI 2.0 and 3.x contracts using Kin-OpenAPI, automatically deriving a Directed Acyclic Graph G = (V, E) of producer-consumer dependencies between endpoints.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 40,
  spaceAfter: 60
});

xml += p('2. Stateful Chaining Planner: Traverses the dependency graph via bounded BFS (depth L ≤ 4) to automatically execute setup sequences, provisioning live resource objects before testing consumer routes.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 40,
  spaceAfter: 60
});

xml += p('3. Four-Tier Role-Differential Matrix: Orchestrates multi-identity testing across Guest, Low, Premium, and Admin privilege tiers to systematically test horizontal data isolation and vertical function permissions.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 40,
  spaceAfter: 60
});

xml += p('4. Ephemeral Sandboxed Reconnaissance: Executes DIRB path discovery inside a hardened Docker container with dropped Linux capabilities and read-only mounts, detecting undocumented Shadow APIs.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 40,
  spaceAfter: 60
});

xml += p('5. Semantic Response Diffing Engine: Replaces simplistic status code checks with Equation (2), mathematically scoring schema Jaccard similarity, owner value overlap, and error penalties.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 40,
  spaceAfter: 60
});

xml += p('6. DevSecOps CI/CD Integration: Generates interactive HTML dashboards, outputs OASIS SARIF 2.1.0 standard files, provides context-aware code patches, and gates pull requests via GitHub Actions.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 40,
  spaceAfter: 120
});

xml += subSecHeading('3.2.1  Merits of Proposed System');
xml += p('• Zero 404 Setup Dead-Ends: Autonomous state setup guarantees live objects exist prior to testing.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 40,
  spaceAfter: 60
});

xml += p('• Near-Zero False Positive Rate (4.2%): Semantic diffing eliminates alarms caused by 200 OK error envelopes.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 40,
  spaceAfter: 60
});

xml += p('• Complete Privilege Coverage: Uncovers both BOLA (OWASP API1) and BFLA (OWASP API5) flaws.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 40,
  spaceAfter: 60
});

xml += p('• Host Security Assurance: Container isolation guarantees third-party fuzzers cannot breach test runners.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 40,
  spaceAfter: 60
});

xml += p('• Actionable Pull-Request Gating: Bridges security finding discovery directly into developer IDEs and Git workflows.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 40,
  spaceAfter: 120
});

xml += subSecHeading('3.2.2  Block Diagram of Proposed System');
xml += p('Figure 3.2 depicts the complete six-layer architectural framework of OFFAT-X, illustrating the interplay between specification ingestion, stateful chaining, role-differential execution, sandboxing, semantic diffing, and CI/CD reporting.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 60,
  spaceAfter: 100
});

xml += drawings['rId15'] || ''; // Figure 3.2 (image3.jpg)
xml += figureCaption('3.2', 'Architecture and Block Diagram of Proposed OFFAT-X Framework');

// ==========================================
// CHAPTER 4: MATERIALS AND METHODS
// ==========================================
xml += chapterTitle(4, 'MATERIALS AND METHODS');

xml += secHeading('4.1  HARDWARE SPECIFICATIONS');
xml += p('The experimental development, benchmarking, containerized sandboxing, and evaluation protocols for OFFAT-X were conducted on a standardized workstation environment specified in Table 4.1.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 60,
  spaceAfter: 100
});

xml += tableCaption('4.1', 'Hardware and Computing Platform Specification');
xml += buildTable(
  ['Component', 'Platform Specification', 'Operational Role in System'],
  [
    ['Host Processor', 'Intel Core i7-1360P / AMD Ryzen 7 (12 cores / 16 threads, up to 5.0 GHz)', 'Executes orchestrator, DAG graph engine, and concurrent test runner'],
    ['System Memory', '16 GB DDR5 4800 MHz Dual-Channel RAM', 'Hosts memory caches, response diffing buffers, and JSON parse trees'],
    ['Disk Storage', '512 GB PCIe 4.0 NVMe Solid State Drive (3500 MB/s)', 'Stores benchmark repos, wordlists, SARIF artifacts, and Docker layers'],
    ['Network Interface', 'Intel Wi-Fi 6E AX211 / Gigabit Ethernet (1000 Mbps)', 'Maintains high-throughput loopback and network sockets for HTTP traffic'],
    ['Operating System', 'Microsoft Windows 11 Enterprise (64-bit) / Ubuntu 22.04 LTS via WSL2', 'Primary execution host for Node.js, Go compiler, and Docker daemon']
  ],
  [2200, 4200, 2960]
);

xml += secHeading('4.2  SOFTWARE SPECIFICATIONS');
xml += p('The implementation of OFFAT-X is built upon a high-performance, strongly typed software stack utilizing Go 1.22+, Kin-OpenAPI, Docker Engine, and modern networking libraries detailed in Table 4.2.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 60,
  spaceAfter: 100
});

xml += tableCaption('4.2', 'Software Stack and Library Specification');
xml += buildTable(
  ['Software Layer', 'Package / Component & Version', 'Functional Purpose in OFFAT-X'],
  [
    ['Core Language Runtime', 'Go (Golang) v1.22.4 (64-bit)', 'High-performance compiled backend runtime for concurrent testing'],
    ['OpenAPI Contract Parser', 'github.com/getkin/kin-openapi v0.127.0', 'Validates and normalizes Swagger 2.0 and OpenAPI 3.0/3.1 schemas'],
    ['HTTP Transport Engine', 'github.com/valyala/fasthttp v1.55.0', 'Zero-memory-allocation HTTP client for rapid request transmission'],
    ['JWT Cryptography', 'github.com/golang-jwt/jwt/v5 v5.2.1', 'Parses, verifies, forges, and tests JSON Web Token security flaws'],
    ['Structured Logging', 'github.com/rs/zerolog v1.33.0', 'High-throughput, structured JSON console and audit logger'],
    ['Container Virtualization', 'Docker Engine v26.1 / containerd v1.6', 'Provisions hardened ephemeral sandbox containers for reconnaissance'],
    ['Reconnaissance Engine', 'DIRB v2.22 (Debian Linux Container)', 'Dictionary-based path discovery for unmanaged Shadow API detection'],
    ['Reporting Standards', 'OASIS SARIF v2.1.0 JSON & HTML5', 'Universal interchange format for GitHub Security and web reporting']
  ],
  [2200, 3600, 3560]
);

xml += secHeading('4.3  METHODOLOGY AND MATHEMATICAL FORMULATION');
xml += p('Figure 4.1 depicts the sequential eight-stage scanning and analysis pipeline implemented in OFFAT-X. The subsequent subsections develop the mathematical formulation, algorithmic mechanics, and operational controls of each pipeline phase.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 60,
  spaceAfter: 100
});

xml += drawings['rId16'] || ''; // Figure 4.1 (image4.jpg)
xml += figureCaption('4.1', 'End-to-End OFFAT-X Methodology Pipeline Flowchart');

xml += subSecHeading('4.3.1  OpenAPI Ingestion & Dependency Graph Construction');
xml += p('Before tests are generated, OFFAT-X normalizes OpenAPI 2.0 and 3.x specifications into a standardized schema representation. Let O = {o_1, o_2, ..., o_n} denote the set of API operations defined in the contract. A Directed Acyclic Graph G = (V, E) is synthesized where vertices V = O represent endpoints and directed edges e = (p, c) ∈ E represent producer-consumer relationships.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 40,
  spaceAfter: 80
});

xml += p('An operation p is designated a producer of resource type τ if its 2xx HTTP response schema defines an identifier attribute (e.g. id, orderId, userId). Conversely, operation c is designated a consumer of resource type τ if its path template or query parameters require a matching key (e.g. /api/v1/orders/{orderId}). Graph construction maps every consumer target to candidate producer sequences capable of instantiating valid resource instances.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 40,
  spaceAfter: 100
});

xml += subSecHeading('4.3.2  Dependency-Aware Stateful Chaining Algorithm');
xml += p('When evaluating an endpoint requiring an existing resource, OFFAT-X traverses G using Breadth-First Search (BFS) to identify the shortest setup path P(t) originating from an unparameterized producer (such as POST /orders). The algorithm strictly bounds chain depth to L ≤ 4 steps. Algorithm 1 formally details this execution:', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 40,
  spaceAfter: 80
});

xml += buildTable(
  ['Step', 'Algorithmic Operation & Execution Logic'],
  [
    ['1', 'Build graph G = (V, E) from normalized OpenAPI contract; derive resource types τ(o) per operation.'],
    ['2', 'For consumer target t, discover shortest setup sequence P(t) by BFS from producers of τ, bounded by depth L ≤ 4.'],
    ['3', 'For each privilege tier r ∈ R, execute P(t) using identity credentials of r; store generated IDs in cache C_r[τ].'],
    ['4', 'If setup execution fails (non-2xx response), mark (t, r) as Inconclusive to prevent false vulnerability reporting.'],
    ['5', 'Replay consumer target t using cached entity ID against an alternative identity r\' ∈ R.'],
    ['6', 'Record tuple (t, r, r\', status, body) in evidence set for semantic response diffing and triaging.']
  ],
  [1200, 8160]
);

xml += subSecHeading('4.3.3  Four-Tier Role-Differential Matrix Formulation');
xml += p('Privilege tiers in OFFAT-X form the ordered set R = {Guest < Low < Premium < Admin}. Each tier maintains distinct authenticated identities to enable both horizontal and vertical differential testing. Table 4.4 specifies the classification decision paths:', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 40,
  spaceAfter: 80
});

xml += tableCaption('4.4', 'Role-Differential Authorization Classification Rules and Decision Paths');
xml += buildTable(
  ['Attacker Identity → Target Resource', 'Decisive Condition & Response Evaluation', 'Assigned Vulnerability Finding'],
  [
    ['Same Tier (Bob) → Alice’s Object', 'Semantic match (Eq. 2 D ≥ 0.70) on owner resource', 'BOLA Confirmed (CWE-639 / OWASP API1)'],
    ['Unauthenticated Guest → Authenticated Object', 'Semantic match (Eq. 2 D ≥ 0.70) without credentials', 'Broken Authentication (CWE-306 / API2)'],
    ['Low Tier User → Admin-Only Function', 'HTTP 200 OK received where RBAC policy denies access', 'BFLA Confirmed (CWE-285 / OWASP API5)'],
    ['Low Tier User → Premium Field / Action', 'Response body leaks premium-restricted attributes', 'BOPLA Confirmed (CWE-200 / OWASP API3)'],
    ['Arbitrary Tier → PUT / PATCH / DELETE', 'Destructive method modifies scanner-provisioned object', 'Unauthorized Mutation Flaw']
  ],
  [2800, 3600, 2960]
);

xml += subSecHeading('4.3.4  Semantic Response Diffing Engine Formulation');
xml += p('Conventional status code checkers fail because frameworks frequently return HTTP 200 accompanied by an error flag. For attacker response body a and resource owner baseline v, OFFAT-X computes Jaccard schema key similarity J and owner-identifier overlap ratio O:', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 40,
  spaceAfter: 80
});

xml += p('J = |K(a) ∩ K(v)| / |K(a) ∪ K(v)|                    (1)', {
  font: 'Courier New',
  bold: true,
  size: 22,
  align: 'center',
  firstLine: 0,
  spaceBefore: 40,
  spaceAfter: 40
});

xml += p('O = |V(v) ∩ V(a)| / |V(v)|                          (2)', {
  font: 'Courier New',
  bold: true,
  size: 22,
  align: 'center',
  firstLine: 0,
  spaceBefore: 40,
  spaceAfter: 40
});

xml += p('The composite Semantic Diff Score D is calculated as:', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 40,
  spaceAfter: 60
});

xml += p('D = w_k · J + w_o · O + w_s · 1[2xx] - w_e · E(a)        (3)', {
  font: 'Courier New',
  bold: true,
  size: 24,
  align: 'center',
  firstLine: 0,
  spaceBefore: 60,
  spaceAfter: 60
});

xml += p('Where w_k = 0.3 (schema key weight), w_o = 0.5 (owner value overlap weight), w_s = 0.2 (2xx status indicator), and w_e = 0.6 (error signature penalty). A response is classified as vulnerable if and only if D ≥ τ = 0.70. Table 4.5 summarizes the scoring outcomes:', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 40,
  spaceAfter: 80
});

xml += tableCaption('4.5', 'Verdicts and Scoring Thresholds of the Semantic Response Differ (Eq. 2)');
xml += buildTable(
  ['Attacker Response Scenario', 'Evaluated Score D', 'Assigned Verdict', 'Underlying Rationale'],
  [
    ['200 OK, full owner data (matching shape & IDs)', 'D = 1.00', 'VULNERABLE (BOLA)', 'Attacker exfiltrated complete victim object'],
    ['200 OK, owner IDs present in altered shape', 'D = 0.70', 'VULNERABLE (At τ)', 'True data leak despite wrapper modification'],
    ['200 OK, matching schema shape but zero owner IDs', 'D = 0.50', 'NOT VULNERABLE', 'Generic response template; no sensitive data leaked'],
    ['200 OK, error body envelope {"success": false}', 'D = -0.10', 'NOT VULNERABLE', 'Error signature penalty suppresses false alarm'],
    ['HTTP 401 / 403 Forbidden', 'D = 0.00', 'NOT VULNERABLE', 'Proper authorization boundary enforced'],
    ['HTTP 404 / 500 Anomaly', 'D = 0.00', 'INCONCLUSIVE', 'Missing resource or server error; non-exploitable']
  ],
  [2800, 1600, 2200, 2760]
);

xml += subSecHeading('4.3.5  Ephemeral Sandboxed Reconnaissance & Security Controls');
xml += p('To detect undocumented Shadow APIs (OWASP API9:2023) without risking host server integrity, OFFAT-X launches a dedicated ephemeral Docker container running DIRB. The container enforces strict security controls detailed in Table 4.3:', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 40,
  spaceAfter: 80
});

xml += tableCaption('4.3', 'Container Security Controls for Ephemeral Sandboxed Tools');
xml += buildTable(
  ['Security Dimension', 'Configured Setting', 'Prevented Cyber Threat Vector'],
  [
    ['Container Identity', 'Non-root user with fixed UID 10001', 'Prevents privilege escalation to host root in case of exploit'],
    ['Filesystem Integrity', 'Read-only rootfs; temporary tmpfs for /tmp', 'Eliminates persistent malware installation or backdoor staging'],
    ['Kernel Capabilities', 'Drop ALL capabilities; no-new-privileges', 'Prevents container escapes and raw socket packet sniffing'],
    ['Resource Ceilings', 'CPU: 0.5 cores, RAM: 256 MB, PID limit: 100', 'Prevents host resource exhaustion and denial-of-service'],
    ['Egress Network Boundary', 'Network allowlist restricted to scope target host', 'Prevents unauthorized scanning of internal cluster infrastructure'],
    ['Credential Isolation', 'OAS contract read-only; secrets via runtime env', 'Prevents host file leakage and secret exposure in container images']
  ],
  [2200, 3600, 3560]
);

xml += subSecHeading('4.3.6  Composite CVSS Scoring & Remediation Synthesis');
xml += p('Discovered vulnerabilities are triaged using Common Vulnerability Scoring System (CVSS v3.1) metrics, mapping findings to MITRE CWE definitions and OWASP API categories. Crucially, OFFAT-X synthesizes context-aware source code remediation patches (e.g. suggesting Prisma/SQL tenant ownership filters or Express RBAC middleware) beside vulnerable findings.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 40,
  spaceAfter: 100
});

xml += subSecHeading('4.3.7  CI/CD SARIF Security Gating Engine');
xml += p('OFFAT-X outputs full test results in OASIS SARIF 2.1.0 JSON format and deploys a native GitHub Action. The merge gate compares the current pull request against the default branch baseline using structural endpoint fingerprints. Builds fail only when new High or Critical vulnerabilities are introduced, preventing alert fatigue.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 40,
  spaceAfter: 200
});

// ==========================================
// CHAPTER 5: EXPERIMENTAL SETUP AND PROCEDURE
// ==========================================
xml += chapterTitle(5, 'EXPERIMENTAL SETUP AND PROCEDURE');

xml += secHeading('5.1  BENCHMARK DATASET CONSTRUCTION');
xml += p('To evaluate OFFAT-X against state-of-the-art baselines under realistic, reproducible conditions, four diverse benchmark targets were established, encompassing both public vulnerable training APIs and an in-house multi-role service. Table 5.1 and Table 5.2 describe the benchmark characteristics:', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 60,
  spaceAfter: 100
});

xml += tableCaption('5.1', 'Security Testing Domains and Vulnerability Categories in Benchmark');
xml += buildTable(
  ['Vulnerability Domain', 'Representative CWE', 'Tested Mechanism & Evaluation Technique'],
  [
    ['Broken Object Level Auth (BOLA)', 'CWE-639', 'Horizontal tenant replay on dynamically created order and vehicle entities'],
    ['Broken Function Level Auth (BFLA)', 'CWE-285', 'Vertical role escalation probing admin-only delete and export endpoints'],
    ['Broken Authentication & JWT', 'CWE-287 / 347', 'Algorithm none forging, expired token replays, and key confusion exploits'],
    ['Shadow & Undocumented APIs', 'CWE-200 / API9', 'Dictionary path fuzzing comparing live routes against OpenAPI contracts'],
    ['Rate Limiting & Abuse', 'CWE-799', 'High-frequency request flooding and X-Forwarded-For IP spoofing probes'],
    ['Injection & SSRF Weaknesses', 'CWE-89 / 918', 'SQL syntax injection, path traversal kid attacks, and callback probing']
  ],
  [2800, 1800, 4760]
);

xml += tableCaption('5.2', 'Evaluation Benchmark Target Characteristics and Ground-Truth Flaws');
xml += buildTable(
  ['Target System / API', 'Architecture & Language', 'Documented Endpoints', 'Planted Flaws', 'Auth Tiers'],
  [
    ['OWASP crAPI [12]', 'Microservices (Java, Python, Node, Go)', '24 endpoints', 'BOLA, JWT None, SSRF', 'Guest, Low, Admin'],
    ['VAmPI [13]', 'REST API (Python Flask, SQLite)', '14 endpoints', 'BOLA, Regex DoS, Auth Bypass', 'Guest, Low, Admin'],
    ['OWASP Juice Shop [14]', 'Modern Web API (Node.js, Express)', '32 endpoints', 'BFLA, BOLA, Introspection', 'Guest, Low, Admin'],
    ['In-House Multi-Role API', 'Enterprise REST (Go, PostgreSQL)', '28 endpoints', '8 BOLA, 6 BFLA, 14 Safe 200s', '4 Full Tiers (R)']
  ],
  [2200, 2600, 1500, 1700, 1360]
);

xml += secHeading('5.2  SOFTWARE SETUP & ENVIRONMENT CONFIGURATION');
xml += p('All targets were containerized using Docker Compose and deployed on dedicated loopback virtual networks (172.28.0.0/16). OFFAT-X was compiled from Go source using the command `make build`. The scope configuration file `offat-x.yml` defined target hostnames, token environment variables (LOW_TOKEN, ADMIN_TOKEN), and requests-per-second ceilings (50 rps).', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 60,
  spaceAfter: 100
});

xml += secHeading('5.3  WORKING PROCEDURE');
xml += p('The automated execution protocol proceeds through eight deterministic steps:', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 60,
  spaceAfter: 80
});

xml += p('Step 1 (Scope Verification): Ingests `offat-x.yml`, ensuring testing is strictly bounded to authorized hosts.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 30,
  spaceAfter: 50
});

xml += p('Step 2 (Spec Normalization): Reads OpenAPI contract; validates schemas and path parameters.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 30,
  spaceAfter: 50
});

xml += p('Step 3 (Sandboxed Reconnaissance): Spawns hardened DIRB container to fuzz for shadow endpoints.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 30,
  spaceAfter: 50
});

xml += p('Step 4 (DAG Graph Construction): Formulates producer-consumer dependency graph G = (V, E).', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 30,
  spaceAfter: 50
});

xml += p('Step 5 (Stateful Setup & Chaining): Executes setup sequences using BFS (L ≤ 4) to instantiate live objects.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 30,
  spaceAfter: 50
});

xml += p('Step 6 (Role-Differential Replay): Replays target endpoints across the 4 privilege tiers.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 30,
  spaceAfter: 50
});

xml += p('Step 7 (Semantic Diffing & Triaging): Evaluates Equation (2); scores responses against τ = 0.70.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 30,
  spaceAfter: 50
});

xml += p('Step 8 (Artifact Generation & CI Gate): Renders HTML dashboard, writes SARIF file, and evaluates PR merge gate.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 30,
  spaceAfter: 100
});

xml += secHeading('5.4  TESTING AND VALIDATION METHODOLOGY');
xml += p('Each tool configuration was evaluated across five independent execution runs. Standard statistical metrics were computed: Precision P = TP/(TP+FP), Recall R = TP/(TP+FN), F1-Score = 2PR/(P+R), and False Positive Rate FPR = FP/(FP+TN). A finding is marked a True Positive (TP) if and only if its endpoint path, vulnerability class, and affected identity tiers match verified ground-truth annotations.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 60,
  spaceAfter: 200
});

// ==========================================
// CHAPTER 6: RESULTS AND DISCUSSION
// ==========================================
xml += chapterTitle(6, 'RESULTS AND DISCUSSION');

xml += secHeading('6.1  MULTI-TARGET PERFORMANCE COMPARISON');
xml += p('Table 6.1 documents the comparative detection performance of unmodified baseline OFFAT versus the proposed OFFAT-X framework averaged across five independent execution runs on the combined benchmark suite. Figure 6.1 visually illustrates these comparative metrics.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 60,
  spaceAfter: 100
});

xml += tableCaption('6.1', 'Comparative Multi-Target Performance on Combined Benchmark (5-Run Mean)');
xml += buildTable(
  ['Evaluation Metric', 'Baseline OWASP OFFAT', 'Proposed OFFAT-X Framework', 'Performance Delta / Gain'],
  [
    ['True Positives (TP)', '35.4 ± 1.2', '74.8 ± 0.8', '+111.3% True Flaws Detected'],
    ['False Positives (FP)', '22.6 ± 1.5', '3.4 ± 0.5', '-85.0% False Alarms Suppressed'],
    ['False Negatives (FN)', '46.6 ± 1.8', '7.2 ± 0.8', '-84.5% Missed Vulnerabilities'],
    ['True Negatives (TN)', '31.4 ± 1.4', '78.6 ± 1.1', '+150.3% Accurate Immunities'],
    ['Precision (P)', '0.610 ± 0.021', '0.941 ± 0.009', '+54.3% Precision Improvement'],
    ['Recall (R)', '0.432 ± 0.018', '0.912 ± 0.010', '+111.1% Recall Improvement'],
    ['F1-Score', '0.506 ± 0.019', '0.926 ± 0.008', '+83.0% F1-Score Improvement'],
    ['False Positive Rate (FPR)', '41.85% ± 2.1%', '4.15% ± 0.6%', '-89.9% Relative FPR Reduction']
  ],
  [2800, 2200, 2360, 2000]
);

xml += drawings['rId17'] || ''; // Figure 6.1 (image5.jpg)
xml += figureCaption('6.1', 'Comparative Multi-Target Detection Performance (Precision, Recall, F1, FPR)');

xml += p('As evidenced in Table 6.1 and Figure 6.1, OFFAT-X achieves dramatic performance gains over the baseline scanner. Baseline OFFAT achieves an F1-score of only 0.506 due to severe recall deficiencies (0.432) and high false positives (22.6 FP per run). In contrast, OFFAT-X attains a 0.926 F1-score, boosting recall to 0.912 while suppressing false positive rates to just 4.15%.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 60,
  spaceAfter: 120
});

xml += secHeading('6.2  VULNERABILITY FINDINGS AND REMEDIATION ANALYSIS');
xml += p('Across the benchmark suites, OFFAT-X uncovered 82 distinct vulnerability instances categorized into 7 Critical, 18 High, 29 Medium, 14 Low, and 12 Data Leak instances. Figure 6.2 illustrates the category distribution, and Table 6.2 itemizes the findings breakdown and automated remediation efficacy.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 60,
  spaceAfter: 100
});

xml += drawings['rId18'] || ''; // Figure 6.2 (image6.jpg)
xml += figureCaption('6.2', 'Vulnerability Category Distribution and Discovery Breakdown');

xml += tableCaption('6.2', 'Severity Breakdown and Automated Remediation Efficacy Across Targets');
xml += buildTable(
  ['Severity Tier', 'Vulnerabilities Detected', 'Mean CVSS v3.1', 'Patch Ready (%)', 'Remediation Synthesis Method'],
  [
    ['CRITICAL', '7 instances', '9.1 ± 0.4', '100.0% (7/7)', 'Enforce JWT algorithm allowlist & identity bounds'],
    ['HIGH', '18 instances', '7.8 ± 0.5', '100.0% (18/18)', 'Attach RBAC middleware & parameter ownership checks'],
    ['MEDIUM', '29 instances', '5.4 ± 0.6', '96.5% (28/29)', 'Socket-derived IP rate limiting & introspection limits'],
    ['LOW', '14 instances', '2.8 ± 0.7', '100.0% (14/14)', 'Remove verbose debug stack-traces & headers'],
    ['DATA LEAKS', '12 instances', '6.2 ± 0.8', '100.0% (12/12)', 'Apply schema attribute redaction filters (BOPLA)']
  ],
  [1800, 2200, 1600, 1600, 2160]
);

xml += secHeading('6.3  SEMANTIC DIFFER RESPONSE BEHAVIOR & CALIBRATION');
xml += p('Figure 6.3 and Table 6.3 evaluate the analytical behavior of the semantic diffing score D (Equation 2) against the owner-identifier overlap ratio O across diverse HTTP response conditions.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 60,
  spaceAfter: 100
});

xml += drawings['rId19'] || ''; // Figure 6.3 (image7.jpg)
xml += figureCaption('6.3', 'Semantic Differ Analytical Response Curve (Score D vs Owner Overlap O)');

xml += p('Figure 6.3 demonstrates the precision of Equation (2). When an attacker receives an error-free 2xx response with matching schema shape (J = 1.0), the score crosses the vulnerability threshold τ = 0.70 as soon as owner-identifier overlap reaches O ≥ 0.40. Conversely, when the response body contains an error signature (E = 1.0), the penalty w_e · E pulls the score down to D = -0.10, completely below zero, ensuring false 200 OK alarms are eliminated.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 60,
  spaceAfter: 120
});

xml += secHeading('6.4  FEATURE ABLATION STUDY');
xml += p('To isolate the precise contribution of each architectural component, an ablation study was conducted by systematically removing one module at a time. Table 6.3 and Figure 6.4 present the results:', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 60,
  spaceAfter: 100
});

xml += tableCaption('6.3', 'Feature Ablation Progression Across Component Configurations');
xml += buildTable(
  ['Configuration Tested', 'BOLA Recall', 'BFLA Recall', 'False Positives', 'Overall F1', 'Observed Operational Defect'],
  [
    ['Full OFFAT-X Framework', '0.93', '0.89', '4', '0.92', 'Complete authorization coverage; near-zero FPR'],
    ['− Stateful Chaining', '0.41', '0.88', '6', '0.68', 'Setup dead-ends; child endpoints return 404'],
    ['− Role-Differential Matrix', '0.91', '0.35', '8', '0.65', 'Completely blind to BFLA privilege escalation'],
    ['− Semantic Response Differ', '0.92', '0.89', '38', '0.71', 'False alarm explosion on 200 OK error bodies'],
    ['− Ephemeral Sandbox', '0.93', '0.89', '4', '0.91', 'Exposes host runner to container escapes & scans']
  ],
  [2400, 1400, 1400, 1400, 1200, 1560]
);

xml += drawings['rId20'] || ''; // Figure 6.4 (image8.jpg)
xml += figureCaption('6.4', 'Stepwise Module Ablation Progression and Metric Sensitivity');

xml += secHeading('6.5  OPERATIONAL PERFORMANCE AND SANDBOX OVERHEAD');
xml += p('A critical design objective of OFFAT-X is ensuring that stateful chaining and container sandboxing do not impose unbounded computational latency or combinatorial request growth. Figure 6.5 characterizes the worst-case request complexity, proving that bounding BFS depth to L ≤ 4 guarantees a maximum of 4(L + 3) = 28 requests per target, eliminating state explosion. Figure 6.6 and Table 6.5 detail runtime performance:', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 60,
  spaceAfter: 100
});

xml += drawings['rId21'] || ''; // Figure 6.5 (image9.jpg)
xml += figureCaption('6.5', 'Chaining Complexity: Bounded Request Scaling 4(L + 3) vs Chain Depth');

xml += drawings['rId22'] || ''; // Figure 6.6 (image10.jpg)
xml += figureCaption('6.6', 'Computational Latency Profile and Ephemeral Container Overhead');

xml += tableCaption('6.5', 'Operational Cost, Throughput, and Memory Consumption Metrics');
xml += buildTable(
  ['Operational Metric', 'Baseline OWASP OFFAT', 'Proposed OFFAT-X', 'Impact / Assessment'],
  [
    ['OpenAPI Operations Covered', '68.2%', '96.4%', '+28.2% Greater Endpoint Test Coverage'],
    ['Total Suite Scan Duration', '5.12 s', '8.91 s', 'Modest 3.79s delta for 111% recall gain'],
    ['Docker Sandbox Startup', '—', '0.42 s', 'Negligible container initialization overhead'],
    ['Peak Memory Consumption', '142 MB', '198 MB', 'Lightweight memory footprint (< 200 MB)'],
    ['DIRB Reconnaissance Throughput', '—', '50.0 req/sec', 'Rapid, non-disruptive shadow path discovery']
  ],
  [2800, 2200, 2200, 2160]
);

xml += secHeading('6.6  COMPREHENSIVE FINDINGS EVIDENCE & REMEDIATION');
xml += p('Table 6.4 itemizes representative vulnerabilities discovered by OFFAT-X across the benchmark targets, citing the observed evidence and generated remediation directive:', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 60,
  spaceAfter: 100
});

xml += tableCaption('6.4', 'Representative Vulnerability Findings, Evidence, and Remediation Directives');
xml += buildTable(
  ['Endpoint & Target', 'Class & Severity', 'Observed Exploit Evidence', 'Synthesized Code Remediation Directive'],
  [
    ['GET /api/v1/orders/{id}\n(OWASP crAPI)', 'BOLA\n(CRITICAL 8.8)', 'Attacker Bob received Alice’s order JSON with D = 1.00', 'Enforce ownership filter: where: { id: req.params.id, userId: currentUser.id }'],
    ['POST /identity/vtoken\n(OWASP crAPI)', 'JWT Bypass\n(CRITICAL 9.1)', 'Forged token with alg="none" yielded 200 OK without sig', 'Enforce strict algorithm verification allowlist: jwt.WithValidMethods([]string{"RS256"})'],
    ['DELETE /api/v1/admin/users\n(OWASP Juice Shop)', 'BFLA\n(HIGH 7.5)', 'Low-tier user deleted user record with 200 OK', 'Attach RBAC middleware: router.use("/admin", requireRole("ADMIN"))'],
    ['GET /api/v1/debug/heap\n(VAmPI Target)', 'Shadow API\n(HIGH 7.5)', 'DIRB found undocumented debug dump route exposing memory', 'Disable actuator debug endpoints on production ingress or register in OAS spec'],
    ['POST /api/v1/auth/login\n(In-House Service)', 'Rate Limit Bypass\n(MEDIUM 5.3)', 'Spoofed X-Forwarded-For header bypassed 15-req throttle', 'Extract client IP strictly from socket connection rather than spoofable headers']
  ],
  [2200, 1800, 2600, 2760]
);

xml += secHeading('6.7  DISCUSSION, TRADE-OFFS & THREATS TO VALIDITY');
xml += p('Three explicit trade-offs characterize the OFFAT-X design: (i) Chaining requires additional requests to provision resources, which is strictly bounded by L ≤ 4 to prevent runtime explosion; (ii) The role matrix necessitates provisioning accounts across four tiers, which is an upfront configuration cost yielding massive gains in BFLA coverage; (iii) The semantic differ replaces binary status checks with a calibrated continuous metric D. Threats to validity include calibration of weights on specific service styles and dependency on OpenAPI contract accuracy, which is mitigated by our fallback conservative planning.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 60,
  spaceAfter: 200
});

// ==========================================
// CHAPTER 7: CONCLUSION AND FUTURE ENHANCEMENT
// ==========================================
xml += chapterTitle(7, 'CONCLUSION AND FUTURE ENHANCEMENT');

xml += secHeading('7.1  CONCLUSION');
xml += p('In this Project Phase-I work, we have designed, implemented, and empirically validated OFFAT-X, an advanced, sandboxed, dependency-aware, and role-differential framework for automated REST API authorization testing. By addressing the fundamental limitations of baseline tools, OFFAT-X bridges the gap between static contract specifications and stateful authorization reality.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 60,
  spaceAfter: 100
});

xml += p('The framework introduces stateful BFS dependency chaining to eliminate 404 setup dead-ends, a four-tier role-differential matrix to systematically uncover BOLA (OWASP API1) and BFLA (OWASP API5) flaws, an ephemeral Docker sandbox to safely discover unmanaged Shadow APIs, a mathematical semantic response diffing engine that slashes false positives by 89.9%, and an automated SARIF GitHub Action that gates pull-request merges on new vulnerabilities. Across standardized benchmarks, OFFAT-X achieved 0.94 precision, 0.91 recall, and a 0.92 F1-score with predictable bounded execution times. The platform establishes an autonomous, highly reliable DevSecOps security pipeline for modern enterprise API ecosystems.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 60,
  spaceAfter: 120
});

xml += secHeading('7.2  FUTURE ENHANCEMENT');
xml += p('Building upon the solid architectural foundation established in Phase-I, the subsequent Phase-II research and development roadmap encompasses five strategic enhancements:', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 60,
  spaceAfter: 80
});

xml += p('1. Native OpenAPI 3.1 & JSON Schema 2020-12 Support: Upgrading spec ingestion to fully support polymorphic inheritance, oneOf/anyOf discriminators, and complex webhooks.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 30,
  spaceAfter: 50
});

xml += p('2. Deep GraphQL & gRPC Testing Integration: Expanding fuzzing engines to support automated GraphQL query depth limiting, introspection mitigation, and HTTP/2 protobuf fuzzing.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 30,
  spaceAfter: 50
});

xml += p('3. Active Dynamic Policy Inference: Incorporating passive traffic observation to automatically infer RBAC/ABAC authorization policies without requiring manual policy configuration.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 30,
  spaceAfter: 50
});

xml += p('4. Multi-Agent LLM-Assisted Remediation: Integrating local fine-tuned code models (such as CodeLlama or StarCoder) to autonomously draft and submit syntax-validated Git pull requests.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 30,
  spaceAfter: 50
});

xml += p('5. Enterprise Identity Federation & Multi-Cloud Ingress: Adding native OAuth 2.0 PKCE, SAML 2.0, and AWS/Azure API Gateway policy verification modules.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 30,
  spaceAfter: 200
});

// ==========================================
// APPENDIX A: SAMPLE CODING
// ==========================================
xml += p('APPENDIX A  -  SAMPLE CODING', {
  bold: true,
  size: 26,
  align: 'center',
  spaceBefore: 300,
  spaceAfter: 160,
  firstLine: 0
});

xml += p('This appendix provides representative source code excerpts from the core implementation packages of the OFFAT-X framework, illustrating the CLI orchestrator, OpenAPI dependency parser, role-differential test generator, semantic response diffing engine, and ephemeral sandboxed reconnaissance probers.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 40,
  spaceAfter: 120
});

xml += subSecHeading('A.1  CLI Entrypoint and Orchestrator (cmd/offat-x/main.go)');
xml += codeBlock([
  'package main',
  '',
  'import (',
  '    "flag"',
  '    "fmt"',
  '    "os"',
  '    "time"',
  '    "github.com/offat-x/offat-x/pkg/discovery"',
  '    "github.com/offat-x/offat-x/pkg/parser"',
  '    "github.com/offat-x/offat-x/pkg/report"',
  '    "github.com/offat-x/offat-x/pkg/tgen"',
  '    "github.com/offat-x/offat-x/pkg/trunner"',
  '    "github.com/rs/zerolog/log"',
  ')',
  '',
  'func main() {',
  '    cfg := FlagConfig{}',
  '    cfg.DocPath = flag.String("f", "", "OpenAPI specification path or URL")',
  '    cfg.BaseUrl = flag.String("b", "", "Target API base URL")',
  '    cfg.RunJWTTests = flag.Bool("jwt", false, "Enable JWT security tests")',
  '    cfg.RunBFLATests = flag.Bool("bfla", false, "Enable Broken Function Level Auth tests")',
  '    cfg.RunDirb = flag.Bool("dirb", false, "Enable Ephemeral Sandboxed DIRB Reconnaissance")',
  '    flag.Parse()',
  '',
  '    log.Info().Msg("OFFAT-X v1.0.0 initializing...")',
  '    prs := parser.NewParser(true, false, false, false)',
  '    if err := prs.Parse(*cfg.DocPath, false); err != nil {',
  '        log.Fatal().Err(err).Msg("Failed to parse OpenAPI contract")',
  '    }',
  '',
  '    // Formulate Directed Acyclic Graph G=(V,E)',
  '    testGen := tgen.NewTestGenerator(prs.Doc)',
  '    tests := testGen.GenerateStatefulChains()',
  '    log.Info().Int("tests", len(tests)).Msg("Stateful chains planned successfully")',
  '',
  '    // Execute tests concurrently across 4 privilege tiers',
  '    runner := trunner.NewTestRunner(tests, 60)',
  '    results := runner.Run()',
  '',
  '    // Emit SARIF and HTML security reports',
  '    htmlData := report.HTMLReport(results, "v1.0.0")',
  '    os.WriteFile("offat-x-report.html", htmlData, 0644)',
  '    log.Info().Msg("Interactive HTML report written to offat-x-report.html")',
  '}'
]);

xml += subSecHeading('A.2  OpenAPI Dependency Graph Parser (pkg/parser/parser.go)');
xml += codeBlock([
  'package parser',
  '',
  'import (',
  '    "github.com/getkin/kin-openapi/openapi3"',
  '    "github.com/rs/zerolog/log"',
  ')',
  '',
  'type Parser struct {',
  '    loader *openapi3.Loader',
  '    Doc    ApiDoc',
  '}',
  '',
  'func NewParser(allowExternalRefs bool, de, ds, dp bool) *Parser {',
  '    loader := openapi3.NewLoader()',
  '    loader.IsExternalRefsAllowed = allowExternalRefs',
  '    return &Parser{loader: loader, Doc: &OpenApi{}}',
  '}',
  '',
  'func (p *Parser) Parse(path string, isURL bool) error {',
  '    doc, err := p.loader.LoadFromFile(path)',
  '    if err != nil { return err }',
  '    p.Doc.SetDoc(doc)',
  '    log.Info().Int("endpoints", len(doc.Paths.Map())).Msg("OAS Contract Loaded")',
  '    return nil',
  '}'
]);

xml += subSecHeading('A.3  Role-Differential Test Generator & Chaining Engine (pkg/tgen/generator.go)');
xml += codeBlock([
  'package tgen',
  '',
  'type ApiTest struct {',
  '    TestName       string  `json:"test_name"`',
  '    Method         string  `json:"method"`',
  '    Path           string  `json:"path"`',
  '    ResponseStatus int     `json:"response_status"`',
  '    IsVulnerable   bool    `json:"is_vulnerable"`',
  '    Severity       string  `json:"severity"`',
  '    CVSSScore      float64 `json:"cvss_score"`',
  '    OWASPCategory  string  `json:"owasp_category"`',
  '    CWE            string  `json:"cwe"`',
  '    Remediation    string  `json:"remediation"`',
  '}',
  '',
  'func (g *TestGenerator) GenerateBOLAChains() []*ApiTest {',
  '    var tests []*ApiTest',
  '    for _, endpoint := range g.doc.GetEndpoints() {',
  '        if endpoint.RequiresResourceID() {',
  '            chain := g.FindShortestSetupChain(endpoint, 4) // BFS bounded L <= 4',
  '            tests = append(tests, &ApiTest{',
  '                TestName:      "BOLA Test",',
  '                Method:        endpoint.Method,',
  '                Path:          endpoint.Path,',
  '                Severity:      "HIGH",',
  '                CVSSScore:     8.6,',
  '                OWASPCategory: "API1:2023 - BOLA",',
  '                CWE:           "CWE-639",',
  '                Remediation:   "Enforce identity ownership validation on target object",',
  '            })',
  '        }',
  '    }',
  '    return tests',
  '}'
]);

xml += subSecHeading('A.4  Semantic Response Diffing Engine & CVSS Scorer (pkg/scorer/scorer.go)');
xml += codeBlock([
  'package scorer',
  '',
  'func ComputeSemanticDiff(schemaOverlap float64, valueOverlap float64, is2xx bool, hasError bool) (float64, bool) {',
  '    wk := 0.3',
  '    wo := 0.5',
  '    ws := 0.2',
  '    we := 0.6',
  '    tau := 0.70',
  '',
  '    statusIndicator := 0.0',
  '    if is2xx { statusIndicator = 1.0 }',
  '    errorPenalty := 0.0',
  '    if hasError { errorPenalty = 1.0 }',
  '',
  '    // Equation 2: D = wk * J + wo * O + ws * 1[2xx] - we * E',
  '    D := (wk * schemaOverlap) + (wo * valueOverlap) + (ws * statusIndicator) - (we * errorPenalty)',
  '    isVulnerable := (D >= tau)',
  '    return D, isVulnerable',
  '}'
]);

xml += subSecHeading('A.5  Ephemeral Sandboxed Reconnaissance Module (pkg/discovery/discovery.go)');
xml += codeBlock([
  'package discovery',
  '',
  'import (',
  '    "os/exec"',
  '    "github.com/rs/zerolog/log"',
  ')',
  '',
  'func RunSandboxedDirb(targetURL string, wordlistPath string) ([]string, error) {',
  '    log.Info().Str("target", targetURL).Msg("Launching Ephemeral Docker Sandbox with Pinned DIRB...")',
  '    cmd := exec.Command("docker", "run", "--rm",',
  '        "--cap-drop=ALL",',
  '        "--security-opt=no-new-privileges",',
  '        "--read-only",',
  '        "--tmpfs", "/tmp:rw,noexec,nosuid,size=64m",',
  '        "--network=container_egress_allowlist",',
  '        "debian-dirb:latest",',
  '        "dirb", targetURL, wordlistPath, "-r", "-S")',
  '',
  '    out, err := cmd.CombinedOutput()',
  '    if err != nil { return nil, err }',
  '    discovered := ParseDirbOutput(string(out))',
  '    log.Info().Int("found", len(discovered)).Msg("Ephemeral Sandbox Scan Completed Successfully")',
  '    return discovered, nil',
  '}'
]);

// ==========================================
// APPENDIX B: OUTPUT (PROJECT SCREENSHOTS)
// ==========================================
xml += p('APPENDIX B  -  OUTPUT', {
  bold: true,
  size: 26,
  align: 'center',
  spaceBefore: 300,
  spaceAfter: 160,
  firstLine: 0
});

xml += p('This appendix documents the live operational output and verified security findings of the OFFAT-X framework across its primary operational modules. The figures below provide full-resolution captures of the live application interface during active execution, demonstrating CLI terminal scanning, GitHub Actions CI/CD gating, the interactive HTML executive report dashboard, ephemeral DIRB shadow API discovery, rate-limit probing, JWT vulnerability analysis, GraphQL fuzzing, and role-differential BOLA evidence validation.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 40,
  spaceAfter: 120
});

xml += subSecHeading('B.1  OFFAT-X CLI Terminal Execution & Interactive Banner');
xml += drawings['rId23'] || ''; // Figure B.1 (image11.png)
xml += figureCaption('B.1', 'OFFAT-X CLI Terminal Execution and Real-Time Assessment Console');

xml += p('Figure B.1 captures the primary terminal user interface of OFFAT-X during an autonomous scan against the OWASP crAPI benchmark. The banner confirms active testing suites (OWASP Top 10, JWT Security, GraphQL, DIRB Discovery, Stateful Chaining, and Role-Differential matrices). The real-time console displays scope validation, producer-consumer DAG synthesis (18 dependency edges), ephemeral Docker sandboxing, and immediate discovery of 9 undocumented Shadow APIs, culminating in an ANSI color-coded vulnerability triage summary.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 40,
  spaceAfter: 100
});

xml += drawings['rId24'] || ''; // Figure B.1b (image12.png)
xml += figureCaption('B.1b', 'GitHub Actions Automated CI/CD PR Merge Gating Console');

xml += p('Figure B.1b demonstrates the OFFAT-X composite GitHub Action in a live CI/CD pipeline (pull_request #14). The security gate evaluated 248 assertions in 14 seconds, detecting two new Critical BOLA flaws and one new High BFLA flaw not present in the default branch baseline. The automated gate blocked the merge and uploaded a standardized SARIF 2.1.0 report directly to GitHub Advanced Security with inline code annotations.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 40,
  spaceAfter: 120
});

xml += subSecHeading('B.2  Executive HTML Security Report Dashboard');
xml += drawings['rId25'] || ''; // Figure B.2 (image13.png)
xml += figureCaption('B.2', 'Interactive HTML Security Report Dashboard and Executive Summary');

xml += p('Figure B.2 displays the full-resolution HTML security report generated by OFFAT-X. The dashboard presents six high-contrast metric summary cards (248 Total Tests, 7 Critical, 18 High, 29 Medium, 14 Low, and 12 Data Leaks). The interactive findings table itemizes each vulnerable endpoint, HTTP response status, CVSS v3.1 base score, OWASP Top 10 category, MITRE CWE identifier, and specific code-level remediation recommendations.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 40,
  spaceAfter: 120
});

xml += subSecHeading('B.3  Ephemeral DIRB Shadow API Discovery & Rate-Limit Prober');
xml += drawings['rId26'] || ''; // Figure B.3 (image14.png)
xml += figureCaption('B.3', 'Ephemeral DIRB Shadow API & Undocumented Endpoint Discovery Console');

xml += p('Figure B.3 illustrates the execution of the ephemeral sandboxed DIRB engine against target infrastructure. By comparing live responding routes against the OpenAPI contract, OFFAT-X discovered 9 unmanaged shadow endpoints—including an exposed debug heap-dump route (/api/v1/debug/heap-dump) and an unauthenticated administrative user export route—flagging critical contract discrepancies.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 40,
  spaceAfter: 100
});

xml += drawings['rId27'] || ''; // Figure B.3b (image15.png)
xml += figureCaption('B.3b', 'Rate-Limit Probing and Header-Based Bypass Console');

xml += p('Figure B.3b demonstrates the rate-limit detection module probing the login endpoint. Although the target enforces a 15-request threshold (returning HTTP 429 Too Many Requests), OFFAT-X automatically bypassed the restriction by injecting rotating client IP values into X-Forwarded-For and X-Real-IP headers, confirming improper client-side header trust (CWE-799).', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 40,
  spaceAfter: 120
});

xml += subSecHeading('B.4  JSON Web Token (JWT) Security & GraphQL Testing');
xml += drawings['rId28'] || ''; // Figure B.4 (image16.png)
xml += figureCaption('B.4', 'JSON Web Token (JWT) Security Assessment and Exploit Evidence Console');

xml += p('Figure B.4 captures the autonomous JWT attack battery. OFFAT-X successfully executed an algorithm "none" signature strip attack against /identity/api/auth/vtoken, escalating ordinary user privileges to SUPERADMIN (CVSS 9.1 Critical). Furthermore, the tool verified RS256-to-HS256 key confusion and expired token replay vulnerabilities.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 40,
  spaceAfter: 100
});

xml += drawings['rId29'] || ''; // Figure B.4b (image17.png)
xml += figureCaption('B.4b', 'GraphQL Advanced Vulnerability Testing Suite Console');

xml += p('Figure B.4b illustrates GraphQL vulnerability fuzzing, demonstrating schema extraction via introspection queries (revealing 48 types and 114 queries), batch query denial-of-service abuse (150 batched user queries processed without throttling), and call-stack exhaustion via deeply nested circular object queries.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 40,
  spaceAfter: 120
});

xml += subSecHeading('B.5  Role-Differential BOLA Evidence & SARIF Integration');
xml += drawings['rId30'] || ''; // Figure B.5 (image18.png)
xml += figureCaption('B.5', 'Role-Differential Execution and Semantic Response Diff Evidence Console');

xml += p('Figure B.5 depicts the role-differential execution trace for order #1042. After owner Alice provisioned the order, attacker Bob replayed the GET request and received Alice’s full order details (J = 1.0, O = 1.0, D = 1.00 ≥ τ). Beside the vulnerability verdict, OFFAT-X displayed the vulnerable Prisma query and the synthesized code patch enforcing tenant ownership bounds.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 40,
  spaceAfter: 100
});

xml += drawings['rId31'] || ''; // Figure B.5b (image19.png)
xml += figureCaption('B.5b', 'OASIS SARIF 2.1.0 Standard Export and Code Scanning Schema');

xml += p('Figure B.5b displays the raw OASIS SARIF 2.1.0 JSON artifact exported by OFFAT-X. Each finding includes tool metadata, rule identifiers, precise physical location pointers into the OpenAPI specification line numbers, and CWE/CVSS severity attributes for seamless integration into GitHub Advanced Security and VS Code.', {
  size: 24,
  align: 'both',
  firstLine: 720,
  spaceBefore: 40,
  spaceAfter: 200
});

// ==========================================
// REFERENCES
// ==========================================
xml += p('REFERENCES', {
  bold: true,
  size: 26,
  align: 'center',
  spaceBefore: 300,
  spaceAfter: 160,
  firstLine: 0
});

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

for (let ref of refs) {
  xml += p(ref, {
    size: 22,
    align: 'both',
    spaceBefore: 40,
    spaceAfter: 80,
    firstLine: -720,
    left: 720
  });
}

// ==========================================
// LIST OF PUBLICATIONS
// ==========================================
xml += p('LIST OF PUBLICATIONS', {
  bold: true,
  size: 26,
  align: 'center',
  spaceBefore: 300,
  spaceAfter: 160,
  firstLine: 0
});

xml += p('1. Dr. Priya A, Sabari Yuhendhran M, Sadhana M, and Jegan S, "OFFAT-X: A Sandboxed, Dependency-Aware and Role-Differential Framework for Automated Authorization Testing of REST APIs," submitted to IEEE International Conference on Computing, Communication, and Security (ICCCS 2026), KIT-Kalaignarkarunanidhi Institute of Technology, Coimbatore, Tamil Nadu, India, November 2026 (Under Review).', {
  size: 22,
  align: 'both',
  spaceBefore: 60,
  spaceAfter: 160,
  firstLine: -720,
  left: 720
});

// Section Break 3 (Final Body Section Properties)
xml += `<w:p><w:pPr><w:ind w:left="-5" w:right="1"/></w:pPr></w:p><w:sectPr w:rsidR="0015618F" w:rsidSect="00857E0D"><w:footerReference w:type="even" r:id="rId32"/><w:footerReference w:type="default" r:id="rId33"/><w:footerReference w:type="first" r:id="rId34"/><w:pgSz w:w="11906" w:h="16838" w:code="9"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1446" w:left="2160" w:header="720" w:footer="862" w:gutter="0"/><w:pgNumType w:start="1"/><w:cols w:space="720"/></w:sectPr></w:body></w:document>`;

// Write new document.xml to vulnix_temp
const targetDocXml = path.join(__dirname, 'vulnix_temp', 'word', 'document.xml');
fs.writeFileSync(targetDocXml, xml, 'utf8');

console.log(`Successfully generated new document.xml! Length: ${xml.length} characters.`);
