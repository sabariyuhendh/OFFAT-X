// Package ratelimit detects missing or bypassable rate limiting on API endpoints.
// OFFAT-X tests: API4:2023 — Unrestricted Resource Consumption (OWASP API Top 10).
package ratelimit

import (
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"
)

// RateLimitResult holds the result of a rate-limit probe against one endpoint.
type RateLimitResult struct {
	URL             string         `json:"url"`
	Method          string         `json:"method"`
	TotalRequests   int            `json:"total_requests"`
	SuccessCount    int            `json:"success_count"` // 2xx responses
	BlockedCount    int            `json:"blocked_count"` // 429 / 503 responses
	StatusCodes     map[int]int    `json:"status_codes"`
	IsVulnerable    bool           `json:"is_vulnerable"`
	Confidence      string         `json:"confidence"` // HIGH / MEDIUM / LOW
	Description     string         `json:"description"`
	Remediation     string         `json:"remediation"`
	ElapsedMs       int64          `json:"elapsed_ms"`
	Headers429      http.Header    `json:"rate_limit_headers,omitempty"`
	BypassAttempts  []BypassResult `json:"bypass_attempts,omitempty"`
}

// BypassResult records a rate-limit bypass technique outcome.
type BypassResult struct {
	Technique   string `json:"technique"`
	Successful  bool   `json:"successful"`
	Description string `json:"description"`
}

// ProbeConfig controls how the rate-limit probe behaves.
type ProbeConfig struct {
	Requests    int               // total requests to send (default 30)
	Concurrency int               // concurrent goroutines (default 10)
	Headers     map[string]string // extra headers (e.g., auth)
	TimeoutSec  int
}

// DefaultProbeConfig returns a sensible default probe configuration.
func DefaultProbeConfig() ProbeConfig {
	return ProbeConfig{
		Requests:    30,
		Concurrency: 10,
		TimeoutSec:  10,
	}
}

// Detector probes endpoints for missing rate limiting.
type Detector struct {
	cfg    ProbeConfig
	client *http.Client
}

// NewDetector creates a Detector with the given config.
func NewDetector(cfg ProbeConfig) *Detector {
	if cfg.Requests == 0 {
		cfg.Requests = 30
	}
	if cfg.Concurrency == 0 {
		cfg.Concurrency = 10
	}
	if cfg.TimeoutSec == 0 {
		cfg.TimeoutSec = 10
	}
	return &Detector{
		cfg:    cfg,
		client: &http.Client{Timeout: time.Duration(cfg.TimeoutSec) * time.Second},
	}
}

// Probe sends N concurrent requests to a URL and analyses rate-limit behaviour.
func (d *Detector) Probe(url, method string) RateLimitResult {
	result := RateLimitResult{
		URL:         url,
		Method:      method,
		TotalRequests: d.cfg.Requests,
		StatusCodes: make(map[int]int),
	}

	type response struct {
		code    int
		headers http.Header
	}

	responses := make([]response, d.cfg.Requests)
	var wg sync.WaitGroup
	sem := make(chan struct{}, d.cfg.Concurrency)

	start := time.Now()
	for i := 0; i < d.cfg.Requests; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			req, err := http.NewRequest(method, url, nil)
			if err != nil {
				return
			}
			for k, v := range d.cfg.Headers {
				req.Header.Set(k, v)
			}

			resp, err := d.client.Do(req)
			if err != nil {
				return
			}
			defer resp.Body.Close()
			responses[idx] = response{code: resp.StatusCode, headers: resp.Header}
		}(i)
	}
	wg.Wait()
	result.ElapsedMs = time.Since(start).Milliseconds()

	// Tally results
	for _, r := range responses {
		if r.code == 0 {
			continue
		}
		result.StatusCodes[r.code]++
		if r.code == 429 || r.code == 503 {
			result.BlockedCount++
			if result.Headers429 == nil && r.headers != nil {
				result.Headers429 = r.headers
			}
		} else if r.code >= 200 && r.code < 300 {
			result.SuccessCount++
		}
	}

	// Determine vulnerability
	blockRatio := float64(result.BlockedCount) / float64(d.cfg.Requests)
	successRatio := float64(result.SuccessCount) / float64(d.cfg.Requests)

	switch {
	case successRatio > 0.9:
		result.IsVulnerable = true
		result.Confidence = "HIGH"
		result.Description = fmt.Sprintf(
			"%.0f%% of %d rapid requests succeeded with no rate limiting detected (HTTP 429 never returned). "+
				"This endpoint is vulnerable to unrestricted resource consumption (OWASP API4:2023).",
			successRatio*100, d.cfg.Requests,
		)
	case successRatio > 0.6:
		result.IsVulnerable = true
		result.Confidence = "MEDIUM"
		result.Description = fmt.Sprintf(
			"%.0f%% of %d requests succeeded before rate limiting kicked in. "+
				"Rate limiting appears inconsistent or easily bypassable.",
			successRatio*100, d.cfg.Requests,
		)
	case blockRatio > 0.8:
		result.IsVulnerable = false
		result.Confidence = "HIGH"
		result.Description = "Rate limiting is enforced — majority of requests were blocked (HTTP 429)."
	default:
		result.IsVulnerable = false
		result.Confidence = "LOW"
		result.Description = "Inconclusive result. Manual verification recommended."
	}

	if result.IsVulnerable {
		result.Remediation = "Implement rate limiting using a token-bucket or sliding-window algorithm. " +
			"Consider tools like nginx limit_req, API Gateway throttling, or application-level middleware. " +
			"Apply stricter limits on authentication and sensitive endpoints."
	}

	return result
}

// ProbeWithBypass attempts known rate-limit bypass techniques.
func (d *Detector) ProbeWithBypass(url, method string) RateLimitResult {
	base := d.Probe(url, method)
	if !base.IsVulnerable {
		// Still attempt bypasses even if base probe was rate-limited
	}

	bypassHeaders := []struct {
		name    string
		headers map[string]string
	}{
		{"X-Forwarded-For Rotation", map[string]string{"X-Forwarded-For": "127.0.0.1"}},
		{"X-Real-IP Override", map[string]string{"X-Real-IP": "10.0.0.1"}},
		{"X-Originating-IP", map[string]string{"X-Originating-IP": "192.168.1.1"}},
		{"X-Remote-Addr", map[string]string{"X-Remote-Addr": "172.16.0.1"}},
		{"Custom X-Host", map[string]string{"X-Host": "127.0.0.1"}},
	}

	for _, bp := range bypassHeaders {
		// Probe with bypass headers merged
		bypassCfg := d.cfg
		bypassCfg.Requests = 10
		bypassCfg.Headers = mergeMaps(d.cfg.Headers, bp.headers)
		bypassDetector := NewDetector(bypassCfg)
		r := bypassDetector.Probe(url, method)

		successful := r.SuccessCount > 7 // >70% success rate means bypass worked
		base.BypassAttempts = append(base.BypassAttempts, BypassResult{
			Technique:   bp.name,
			Successful:  successful,
			Description: describeBypass(bp.name, successful, r.SuccessCount, bypassCfg.Requests),
		})
		if successful && !base.IsVulnerable {
			base.IsVulnerable = true
			base.Confidence = "HIGH"
			base.Description += fmt.Sprintf(" Rate-limit bypass achieved via '%s'.", bp.name)
		}
	}

	return base
}

// DetectRateLimitHeaders inspects response headers for rate-limit information.
func DetectRateLimitHeaders(headers http.Header) map[string]string {
	found := map[string]string{}
	candidates := []string{
		"RateLimit-Limit",
		"RateLimit-Remaining",
		"RateLimit-Reset",
		"X-RateLimit-Limit",
		"X-RateLimit-Remaining",
		"X-RateLimit-Reset",
		"Retry-After",
		"X-Rate-Limit-Limit",
		"X-Rate-Limit-Remaining",
	}
	for _, h := range candidates {
		if v := headers.Get(h); v != "" {
			found[h] = v
		}
	}
	return found
}

func mergeMaps(a, b map[string]string) map[string]string {
	out := make(map[string]string)
	for k, v := range a {
		out[k] = v
	}
	for k, v := range b {
		out[k] = v
	}
	return out
}

func describeBypass(technique string, successful bool, successes, total int) string {
	if successful {
		return fmt.Sprintf("Bypass SUCCESSFUL using %s: %d/%d requests succeeded after rate-limiting was triggered.", technique, successes, total)
	}
	header := strings.Split(technique, " ")[0]
	return fmt.Sprintf("%s bypass failed: only %d/%d requests succeeded.", header, successes, total)
}
