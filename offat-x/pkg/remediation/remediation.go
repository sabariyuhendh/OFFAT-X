// Package remediation generates context-aware source code remediation directives and patches.
// Formulated in Section 4.3.7, Listing 2, and Table 6.4 of the OFFAT-X IEEE Paper and Phase 1 Report.
package remediation

import (
	"fmt"
	"strings"
)

// Directive holds the before-and-after source code patch and explanation.
type Directive struct {
	VulnerabilityType string `json:"vulnerability_type"`
	CWE               string `json:"cwe"`
	OWASP             string `json:"owasp_category"`
	VulnerableSnippet string `json:"vulnerable_snippet"`
	FixedSnippet      string `json:"fixed_snippet"`
	Rationale         string `json:"rationale"`
	LanguageFramework string `json:"language_framework"`
}

// GenerateDirective synthesizes a context-aware code remediation patch based on finding metadata.
func GenerateDirective(cwe, owaspCategory, endpoint, method string) Directive {
	cweUpper := strings.ToUpper(cwe)
	catUpper := strings.ToUpper(owaspCategory)

	// 1. Broken Object Level Authorization (BOLA / CWE-639 / API1)
	if strings.Contains(cweUpper, "639") || strings.Contains(catUpper, "BOLA") || strings.Contains(catUpper, "API1") {
		return Directive{
			VulnerabilityType: "Broken Object Level Authorization (BOLA)",
			CWE:               "CWE-639",
			OWASP:             "API1:2023 - BOLA",
			LanguageFramework: "Node.js / Prisma / SQL ORM",
			VulnerableSnippet: fmt.Sprintf(`// Vulnerable handler for %s %s:
// Queries record directly by client-supplied ID without verifying caller ownership
const item = await prisma.record.findUnique({
  where: { id: req.params.id }
});`, method, endpoint),
			FixedSnippet: fmt.Sprintf(`// Remediated handler for %s %s:
// Enforces tenant isolation by binding query filter to authenticated user identifier
const item = await prisma.record.findFirst({
  where: {
    id: req.params.id,
    userId: req.user.id // Enforce tenant boundary
  }
});
if (!item) {
  return res.status(404).json({ error: "Record not found or access denied" });
}`, method, endpoint),
			Rationale: "Always validate that the authenticated caller owns or is authorized to view the requested resource before returning business objects.",
		}
	}

	// 2. Broken Function Level Authorization (BFLA / CWE-285 / API5)
	if strings.Contains(cweUpper, "285") || strings.Contains(catUpper, "BFLA") || strings.Contains(catUpper, "API5") {
		return Directive{
			VulnerabilityType: "Broken Function Level Authorization (BFLA)",
			CWE:               "CWE-285",
			OWASP:             "API5:2023 - BFLA",
			LanguageFramework: "Express.js / Go Chi / REST Controller",
			VulnerableSnippet: fmt.Sprintf(`// Vulnerable administrative route definition:
// Missing role authorization check
router.%s('%s', handleAdminAction);`, strings.ToLower(method), endpoint),
			FixedSnippet: fmt.Sprintf(`// Remediated administrative route definition:
// Protects administrative endpoint with Role-Based Access Control (RBAC) middleware
router.%s('%s', requireRole('ADMIN'), handleAdminAction);

function requireRole(requiredRole) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== requiredRole) {
      return res.status(403).json({ error: "Access denied: administrative privilege required" });
    }
    next();
  };
}`, strings.ToLower(method), endpoint),
			Rationale: "Enforce strict Role-Based Access Control (RBAC) on all administrative and privileged endpoints.",
		}
	}

	// 3. JWT Vulnerabilities (CWE-347 / API2)
	if strings.Contains(cweUpper, "347") || strings.Contains(catUpper, "JWT") || strings.Contains(catUpper, "ALGORITHM") {
		return Directive{
			VulnerabilityType: "JWT Algorithm Confusion / None Bypass",
			CWE:               "CWE-347",
			OWASP:             "API2:2023 - Broken Authentication",
			LanguageFramework: "JSON Web Token (RFC 7519)",
			VulnerableSnippet: `// Vulnerable token verification:
// Accepts any algorithm or unsigned tokens
const decoded = jwt.verify(token, secretKey);`,
			FixedSnippet: `// Remediated token verification:
// Strictly allowlists expected cryptographic signature algorithm (e.g. RS256 or HS256)
const decoded = jwt.verify(token, publicKey, {
  algorithms: ['RS256'], // Explicit allowlist prevents 'none' algorithm bypass
  issuer: 'https://auth.example.com',
  audience: 'https://api.example.com'
});`,
			Rationale: "Always explicitly specify allowed signature algorithms to prevent algorithm 'none' stripping and RS256-to-HS256 key confusion attacks.",
		}
	}

	// 4. Missing Authentication (CWE-306 / API2)
	if strings.Contains(cweUpper, "306") || strings.Contains(catUpper, "MISSING AUTH") {
		return Directive{
			VulnerabilityType: "Missing Authentication for Critical Function",
			CWE:               "CWE-306",
			OWASP:             "API2:2023 - Broken Authentication",
			LanguageFramework: "HTTP Middleware",
			VulnerableSnippet: fmt.Sprintf(`// Vulnerable: %s %s accessible without credentials
app.%s('%s', endpointHandler);`, method, endpoint, strings.ToLower(method), endpoint),
			FixedSnippet: fmt.Sprintf(`// Remediated: Authenticate request before invoking controller
app.%s('%s', passport.authenticate('jwt', { session: false }), endpointHandler);`, method, endpoint, strings.ToLower(method), endpoint),
			Rationale: "Ensure all non-public endpoints require valid session or bearer tokens prior to dispatch.",
		}
	}

	// 5. Rate Limiting & Abuse (CWE-799 / API4)
	if strings.Contains(cweUpper, "799") || strings.Contains(catUpper, "RATE LIMIT") {
		return Directive{
			VulnerabilityType: "Unrestricted Resource Consumption / Missing Rate Limiting",
			CWE:               "CWE-799",
			OWASP:             "API4:2023 - Unrestricted Resource Consumption",
			LanguageFramework: "Express / Redis Rate Limiter",
			VulnerableSnippet: fmt.Sprintf(`// Vulnerable endpoint %s without rate limiting
app.%s('%s', authHandler);`, endpoint, strings.ToLower(method), endpoint),
			FixedSnippet: fmt.Sprintf(`// Remediated: Attach distributed token bucket / leaky bucket rate limiter
const rateLimit = require('express-rate-limit');
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // 10 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts, please try again later." }
});
app.%s('%s', loginLimiter, authHandler);`, strings.ToLower(method), endpoint),
			Rationale: "Implement rate limiting using client IP and user tokens to protect against automated credential stuffing and resource exhaustion.",
		}
	}

	// 6. Shadow / Undocumented API (CWE-200 / API9)
	if strings.Contains(cweUpper, "200") || strings.Contains(catUpper, "SHADOW") || strings.Contains(catUpper, "API9") {
		return Directive{
			VulnerabilityType: "Undocumented / Shadow API Endpoint",
			CWE:               "CWE-200",
			OWASP:             "API9:2023 - Improper Inventory Management",
			LanguageFramework: "OpenAPI / Gateway Config",
			VulnerableSnippet: fmt.Sprintf(`// Undocumented active route discovered on backend:
// %s %s is live but omitted from openapi.json`, method, endpoint),
			FixedSnippet: fmt.Sprintf(`// Remediation 1: Register route in OpenAPI 3.x specification:
// paths:
//   %s:
//     %s:
//       summary: "Documented API Operation"
//       security: [{ BearerAuth: [] }]
//
// Remediation 2: Or block access at API Gateway / Ingress:
// location = %s { return 404; }`, endpoint, strings.ToLower(method), endpoint),
			Rationale: "Maintain a complete and synchronized OpenAPI contract for all exposed services to eliminate unmanaged shadow routes.",
		}
	}

	// Default Generic Remediation
	return Directive{
		VulnerabilityType: "API Security Weakness",
		CWE:               cwe,
		OWASP:             owaspCategory,
		LanguageFramework: "Backend API",
		VulnerableSnippet: fmt.Sprintf(`// Vulnerable logic for %s %s`, method, endpoint),
		FixedSnippet: fmt.Sprintf(`// Remediate by validating input parameters and enforcing authorization checks for %s %s`, method, endpoint),
		Rationale: "Enforce least privilege, validate all input parameters, and ensure authorization checks execute on every state change.",
	}
}
