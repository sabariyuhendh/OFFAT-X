package postrunner

import (
	"regexp"

	"github.com/offat-x/offat-x/pkg/scorer"
	"github.com/offat-x/offat-x/pkg/tgen"
)

// EnrichWithScores assigns CVSS scores, severity, OWASP category, and CWE to each vulnerable test.
// This is a key OFFAT-X contribution — risk-ranked reporting.
func EnrichWithScores(tests *[]*tgen.ApiTest) {
	for _, t := range *tests {
		s := scorer.Score(t.TestName)
		t.Severity = s.Severity
		t.CVSSScore = s.CVSSScore
		t.OWASPCategory = s.OWASP
		t.CWE = s.CWE

		// Set remediation if not already set
		if t.Remediation == "" {
			t.Remediation = s.Description
		}
	}
}

// ApplyRegexVulnerabilityDetection runs MatchRegex on response bodies
// and marks tests vulnerable when a match is found.
func ApplyRegexVulnerabilityDetection(tests *[]*tgen.ApiTest) {
	for _, t := range *tests {
		if t.MatchRegex == "" || t.ResponseBody == "" {
			continue
		}
		re, err := regexp.Compile(t.MatchRegex)
		if err != nil {
			continue
		}
		if re.MatchString(t.ResponseBody) {
			t.IsVulnerable = true
		}
	}
}
