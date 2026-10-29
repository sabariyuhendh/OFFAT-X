package discovery

import (
	"fmt"
	"strings"

	"github.com/rs/zerolog/log"
)

// ComparisonReport compares OAS-documented paths against DIRB-discovered paths.
// This directly maps to OWASP API9:2023 — Improper Inventory Management.
type ComparisonReport struct {
	// Endpoints in spec AND found live
	DocumentedAndLive []string `json:"documented_and_live"`

	// Endpoints in spec but NOT responding (possibly removed/changed)
	DocumentedButDead []string `json:"documented_but_dead"`

	// Endpoints NOT in spec but responding live — the critical finding
	UndocumentedAndLive []UndocumentedFinding `json:"undocumented_and_live"`

	// Summary
	TotalDocumented     int `json:"total_documented"`
	TotalDiscovered     int `json:"total_discovered"`
	UndocumentedCount   int `json:"undocumented_count"`
	ShadowAPIRisk       string `json:"shadow_api_risk"` // LOW/MEDIUM/HIGH/CRITICAL
}

// UndocumentedFinding represents a single undocumented endpoint finding.
type UndocumentedFinding struct {
	Path           string `json:"path"`
	FullURL        string `json:"full_url"`
	StatusCode     int    `json:"status_code"`
	ContentType    string `json:"content_type"`
	Severity       string `json:"severity"`
	CVSSScore      float64 `json:"cvss_score"`
	OWASPCategory  string `json:"owasp_category"`
	CWE            string `json:"cwe"`
	Description    string `json:"description"`
	Remediation    string `json:"remediation"`
}

// BuildComparisonReport generates the full comparison between spec and discovered endpoints.
func BuildComparisonReport(knownPaths []string, discovered []DiscoveredEndpoint) ComparisonReport {
	knownSet := make(map[string]bool)
	for _, p := range knownPaths {
		knownSet[normalise(p)] = true
	}

	discoveredSet := make(map[string]bool)
	for _, ep := range discovered {
		discoveredSet[normalise(ep.Path)] = true
	}

	report := ComparisonReport{
		TotalDocumented: len(knownPaths),
		TotalDiscovered: len(discovered),
	}

	// Documented + live
	for _, p := range knownPaths {
		if discoveredSet[normalise(p)] {
			report.DocumentedAndLive = append(report.DocumentedAndLive, p)
		} else {
			report.DocumentedButDead = append(report.DocumentedButDead, p)
		}
	}

	// Undocumented + live — the real findings
	for _, ep := range discovered {
		if !knownSet[normalise(ep.Path)] && ep.IsUndocumented {
			finding := classifyUndocumented(ep)
			report.UndocumentedAndLive = append(report.UndocumentedAndLive, finding)
		}
	}

	report.UndocumentedCount = len(report.UndocumentedAndLive)
	report.ShadowAPIRisk = computeShadowRisk(report.UndocumentedAndLive)

	return report
}

// classifyUndocumented assigns severity, CVSS, OWASP, and CWE to an undocumented endpoint.
func classifyUndocumented(ep DiscoveredEndpoint) UndocumentedFinding {
	f := UndocumentedFinding{
		Path:          ep.Path,
		FullURL:       ep.FullURL,
		StatusCode:    ep.StatusCode,
		ContentType:   ep.ContentType,
		OWASPCategory: "API9:2023 - Improper Inventory Management",
		CWE:           "CWE-1059",
	}

	lower := strings.ToLower(ep.Path)

	switch {
	// Admin / internal paths — critical
	case containsAny(lower, []string{"admin", "internal", "superadmin", "root", "staff", "management"}):
		f.Severity = "CRITICAL"
		f.CVSSScore = 9.8
		f.Description = fmt.Sprintf(
			"Undocumented admin/internal endpoint '%s' (HTTP %d) is accessible. "+
				"Shadow API endpoints that bypass normal access controls are extremely dangerous.",
			ep.Path, ep.StatusCode,
		)
		f.Remediation = "Remove or properly document and secure admin endpoints. " +
			"Enforce authentication and authorisation. Add to API inventory."

	// Debug / env / config — critical
	case containsAny(lower, []string{"debug", ".env", "env", "actuator", "phpinfo", "server-status"}):
		f.Severity = "CRITICAL"
		f.CVSSScore = 9.1
		f.Description = fmt.Sprintf(
			"Undocumented debug/configuration endpoint '%s' (HTTP %d) is exposed. "+
				"These often leak secrets, stack traces, and environment variables.",
			ep.Path, ep.StatusCode,
		)
		f.Remediation = "Disable debug endpoints in production. Use environment-specific configs. " +
			"Never expose .env files or actuator endpoints publicly."

	// Git / source code
	case containsAny(lower, []string{".git", ".svn", ".hg"}):
		f.Severity = "CRITICAL"
		f.CVSSScore = 9.1
		f.Description = fmt.Sprintf(
			"Source control metadata at '%s' is publicly accessible. "+
				"This allows reconstruction of the full source code.",
			ep.Path,
		)
		f.Remediation = "Block access to .git, .svn, .hg directories via web server config. " +
			"Use .htaccess or nginx deny rules."

	// API docs exposed
	case containsAny(lower, []string{"swagger", "openapi", "api-docs", "redoc", "graphiql"}):
		f.Severity = "MEDIUM"
		f.CVSSScore = 5.3
		f.Description = fmt.Sprintf(
			"API documentation at '%s' is publicly accessible. "+
				"Exposed docs aid attacker reconnaissance significantly.",
			ep.Path,
		)
		f.Remediation = "Restrict API documentation to authenticated users in production, " +
			"or serve it only on internal networks."

	// v1/v2/v3 legacy API
	case containsAny(lower, []string{"/v1", "/v2", "/v3", "legacy", "old", "deprecated"}):
		f.Severity = "HIGH"
		f.CVSSScore = 7.5
		f.Description = fmt.Sprintf(
			"Undocumented/legacy API version at '%s' (HTTP %d). "+
				"Old API versions often lack current security controls and patches.",
			ep.Path, ep.StatusCode,
		)
		f.Remediation = "Decommission old API versions or enforce the same security controls. " +
			"Add deprecation notices and document all active versions."

	// Everything else
	default:
		f.Severity = "MEDIUM"
		f.CVSSScore = 5.0
		f.Description = fmt.Sprintf(
			"Undocumented endpoint '%s' responded with HTTP %d. "+
				"This endpoint is not in the API specification and may bypass security controls.",
			ep.Path, ep.StatusCode,
		)
		f.Remediation = "Add this endpoint to the API specification or remove it if unused. " +
			"Ensure all active endpoints are inventoried and security-tested."
	}

	return f
}

// computeShadowRisk gives an overall risk rating based on undocumented findings.
func computeShadowRisk(findings []UndocumentedFinding) string {
	if len(findings) == 0 {
		return "LOW"
	}
	critical, high := 0, 0
	for _, f := range findings {
		switch f.Severity {
		case "CRITICAL":
			critical++
		case "HIGH":
			high++
		}
	}
	switch {
	case critical > 0:
		return "CRITICAL"
	case high > 2:
		return "HIGH"
	case len(findings) > 5:
		return "MEDIUM"
	default:
		return "LOW"
	}
}

// PrintComparisonSummary logs a human-readable comparison summary.
func PrintComparisonSummary(r ComparisonReport) {
	log.Info().
		Int("documented_endpoints", r.TotalDocumented).
		Int("live_discovered", r.TotalDiscovered).
		Int("undocumented_live", r.UndocumentedCount).
		Str("shadow_api_risk", r.ShadowAPIRisk).
		Msg("━━ Endpoint Discovery vs OAS Spec Comparison ━━")

	if r.UndocumentedCount == 0 {
		log.Info().Msg("✅ No undocumented endpoints found — API inventory is complete")
		return
	}

	log.Warn().Msgf("⚠  %d undocumented endpoint(s) found — OWASP API9:2023 (Improper Inventory Management)", r.UndocumentedCount)

	for _, f := range r.UndocumentedAndLive {
		log.Warn().
			Str("path", f.Path).
			Int("status", f.StatusCode).
			Str("severity", f.Severity).
			Float64("cvss", f.CVSSScore).
			Str("owasp", f.OWASPCategory).
			Msg("  Shadow API endpoint detected")
	}
}

// ─── helpers ──────────────────────────────────────────────────────────────────

func containsAny(s string, keywords []string) bool {
	for _, kw := range keywords {
		if strings.Contains(s, kw) {
			return true
		}
	}
	return false
}
