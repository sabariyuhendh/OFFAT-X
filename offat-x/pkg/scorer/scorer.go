// Package scorer provides CVSS-based vulnerability scoring and risk prioritization for OFFAT-X.
// It assigns severity levels and scores to test results, enabling risk-ranked reporting.
package scorer

import "strings"

// Severity levels aligned with CVSS v3.1 qualitative ratings.
const (
	SeverityCritical = "CRITICAL" // CVSS 9.0–10.0
	SeverityHigh     = "HIGH"     // CVSS 7.0–8.9
	SeverityMedium   = "MEDIUM"   // CVSS 4.0–6.9
	SeverityLow      = "LOW"      // CVSS 0.1–3.9
	SeverityInfo     = "INFO"     // CVSS 0.0
)

// VulnScore holds computed risk metrics for a test finding.
type VulnScore struct {
	TestName    string  `json:"test_name"`
	Severity    string  `json:"severity"`
	CVSSScore   float64 `json:"cvss_score"`
	OWASP       string  `json:"owasp_category"`
	CWE         string  `json:"cwe"`
	Description string  `json:"description"`
}

// testScoreMap maps test names to their baseline CVSS score and metadata.
// Derived from OWASP API Security Top 10 (2023) and CWE database.
var testScoreMap = map[string]VulnScore{
	// OWASP API1:2023 — Broken Object Level Authorization
	"BOLA Test": {
		Severity:    SeverityHigh,
		CVSSScore:   8.6,
		OWASP:       "API1:2023 - BOLA",
		CWE:         "CWE-639",
		Description: "Object-level authorization not enforced; attacker can access other users' data by manipulating resource IDs.",
	},
	"BOLA Trailing Path Test": {
		Severity:    SeverityHigh,
		CVSSScore:   8.1,
		OWASP:       "API1:2023 - BOLA",
		CWE:         "CWE-639",
		Description: "Trailing path BOLA — appending numeric IDs to paths bypasses authorization checks.",
	},

	// OWASP API2:2023 — Broken Authentication
	"Missing Auth Test": {
		Severity:    SeverityCritical,
		CVSSScore:   9.8,
		OWASP:       "API2:2023 - Broken Authentication",
		CWE:         "CWE-306",
		Description: "Endpoint accessible without authentication credentials.",
	},
	"JWT None Algorithm": {
		Severity:    SeverityCritical,
		CVSSScore:   9.8,
		OWASP:       "API2:2023 - Broken Authentication",
		CWE:         "CWE-347",
		Description: "Server accepts JWTs with alg=none, allowing forged tokens.",
	},
	"JWT Empty Signature": {
		Severity:    SeverityCritical,
		CVSSScore:   9.8,
		OWASP:       "API2:2023 - Broken Authentication",
		CWE:         "CWE-347",
		Description: "Server accepts JWTs with empty signatures.",
	},
	"JWT Tampered Payload (Privilege Escalation)": {
		Severity:    SeverityCritical,
		CVSSScore:   9.1,
		OWASP:       "API2:2023 - Broken Authentication",
		CWE:         "CWE-284",
		Description: "JWT payload tampered to escalate privileges — server did not verify signature.",
	},
	"JWT Algorithm Confusion (RS256→HS256)": {
		Severity:    SeverityCritical,
		CVSSScore:   9.1,
		OWASP:       "API2:2023 - Broken Authentication",
		CWE:         "CWE-347",
		Description: "Algorithm confusion attack: RS256 public key used as HS256 secret.",
	},

	// OWASP API3:2023 — Broken Object Property Level Authorization
	"BOPLA/Mass Assignment Test": {
		Severity:    SeverityHigh,
		CVSSScore:   7.5,
		OWASP:       "API3:2023 - BOPLA",
		CWE:         "CWE-915",
		Description: "Mass assignment vulnerability — hidden fields can be set via API requests.",
	},

	// OWASP API4:2023 — Unrestricted Resource Consumption
	"Rate Limit Missing": {
		Severity:    SeverityHigh,
		CVSSScore:   7.5,
		OWASP:       "API4:2023 - Unrestricted Resource Consumption",
		CWE:         "CWE-770",
		Description: "No rate limiting detected on endpoint — vulnerable to brute-force and DoS.",
	},
	"GraphQL Batch Query Abuse (Potential DoS)": {
		Severity:    SeverityHigh,
		CVSSScore:   7.5,
		OWASP:       "API4:2023 - Unrestricted Resource Consumption",
		CWE:         "CWE-770",
		Description: "Batch query abuse allows sending many queries in one request, exhausting resources.",
	},

	// OWASP API5:2023 — Broken Function Level Authorization
	"Unrestricted HTTP Method/Verb": {
		Severity:    SeverityHigh,
		CVSSScore:   7.2,
		OWASP:       "API5:2023 - Broken Function Level Authorization",
		CWE:         "CWE-863",
		Description: "HTTP methods that should be restricted are accepted by the server.",
	},
	"GraphQL Unauthorized Mutation": {
		Severity:    SeverityCritical,
		CVSSScore:   9.8,
		OWASP:       "API5:2023 - Broken Function Level Authorization",
		CWE:         "CWE-863",
		Description: "Destructive mutation accepted without authentication.",
	},

	// OWASP API6:2023 — Unrestricted Access to Sensitive Business Flows
	// (handled via rate limit + BOLA combos)

	// OWASP API7:2023 — Server-Side Request Forgery
	"Basic SSRF Test": {
		Severity:    SeverityCritical,
		CVSSScore:   9.1,
		OWASP:       "API7:2023 - SSRF",
		CWE:         "CWE-918",
		Description: "SSRF payload injected into request — server may fetch internal resources.",
	},
	"GraphQL SSRF via URL Variable": {
		Severity:    SeverityCritical,
		CVSSScore:   9.1,
		OWASP:       "API7:2023 - SSRF",
		CWE:         "CWE-918",
		Description: "SSRF via GraphQL URL variable — resolver fetches attacker-controlled URLs.",
	},

	// OWASP API8:2023 — Security Misconfiguration
	"GraphQL Introspection Enabled": {
		Severity:    SeverityMedium,
		CVSSScore:   5.3,
		OWASP:       "API8:2023 - Security Misconfiguration",
		CWE:         "CWE-200",
		Description: "GraphQL introspection enabled in production — full schema exposed.",
	},
	"GraphQL Field Suggestion Leakage": {
		Severity:    SeverityLow,
		CVSSScore:   3.7,
		OWASP:       "API8:2023 - Security Misconfiguration",
		CWE:         "CWE-200",
		Description: "Field suggestions leak valid field names to unauthenticated users.",
	},

	// OWASP API9:2023 — Improper Inventory Management
	// (undocumented endpoints tests)

	// OWASP API10:2023 — Unsafe API Consumption
	// Injection tests
	"Basic SQLi Test": {
		Severity:    SeverityCritical,
		CVSSScore:   9.8,
		OWASP:       "API10:2023 - Unsafe API Consumption / Injection",
		CWE:         "CWE-89",
		Description: "SQL injection payload reflected or accepted by endpoint.",
	},
	"Basic OS Command Injection Test": {
		Severity:    SeverityCritical,
		CVSSScore:   9.8,
		OWASP:       "API10:2023 - Injection",
		CWE:         "CWE-78",
		Description: "OS command injection payload accepted.",
	},
	"Basic XSS/HTML Injection Test": {
		Severity:    SeverityHigh,
		CVSSScore:   6.1,
		OWASP:       "API10:2023 - Injection",
		CWE:         "CWE-79",
		Description: "XSS/HTML injection payload reflected in API response.",
	},
	"SSTI Injection Test": {
		Severity:    SeverityCritical,
		CVSSScore:   9.8,
		OWASP:       "API10:2023 - Injection",
		CWE:         "CWE-94",
		Description: "Server-Side Template Injection payload reflected — potential RCE.",
	},
	"GraphQL SQLi in Variable": {
		Severity:    SeverityCritical,
		CVSSScore:   9.8,
		OWASP:       "API10:2023 - Injection",
		CWE:         "CWE-89",
		Description: "SQL injection via GraphQL variable.",
	},
}

// Score returns the VulnScore for a given test name.
// Falls back to heuristic matching if exact name not found.
func Score(testName string) VulnScore {
	if score, ok := testScoreMap[testName]; ok {
		score.TestName = testName
		return score
	}
	return heuristicScore(testName)
}

// heuristicScore assigns a score based on keywords in the test name.
func heuristicScore(testName string) VulnScore {
	name := strings.ToLower(testName)
	score := VulnScore{TestName: testName, OWASP: "Unknown", CWE: "Unknown"}

	switch {
	case strings.Contains(name, "sql"), strings.Contains(name, "injection"),
		strings.Contains(name, "rce"), strings.Contains(name, "command"):
		score.Severity = SeverityCritical
		score.CVSSScore = 9.8
	case strings.Contains(name, "ssrf"), strings.Contains(name, "auth"),
		strings.Contains(name, "bola"), strings.Contains(name, "jwt"):
		score.Severity = SeverityHigh
		score.CVSSScore = 7.5
	case strings.Contains(name, "xss"), strings.Contains(name, "rate"),
		strings.Contains(name, "exposure"):
		score.Severity = SeverityMedium
		score.CVSSScore = 5.0
	case strings.Contains(name, "info"), strings.Contains(name, "disclosure"):
		score.Severity = SeverityLow
		score.CVSSScore = 3.0
	default:
		score.Severity = SeverityInfo
		score.CVSSScore = 0.0
	}
	return score
}

// SeverityFromCVSS maps a CVSS numeric score to a qualitative severity string.
func SeverityFromCVSS(cvss float64) string {
	switch {
	case cvss >= 9.0:
		return SeverityCritical
	case cvss >= 7.0:
		return SeverityHigh
	case cvss >= 4.0:
		return SeverityMedium
	case cvss > 0:
		return SeverityLow
	default:
		return SeverityInfo
	}
}

// SortBySeverity returns severity ordering index (lower = more severe).
func SortBySeverity(severity string) int {
	order := map[string]int{
		SeverityCritical: 0,
		SeverityHigh:     1,
		SeverityMedium:   2,
		SeverityLow:      3,
		SeverityInfo:     4,
	}
	if v, ok := order[severity]; ok {
		return v
	}
	return 5
}

// ComputeSemanticDiff calculates Equation (2) Semantic Diff score D and determines vulnerability verdict.
// Formulated in Section 4.3.4 and Appendix A.4 of the OFFAT-X IEEE Paper and Phase 1 Report:
// D = wk · J + wo · O + ws · 1[2xx] - we · E(a)
func ComputeSemanticDiff(schemaOverlap float64, valueOverlap float64, is2xx bool, hasError bool) (float64, bool) {
	wk := 0.3
	wo := 0.5
	ws := 0.2
	we := 0.6
	tau := 0.70

	statusIndicator := 0.0
	if is2xx {
		statusIndicator = 1.0
	}
	errorPenalty := 0.0
	if hasError {
		errorPenalty = 1.0
	}

	D := (wk * schemaOverlap) + (wo * valueOverlap) + (ws * statusIndicator) - (we * errorPenalty)
	return D, (D >= tau)
}

