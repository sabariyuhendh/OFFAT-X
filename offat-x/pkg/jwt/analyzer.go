// Package jwt provides JWT security testing capabilities for OFFAT-X.
// It detects common JWT vulnerabilities such as:
//   - Algorithm confusion (RS256 → HS256 downgrade)
//   - "none" algorithm acceptance
//   - Weak/empty secrets
//   - Missing or expired token handling
//   - JWT structure tampering
package jwt

import (
	"encoding/base64"
	"encoding/json"
	"strings"
	"time"
)

// TokenVulnerability represents a detected JWT vulnerability.
type TokenVulnerability struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Severity    string `json:"severity"` // CRITICAL, HIGH, MEDIUM, LOW, INFO
	CVSS        float64 `json:"cvss_score"`
	Remediation string `json:"remediation"`
}

// JWTClaims holds the decoded JWT claims.
type JWTClaims map[string]interface{}

// JWTHeader holds the decoded JWT header.
type JWTHeader struct {
	Algorithm string `json:"alg"`
	Type      string `json:"typ"`
	KeyID     string `json:"kid"`
}

// ParsedToken represents a decoded (but not verified) JWT.
type ParsedToken struct {
	RawToken string
	Header   JWTHeader
	Claims   JWTClaims
	Parts    [3]string
}

// ParseToken decodes a JWT without verification.
func ParseToken(token string) (*ParsedToken, error) {
	// Strip "Bearer " prefix if present
	token = strings.TrimPrefix(token, "Bearer ")
	token = strings.TrimSpace(token)

	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return nil, ErrInvalidTokenFormat
	}

	// Decode header
	headerBytes, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return nil, ErrBase64Decode
	}
	var header JWTHeader
	if err := json.Unmarshal(headerBytes, &header); err != nil {
		return nil, ErrJSONDecode
	}

	// Decode claims
	claimsBytes, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, ErrBase64Decode
	}
	var claims JWTClaims
	if err := json.Unmarshal(claimsBytes, &claims); err != nil {
		return nil, ErrJSONDecode
	}

	return &ParsedToken{
		RawToken: token,
		Header:   header,
		Claims:   claims,
		Parts:    [3]string{parts[0], parts[1], parts[2]},
	}, nil
}

// AnalyzeToken performs static analysis on a JWT and returns detected vulnerabilities.
func AnalyzeToken(token string) ([]TokenVulnerability, error) {
	parsed, err := ParseToken(token)
	if err != nil {
		return nil, err
	}

	var vulns []TokenVulnerability

	// Check 1: "none" algorithm
	if strings.ToLower(parsed.Header.Algorithm) == "none" {
		vulns = append(vulns, TokenVulnerability{
			Name:        "Algorithm None Accepted",
			Description: "The JWT uses the 'none' algorithm, meaning no signature verification occurs. An attacker can forge arbitrary tokens.",
			Severity:    "CRITICAL",
			CVSS:        9.8,
			Remediation: "Reject JWTs with 'none' algorithm on the server side. Enforce a strict whitelist of allowed algorithms (e.g., RS256, ES256).",
		})
	}

	// Check 2: Algorithm confusion (HS256 with a public key)
	if strings.ToUpper(parsed.Header.Algorithm) == "HS256" {
		vulns = append(vulns, TokenVulnerability{
			Name:        "Potential Algorithm Confusion (HS256)",
			Description: "Token uses HS256 (symmetric). If the server also supports RS256, an attacker may use the RS256 public key as the HS256 secret.",
			Severity:    "HIGH",
			CVSS:        7.5,
			Remediation: "Explicitly specify and enforce the expected algorithm server-side. Never allow algorithm selection from the token header.",
		})
	}

	// Check 3: Missing expiration
	if _, ok := parsed.Claims["exp"]; !ok {
		vulns = append(vulns, TokenVulnerability{
			Name:        "Missing Expiration Claim (exp)",
			Description: "The JWT has no 'exp' claim. Tokens without expiration remain valid indefinitely, enabling session replay attacks.",
			Severity:    "HIGH",
			CVSS:        7.2,
			Remediation: "Always include an 'exp' claim with a short-lived expiration (e.g., 15 minutes for access tokens).",
		})
	}

	// Check 4: Expired token
	if exp, ok := parsed.Claims["exp"]; ok {
		var expTime int64
		switch v := exp.(type) {
		case float64:
			expTime = int64(v)
		case int64:
			expTime = v
		}
		if expTime > 0 && time.Unix(expTime, 0).Before(time.Now()) {
			vulns = append(vulns, TokenVulnerability{
				Name:        "Expired Token Accepted",
				Description: "The JWT is already expired. If the server accepts it, it indicates missing expiration validation.",
				Severity:    "HIGH",
				CVSS:        7.0,
				Remediation: "Validate the 'exp' claim on every request. Return HTTP 401 for expired tokens.",
			})
		}
	}

	// Check 5: Missing issuer
	if _, ok := parsed.Claims["iss"]; !ok {
		vulns = append(vulns, TokenVulnerability{
			Name:        "Missing Issuer Claim (iss)",
			Description: "The JWT has no 'iss' claim. Without issuer validation, tokens from other services may be accepted.",
			Severity:    "MEDIUM",
			CVSS:        5.3,
			Remediation: "Include and validate the 'iss' claim against a known trusted issuer.",
		})
	}

	// Check 6: Missing audience
	if _, ok := parsed.Claims["aud"]; !ok {
		vulns = append(vulns, TokenVulnerability{
			Name:        "Missing Audience Claim (aud)",
			Description: "The JWT has no 'aud' claim. Tokens intended for one service may be reused against another.",
			Severity:    "MEDIUM",
			CVSS:        5.0,
			Remediation: "Include and validate the 'aud' claim to scope tokens to specific services.",
		})
	}

	// Check 7: kid header injection risk
	if strings.ContainsAny(parsed.Header.KeyID, "';\"\\/*") {
		vulns = append(vulns, TokenVulnerability{
			Name:        "Suspicious kid Header Value",
			Description: "The 'kid' (Key ID) header contains special characters that may be used for path traversal or SQL injection in key-lookup logic.",
			Severity:    "HIGH",
			CVSS:        8.1,
			Remediation: "Sanitize and validate the 'kid' header value. Use a whitelist of known key identifiers.",
		})
	}

	// Check 8: Sensitive data in payload
	sensitiveKeys := []string{"password", "passwd", "secret", "credit_card", "ssn", "private_key", "token"}
	for _, key := range sensitiveKeys {
		for claimKey := range parsed.Claims {
			if strings.Contains(strings.ToLower(claimKey), key) {
				vulns = append(vulns, TokenVulnerability{
					Name:        "Sensitive Data in JWT Payload",
					Description: "The JWT payload contains a potentially sensitive field '" + claimKey + "'. JWT payloads are base64-encoded, not encrypted — anyone with the token can decode it.",
					Severity:    "MEDIUM",
					CVSS:        4.3,
					Remediation: "Do not store sensitive data in JWTs. Use opaque reference tokens and store sensitive data server-side.",
				})
				break
			}
		}
	}

	return vulns, nil
}

// BuildNoneAlgToken crafts a JWT with the "none" algorithm for testing.
func BuildNoneAlgToken(originalToken string) (string, error) {
	parsed, err := ParseToken(originalToken)
	if err != nil {
		return "", err
	}

	// Reconstruct header with "none"
	newHeader := map[string]interface{}{
		"alg": "none",
		"typ": "JWT",
	}
	headerJSON, _ := json.Marshal(newHeader)
	headerEncoded := base64.RawURLEncoding.EncodeToString(headerJSON)

	// Reuse original payload
	return headerEncoded + "." + parsed.Parts[1] + ".", nil
}

// BuildAlgConfusionToken attempts to craft an HS256 token using an RSA public key as the secret.
// publicKeyPEM is the PEM-encoded RSA public key bytes (used as HMAC secret).
func BuildAlgConfusionToken(originalToken string, publicKeyBytes []byte) (string, error) {
	parsed, err := ParseToken(originalToken)
	if err != nil {
		return "", err
	}

	// Rebuild header with HS256
	newHeader := map[string]interface{}{
		"alg": "HS256",
		"typ": "JWT",
	}
	headerJSON, _ := json.Marshal(newHeader)
	headerEncoded := base64.RawURLEncoding.EncodeToString(headerJSON)

	signingInput := headerEncoded + "." + parsed.Parts[1]

	// Import crypto/hmac locally
	sig, err := hmacSign(signingInput, publicKeyBytes)
	if err != nil {
		return "", err
	}

	return signingInput + "." + base64.RawURLEncoding.EncodeToString(sig), nil
}
