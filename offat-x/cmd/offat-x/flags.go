package main

import "strings"

// StringSliceFlag allows repeating a flag (e.g. -H 'key: value' -H 'key2: value2').
type StringSliceFlag []string

func (s *StringSliceFlag) String() string {
	return strings.Join(*s, ", ")
}

func (s *StringSliceFlag) Set(value string) error {
	*s = append(*s, value)
	return nil
}

// ToMap converts "Key: Value" or "Key=Value" entries to a map.
func (s StringSliceFlag) ToMap() map[string]string {
	out := make(map[string]string)
	for _, entry := range s {
		// Support both "Key: Value" and "Key=Value"
		if idx := strings.Index(entry, ": "); idx > 0 {
			out[entry[:idx]] = entry[idx+2:]
			continue
		}
		if idx := strings.Index(entry, "="); idx > 0 {
			out[entry[:idx]] = entry[idx+1:]
		}
	}
	return out
}

// FlagConfig holds all parsed CLI flags for the complete OFFAT-X platform.
type FlagConfig struct {
	Version *bool

	// OAS Document
	DocPath                         *string
	BaseUrl                         *string
	IsExternalRefsAllowed           *bool
	DisableExamplesValidation       *bool
	DisableSchemaDefaultsValidation *bool
	DisableSchemaPatternValidation  *bool

	// Test selection
	PathRegex *string

	// SSRF
	SsrfUrl *string

	// Data leak
	DataLeakPatternFile *string

	// Network
	RequestsPerSecond   *int
	SkipTlsVerification *bool
	Proxy               *string
	Headers             StringSliceFlag
	QueryParams         StringSliceFlag

	// Output & Reporting
	OutputFilePath    *string
	HtmlOutputPath    *string
	SarifOutputPath   *string
	AvoidImmuneFilter *bool

	// OFFAT-X Core Architectural Extensions
	ScopeFilePath          *string  // path to offat-x.yml (Listing 1)
	EnableStatefulChaining *bool    // stateful BFS dependency chaining (L <= 4)
	EnableRoleDiffMatrix   *bool    // 4-tier role-differential matrix (Table II)
	SemanticDiffTau        *float64 // Equation (2) decision threshold (default 0.70)
	UseDockerSandbox       *bool    // ephemeral container sandbox for DIRB

	// CI/CD Automated PR Merge Gate
	EnableCIMergeGate *bool   // enable CI gating mode
	BaselineFilePath  *string // baseline report path for differential comparison
	FailOnCondition   *string // high-new, critical-new, any-new, any-critical

	// Specialized Attack Engines
	RunJWTTests     *bool
	RunBFLATests    *bool
	AdminPaths      StringSliceFlag
	RunGraphQL      *bool
	GraphQLURL      *string
	RunRateLimit    *bool
	RateLimitProbes *int

	// DIRB Endpoint Discovery (Shadow API Detection - OWASP API9)
	RunDirb         *bool   // enable endpoint discovery
	DirbWordlist    *string // custom wordlist path; empty = auto-detect
	UseSystemDirb   *bool   // shell out to /usr/bin/dirb if on Kali Linux
	DirbConcurrency *int    // concurrent probes (default 20)
	DirbRPS         *int    // requests per second (default 50)
}
