package tgen

// ApiTest holds all data for a single generated API security test.
type ApiTest struct {
	// Pre-request fields
	TestName       string            `json:"test_name"`
	Method         string            `json:"method"`
	URL            string            `json:"url"`
	Path           string            `json:"path"`
	PathWithParams string            `json:"path_with_params"`
	Headers        map[string]string `json:"headers"`
	QueryParams    map[string]string `json:"query_params"`
	Body           []byte            `json:"body"`
	MatchRegex     string            `json:"match_regex"`

	// Post-request fields
	ResponseStatus  int               `json:"response_status"`
	ResponseBody    string            `json:"response_body"`
	ResponseHeaders map[string]string `json:"response_headers"`
	ElapsedMs       int64             `json:"elapsed_ms"`

	// Verdict
	IsVulnerable bool   `json:"is_vulnerable"`
	IsDataLeak   bool   `json:"is_data_leak"`
	IsImmune     bool   `json:"is_immune"`
	Severity     string `json:"severity"`
	CVSSScore    float64 `json:"cvss_score"`
	OWASPCategory string `json:"owasp_category"`
	CWE          string `json:"cwe"`
	Remediation  string `json:"remediation"`

	// OFFAT-X Semantic Diff Fields (Equation 2)
	DiffScore      float64 `json:"diff_score,omitempty"`
	KeySimilarity  float64 `json:"key_similarity,omitempty"`
	ValueOverlap   float64 `json:"value_overlap,omitempty"`
	RoleComparison string  `json:"role_comparison,omitempty"`


	// Verdict codes
	VulnerableResponseCodes []int                  `json:"vulnerable_response_codes"`
	ImmuneResponseCodes     []int                  `json:"immune_response_codes"`
	DataLeakMatches         []DataLeakPatternMatch `json:"data_leak_matches"`
}

// InjectionConfig controls where payloads are injected.
type InjectionConfig struct {
	InPath   bool
	InQuery  bool
	InBody   bool
	InHeader bool
	InCookie bool
	Payloads []Payload

	InjectUriInQuery bool
}

// Payload represents a single injection string and its detection criteria.
type Payload struct {
	InjText                 string
	VulnerableResponseCodes []int
	ImmuneResponseCodes     []int
	Regex                   string
}

// DataLeakPattern defines a regex-based sensitive data pattern.
type DataLeakPattern struct {
	Name       string `json:"name" yaml:"name"`
	Regex      string `json:"regex" yaml:"regex"`
	Confidence string `json:"confidence" yaml:"confidence"`
}

// DataLeakPatterns is a collection of patterns loaded from a YAML/JSON file.
type DataLeakPatterns struct {
	Patterns []DataLeakPattern `json:"patterns" yaml:"patterns"`
}

// DataLeakPatternMatch stores a matched pattern and the matching strings.
type DataLeakPatternMatch struct {
	DataLeakPattern
	Matches []string
}
