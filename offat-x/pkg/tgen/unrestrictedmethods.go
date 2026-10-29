package tgen

import (
	"github.com/offat-x/offat-x/pkg/parser"
	"github.com/offat-x/offat-x/pkg/utils"
	"github.com/rs/zerolog/log"
)

var allHttpMethods = []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD", "TRACE", "CONNECT"}

// UnrestrictedHttpMethods generates tests that probe for unrestricted HTTP verb access.
func UnrestrictedHttpMethods(baseURL string, docParams []*parser.DocHttpParams, queryParams map[string]string, headers map[string]string) []*ApiTest {
	var tests []*ApiTest
	testName := "Unrestricted HTTP Method/Verb"
	immuneCodes := []int{405, 404}

	// Group documented methods per path
	pathMethods := make(map[string][]string)
	pathDoc := make(map[string]*parser.DocHttpParams)
	for _, dp := range docParams {
		pathMethods[dp.Path] = append(pathMethods[dp.Path], dp.HttpMethod)
		pathDoc[dp.Path] = dp
	}

	for apiPath, docMethods := range pathMethods {
		dp := pathDoc[apiPath]
		url, hdrs, qMap, body, pathWP, err := httpParamToRequest(baseURL, dp, queryParams, headers, utils.JSON)
		if err != nil {
			log.Error().Err(err).Msgf("failed to build request for path %s", apiPath)
			continue
		}

		for _, method := range allHttpMethods {
			if containsString(docMethods, method) {
				continue // documented method, skip
			}
			test := &ApiTest{
				TestName:            testName,
				Method:              method,
				URL:                 url,
				Path:                apiPath,
				PathWithParams:      pathWP,
				Headers:             copyMap(hdrs),
				QueryParams:         copyMap(qMap),
				Body:                body,
				ImmuneResponseCodes: immuneCodes,
			}
			tests = append(tests, test)
		}
	}
	return tests
}

func containsString(slice []string, s string) bool {
	for _, v := range slice {
		if v == s {
			return true
		}
	}
	return false
}

func copyMap(m map[string]string) map[string]string {
	out := make(map[string]string, len(m))
	for k, v := range m {
		out[k] = v
	}
	return out
}
