package tgen

import (
	"github.com/offat-x/offat-x/pkg/parser"
	"github.com/offat-x/offat-x/pkg/utils"
	"github.com/rs/zerolog/log"
)

// injectParamInParam inserts a payload value into all matching params.
func injectParamInParam(params []parser.Param, payload, injectIn string) []parser.Param {
	injected := append(params, parser.Param{
		Name: payload,
		In:   injectIn,
		Type: []string{"string"},
	})
	for i := range injected {
		p := &injected[i]
		typeStr := "string"
		if len(p.Type) > 0 {
			typeStr = p.Type[0]
		}
		switch typeStr {
		case "string", "random":
			p.Value = payload
		}
	}
	return injected
}

// injectParamIntoApiTest generates tests by injecting payloads across all param types.
func injectParamIntoApiTest(baseURL string, docParams []*parser.DocHttpParams, queryParams map[string]string, headers map[string]string, testName string, cfg InjectionConfig) []*ApiTest {
	var tests []*ApiTest

	for _, payload := range cfg.Payloads {
		for _, dp := range docParams {
			// Deep-copy to avoid mutation of original
			dpCopy := *dp
			dpCopy.BodyParams = append([]parser.Param(nil), dp.BodyParams...)
			dpCopy.QueryParams = append([]parser.Param(nil), dp.QueryParams...)
			dpCopy.CookieParams = append([]parser.Param(nil), dp.CookieParams...)
			dpCopy.HeaderParams = append([]parser.Param(nil), dp.HeaderParams...)
			dpCopy.PathParams = append([]parser.Param(nil), dp.PathParams...)

			if cfg.InBody {
				dpCopy.BodyParams = injectParamInParam(dpCopy.BodyParams, payload.InjText, Body)
			}
			if cfg.InQuery {
				dpCopy.QueryParams = injectParamInParam(dpCopy.QueryParams, payload.InjText, Query)
			}
			if cfg.InCookie {
				dpCopy.CookieParams = injectParamInParam(dpCopy.CookieParams, payload.InjText, Cookie)
			}
			if cfg.InHeader {
				dpCopy.HeaderParams = injectParamInParam(dpCopy.HeaderParams, payload.InjText, Header)
			}

			url, hdrs, qMap, body, pathWP, err := httpParamToRequest(baseURL, &dpCopy, queryParams, headers, utils.JSON)
			if err != nil {
				log.Error().Err(err).Msgf("skipping injection test for %s", dp.Path)
				continue
			}

			if cfg.InjectUriInQuery {
				qMap["offatx_test_endpoint"] = dp.Path
			}

			tests = append(tests, &ApiTest{
				TestName:                testName,
				Method:                  dp.HttpMethod,
				URL:                     url,
				Path:                    dp.Path,
				PathWithParams:          pathWP,
				Headers:                 hdrs,
				QueryParams:             qMap,
				Body:                    body,
				VulnerableResponseCodes: payload.VulnerableResponseCodes,
				ImmuneResponseCodes:     payload.ImmuneResponseCodes,
				MatchRegex:              payload.Regex,
			})
		}
	}
	return tests
}
