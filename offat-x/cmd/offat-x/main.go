package main

import (
	"flag"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/offat-x/offat-x/pkg/chain"
	"github.com/offat-x/offat-x/pkg/diff"
	"github.com/offat-x/offat-x/pkg/discovery"
	"github.com/offat-x/offat-x/pkg/gate"
	"github.com/offat-x/offat-x/pkg/graphql"
	_ "github.com/offat-x/offat-x/pkg/logging"
	"github.com/offat-x/offat-x/pkg/parser"
	"github.com/offat-x/offat-x/pkg/ratelimit"
	"github.com/offat-x/offat-x/pkg/remediation"
	"github.com/offat-x/offat-x/pkg/report"
	"github.com/offat-x/offat-x/pkg/rolediff"
	"github.com/offat-x/offat-x/pkg/scorer"
	"github.com/offat-x/offat-x/pkg/tgen"
	"github.com/offat-x/offat-x/pkg/trunner"
	"github.com/offat-x/offat-x/pkg/trunner/postrunner"
	"github.com/offat-x/offat-x/pkg/utils"
	"github.com/rs/zerolog/log"
)

const Version = "v1.0.0"

func banner() {
	fmt.Print(`
   ___  _________  ___  _____  _  __
  / _ \/ __/ __/ |/ / |/ / _ \/ |/ /
 / // / _// _//    /   / __ /    / 
/____/_/ /_/ /_/|_/_/|_/_/ |_/_/|_/ 
           OFFensive API Tester X
  ──────────────────────────────────────────
  OWASP API Top 10 • JWT Security • GraphQL
  DIRB Discovery • Shadow API Detection
  Dependency Chaining (BFS L≤4) • 4-Tier Matrix
  Semantic Differ Eq(2) • OASIS SARIF 2.1.0
  Automated CI/CD PR Merge Gating
` + "\n")
}

func main() {
	banner()

	cfg := FlagConfig{}

	// ── Core flags ──────────────────────────────────────────────────────────
	cfg.Version = flag.Bool("v", false, "print version and exit")
	cfg.DocPath = flag.String("f", "", "OAS/OpenAPI document path or URL (required unless --graphql)")
	cfg.BaseUrl = flag.String("b", "", "override base URL from spec (e.g. http://localhost:8000/api)")
	cfg.IsExternalRefsAllowed = flag.Bool("er", false, "allow external $ref in OAS document")
	cfg.DisableExamplesValidation = flag.Bool("de", false, "disable OAS examples validation")
	cfg.DisableSchemaDefaultsValidation = flag.Bool("ds", false, "disable OAS schema defaults validation")
	cfg.DisableSchemaPatternValidation = flag.Bool("dp", false, "disable OAS schema pattern validation")
	cfg.PathRegex = flag.String("pr", "", "only run tests for paths matching this regex")
	cfg.SsrfUrl = flag.String("ssrf", "", "SSRF callback URL for out-of-band SSRF detection")
	cfg.DataLeakPatternFile = flag.String("dl", "", "data leak pattern YAML/JSON file")
	cfg.RequestsPerSecond = flag.Int("r", 60, "max requests per second")
	cfg.SkipTlsVerification = flag.Bool("ns", false, "skip TLS/SSL certificate verification")
	cfg.Proxy = flag.String("p", "", "HTTP/SOCKS proxy URL (e.g. http://127.0.0.1:8080)")
	flag.Var(&cfg.Headers, "H", "HTTP header in 'Key: Value' format (repeatable)")
	flag.Var(&cfg.QueryParams, "q", "Query param in 'key=value' format (repeatable)")
	cfg.OutputFilePath = flag.String("o", "offat-x-output.json", "JSON report output path")
	cfg.HtmlOutputPath = flag.String("html", "offat-x-report.html", "HTML report output path")
	cfg.SarifOutputPath = flag.String("sarif", "offat-x-report.sarif", "OASIS SARIF 2.1.0 output report path")
	cfg.AvoidImmuneFilter = flag.Bool("ai", true, "include immune (non-vulnerable) results in output")

	// ── OFFAT-X Architectural Extensions ─────────────────────────────────────
	cfg.ScopeFilePath = flag.String("scope", "", "path to offat-x.yml scope and role matrix configuration")
	cfg.EnableStatefulChaining = flag.Bool("chain", true, "enable stateful BFS dependency chaining (L ≤ 4)")
	cfg.EnableRoleDiffMatrix = flag.Bool("rolediff", true, "enable 4-tier role-differential matrix (Guest < Low < Premium < Admin)")
	cfg.SemanticDiffTau = flag.Float64("diff-tau", 0.70, "decision threshold τ for Equation (2) Semantic Differ")
	cfg.UseDockerSandbox = flag.Bool("sandbox", true, "execute external tools in hardened ephemeral Docker sandbox")

	// ── CI/CD PR Merge Gate flags ───────────────────────────────────────────
	cfg.EnableCIMergeGate = flag.Bool("ci", false, "enable automated CI/CD PR merge gate mode")
	cfg.BaselineFilePath = flag.String("baseline", "", "path to baseline scan JSON/SARIF for PR diff gating")
	cfg.FailOnCondition = flag.String("fail-on", "high-new", "gating failure rule: high-new, critical-new, any-new, any-critical")

	// ── Specialized Attack Engines ──────────────────────────────────────────
	cfg.RunJWTTests = flag.Bool("jwt", false, "enable JWT security tests")
	cfg.RunBFLATests = flag.Bool("bfla", false, "enable Broken Function Level Authorization tests")
	flag.Var(&cfg.AdminPaths, "admin-path", "admin path prefix for BFLA (repeatable)")
	cfg.RunGraphQL = flag.Bool("graphql", false, "enable GraphQL security tests")
	cfg.GraphQLURL = flag.String("graphql-url", "", "GraphQL endpoint URL")
	cfg.RunRateLimit = flag.Bool("rl", false, "enable rate limit detection")
	cfg.RateLimitProbes = flag.Int("rl-probes", 30, "requests per endpoint for rate-limit probe")

	// ── DIRB Endpoint Discovery flags ───────────────────────────────────────
	cfg.RunDirb = flag.Bool("dirb", false,
		"enable DIRB-style endpoint discovery (finds undocumented/shadow APIs — OWASP API9:2023)")
	cfg.DirbWordlist = flag.String("dirb-wordlist", "",
		"custom wordlist file for DIRB scan (default: auto-detect Kali lists or built-in)")
	cfg.UseSystemDirb = flag.Bool("dirb-system", false,
		"use system dirb binary if available (Kali Linux: /usr/bin/dirb)")
	cfg.DirbConcurrency = flag.Int("dirb-c", 20,
		"concurrent connections for DIRB discovery (default 20)")
	cfg.DirbRPS = flag.Int("dirb-r", 50,
		"requests per second for DIRB discovery (default 50)")

	flag.Parse()

	start := time.Now()

	if *cfg.Version {
		fmt.Println("OFFAT-X", Version)
		os.Exit(0)
	}

	// ── STAGE 1: Scope Validation and Target Allowlisting ───────────────────
	log.Info().Msg("━━ Stage 1: Scope Validation & Role Configuration ━━")
	var scopeConfig *rolediff.ScopeConfig
	scopeFile := *cfg.ScopeFilePath
	if scopeFile == "" && utils.FileExists("offat-x.yml") {
		scopeFile = "offat-x.yml"
	}

	if scopeFile != "" {
		sc, err := rolediff.LoadScopeConfig(scopeFile)
		if err != nil {
			log.Fatal().Err(err).Msg("Scope validation failed — aborting scan")
		}
		scopeConfig = sc
		log.Info().
			Str("scope_file", scopeFile).
			Int("allowed_hosts", len(sc.Scope)).
			Int("configured_roles", len(sc.Roles)).
			Msg("Scope validation: PASSED")

		// If base URL wasn't provided on CLI, adopt target from scope file
		if *cfg.BaseUrl == "" && sc.Target != "" {
			*cfg.BaseUrl = sc.Target
		}
	} else {
		log.Info().Msg("No offat-x.yml specified; running in unconstrained mode")
		scopeConfig = &rolediff.ScopeConfig{}
	}

	if *cfg.DocPath == "" && !*cfg.RunGraphQL {
		log.Error().Msg("-f <OAS file/URL> is required. Use -h for help.")
		os.Exit(1)
	}

	headers := cfg.Headers.ToMap()
	queryParams := cfg.QueryParams.ToMap()

	// If headers missing Auth, load low/admin tokens from scope file roles
	if _, hasAuth := headers["Authorization"]; !hasAuth && scopeConfig != nil {
		if role, ok := scopeConfig.Roles["low"]; ok {
			k, v := role.GetHeader()
			if k != "" && v != "" {
				headers[k] = v
			}
		}
	}

	// ── GraphQL-only mode ───────────────────────────────────────────────────
	if *cfg.RunGraphQL && *cfg.DocPath == "" {
		if *cfg.GraphQLURL == "" {
			log.Error().Msg("--graphql-url is required when using --graphql")
			os.Exit(1)
		}
		runGraphQLTests(*cfg.GraphQLURL, headers)
		return
	}

	// ── STAGE 2: OpenAPI Specification Ingestion & Normalization ───────────
	log.Info().Msg("━━ Stage 2: OpenAPI Spec Ingestion & Normalization ━━")
	p := parser.NewParser(
		*cfg.IsExternalRefsAllowed,
		*cfg.DisableExamplesValidation,
		*cfg.DisableSchemaDefaultsValidation,
		*cfg.DisableSchemaPatternValidation,
	)

	if err := p.Parse(*cfg.DocPath, utils.ValidateURL(*cfg.DocPath)); err != nil {
		log.Fatal().Err(err).Msg("Failed to parse OAS document")
	}
	if err := p.Doc.SetBaseUrl(*cfg.BaseUrl); err != nil {
		log.Error().Err(err).Msg("Failed to set base URL")
	}
	if err := p.Doc.SetDocHttpParams(); err != nil {
		log.Fatal().Err(err).Msg("Failed to extract HTTP params from spec")
	}

	log.Info().Msg("Fuzzing HTTP parameter values…")
	p.FuzzDocHttpParams()

	baseURL := *p.Doc.GetBaseUrl()
	log.Info().Msgf("Target: %s (Endpoints: %d)", baseURL, len(p.Doc.GetDocHttpParams()))

	// ── STAGE 3: Ephemeral Sandboxed Reconnaissance (DIRB) ─────────────────
	var dirbResult discovery.DirbResult
	var comparisonReport discovery.ComparisonReport

	if *cfg.RunDirb {
		log.Info().Msg("━━ Stage 3: Ephemeral Sandboxed Reconnaissance (DIRB) ━━")

		knownPaths := make([]string, 0, len(p.Doc.GetDocHttpParams()))
		for _, dp := range p.Doc.GetDocHttpParams() {
			knownPaths = append(knownPaths, dp.Path)
		}

		if *cfg.UseDockerSandbox {
			log.Info().Msg("Deploying DIRB container sandbox (--cap-drop=ALL, no-new-privileges, read-only rootfs)…")
			lines, err := discovery.RunSandboxedDirb(baseURL, *cfg.DirbWordlist)
			if err != nil {
				log.Warn().Err(err).Msg("Container sandbox unavailable; falling back to high-throughput native scanner")
			} else {
				log.Info().Int("raw_lines", len(lines)).Msg("Containerized reconnaissance complete")
			}
		}

		dirbCfg := discovery.Config{
			BaseURL:        baseURL,
			WordlistPath:   *cfg.DirbWordlist,
			UseSystemDirb:  *cfg.UseSystemDirb,
			KnownPaths:     knownPaths,
			Headers:        headers,
			Concurrency:    *cfg.DirbConcurrency,
			RequestsPerSec: *cfg.DirbRPS,
			TimeoutSec:     8,
			SkipCodes:      []int{404},
			Extensions:     []string{"", ".json"},
		}

		scanner := discovery.NewScanner(dirbCfg)
		dirbResult = scanner.Run()

		comparisonReport = discovery.BuildComparisonReport(knownPaths, dirbResult.Discovered)
		discovery.PrintComparisonSummary(comparisonReport)

		log.Info().
			Int("undocumented", comparisonReport.UndocumentedCount).
			Str("shadow_risk", comparisonReport.ShadowAPIRisk).
			Msg("Shadow API analysis complete")
	}

	// ── STAGE 4: Dependency Graph DAG Synthesis & BFS Chain Planning ────────
	log.Info().Msg("━━ Stage 4: Dependency Graph Construction & BFS Chain Planning ━━")
	depGraph := chain.BuildDependencyGraph(p.Doc.GetDocHttpParams())
	planner := chain.NewPlanner(depGraph, 4)
	plannedChains := planner.PlanAllChains()

	log.Info().
		Int("vertices_v", len(depGraph.Nodes)).
		Int("producer_edges_e", len(depGraph.Edges)).
		Int("planned_chains", len(plannedChains)).
		Msg("Dependency DAG synthesis complete (bounded depth L ≤ 4)")

	for i, c := range plannedChains {
		if i < 5 {
			log.Debug().Msg(c.SummaryString())
		}
	}

	// ── STAGE 5: Four-Tier Role-Differential Matrix & Stateful Chaining ─────
	log.Info().Msg("━━ Stage 5: Four-Tier Role-Differential & Stateful Chaining ━━")
	var chainedResults []chain.ChainedTestResult

	if *cfg.EnableStatefulChaining && len(scopeConfig.Roles) > 1 {
		executor := chain.NewChainExecutor(baseURL, scopeConfig)
		for _, ch := range plannedChains {
			if !ch.HasValidPlan {
				continue
			}
			// Horizontal BOLA test: low vs low_secondary
			res := executor.ExecuteStatefulBOLA(ch, "low", "low_secondary")
			chainedResults = append(chainedResults, res)
			if res.IsVulnerable {
				log.Warn().
					Str("endpoint", res.TargetEndpoint).
					Float64("score_d", res.DiffResult.ScoreD).
					Msg("⚠ Confirmed BOLA exfiltration via stateful BFS chaining!")
			}
		}
		log.Info().Int("chained_evaluations", len(chainedResults)).Msg("Stateful chained replay complete")
	}

	// ── STAGE 6: Specialized Attack Batteries & Core Security Suite ────────
	log.Info().Msg("━━ Stage 6: Attack Batteries (JWT, Injection, BFLA, Auth) ━━")

	if *cfg.RunJWTTests {
		log.Info().Msg("Running JWT static analysis on bearer tokens…")
		for _, v := range headers {
			if strings.Contains(strings.ToLower(v), "bearer ") {
				tgen.JWTStaticAnalysis(v)
				break
			}
		}
	}

	var dataLeakPatterns tgen.DataLeakPatterns
	if *cfg.DataLeakPatternFile != "" {
		ct, err := utils.InferContentTypeByPath(*cfg.DataLeakPatternFile)
		if err == nil {
			_ = utils.LoadJsonYamlFromFile(*cfg.DataLeakPatternFile, &dataLeakPatterns, ct)
		}
	}

	handler := tgen.TGenHandler{
		BaseUrl:            baseURL,
		Doc:                p.Doc.GetDocHttpParams(),
		DefaultHeaders:     headers,
		DefaultQueryParams: queryParams,

		RunUnrestrictedHttpMethodTest:    true,
		RunBolaTest:                      true,
		RunBolaTrailingPathTest:          true,
		RunMissingAuthImplementationTest: true,
		RunBasicSQLiTest:                 true,
		RunOsCommandInjectionTest:        true,
		RunXssHtmlInjectionTest:          true,
		RunSstiInjectionTest:             true,
		RunBasicSSRFTest:                 *cfg.SsrfUrl != "",
		SsrfUrl:                          *cfg.SsrfUrl,
		RunJWTSecurityTest:               *cfg.RunJWTTests,
		RunBFLATest:                      *cfg.RunBFLATests,
		AdminPathPrefixes:                []string(cfg.AdminPaths),
	}

	apiTests := handler.GenerateTests()

	if *cfg.PathRegex != "" {
		apiTests = handler.FilterTests(apiTests, *cfg.PathRegex)
	}

	log.Info().Msgf("Executing %d tests at %d req/s…", len(apiTests), *cfg.RequestsPerSecond)
	trunner.RunApiTests(&handler, *cfg.RequestsPerSecond, apiTests)

	// ── STAGE 7: Semantic Response Diffing & CVSS Remediation ───────────────
	log.Info().Msg("━━ Stage 7: Semantic Response Diffing Eq(2) & Remediation ━━")
	postrunner.ApplyRegexVulnerabilityDetection(&apiTests)
	if len(dataLeakPatterns.Patterns) > 0 {
		postrunner.UpdateDataLeakResult(&apiTests, dataLeakPatterns)
	}
	postrunner.UpdateStatusCodeBasedResult(&apiTests)
	postrunner.EnrichWithScores(&apiTests)

	// Attach Equation (2) Semantic Diff scores and context-aware code remediation
	diffEngine := diff.NewDiffer(diff.Weights{
		Wk:  0.30,
		Wo:  0.50,
		Ws:  0.20,
		We:  0.60,
		Tau: *cfg.SemanticDiffTau,
	})

	for _, t := range apiTests {
		// Run semantic differ on response body
		dRes := diffEngine.Evaluate("{}", t.ResponseBody, t.ResponseStatus)
		t.DiffScore = dRes.ScoreD
		t.KeySimilarity = dRes.JaccardKeySim
		t.ValueOverlap = dRes.OwnerIdOverlap

		// Synthesize context-aware code remediation
		directive := remediation.GenerateDirective(t.CWE, t.OWASPCategory, t.Path, t.Method)
		t.Remediation = directive.FixedSnippet
	}

	postrunner.FilterImmuneResults(&apiTests, cfg.AvoidImmuneFilter)

	// Optional Rate Limit & GraphQL phases
	if *cfg.RunRateLimit {
		runRateLimitTests(p.Doc.GetDocHttpParams(), headers, *cfg.RateLimitProbes)
	}
	if *cfg.RunGraphQL && *cfg.GraphQLURL != "" {
		runGraphQLTests(*cfg.GraphQLURL, headers)
	}

	// ── STAGE 8: Reporting & Automated CI/CD PR Merge Gate ──────────────────
	log.Info().Msg("━━ Stage 8: Reports & DevSecOps CI/CD Gating ━━")

	summary := report.BuildSummary(apiTests)
	log.Info().
		Int("total_tests", summary.TotalTests).
		Int("vulnerable", summary.Vulnerable).
		Int("critical", summary.Critical).
		Int("high", summary.High).
		Int("medium", summary.Medium).
		Int("low", summary.Low).
		Int("data_leaks", summary.DataLeaks).
		Msg("Security assessment summary")

	// 1. JSON Report
	if jsonData, err := report.Report(apiTests); err == nil {
		if err := utils.WriteFile(*cfg.OutputFilePath, jsonData); err == nil {
			log.Info().Msgf("JSON report → %s", *cfg.OutputFilePath)
		}
	}

	// 2. HTML Executive Dashboard
	if *cfg.HtmlOutputPath != "" {
		htmlData := report.HTMLReport(apiTests, Version)
		if err := utils.WriteFile(*cfg.HtmlOutputPath, htmlData); err == nil {
			log.Info().Msgf("HTML report → %s", *cfg.HtmlOutputPath)
		}
	}

	// 3. OASIS SARIF 2.1.0 Standard Export
	if *cfg.SarifOutputPath != "" {
		if sarifBytes, err := report.GenerateSARIF(apiTests, *cfg.DocPath, Version); err == nil {
			if err := utils.WriteFile(*cfg.SarifOutputPath, sarifBytes); err == nil {
				log.Info().Msgf("OASIS SARIF 2.1.0 report → %s", *cfg.SarifOutputPath)
			}
		}
	}

	// 4. DIRB Discovery Report
	if *cfg.RunDirb {
		dirbReportPath := "offat-x-discovery.json"
		if dirbJSON, err := report.DiscoveryReport(dirbResult, comparisonReport); err == nil {
			_ = utils.WriteFile(dirbReportPath, dirbJSON)
			log.Info().Msgf("Discovery report → %s", dirbReportPath)
		}
	}

	// Print terminal results table
	report.Table(apiTests, nil)

	// 5. Automated CI/CD PR Merge Gate
	if *cfg.EnableCIMergeGate {
		gateSummary := gate.EvaluateGate(apiTests, *cfg.BaselineFilePath, *cfg.FailOnCondition)
		gate.PrintGateReport(gateSummary)
		if !gateSummary.Passed {
			log.Error().Msg("PR Merge Gate FAILED — Exiting with status 1 to block pull request merge")
			os.Exit(1)
		}
		log.Info().Msg("PR Merge Gate PASSED — Pull request approved for merge")
	}

	log.Info().Msgf("Total execution time: %v", time.Since(start).Round(time.Millisecond))
}

// runGraphQLTests executes the GraphQL test suite.
func runGraphQLTests(endpoint string, headers map[string]string) {
	log.Info().Msgf("Running GraphQL security tests against %s…", endpoint)
	tester := graphql.NewTester(endpoint, headers, 15)
	results := tester.RunAll()

	vulnCount := 0
	for _, r := range results {
		if r.IsVulnerable && r.Vulnerability != nil {
			vulnCount++
			log.Warn().
				Str("test", r.TestName).
				Str("severity", r.Vulnerability.Severity).
				Str("finding", r.Vulnerability.Name).
				Int("status", r.StatusCode).
				Msg("GraphQL vulnerability found")
		}
	}
	log.Info().Msgf("GraphQL scan complete — %d/%d flagged", vulnCount, len(results))
}

// runRateLimitTests probes each unique endpoint for rate limiting.
func runRateLimitTests(docParams []*parser.DocHttpParams, headers map[string]string, probes int) {
	log.Info().Msg("Running rate-limit detection tests…")
	seen := make(map[string]bool)
	detector := ratelimit.NewDetector(ratelimit.ProbeConfig{
		Requests:    probes,
		Concurrency: 10,
		Headers:     headers,
	})
	for _, dp := range docParams {
		key := dp.HttpMethod + ":" + dp.Url
		if seen[key] {
			continue
		}
		seen[key] = true
		result := detector.Probe(dp.Url, dp.HttpMethod)
		if result.IsVulnerable {
			log.Warn().
				Str("url", dp.Url).
				Str("method", dp.HttpMethod).
				Str("confidence", result.Confidence).
				Msg("⚠ Rate limit MISSING")
		}
	}
}
