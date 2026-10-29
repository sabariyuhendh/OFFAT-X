package tgen

import (
	"fmt"
	"path"
	"strings"

	"github.com/offat-x/offat-x/pkg/fuzzer"
	"github.com/offat-x/offat-x/pkg/parser"
	"github.com/offat-x/offat-x/pkg/utils"
	"github.com/rs/zerolog/log"
)

// BolaTest generates tests for Broken Object Level Authorization.
func BolaTest(baseURL string, docParams []*parser.DocHttpParams, queryParams map[string]string, headers map[string]string) []*ApiTest {
	var tests []*ApiTest
	testName := "BOLA Test"
	immuneCodes := []int{404, 405}

	for _, dp := range docParams {
		if len(dp.PathParams) == 0 {
			continue
		}
		url, hdrs, qMap, body, pathWP, err := httpParamToRequest(baseURL, dp, queryParams, headers, utils.JSON)
		if err != nil {
			log.Error().Err(err).Msgf("skipping BOLA test for %s", dp.Path)
			continue
		}
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

// BolaTrailingPathTest appends a random numeric ID to each path.
func BolaTrailingPathTest(baseURL string, docParams []*parser.DocHttpParams, queryParams map[string]string, headers map[string]string) []*ApiTest {
	var tests []*ApiTest
	testName := "BOLA Trailing Path Test"
	immuneCodes := []int{404, 405}

	for _, dp := range docParams {
		url, hdrs, qMap, body, pathWP, err := httpParamToRequest(baseURL, dp, queryParams, headers, utils.JSON)
		if err != nil {
			log.Error().Err(err).Msgf("skipping BOLA trailing path for %s", dp.Path)
			continue
		}

		randNum, err := fuzzer.GenerateRandomIntInRange(1, 1000)
		if err != nil {
			log.Error().Err(err).Msg("failed to generate random ID for BOLA trailing path")
			continue
		}
		randomID := fmt.Sprintf("%d", randNum)

		trailingPath := path.Join(dp.Path, randomID)
		trailingURL := strings.ReplaceAll(path.Join(url, randomID), ":/", "://")

		tests = append(tests, &ApiTest{
			TestName:            testName,
			Method:              dp.HttpMethod,
			URL:                 trailingURL,
			Path:                trailingPath,
			PathWithParams:      pathWP,
			Headers:             hdrs,
			QueryParams:         qMap,
			Body:                body,
			ImmuneResponseCodes: immuneCodes,
		})
	}
	return tests
}

// BFLATest generates Broken Function Level Authorization tests by testing
// lower-privileged methods against admin-only paths.
func BFLATest(baseURL string, docParams []*parser.DocHttpParams, queryParams map[string]string, headers map[string]string, adminPaths []string) []*ApiTest {
	var tests []*ApiTest
	testName := "BFLA Test (Broken Function Level Authorization)"
	immuneCodes := []int{401, 403, 404, 405}

	for _, dp := range docParams {
		// Only test paths that match admin path patterns
		if !isAdminPath(dp.Path, adminPaths) {
			continue
		}
		url, hdrs, qMap, body, pathWP, err := httpParamToRequest(baseURL, dp, queryParams, headers, utils.JSON)
		if err != nil {
			log.Error().Err(err).Msgf("skipping BFLA test for %s", dp.Path)
			continue
		}
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

func isAdminPath(apiPath string, adminPaths []string) bool {
	for _, ap := range adminPaths {
		if strings.Contains(strings.ToLower(apiPath), strings.ToLower(ap)) {
			return true
		}
	}
	// Heuristic: paths with /admin, /management, /internal, /superuser
	lower := strings.ToLower(apiPath)
	for _, keyword := range []string{"admin", "management", "internal", "superuser", "root", "staff"} {
		if strings.Contains(lower, keyword) {
			return true
		}
	}
	return false
}
