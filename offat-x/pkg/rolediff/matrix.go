package rolediff

import (
	"fmt"
	"strings"

	"github.com/offat-x/offat-x/pkg/diff"
	"github.com/offat-x/offat-x/pkg/parser"
	"github.com/offat-x/offat-x/pkg/scorer"
)

// ClassificationRule maps role comparisons to vulnerability categories (Table II).
type FindingCategory string

const (
	FindingBOLA       FindingCategory = "BOLA, confirmed"
	FindingBrokenAuth FindingCategory = "Broken Authentication (API2)"
	FindingBFLAConf   FindingCategory = "BFLA, confirmed"
	FindingBFLASusp   FindingCategory = "BFLA, suspected"
	FindingBOPLA      FindingCategory = "BOPLA (API3)"
	FindingNone       FindingCategory = "Not vulnerable"
)

// RoleDifferentialResult records an empirical evaluation between attacker and owner identities.
type RoleDifferentialResult struct {
	Endpoint       string          `json:"endpoint"`
	Method         string          `json:"method"`
	OwnerRole      string          `json:"owner_role"`
	AttackerRole   string          `json:"attacker_role"`
	ComparisonType string          `json:"comparison_type"` // "horizontal", "vertical_escalation", "unauthenticated"
	Category       FindingCategory `json:"category"`
	IsVulnerable   bool            `json:"is_vulnerable"`
	Severity       string          `json:"severity"`
	CVSSScore      float64         `json:"cvss_score"`
	OWASP          string          `json:"owasp_category"`
	CWE            string          `json:"cwe"`
	DiffResult     diff.DiffResult `json:"diff_result"`
	Evidence       string          `json:"evidence"`
	Remediation    string          `json:"remediation"`
}

// Evaluator executes the decision path and classification rules of Table II.
type Evaluator struct {
	cfg    *ScopeConfig
	differ *diff.Differ
}

// NewEvaluator creates a role-differential matrix evaluator.
func NewEvaluator(cfg *ScopeConfig) *Evaluator {
	if cfg == nil {
		cfg = &ScopeConfig{}
	}
	return &Evaluator{
		cfg:    cfg,
		differ: diff.NewDiffer(diff.DefaultWeights()),
	}
}

// EvaluateComparison evaluates an attacker request against the owner baseline using Table II rules.
func (e *Evaluator) EvaluateComparison(
	method, path string,
	ownerRole, attackerRole string,
	ownerBody string, ownerStatus int,
	attackerBody string, attackerStatus int,
) RoleDifferentialResult {
	res := RoleDifferentialResult{
		Endpoint:     path,
		Method:       strings.ToUpper(method),
		OwnerRole:    ownerRole,
		AttackerRole: attackerRole,
		Category:     FindingNone,
	}

	// Run Semantic Diff on responses
	diffRes := e.differ.Evaluate(ownerBody, attackerBody, attackerStatus)
	res.DiffResult = diffRes

	// Check explicit policy
	explicitMatched, isAllowed := e.cfg.IsAllowedByPolicy(method, path, attackerRole)

	// 1. Unauthenticated Comparison (Guest -> Authenticated Object)
	if strings.EqualFold(attackerRole, "guest") && !strings.EqualFold(ownerRole, "guest") {
		res.ComparisonType = "unauthenticated"
		if diffRes.Is2xx && diffRes.IsVulnerable {
			res.Category = FindingBrokenAuth
			res.IsVulnerable = true
			res.Severity = scorer.SeverityCritical
			res.CVSSScore = 9.8
			res.OWASP = "API2:2023 - Broken Authentication"
			res.CWE = "CWE-306"
			res.Evidence = fmt.Sprintf("Guest accessed authenticated %s %s without credentials (D=%.2f ≥ τ).", method, path, diffRes.ScoreD)
			res.Remediation = "Enforce authentication middleware (e.g. passport.authenticate('jwt') or requireAuth()) on endpoint."
			return res
		}
	}

	// 2. Vertical Escalation: Low/Guest -> Admin-only Operation (BFLA)
	isAdminEndpoint := strings.Contains(strings.ToLower(path), "/admin") ||
		strings.Contains(strings.ToLower(path), "/manage") ||
		strings.Contains(strings.ToLower(path), "/internal")

	if explicitMatched && !isAllowed && diffRes.Is2xx {
		// Explicit policy strictly forbade attackerRole!
		res.ComparisonType = "vertical_escalation"
		res.Category = FindingBFLAConf
		res.IsVulnerable = true
		res.Severity = scorer.SeverityHigh
		res.CVSSScore = 8.5
		res.OWASP = "API5:2023 - Broken Function Level Authorization"
		res.CWE = "CWE-285"
		res.Evidence = fmt.Sprintf("Role '%s' successfully invoked admin endpoint %s %s (HTTP %d) violating explicit offat-x.yml policy.", attackerRole, method, path, attackerStatus)
		res.Remediation = "Attach RBAC authorization check: router.use('/admin', requireRole('ADMIN')); verify user claims before execution."
		return res
	}

	if (strings.EqualFold(attackerRole, "low") || strings.EqualFold(attackerRole, "guest")) &&
		strings.EqualFold(ownerRole, "admin") && isAdminEndpoint && diffRes.Is2xx && !diffRes.HasErrorSig {
		res.ComparisonType = "vertical_escalation"
		res.Category = FindingBFLASusp
		res.IsVulnerable = true
		res.Severity = scorer.SeverityHigh
		res.CVSSScore = 7.5
		res.OWASP = "API5:2023 - Broken Function Level Authorization"
		res.CWE = "CWE-285"
		res.Evidence = fmt.Sprintf("Role '%s' received 2xx on administrative path %s without 403 Forbidden.", attackerRole, path)
		res.Remediation = "Restrict function access using role-based access control (RBAC) middleware verifying user tier before dispatch."
		return res
	}

	// 3. Horizontal Cross-Tenant Comparison: Same Tier (Alice vs Bob) -> BOLA
	if strings.EqualFold(attackerRole, ownerRole) ||
		(strings.HasPrefix(attackerRole, "low") && strings.HasPrefix(ownerRole, "low")) {
		res.ComparisonType = "horizontal"
		if diffRes.Is2xx && diffRes.IsVulnerable {
			res.Category = FindingBOLA
			res.IsVulnerable = true
			res.Severity = scorer.SeverityHigh
			res.CVSSScore = 8.6
			res.OWASP = "API1:2023 - Broken Object Level Authorization"
			res.CWE = "CWE-639"
			res.Evidence = fmt.Sprintf("Attacker %s replayed request for %s's resource and received owner data (Score D=%.2f ≥ τ=0.70, Key Sim J=%.2f, Value Overlap O=%.2f).", attackerRole, ownerRole, diffRes.ScoreD, diffRes.JaccardKeySim, diffRes.OwnerIdOverlap)
			res.Remediation = "Enforce tenant ownership boundary: prisma.order.findFirst({ where: { id: req.params.id, userId: currentUser.id } })"
			return res
		}
	}

	// 4. Low -> Premium-only field / endpoint -> BOPLA
	if strings.EqualFold(attackerRole, "low") && strings.EqualFold(ownerRole, "premium") {
		res.ComparisonType = "property_escalation"
		if diffRes.Is2xx && diffRes.IsVulnerable {
			res.Category = FindingBOPLA
			res.IsVulnerable = true
			res.Severity = scorer.SeverityMedium
			res.CVSSScore = 5.3
			res.OWASP = "API3:2023 - Broken Object Property Level Authorization"
			res.CWE = "CWE-213"
			res.Evidence = fmt.Sprintf("Low-tier user received premium-tier object fields for %s %s.", method, path)
			res.Remediation = "Filter response properties based on user subscription tier using schema projection (e.g. select/omit in ORM)."
			return res
		}
	}

	// Not vulnerable or suppressed
	res.Evidence = diffRes.EvidenceSummary
	return res
}

// GenerateRoleTestPairs produces testing permutations across available roles.
func GenerateRoleTestPairs(roles map[string]RoleAuth, docParams []*parser.DocHttpParams) []struct {
	OwnerRole    string
	AttackerRole string
	Param        *parser.DocHttpParams
} {
	var pairs []struct {
		OwnerRole    string
		AttackerRole string
		Param        *parser.DocHttpParams
	}

	roleNames := make([]string, 0, len(roles))
	for r := range roles {
		roleNames = append(roleNames, r)
	}

	for _, dp := range docParams {
		// 1. Horizontal BOLA pair: low vs low_secondary (or low vs guest)
		if _, ok := roles["low"]; ok {
			if _, ok2 := roles["low_secondary"]; ok2 {
				pairs = append(pairs, struct {
					OwnerRole    string
					AttackerRole string
					Param        *parser.DocHttpParams
				}{OwnerRole: "low", AttackerRole: "low_secondary", Param: dp})
			}
		}

		// 2. Unauthenticated pair: low vs guest
		if _, ok := roles["guest"]; ok && len(roles) > 1 {
			pairs = append(pairs, struct {
				OwnerRole    string
				AttackerRole string
				Param        *parser.DocHttpParams
			}{OwnerRole: "low", AttackerRole: "guest", Param: dp})
		}

		// 3. Vertical BFLA pair: admin vs low
		if _, ok := roles["admin"]; ok {
			if _, ok2 := roles["low"]; ok2 {
				pairs = append(pairs, struct {
					OwnerRole    string
					AttackerRole string
					Param        *parser.DocHttpParams
				}{OwnerRole: "admin", AttackerRole: "low", Param: dp})
			}
		}
	}

	return pairs
}
