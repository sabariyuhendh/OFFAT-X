package postrunner

import (
	"github.com/offat-x/offat-x/pkg/tgen"
	"github.com/offat-x/offat-x/pkg/utils"
)

// UpdateStatusCodeBasedResult marks tests as vulnerable or immune based on HTTP response codes.
func UpdateStatusCodeBasedResult(tests *[]*tgen.ApiTest) {
	for _, t := range *tests {
		if t.ResponseStatus == 0 {
			continue // no response received
		}

		// Immune: explicitly safe response codes
		if len(t.ImmuneResponseCodes) > 0 && utils.SearchInSlice(t.ImmuneResponseCodes, t.ResponseStatus) {
			t.IsImmune = true
			t.IsVulnerable = false
			continue
		}

		// Vulnerable: explicitly flagged response codes
		if len(t.VulnerableResponseCodes) > 0 && utils.SearchInSlice(t.VulnerableResponseCodes, t.ResponseStatus) {
			t.IsVulnerable = true
			continue
		}

		// Default heuristic: 2xx on a test that expects rejection = potential vulnerability
		if t.ResponseStatus >= 200 && t.ResponseStatus < 300 {
			if len(t.ImmuneResponseCodes) == 0 && len(t.VulnerableResponseCodes) == 0 {
				// Generic: flag as potential finding for manual review
				t.IsVulnerable = true
			}
		}
	}
}
