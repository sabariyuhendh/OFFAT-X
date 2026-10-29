// Package tgen (test generator) is the core of OFFAT-X.
// It generates security test cases from a parsed OAS document.
package tgen

import (
	"regexp"

	_ "github.com/offat-x/offat-x/pkg/logging"
	"github.com/offat-x/offat-x/pkg/parser"
	"github.com/rs/zerolog/log"
)

// TGenHandler configures and orchestrates all test generators.
type TGenHandler struct {
	BaseUrl            string
	Doc                []*parser.DocHttpParams
	DefaultHeaders     map[string]string
	DefaultQueryParams map[string]string

	// ── Core tests (from OFFAT) ──
	RunUnrestrictedHttpMethodTest    bool
	RunBasicSQLiTest                 bool
	RunBasicSSRFTest                 bool
	RunOsCommandInjectionTest        bool
	RunXssHtmlInjectionTest          bool
	RunSstiInjectionTest             bool
	RunBolaTest                      bool
	RunBolaTrailingPathTest          bool
	RunMissingAuthImplementationTest bool

	// ── OFFAT-X Extended tests ──
	RunJWTSecurityTest bool   // JWT security tests (OFFAT-X)
	RunBFLATest        bool   // Broken Function Level Authorization (OFFAT-X)
	AdminPathPrefixes  []string // Path prefixes treated as admin routes for BFLA

	// SSRF
	SsrfUrl string
}

// allInjectionConfig returns an InjectionConfig that injects into all parameter locations.
func allInjectionConfig() InjectionConfig {
	return InjectionConfig{
		InBody:   true,
		InCookie: true,
		InHeader: true,
		InPath:   true,
		InQuery:  true,
	}
}

// GenerateTests builds the full test suite from the parsed API spec.
func (t *TGenHandler) GenerateTests() []*ApiTest {
	var tests []*ApiTest

	// 1. Unrestricted HTTP Methods
	if t.RunUnrestrictedHttpMethodTest {
		newTests := UnrestrictedHttpMethods(t.BaseUrl, t.Doc, t.DefaultQueryParams, t.DefaultHeaders)
		tests = append(tests, newTests...)
		log.Info().Msgf("  [+] %d tests — Unrestricted HTTP Methods", len(newTests))
	}

	// 2. BOLA
	if t.RunBolaTest {
		newTests := BolaTest(t.BaseUrl, t.Doc, t.DefaultQueryParams, t.DefaultHeaders)
		tests = append(tests, newTests...)
		log.Info().Msgf("  [+] %d tests — BOLA", len(newTests))
	}

	// 3. BOLA Trailing Path
	if t.RunBolaTrailingPathTest {
		newTests := BolaTrailingPathTest(t.BaseUrl, t.Doc, t.DefaultQueryParams, t.DefaultHeaders)
		tests = append(tests, newTests...)
		log.Info().Msgf("  [+] %d tests — BOLA Trailing Path", len(newTests))
	}

	// 4. Missing Auth
	if t.RunMissingAuthImplementationTest {
		newTests := MissingAuthTest(t.BaseUrl, t.Doc, t.DefaultQueryParams, t.DefaultHeaders)
		tests = append(tests, newTests...)
		log.Info().Msgf("  [+] %d tests — Missing Auth Implementation", len(newTests))
	}

	// 5. SQL Injection
	if t.RunBasicSQLiTest {
		newTests := BasicSqliTest(t.BaseUrl, t.Doc, t.DefaultQueryParams, t.DefaultHeaders, allInjectionConfig())
		tests = append(tests, newTests...)
		log.Info().Msgf("  [+] %d tests — SQL Injection", len(newTests))
	}

	// 6. OS Command Injection
	if t.RunOsCommandInjectionTest {
		newTests := BasicOsCommandInjectionTest(t.BaseUrl, t.Doc, t.DefaultQueryParams, t.DefaultHeaders, allInjectionConfig())
		tests = append(tests, newTests...)
		log.Info().Msgf("  [+] %d tests — OS Command Injection", len(newTests))
	}

	// 7. XSS / HTML Injection
	if t.RunXssHtmlInjectionTest {
		newTests := BasicXssHtmlInjectionTest(t.BaseUrl, t.Doc, t.DefaultQueryParams, t.DefaultHeaders, allInjectionConfig())
		tests = append(tests, newTests...)
		log.Info().Msgf("  [+] %d tests — XSS/HTML Injection", len(newTests))
	}

	// 8. SSTI
	if t.RunSstiInjectionTest {
		newTests := BasicSstiInjectionTest(t.BaseUrl, t.Doc, t.DefaultQueryParams, t.DefaultHeaders, allInjectionConfig())
		tests = append(tests, newTests...)
		log.Info().Msgf("  [+] %d tests — SSTI", len(newTests))
	}

	// 9. SSRF
	if t.RunBasicSSRFTest && t.SsrfUrl != "" {
		ssrfCfg := allInjectionConfig()
		ssrfCfg.InjectUriInQuery = true
		newTests := BasicSsrfTest(t.SsrfUrl, t.BaseUrl, t.Doc, t.DefaultQueryParams, t.DefaultHeaders, ssrfCfg)
		tests = append(tests, newTests...)
		log.Info().Msgf("  [+] %d tests — SSRF", len(newTests))
	}

	// 10. JWT Security Tests [OFFAT-X]
	if t.RunJWTSecurityTest {
		newTests := JWTSecurityTest(t.BaseUrl, t.Doc, t.DefaultQueryParams, t.DefaultHeaders)
		tests = append(tests, newTests...)
		log.Info().Msgf("  [+] %d tests — JWT Security (OFFAT-X)", len(newTests))
	}

	// 11. BFLA [OFFAT-X]
	if t.RunBFLATest {
		newTests := BFLATest(t.BaseUrl, t.Doc, t.DefaultQueryParams, t.DefaultHeaders, t.AdminPathPrefixes)
		tests = append(tests, newTests...)
		log.Info().Msgf("  [+] %d tests — BFLA (OFFAT-X)", len(newTests))
	}

	log.Info().Msgf("Total: %d tests generated", len(tests))
	return tests
}

// FilterTests returns only tests whose path matches the given regex.
func (t *TGenHandler) FilterTests(tests []*ApiTest, pathRegex string) []*ApiTest {
	var filtered []*ApiTest
	for _, test := range tests {
		matched, err := regexp.MatchString(pathRegex, test.Path)
		if err != nil {
			log.Error().Err(err).Msgf("regex match error: %s vs %s", pathRegex, test.Path)
			continue
		}
		if matched {
			filtered = append(filtered, test)
		}
	}
	return filtered
}
