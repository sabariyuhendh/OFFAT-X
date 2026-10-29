package tgen

import "github.com/offat-x/offat-x/pkg/parser"

// BasicSsrfTest generates SSRF tests by injecting a callback URL.
func BasicSsrfTest(ssrfURL string, baseURL string, docParams []*parser.DocHttpParams, queryParams map[string]string, headers map[string]string, cfg InjectionConfig) []*ApiTest {
	payloads := []Payload{
		{InjText: ssrfURL, VulnerableResponseCodes: []int{200}, Regex: ``},
		{InjText: "http://169.254.169.254/latest/meta-data/", VulnerableResponseCodes: []int{200}, Regex: `ami-id|instance-id`},
		{InjText: "http://metadata.google.internal/computeMetadata/v1/", VulnerableResponseCodes: []int{200}, Regex: `computeMetadata|project-id`},
	}
	cfg.Payloads = payloads
	return injectParamIntoApiTest(baseURL, docParams, queryParams, headers, "Basic SSRF Test", cfg)
}
