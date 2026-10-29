package tgen

import (
	"github.com/offat-x/offat-x/pkg/parser"
	"github.com/offat-x/offat-x/pkg/utils"
	"github.com/rs/zerolog/log"
)

// MissingAuthTest generates tests that probe endpoints without any auth headers.
// It targets endpoints that declare a security scheme in the spec.
func MissingAuthTest(baseURL string, docParams []*parser.DocHttpParams, queryParams map[string]string, headers map[string]string) []*ApiTest {
	var tests []*ApiTest
	testName := "Missing Auth Test"
	immuneCodes := []int{401, 403}

	// Strip auth-related headers for this test
	strippedHeaders := make(map[string]string)
	for k, v := range headers {
		lower := k
		if lower != "Authorization" && lower != "authorization" {
			strippedHeaders[k] = v
		}
	}

	for _, dp := range docParams {
		// Only test endpoints that specify a security scheme
		if len(dp.Security) == 0 {
			continue
		}
		url, hdrs, qMap, body, pathWP, err := httpParamToRequest(baseURL, dp, queryParams, strippedHeaders, utils.JSON)
		if err != nil {
			log.Error().Err(err).Msgf("skipping missing auth test for %s", dp.Path)
			continue
		}

		// Remove Authorization from the generated headers too
		delete(hdrs, "Authorization")
		delete(hdrs, "authorization")

		tests = append(tests, &ApiTest{
			TestName:            testName,
			Method:              dp.HttpMethod,
			URL:                 url,
			Path:                dp.Path,
			PathWithParams:      pathWP,
			Headers:             hdrs,
			QueryParams:         qMap,
			Body:                body,
			ImmuneResponseCodes: immuneCodes,
		})
	}
	return tests
}
