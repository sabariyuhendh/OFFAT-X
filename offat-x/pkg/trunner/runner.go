// Package trunner executes generated API tests concurrently with rate limiting and a progress bar.
package trunner

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/k0kubun/go-ansi"
	_ "github.com/offat-x/offat-x/pkg/logging"
	"github.com/offat-x/offat-x/pkg/tgen"
	"github.com/rs/zerolog/log"
	"github.com/schollz/progressbar/v3"
	"golang.org/x/term"
	"golang.org/x/time/rate"
)

// RunApiTests executes all ApiTests concurrently, respecting the rate limit.
// handler is accepted for future extension (e.g. custom auth hooks).
func RunApiTests(_ *tgen.TGenHandler, rps int, tests []*tgen.ApiTest) {
	if len(tests) == 0 {
		log.Warn().Msg("No tests to run.")
		return
	}

	limiter := rate.NewLimiter(rate.Limit(rps), rps)
	client := &http.Client{Timeout: 15 * time.Second}

	// Adjust progress bar width to terminal
	width, _, err := term.GetSize(int(os.Stdout.Fd()))
	if err != nil || width < 60 {
		width = 80
	}

	bar := progressbar.NewOptions(
		len(tests),
		progressbar.OptionSetWriter(ansi.NewAnsiStdout()),
		progressbar.OptionEnableColorCodes(true),
		progressbar.OptionSetWidth(width-40),
		progressbar.OptionSetTheme(progressbar.Theme{
			Saucer:        "[green]█[reset]",
			SaucerHead:    "[green]▓[reset]",
			SaucerPadding: "░",
			BarStart:      "╢",
			BarEnd:        "╟",
		}),
	)

	var wg sync.WaitGroup
	for _, test := range tests {
		wg.Add(1)
		go func(t *tgen.ApiTest) {
			defer wg.Done()

			// Rate-limit
			if err := limiter.Wait(context.Background()); err != nil {
				log.Error().Err(err).Msg("rate limiter error")
				return
			}

			executeTest(client, t)

			if err := bar.Add(1); err != nil {
				log.Error().Err(err).Msg("progress bar update failed")
			}
		}(test)
	}

	wg.Wait()
	fmt.Println()
}

// executeTest performs a single HTTP request for the given ApiTest and populates response fields.
func executeTest(client *http.Client, t *tgen.ApiTest) {
	method := t.Method
	if method == "" {
		method = "GET"
	}

	// Build request
	var bodyReader io.Reader
	if len(t.Body) > 0 {
		bodyReader = strings.NewReader(string(t.Body))
	}

	req, err := http.NewRequest(method, buildURL(t.URL, t.QueryParams), bodyReader)
	if err != nil {
		log.Error().Err(err).Msgf("failed to create request for %s %s", method, t.URL)
		return
	}

	// Set headers
	for k, v := range t.Headers {
		req.Header.Set(k, v)
	}

	start := time.Now()
	resp, err := client.Do(req)
	t.ElapsedMs = time.Since(start).Milliseconds()

	if err != nil {
		log.Debug().Err(err).Msgf("request error: %s %s", method, t.URL)
		return
	}
	defer resp.Body.Close()

	t.ResponseStatus = resp.StatusCode

	// Read response body (capped at 64KB)
	const maxBodyBytes = 64 * 1024
	limitedReader := io.LimitReader(resp.Body, maxBodyBytes)
	bodyBytes, _ := io.ReadAll(limitedReader)
	t.ResponseBody = string(bodyBytes)

	// Capture response headers
	t.ResponseHeaders = make(map[string]string)
	for k, v := range resp.Header {
		if len(v) > 0 {
			t.ResponseHeaders[k] = v[0]
		}
	}
}

// buildURL appends query parameters to the base URL.
func buildURL(base string, params map[string]string) string {
	if len(params) == 0 {
		return base
	}
	sep := "?"
	if strings.Contains(base, "?") {
		sep = "&"
	}
	parts := make([]string, 0, len(params))
	for k, v := range params {
		parts = append(parts, k+"="+v)
	}
	return base + sep + strings.Join(parts, "&")
}
