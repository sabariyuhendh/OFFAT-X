// Package gate implements the DevSecOps CI/CD PR Merge Gating Engine for OFFAT-X.
// Formulated in Section 4.3.7, Listing 3, and Figure B.1b of the OFFAT-X IEEE Paper and Phase 1 Report.
package gate

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"github.com/offat-x/offat-x/pkg/scorer"
	"github.com/offat-x/offat-x/pkg/tgen"
	"github.com/rs/zerolog/log"
)

// GateSummary holds the evaluation result of the CI merge gate.
type GateSummary struct {
	TotalEvaluated   int      `json:"total_evaluated"`
	BaselineFindings int      `json:"baseline_findings"`
	CurrentFindings  int      `json:"current_findings"`
	NewFindings      int      `json:"new_findings"`
	NewCritical      int      `json:"new_critical"`
	NewHigh          int      `json:"new_high"`
	NewMedium        int      `json:"new_medium"`
	NewLow           int      `json:"new_low"`
	Passed           bool     `json:"passed"`
	FailReason       string   `json:"fail_reason,omitempty"`
	NewFingerprints  []string `json:"new_fingerprints,omitempty"`
}

// Fingerprint computes a stable structural endpoint signature: Method:Path:CWE
func Fingerprint(t *tgen.ApiTest) string {
	cwe := t.CWE
	if cwe == "" {
		cwe = "CWE-UNKNOWN"
	}
	return fmt.Sprintf("%s:%s:%s", strings.ToUpper(t.Method), t.Path, strings.ToUpper(cwe))
}

// EvaluateGate compares current test findings against a baseline report.
// failCondition can be "high-new" (default), "critical-new", "any-new", "any-high", "any-critical".
func EvaluateGate(currentTests []*tgen.ApiTest, baselineFilePath string, failCondition string) GateSummary {
	if failCondition == "" {
		failCondition = "high-new"
	}

	summary := GateSummary{
		TotalEvaluated: len(currentTests),
		Passed:         true,
	}

	// 1. Load Baseline Fingerprints (if provided)
	baselineFingerprints := make(map[string]bool)
	if baselineFilePath != "" {
		data, err := os.ReadFile(baselineFilePath)
		if err == nil {
			var baseTests []*tgen.ApiTest
			if err := json.Unmarshal(data, &baseTests); err == nil {
				for _, bt := range baseTests {
					if bt.IsVulnerable {
						baselineFingerprints[Fingerprint(bt)] = true
					}
				}
				summary.BaselineFindings = len(baselineFingerprints)
				log.Info().Int("baseline_findings", len(baselineFingerprints)).Msg("Loaded baseline findings from previous scan")
			}
		}
	}

	// 2. Identify New Findings
	for _, t := range currentTests {
		if !t.IsVulnerable {
			continue
		}
		summary.CurrentFindings++

		fp := Fingerprint(t)
		isNew := !baselineFingerprints[fp]

		if isNew {
			summary.NewFindings++
			summary.NewFingerprints = append(summary.NewFingerprints, fp)

			switch t.Severity {
			case scorer.SeverityCritical:
				summary.NewCritical++
			case scorer.SeverityHigh:
				summary.NewHigh++
			case scorer.SeverityMedium:
				summary.NewMedium++
			case scorer.SeverityLow:
				summary.NewLow++
			}
		}
	}

	// 3. Evaluate Pass/Fail Gating Rules
	switch strings.ToLower(failCondition) {
	case "critical-new":
		if summary.NewCritical > 0 {
			summary.Passed = false
			summary.FailReason = fmt.Sprintf("CI Gate BLOCKED: %d NEW CRITICAL vulnerabilities introduced in PR", summary.NewCritical)
		}
	case "high-new", "":
		if summary.NewCritical > 0 || summary.NewHigh > 0 {
			summary.Passed = false
			summary.FailReason = fmt.Sprintf("CI Gate BLOCKED: %d NEW Critical/High vulnerabilities introduced (%d Critical, %d High)",
				summary.NewCritical+summary.NewHigh, summary.NewCritical, summary.NewHigh)
		}
	case "any-new":
		if summary.NewFindings > 0 {
			summary.Passed = false
			summary.FailReason = fmt.Sprintf("CI Gate BLOCKED: %d new vulnerabilities introduced in PR", summary.NewFindings)
		}
	case "any-critical":
		critCount := 0
		for _, t := range currentTests {
			if t.IsVulnerable && t.Severity == scorer.SeverityCritical {
				critCount++
			}
		}
		if critCount > 0 {
			summary.Passed = false
			summary.FailReason = fmt.Sprintf("CI Gate BLOCKED: %d CRITICAL vulnerabilities present in codebase", critCount)
		}
	}

	return summary
}

// PrintGateReport outputs an ANSI summary to stdout.
func PrintGateReport(summary GateSummary) {
	fmt.Println("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	fmt.Println("              OFFAT-X CI/CD PR MERGE GATE                 ")
	fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	fmt.Printf(" Total Assertions Evaluated : %d\n", summary.TotalEvaluated)
	fmt.Printf(" Baseline Vulnerabilities   : %d\n", summary.BaselineFindings)
	fmt.Printf(" Current Vulnerabilities    : %d\n", summary.CurrentFindings)
	fmt.Printf(" Newly Introduced in PR     : %d\n", summary.NewFindings)
	fmt.Printf("   ├─ Critical              : %d\n", summary.NewCritical)
	fmt.Printf("   ├─ High                  : %d\n", summary.NewHigh)
	fmt.Printf("   ├─ Medium                : %d\n", summary.NewMedium)
	fmt.Printf("   └─ Low                   : %d\n", summary.NewLow)
	fmt.Println("──────────────────────────────────────────────────────────")

	if summary.Passed {
		fmt.Println(" Status: [PASSED] ✓ Pull Request meets security criteria.")
	} else {
		fmt.Printf(" Status: [BLOCKED] ✗ %s\n", summary.FailReason)
		fmt.Println("\n Blocking Vulnerability Fingerprints:")
		for _, fp := range summary.NewFingerprints {
			fmt.Printf("  • %s\n", fp)
		}
	}
	fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
}
