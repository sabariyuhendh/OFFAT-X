package tgen

import (
	"github.com/offat-x/offat-x/pkg/jwt"
	"github.com/offat-x/offat-x/pkg/parser"
	"github.com/offat-x/offat-x/pkg/utils"
	"github.com/rs/zerolog/log"
)

// JWTSecurityTest generates JWT-specific security tests against all secured endpoints.
// It requires an existing valid JWT token from the default headers to craft adversarial variants.
func JWTSecurityTest(baseURL string, docParams []*parser.DocHttpParams, queryParams map[string]string, headers map[string]string) []*ApiTest {
	var tests []*ApiTest

	// Extract the JWT from Authorization header if present
	rawToken := ""
	for k, v := range headers {
		if k == "Authorization" || k == "authorization" {
			rawToken = jwt.ExtractTokenFromHeader(v)
			break
		}
	}

	if rawToken == "" {
		log.Warn().Msg("JWT Security Tests skipped — no Authorization header provided. Use -H 'Authorization: Bearer <token>'")
		return tests
	}

	// Generate adversarial JWT test cases
	jwtCases, err := jwt.GenerateTestCases(rawToken)
	if err != nil {
		log.Warn().Err(err).Msg("JWT Security Tests skipped — could not parse provided token")
		return tests
	}

	immuneCodes := []int{401, 403}

	for _, dp := range docParams {
		// Only test secured endpoints
		if len(dp.Security) == 0 {
			continue
		}

		url, baseHdrs, qMap, body, pathWP, err := httpParamToRequest(baseURL, dp, queryParams, headers, utils.JSON)
		if err != nil {
			log.Error().Err(err).Msgf("skipping JWT test for %s", dp.Path)
			continue
		}

		for _, jwtCase := range jwtCases {
			// Build a copy of headers with the crafted token
			testHdrs := copyMap(baseHdrs)
			if jwtCase.Token == "" {
				delete(testHdrs, "Authorization")
				delete(testHdrs, "authorization")
			} else {
				testHdrs["Authorization"] = "Bearer " + jwtCase.Token
			}

			tests = append(tests, &ApiTest{
				TestName:            "JWT: " + jwtCase.Name,
				Method:              dp.HttpMethod,
				URL:                 url,
				Path:                dp.Path,
				PathWithParams:      pathWP,
				Headers:             testHdrs,
				QueryParams:         qMap,
				Body:                body,
				ImmuneResponseCodes: immuneCodes,
			})
		}
	}

	log.Info().Msgf("%d JWT security tests generated across %d secured endpoints", len(tests), countSecuredEndpoints(docParams))
	return tests
}

// JWTStaticAnalysis runs static analysis on the provided token and logs findings.
func JWTStaticAnalysis(token string) []jwt.TokenVulnerability {
	token = jwt.ExtractTokenFromHeader(token)
	if token == "" {
		return nil
	}
	vulns, err := jwt.AnalyzeToken(token)
	if err != nil {
		log.Warn().Err(err).Msg("JWT static analysis failed")
		return nil
	}
	for _, v := range vulns {
		log.Warn().
			Str("test", "JWT Static Analysis").
			Str("severity", v.Severity).
			Str("finding", v.Name).
			Str("remediation", v.Remediation).
			Msg("JWT vulnerability detected")
	}
	return vulns
}

func countSecuredEndpoints(params []*parser.DocHttpParams) int {
	n := 0
	for _, p := range params {
		if len(p.Security) > 0 {
			n++
		}
	}
	return n
}
