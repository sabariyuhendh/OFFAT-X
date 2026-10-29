package utils

import "net/url"

// ValidateURL returns true if the given string is a valid HTTP/HTTPS URL.
func ValidateURL(rawURL string) bool {
	if rawURL == "" {
		return false
	}
	u, err := url.ParseRequestURI(rawURL)
	if err != nil {
		return false
	}
	return u.Scheme == "http" || u.Scheme == "https"
}
