package tgen

import "github.com/offat-x/offat-x/pkg/parser"

var xssPayloads = []Payload{
	{InjText: `<script>alert(1)</script>`, VulnerableResponseCodes: []int{200}, Regex: `<script>alert\(1\)</script>`},
	{InjText: `"><img src=x onerror=alert(1)>`, VulnerableResponseCodes: []int{200}, Regex: `onerror=alert`},
	{InjText: `<svg onload=alert(1)>`, VulnerableResponseCodes: []int{200}, Regex: `onload=alert`},
	{InjText: `javascript:alert(1)`, VulnerableResponseCodes: []int{200}, Regex: `javascript:alert`},
	{InjText: `'"><body onload=alert(1)>`, VulnerableResponseCodes: []int{200}, Regex: `onload=alert`},
}

// BasicXssHtmlInjectionTest generates XSS/HTML injection tests.
func BasicXssHtmlInjectionTest(baseURL string, docParams []*parser.DocHttpParams, queryParams map[string]string, headers map[string]string, cfg InjectionConfig) []*ApiTest {
	cfg.Payloads = xssPayloads
	return injectParamIntoApiTest(baseURL, docParams, queryParams, headers, "Basic XSS/HTML Injection Test", cfg)
}
