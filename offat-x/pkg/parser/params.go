package parser

// Param represents a single HTTP parameter extracted from an OAS document.
type Param struct {
	Name        string
	In          string // path, query, header, cookie, body
	Required    bool
	Type        []string
	ContentType string
	Value       interface{}
}

// DocHttpParams holds all parsed HTTP parameters for a single API operation.
type DocHttpParams struct {
	Url        string
	HttpMethod string
	Path       string
	Security   []map[string][]string

	BodyParams     []Param
	CookieParams   []Param
	HeaderParams   []Param
	PathParams     []Param
	QueryParams    []Param
	ResponseParams []Param
}
