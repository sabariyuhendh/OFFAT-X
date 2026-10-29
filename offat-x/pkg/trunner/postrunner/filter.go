package postrunner

import "github.com/offat-x/offat-x/pkg/tgen"

// FilterImmuneResults optionally removes immune (non-vulnerable) results from the list.
func FilterImmuneResults(tests *[]*tgen.ApiTest, avoidFilter *bool) {
	if avoidFilter != nil && *avoidFilter {
		return // keep all results
	}
	var filtered []*tgen.ApiTest
	for _, t := range *tests {
		if !t.IsImmune {
			filtered = append(filtered, t)
		}
	}
	*tests = filtered
}
