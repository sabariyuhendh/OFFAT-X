package postrunner

import (
	"regexp"

	"github.com/offat-x/offat-x/pkg/tgen"
	"github.com/rs/zerolog/log"
)

// UpdateDataLeakResult scans response bodies for sensitive data patterns.
func UpdateDataLeakResult(tests *[]*tgen.ApiTest, patterns tgen.DataLeakPatterns) {
	for _, t := range *tests {
		if t.ResponseBody == "" {
			continue
		}
		for _, pattern := range patterns.Patterns {
			re, err := regexp.Compile(pattern.Regex)
			if err != nil {
				log.Error().Err(err).Msgf("invalid data leak regex: %s", pattern.Regex)
				continue
			}
			matches := re.FindAllString(t.ResponseBody, -1)
			if len(matches) > 0 {
				t.IsDataLeak = true
				t.DataLeakMatches = append(t.DataLeakMatches, tgen.DataLeakPatternMatch{
					DataLeakPattern: pattern,
					Matches:         matches,
				})
			}
		}
	}
}
