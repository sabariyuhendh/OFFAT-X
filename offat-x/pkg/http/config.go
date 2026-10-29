// Package http wraps fasthttp client configuration for OFFAT-X.
package http

import (
	"net/http"
	"time"

	"golang.org/x/time/rate"
)

// Config holds HTTP client configuration.
type Config struct {
	RequestsPerSecond *int
	SkipTLSVerify     *bool
	Proxy             *string
}

// NewConfig creates an HTTP config with rate limiting and optional proxy.
func NewConfig(rps *int, skipTLS *bool, proxy *string) *Config {
	return &Config{
		RequestsPerSecond: rps,
		SkipTLSVerify:     skipTLS,
		Proxy:             proxy,
	}
}

// RateLimitedClient wraps net/http.Client with a token-bucket rate limiter.
type RateLimitedClient struct {
	Client  *http.Client
	Limiter *rate.Limiter
}

// NewRateLimitedClient creates an HTTP client that respects the given RPS limit.
func NewRateLimitedClient(rps int, timeoutSec int) *RateLimitedClient {
	if rps <= 0 {
		rps = 60
	}
	if timeoutSec <= 0 {
		timeoutSec = 15
	}

	limiter := rate.NewLimiter(rate.Limit(rps), rps)
	client := &http.Client{
		Timeout: time.Duration(timeoutSec) * time.Second,
	}
	return &RateLimitedClient{
		Client:  client,
		Limiter: limiter,
	}
}
