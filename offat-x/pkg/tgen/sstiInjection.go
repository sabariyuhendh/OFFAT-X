package tgen

import "github.com/offat-x/offat-x/pkg/parser"

var sstiPayloads = []Payload{
	{InjText: "{{7*7}}", VulnerableResponseCodes: []int{200}, Regex: `49`},
	{InjText: "${7*7}", VulnerableResponseCodes: []int{200}, Regex: `49`},
	{InjText: "<%= 7*7 %>", VulnerableResponseCodes: []int{200}, Regex: `49`},
	{InjText: "#{7*7}", VulnerableResponseCodes: []int{200}, Regex: `49`},
	{InjText: "{{config}}", VulnerableResponseCodes: []int{200}, Regex: `SECRET_KEY|DATABASE`},
	{InjText: "{{''.__class__.__mro__}}", VulnerableResponseCodes: []int{200}, Regex: `object`},
}

// BasicSstiInjectionTest generates Server-Side Template Injection tests.
func BasicSstiInjectionTest(baseURL string, docParams []*parser.DocHttpParams, queryParams map[string]string, headers map[string]string, cfg InjectionConfig) []*ApiTest {
	cfg.Payloads = sstiPayloads
	return injectParamIntoApiTest(baseURL, docParams, queryParams, headers, "SSTI Injection Test", cfg)
}
