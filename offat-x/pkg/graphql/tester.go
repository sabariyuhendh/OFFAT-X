// Package graphql provides GraphQL-specific security tests for OFFAT-X.
// Covers: introspection exposure, batch query DoS, deeply nested queries,
// field suggestion leakage, SSRF via URL arguments, and injection in variables.
package graphql

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// GraphQLVulnerability represents a detected GraphQL security issue.
type GraphQLVulnerability struct {
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Severity    string  `json:"severity"`
	CVSS        float64 `json:"cvss_score"`
	Details     string  `json:"details"`
	Remediation string  `json:"remediation"`
}

// TestResult holds the outcome of a single GraphQL test.
type TestResult struct {
	TestName       string               `json:"test_name"`
	Endpoint       string               `json:"endpoint"`
	Query          string               `json:"query"`
	StatusCode     int                  `json:"status_code"`
	ResponseBody   string               `json:"response_body"`
	IsVulnerable   bool                 `json:"is_vulnerable"`
	Vulnerability  *GraphQLVulnerability `json:"vulnerability,omitempty"`
	ElapsedMs      int64                `json:"elapsed_ms"`
}

// Tester performs GraphQL security tests against a given endpoint.
type Tester struct {
	Endpoint string
	Headers  map[string]string
	Timeout  time.Duration
	client   *http.Client
}

// NewTester creates a Tester for the given GraphQL endpoint.
func NewTester(endpoint string, headers map[string]string, timeoutSec int) *Tester {
	if timeoutSec <= 0 {
		timeoutSec = 15
	}
	return &Tester{
		Endpoint: endpoint,
		Headers:  headers,
		Timeout:  time.Duration(timeoutSec) * time.Second,
		client:   &http.Client{Timeout: time.Duration(timeoutSec) * time.Second},
	}
}

// RunAll executes the full GraphQL security test suite.
func (t *Tester) RunAll() []TestResult {
	var results []TestResult
	tests := []func() TestResult{
		t.TestIntrospection,
		t.TestFieldSuggestions,
		t.TestBatchQuery,
		t.TestDeepNesting,
		t.TestSQLiInVariable,
		t.TestXSSInVariable,
		t.TestSSRFInVariable,
		t.TestUnauthorizedMutation,
	}
	for _, test := range tests {
		results = append(results, test())
	}
	return results
}

// TestIntrospection checks if introspection is enabled (information exposure).
func (t *Tester) TestIntrospection() TestResult {
	query := `{"query":"{ __schema { types { name } } }"}`
	start := time.Now()
	status, body, err := t.post(query)
	elapsed := time.Since(start).Milliseconds()

	result := TestResult{
		TestName:   "GraphQL Introspection Enabled",
		Endpoint:   t.Endpoint,
		Query:      query,
		StatusCode: status,
		ElapsedMs:  elapsed,
	}

	if err != nil {
		result.ResponseBody = "request error: " + err.Error()
		return result
	}
	result.ResponseBody = body

	// Introspection enabled if response contains schema data
	if status == 200 && strings.Contains(body, "__schema") && !strings.Contains(body, "errors") {
		result.IsVulnerable = true
		result.Vulnerability = &GraphQLVulnerability{
			Name:        "GraphQL Introspection Enabled",
			Description: "The GraphQL endpoint allows schema introspection, exposing the full API schema including all types, queries, mutations, and field names. This significantly aids attackers in reconnaissance.",
			Severity:    "MEDIUM",
			CVSS:        5.3,
			Remediation: "Disable introspection in production environments. Most GraphQL frameworks support a configuration flag (e.g., introspection: false).",
		}
	}
	return result
}

// TestFieldSuggestions checks if the server leaks field name suggestions.
func (t *Tester) TestFieldSuggestions() TestResult {
	query := `{"query":"{ userss { id } }"}`
	start := time.Now()
	status, body, err := t.post(query)
	elapsed := time.Since(start).Milliseconds()

	result := TestResult{
		TestName:   "GraphQL Field Suggestion Leakage",
		Endpoint:   t.Endpoint,
		Query:      query,
		StatusCode: status,
		ElapsedMs:  elapsed,
	}

	if err != nil {
		result.ResponseBody = "request error: " + err.Error()
		return result
	}
	result.ResponseBody = body

	// Field suggestion appears as "Did you mean ...?" in errors
	if strings.Contains(strings.ToLower(body), "did you mean") {
		result.IsVulnerable = true
		result.Vulnerability = &GraphQLVulnerability{
			Name:        "GraphQL Field Suggestion Leakage",
			Description: "The server returns 'Did you mean?' suggestions in error responses, revealing valid field names to an unauthenticated attacker.",
			Severity:    "LOW",
			CVSS:        3.7,
			Remediation: "Disable field suggestions in production (e.g., 'fieldSuggestions: false' in Apollo Server, or equivalent).",
		}
	}
	return result
}

// TestBatchQuery tests for batch query abuse (DoS potential).
func (t *Tester) TestBatchQuery() TestResult {
	// Send 50 introspection queries in a batch
	queries := make([]map[string]string, 50)
	for i := range queries {
		queries[i] = map[string]string{"query": "{ __typename }"}
	}
	batchJSON, _ := json.Marshal(queries)
	start := time.Now()
	status, body, err := t.postRaw(string(batchJSON))
	elapsed := time.Since(start).Milliseconds()

	result := TestResult{
		TestName:   "GraphQL Batch Query Abuse",
		Endpoint:   t.Endpoint,
		Query:      fmt.Sprintf("[%d queries batched]", len(queries)),
		StatusCode: status,
		ElapsedMs:  elapsed,
	}

	if err != nil {
		result.ResponseBody = "request error: " + err.Error()
		return result
	}
	result.ResponseBody = truncate(body, 500)

	// If server processed all 50 without rate limiting, it's vulnerable
	if status == 200 && strings.Contains(body, "__typename") {
		result.IsVulnerable = true
		result.Vulnerability = &GraphQLVulnerability{
			Name:        "GraphQL Batch Query Abuse (Potential DoS)",
			Description: "The server processed 50 batched GraphQL queries in a single HTTP request without restriction. This can be exploited for denial-of-service or to bypass rate limits.",
			Severity:    "HIGH",
			CVSS:        7.5,
			Remediation: "Implement query batch size limits. Use complexity analysis or depth limiting (e.g., graphql-query-complexity). Consider disabling batching if not needed.",
		}
	}
	return result
}

// TestDeepNesting tests for deeply nested query attacks (query complexity).
func (t *Tester) TestDeepNesting() TestResult {
	// Build a deeply nested query that tries to exhaust resources
	depth := 15
	nested := "friends { "
	for i := 0; i < depth; i++ {
		nested += "friends { "
	}
	nested += "id "
	for i := 0; i <= depth; i++ {
		nested += "}"
	}
	query := fmt.Sprintf(`{"query":"{ user { %s } }"}`, nested)

	start := time.Now()
	status, body, err := t.post(query)
	elapsed := time.Since(start).Milliseconds()

	result := TestResult{
		TestName:   "GraphQL Deep Nesting Attack",
		Endpoint:   t.Endpoint,
		Query:      fmt.Sprintf("[depth-%d nested query]", depth),
		StatusCode: status,
		ElapsedMs:  elapsed,
	}

	if err != nil {
		result.ResponseBody = "request error: " + err.Error()
		return result
	}
	result.ResponseBody = truncate(body, 500)

	// If no error about depth/complexity, server might be vulnerable
	if status == 200 && !strings.Contains(strings.ToLower(body), "complexity") &&
		!strings.Contains(strings.ToLower(body), "max depth") {
		result.IsVulnerable = true
		result.Vulnerability = &GraphQLVulnerability{
			Name:        "GraphQL Deep Nesting (Missing Query Depth Limit)",
			Description: fmt.Sprintf("A query nested %d levels deep was accepted without a depth-limit error. Deep queries can exhaust CPU/memory and cause denial of service.", depth),
			Severity:    "HIGH",
			CVSS:        7.5,
			Remediation: "Implement query depth limiting (e.g., graphql-depth-limit library) and query complexity analysis. Reject queries exceeding defined thresholds.",
		}
	}
	return result
}

// TestSQLiInVariable tests for SQL injection via GraphQL variables.
func (t *Tester) TestSQLiInVariable() TestResult {
	payload := "' OR '1'='1"
	query := fmt.Sprintf(`{"query":"query { user(id: \"%s\") { id name } }"}`, payload)
	start := time.Now()
	status, body, err := t.post(query)
	elapsed := time.Since(start).Milliseconds()

	result := TestResult{
		TestName:   "GraphQL SQLi in Variable",
		Endpoint:   t.Endpoint,
		Query:      query,
		StatusCode: status,
		ElapsedMs:  elapsed,
	}

	if err != nil {
		result.ResponseBody = "request error: " + err.Error()
		return result
	}
	result.ResponseBody = truncate(body, 500)

	// Indicators of SQLi in response
	sqliIndicators := []string{"syntax error", "sql", "mysql", "postgresql", "sqlite", "ORA-", "unrecognized token"}
	for _, indicator := range sqliIndicators {
		if strings.Contains(strings.ToLower(body), indicator) {
			result.IsVulnerable = true
			result.Vulnerability = &GraphQLVulnerability{
				Name:        "GraphQL SQL Injection via Variable",
				Description: "The server returned a database error message in response to a SQL injection payload in a GraphQL variable. This confirms lack of input sanitization.",
				Severity:    "CRITICAL",
				CVSS:        9.8,
				Details:     "Matched indicator: " + indicator,
				Remediation: "Use parameterized queries / prepared statements in resolvers. Validate and sanitize all input variables.",
			}
			break
		}
	}
	return result
}

// TestXSSInVariable tests for reflected XSS via GraphQL variables.
func (t *Tester) TestXSSInVariable() TestResult {
	payload := "<script>alert(1)</script>"
	query := fmt.Sprintf(`{"query":"query { search(term: \"%s\") { id } }"}`, payload)
	start := time.Now()
	status, body, err := t.post(query)
	elapsed := time.Since(start).Milliseconds()

	result := TestResult{
		TestName:   "GraphQL XSS in Variable",
		Endpoint:   t.Endpoint,
		Query:      query,
		StatusCode: status,
		ElapsedMs:  elapsed,
	}

	if err != nil {
		result.ResponseBody = "request error: " + err.Error()
		return result
	}
	result.ResponseBody = truncate(body, 500)

	if strings.Contains(body, payload) {
		result.IsVulnerable = true
		result.Vulnerability = &GraphQLVulnerability{
			Name:        "GraphQL Reflected XSS via Variable",
			Description: "The GraphQL response reflects back unsanitized user input, indicating a potential XSS vector if this response is rendered in a browser.",
			Severity:    "HIGH",
			CVSS:        6.1,
			Remediation: "Sanitize all output in resolvers. Ensure the API sets proper Content-Type headers and the frontend escapes dynamic content.",
		}
	}
	return result
}

// TestSSRFInVariable tests for SSRF via URL-typed GraphQL variables.
func (t *Tester) TestSSRFInVariable() TestResult {
	ssrfPayload := "http://169.254.169.254/latest/meta-data/"
	query := fmt.Sprintf(`{"query":"mutation { fetchUrl(url: \"%s\") { content } }"}`, ssrfPayload)
	start := time.Now()
	status, body, err := t.post(query)
	elapsed := time.Since(start).Milliseconds()

	result := TestResult{
		TestName:   "GraphQL SSRF via URL Variable",
		Endpoint:   t.Endpoint,
		Query:      query,
		StatusCode: status,
		ElapsedMs:  elapsed,
	}

	if err != nil {
		result.ResponseBody = "request error: " + err.Error()
		return result
	}
	result.ResponseBody = truncate(body, 500)

	// SSRF indicators: AWS metadata, GCP metadata, internal content
	ssrfIndicators := []string{"ami-id", "instance-id", "metadata", "169.254", "computeMetadata"}
	for _, indicator := range ssrfIndicators {
		if strings.Contains(body, indicator) {
			result.IsVulnerable = true
			result.Vulnerability = &GraphQLVulnerability{
				Name:        "GraphQL SSRF via URL Variable",
				Description: "The GraphQL resolver fetched an internal/cloud-metadata URL provided by the attacker, indicating SSRF vulnerability.",
				Severity:    "CRITICAL",
				CVSS:        9.1,
				Remediation: "Validate and restrict URL inputs in resolvers. Block requests to private IP ranges and cloud metadata endpoints using an allowlist.",
			}
			break
		}
	}
	return result
}

// TestUnauthorizedMutation tests if mutations are accessible without authentication.
func (t *Tester) TestUnauthorizedMutation() TestResult {
	query := `{"query":"mutation { deleteUser(id: \"1\") { success } }"}`
	// Remove auth headers for this test
	tempHeaders := map[string]string{"Content-Type": "application/json"}
	start := time.Now()
	status, body, err := t.postWithHeaders(query, tempHeaders)
	elapsed := time.Since(start).Milliseconds()

	result := TestResult{
		TestName:   "GraphQL Unauthorized Mutation",
		Endpoint:   t.Endpoint,
		Query:      query,
		StatusCode: status,
		ElapsedMs:  elapsed,
	}

	if err != nil {
		result.ResponseBody = "request error: " + err.Error()
		return result
	}
	result.ResponseBody = truncate(body, 500)

	// If server returns 200 without error about authentication
	if status == 200 && !strings.Contains(strings.ToLower(body), "unauthorized") &&
		!strings.Contains(strings.ToLower(body), "unauthenticated") &&
		!strings.Contains(strings.ToLower(body), "not authenticated") {
		result.IsVulnerable = true
		result.Vulnerability = &GraphQLVulnerability{
			Name:        "GraphQL Broken Authentication on Mutation",
			Description: "A destructive mutation was accepted without an Authorization header, suggesting missing authentication enforcement on sensitive operations.",
			Severity:    "CRITICAL",
			CVSS:        9.8,
			Remediation: "Enforce authentication middleware for all mutations. Use directive-based auth (e.g., @auth) or resolver-level checks.",
		}
	}
	return result
}

// --- HTTP helpers ---

func (t *Tester) post(body string) (int, string, error) {
	headers := map[string]string{"Content-Type": "application/json"}
	for k, v := range t.Headers {
		headers[k] = v
	}
	return t.postWithHeaders(body, headers)
}

func (t *Tester) postRaw(body string) (int, string, error) {
	return t.post(body)
}

func (t *Tester) postWithHeaders(body string, headers map[string]string) (int, string, error) {
	req, err := http.NewRequest(http.MethodPost, t.Endpoint, bytes.NewBufferString(body))
	if err != nil {
		return 0, "", err
	}
	for k, v := range headers {
		req.Header.Set(k, v)
	}

	resp, err := t.client.Do(req)
	if err != nil {
		return 0, "", err
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return resp.StatusCode, "", err
	}
	return resp.StatusCode, string(respBytes), nil
}

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max] + "... [truncated]"
}
