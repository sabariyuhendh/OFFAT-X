// Package discovery implements DIRB-style endpoint brute-forcing for OFFAT-X.
//
// It probes a target base URL against a wordlist of common API paths,
// identifying endpoints that respond with non-404 status codes — including
// endpoints that are NOT documented in the OAS spec (OWASP API9:2023).
//
// It can use:
//   - The built-in API wordlist (embedded in the binary)
//   - An external DIRB wordlist (/usr/share/dirb/wordlists/common.txt on Kali)
//   - Any user-supplied wordlist file
//   - The system `dirb` binary if available (shells out, parses output)
package discovery

import (
	"bufio"
	"bytes"
	"context"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"sync"
	"time"

	"github.com/rs/zerolog/log"
	"golang.org/x/time/rate"
)

// DiscoveredEndpoint is a path found by brute-force that returned a live response.
type DiscoveredEndpoint struct {
	Path           string `json:"path"`
	FullURL        string `json:"full_url"`
	StatusCode     int    `json:"status_code"`
	ContentLength  int64  `json:"content_length"`
	ContentType    string `json:"content_type"`
	IsDocumented   bool   `json:"is_documented"`   // present in OAS spec
	IsUndocumented bool   `json:"is_undocumented"` // NOT in OAS spec = OWASP API9
	ElapsedMs      int64  `json:"elapsed_ms"`
	Source         string `json:"source"` // "builtin", "dirb", "custom"
}

// DirbResult holds everything from a discovery scan.
type DirbResult struct {
	BaseURL            string               `json:"base_url"`
	TotalProbed        int                  `json:"total_probed"`
	Discovered         []DiscoveredEndpoint `json:"discovered"`
	Undocumented       []DiscoveredEndpoint `json:"undocumented_endpoints"`
	DocumentedFound    int                  `json:"documented_found"`
	UndocumentedFound  int                  `json:"undocumented_found"`
	ElapsedMs          int64                `json:"elapsed_ms"`
	WordlistSource     string               `json:"wordlist_source"`
}

// Config controls the discovery scanner.
type Config struct {
	BaseURL         string
	WordlistPath    string            // custom wordlist file; "" = use built-in
	UseSystemDirb   bool              // shell out to /usr/bin/dirb if available
	KnownPaths      []string          // paths already in the OAS spec
	Headers         map[string]string // auth headers etc.
	Concurrency     int               // default 20
	RequestsPerSec  int               // default 50
	TimeoutSec      int               // default 8
	SkipCodes       []int             // codes to ignore (default: 404)
	Extensions      []string          // try .json .yaml etc. after each path
}

// DefaultConfig returns a sensible Config for API discovery.
func DefaultConfig(baseURL string, knownPaths []string, headers map[string]string) Config {
	return Config{
		BaseURL:        baseURL,
		KnownPaths:     knownPaths,
		Headers:        headers,
		Concurrency:    20,
		RequestsPerSec: 50,
		TimeoutSec:     8,
		SkipCodes:      []int{404},
		Extensions:     []string{"", ".json", ".yaml"},
	}
}

// Scanner performs the endpoint discovery.
type Scanner struct {
	cfg    Config
	client *http.Client
}

// NewScanner creates a Scanner from config.
func NewScanner(cfg Config) *Scanner {
	if cfg.Concurrency <= 0 {
		cfg.Concurrency = 20
	}
	if cfg.RequestsPerSec <= 0 {
		cfg.RequestsPerSec = 50
	}
	if cfg.TimeoutSec <= 0 {
		cfg.TimeoutSec = 8
	}
	if len(cfg.SkipCodes) == 0 {
		cfg.SkipCodes = []int{404}
	}
	return &Scanner{
		cfg:    cfg,
		client: &http.Client{Timeout: time.Duration(cfg.TimeoutSec) * time.Second},
	}
}

// Run executes the full discovery scan and returns a DirbResult.
func (s *Scanner) Run() DirbResult {
	start := time.Now()

	result := DirbResult{
		BaseURL:        s.cfg.BaseURL,
		WordlistSource: "builtin",
	}

	// If system dirb is available and requested, use it
	if s.cfg.UseSystemDirb && isSystemDirbAvailable() {
		discovered, err := s.runSystemDirb()
		if err == nil && len(discovered) > 0 {
			log.Info().Msgf("System dirb found %d paths", len(discovered))
			result.WordlistSource = "system-dirb"
			result = s.buildResult(discovered, start)
			return result
		}
		log.Warn().Err(err).Msg("System dirb failed, falling back to built-in scanner")
	}

	// Load wordlist
	paths, source := s.loadWordlist()
	result.WordlistSource = source
	result.TotalProbed = len(paths)

	log.Info().Msgf("Endpoint discovery: probing %d paths against %s", len(paths), s.cfg.BaseURL)

	// Probe concurrently
	discovered := s.probe(paths)
	result = s.buildResult(discovered, start)

	return result
}

// loadWordlist returns (paths, source) — either built-in, Kali system, or custom.
func (s *Scanner) loadWordlist() ([]string, string) {
	// 1. User-supplied custom wordlist
	if s.cfg.WordlistPath != "" {
		paths, err := readWordlistFile(s.cfg.WordlistPath)
		if err == nil && len(paths) > 0 {
			log.Info().Msgf("Using custom wordlist: %s (%d paths)", s.cfg.WordlistPath, len(paths))
			return expandExtensions(paths, s.cfg.Extensions), "custom:" + s.cfg.WordlistPath
		}
		log.Warn().Err(err).Msgf("Failed to read custom wordlist %s, trying alternatives", s.cfg.WordlistPath)
	}

	// 2. Kali Linux system DIRB wordlist
	kaliWordlists := []string{
		"/usr/share/dirb/wordlists/common.txt",
		"/usr/share/dirb/wordlists/big.txt",
		"/usr/share/seclists/Discovery/Web-Content/api/api-endpoints.txt",
		"/usr/share/seclists/Discovery/Web-Content/common.txt",
	}
	for _, wl := range kaliWordlists {
		paths, err := readWordlistFile(wl)
		if err == nil && len(paths) > 0 {
			log.Info().Msgf("Using Kali wordlist: %s (%d paths)", wl, len(paths))
			return expandExtensions(paths, s.cfg.Extensions), "kali:"+wl
		}
	}

	// 3. Built-in wordlist (always available)
	log.Info().Msg("Using OFFAT-X built-in API endpoint wordlist")
	return expandExtensions(builtinWordlist(), s.cfg.Extensions), "builtin"
}

// probe sends HEAD/GET requests to all paths concurrently.
func (s *Scanner) probe(paths []string) []DiscoveredEndpoint {
	limiter := rate.NewLimiter(rate.Limit(s.cfg.RequestsPerSec), s.cfg.RequestsPerSec)
	sem := make(chan struct{}, s.cfg.Concurrency)

	var mu sync.Mutex
	var discovered []DiscoveredEndpoint
	var wg sync.WaitGroup

	for _, p := range paths {
		wg.Add(1)
		go func(path string) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			if err := limiter.Wait(context.Background()); err != nil {
				return
			}

			endpoint := s.probeOne(path)
			if endpoint == nil {
				return
			}

			mu.Lock()
			discovered = append(discovered, *endpoint)
			mu.Unlock()
		}(p)
	}
	wg.Wait()
	return discovered
}

// probeOne makes a single HEAD (then GET fallback) request and returns a result if live.
func (s *Scanner) probeOne(path string) *DiscoveredEndpoint {
	fullURL := strings.TrimRight(s.cfg.BaseURL, "/") + path

	start := time.Now()

	// Try HEAD first (lighter)
	req, err := http.NewRequest(http.MethodHead, fullURL, nil)
	if err != nil {
		return nil
	}
	for k, v := range s.cfg.Headers {
		req.Header.Set(k, v)
	}

	resp, err := s.client.Do(req)
	if err != nil {
		return nil
	}
	resp.Body.Close()

	// If HEAD not supported, retry with GET
	if resp.StatusCode == http.StatusMethodNotAllowed {
		req2, _ := http.NewRequest(http.MethodGet, fullURL, nil)
		for k, v := range s.cfg.Headers {
			req2.Header.Set(k, v)
		}
		resp2, err2 := s.client.Do(req2)
		if err2 != nil {
			return nil
		}
		resp2.Body.Close()
		resp = resp2
	}

	elapsed := time.Since(start).Milliseconds()

	// Skip configured skip codes
	for _, skip := range s.cfg.SkipCodes {
		if resp.StatusCode == skip {
			return nil
		}
	}

	return &DiscoveredEndpoint{
		Path:          path,
		FullURL:       fullURL,
		StatusCode:    resp.StatusCode,
		ContentLength: resp.ContentLength,
		ContentType:   resp.Header.Get("Content-Type"),
		ElapsedMs:     elapsed,
		Source:        "scanner",
	}
}

// buildResult combines discovered endpoints with OAS known-path comparison.
func (s *Scanner) buildResult(discovered []DiscoveredEndpoint, start time.Time) DirbResult {
	knownSet := make(map[string]bool, len(s.cfg.KnownPaths))
	for _, p := range s.cfg.KnownPaths {
		knownSet[normalise(p)] = true
	}

	result := DirbResult{
		BaseURL:    s.cfg.BaseURL,
		TotalProbed: 0,
		ElapsedMs:  time.Since(start).Milliseconds(),
	}

	for i := range discovered {
		ep := &discovered[i]
		if knownSet[normalise(ep.Path)] {
			ep.IsDocumented = true
			result.DocumentedFound++
		} else {
			ep.IsUndocumented = true
			result.UndocumentedFound++
			result.Undocumented = append(result.Undocumented, *ep)
		}
		result.Discovered = append(result.Discovered, *ep)
	}

	return result
}

// runSystemDirb shells out to the system dirb binary and parses its output.
func (s *Scanner) runSystemDirb() ([]DiscoveredEndpoint, error) {
	wordlist := s.cfg.WordlistPath
	if wordlist == "" {
		wordlist = "/usr/share/dirb/wordlists/common.txt"
	}

	args := []string{
		s.cfg.BaseURL,
		wordlist,
		"-S",        // silent (no banner)
		"-r",        // don't search recursively
		"-z", "50",  // 50ms delay between requests
	}

	// Add headers
	for k, v := range s.cfg.Headers {
		args = append(args, "-H", fmt.Sprintf("%s: %s", k, v))
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	cmd := exec.CommandContext(ctx, "dirb", args...)
	var out bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &out

	log.Info().Msgf("Running system dirb: dirb %s", strings.Join(args, " "))

	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("dirb exited: %w (output: %s)", err, out.String())
	}

	return parseDirbOutput(out.String()), nil
}

// parseDirbOutput extracts discovered URLs from dirb stdout.
func parseDirbOutput(output string) []DiscoveredEndpoint {
	var results []DiscoveredEndpoint
	scanner := bufio.NewScanner(strings.NewReader(output))
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		// dirb output lines look like: ==> DIRECTORY: http://...  or  + http://... (CODE:200|SIZE:1234)
		if !strings.HasPrefix(line, "+") && !strings.HasPrefix(line, "==>") {
			continue
		}

		// Extract URL
		parts := strings.Fields(line)
		var rawURL string
		for _, p := range parts {
			if strings.HasPrefix(p, "http") {
				rawURL = p
				break
			}
		}
		if rawURL == "" {
			continue
		}

		// Extract status code if present: (CODE:200|SIZE:...)
		status := 200
		if idx := strings.Index(line, "CODE:"); idx >= 0 {
			codeStr := line[idx+5:]
			if end := strings.IndexAny(codeStr, "|)"); end >= 0 {
				codeStr = codeStr[:end]
			}
			fmt.Sscanf(codeStr, "%d", &status)
		}

		results = append(results, DiscoveredEndpoint{
			FullURL:    rawURL,
			Path:       extractPath(rawURL),
			StatusCode: status,
			Source:     "system-dirb",
		})
	}
	return results
}

// LogResults prints a formatted summary of discovery findings to the logger.
func LogResults(result DirbResult) {
	log.Info().
		Int("probed", result.TotalProbed).
		Int("discovered", len(result.Discovered)).
		Int("undocumented", result.UndocumentedFound).
		Int("documented", result.DocumentedFound).
		Int64("elapsed_ms", result.ElapsedMs).
		Str("wordlist", result.WordlistSource).
		Msg("Endpoint discovery complete")

	if result.UndocumentedFound == 0 {
		log.Info().Msg("No undocumented endpoints found")
		return
	}

	log.Warn().Msgf("Found %d UNDOCUMENTED endpoints (OWASP API9:2023 — Improper Inventory Management):", result.UndocumentedFound)
	for _, ep := range result.Undocumented {
		log.Warn().
			Str("path", ep.Path).
			Int("status", ep.StatusCode).
			Str("content_type", ep.ContentType).
			Msg("  ⚠  Undocumented endpoint")
	}
}

// ─── helpers ──────────────────────────────────────────────────────────────────

func readWordlistFile(path string) ([]string, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	var lines []string
	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		if !strings.HasPrefix(line, "/") {
			line = "/" + line
		}
		lines = append(lines, line)
	}
	return lines, scanner.Err()
}

func expandExtensions(paths []string, exts []string) []string {
	if len(exts) == 0 || (len(exts) == 1 && exts[0] == "") {
		return paths
	}
	seen := make(map[string]bool)
	var out []string
	for _, p := range paths {
		for _, ext := range exts {
			candidate := p + ext
			if !seen[candidate] {
				seen[candidate] = true
				out = append(out, candidate)
			}
		}
	}
	return out
}

func normalise(path string) string {
	// Strip path params: /users/{id} → /users/
	path = strings.ToLower(path)
	// Remove {param} and :param style
	for _, ch := range []string{"{", "}"} {
		path = strings.ReplaceAll(path, ch, "")
	}
	return strings.TrimRight(path, "/")
}

func isSystemDirbAvailable() bool {
	_, err := exec.LookPath("dirb")
	return err == nil
}

func extractPath(rawURL string) string {
	// Remove scheme + host
	for _, prefix := range []string{"https://", "http://"} {
		if strings.HasPrefix(rawURL, prefix) {
			rawURL = strings.TrimPrefix(rawURL, prefix)
			if idx := strings.Index(rawURL, "/"); idx >= 0 {
				return rawURL[idx:]
			}
			return "/"
		}
	}
	return rawURL
}

// builtinWordlist returns the minimal embedded API path list.
// On Kali, the system DIRB wordlists take precedence.
func builtinWordlist() []string {
	return []string{
		"/api", "/api/v1", "/api/v2", "/api/v3",
		"/api/v1/users", "/api/v2/users",
		"/api/v1/user", "/api/v1/auth",
		"/api/v1/auth/login", "/api/v1/auth/logout",
		"/api/v1/auth/register", "/api/v1/auth/refresh",
		"/api/v1/login", "/api/v1/logout", "/api/v1/register",
		"/api/v1/me", "/api/v1/profile", "/api/v1/account",
		"/api/v1/admin", "/api/v2/admin",
		"/api/admin", "/admin",
		"/api/v1/products", "/api/v1/orders",
		"/api/v1/payments", "/api/v1/files",
		"/api/v1/debug", "/api/v1/config", "/api/v1/env",
		"/api/v1/internal", "/internal",
		"/graphql", "/api/graphql",
		"/swagger.json", "/swagger.yaml", "/openapi.json", "/openapi.yaml",
		"/swagger-ui.html", "/api-docs", "/docs", "/redoc",
		"/actuator", "/actuator/health", "/actuator/env",
		"/api/v1/health", "/api/v1/ping", "/api/v1/status", "/api/v1/version",
		"/api/v1/search", "/api/v1/export", "/api/v1/import",
		"/api/v1/roles", "/api/v1/permissions",
		"/api/v1/keys", "/api/v1/apikeys",
		"/api/v1/logs", "/api/v1/metrics", "/api/v1/stats",
		"/.env", "/.git/config",
	}
}

// RunSandboxedDirb executes DIRB inside a hardened ephemeral Docker container.
// Formalized in Section 4.3.5, Table IV, and Appendix A.5 of the OFFAT-X IEEE Paper and Phase 1 Report.
// Dropping Linux capabilities (--cap-drop=ALL), enabling no-new-privileges, mounting root as read-only,
// and mounting an ephemeral tmpfs volume ensures third-party reconnaissance cannot compromise the host.
func RunSandboxedDirb(targetURL string, wordlistPath string) ([]string, error) {
	if wordlistPath == "" {
		wordlistPath = "/usr/share/dirb/wordlists/common.txt"
	}
	cmd := exec.Command("docker", "run", "--rm",
		"--cap-drop=ALL",
		"--security-opt=no-new-privileges",
		"--read-only",
		"--tmpfs", "/tmp:rw,noexec,nosuid,size=64m",
		"debian-dirb:latest", "dirb", targetURL, wordlistPath, "-r", "-S")
	out, err := cmd.CombinedOutput()
	if err != nil {
		return nil, err
	}
	var lines []string
	for _, l := range strings.Split(string(out), "\n") {
		trimmed := strings.TrimSpace(l)
		if trimmed != "" {
			lines = append(lines, trimmed)
		}
	}
	return lines, nil
}

