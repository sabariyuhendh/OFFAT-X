// Package rolediff implements the Four-Tier Role-Differential Matrix and scope validation for OFFAT-X.
// Formulated in Section 4.3.3 and Table II of the OFFAT-X research paper and Phase 1 Report.
package rolediff

import (
	"fmt"
	"net/url"
	"os"
	"strings"

	"gopkg.in/yaml.v3"
)

// PrivilegeTier represents an authorization tier in the ordered set:
// R = {Guest < Low < Premium < Admin}
type PrivilegeTier int

const (
	TierGuest PrivilegeTier = iota
	TierLow
	TierPremium
	TierAdmin
)

func (t PrivilegeTier) String() string {
	switch t {
	case TierGuest:
		return "guest"
	case TierLow:
		return "low"
	case TierPremium:
		return "premium"
	case TierAdmin:
		return "admin"
	default:
		return "unknown"
	}
}

// RoleAuth defines credentials and authentication scheme for a role.
type RoleAuth struct {
	Auth  string `yaml:"auth"`            // "none", "bearer", "basic", "header"
	Token string `yaml:"token,omitempty"` // Direct token
	Env   string `yaml:"env,omitempty"`   // Environment variable name containing token
	User  string `yaml:"user,omitempty"`  // Username (if basic auth)
	Pass  string `yaml:"pass,omitempty"`  // Password (if basic auth)
}

// GetHeader returns the HTTP Authorization header string for this role.
func (ra *RoleAuth) GetHeader() (string, string) {
	if strings.EqualFold(ra.Auth, "none") || ra.Auth == "" {
		return "", ""
	}
	token := ra.Token
	if token == "" && ra.Env != "" {
		token = os.Getenv(ra.Env)
	}
	if strings.EqualFold(ra.Auth, "bearer") {
		if !strings.HasPrefix(strings.ToLower(token), "bearer ") {
			token = "Bearer " + token
		}
		return "Authorization", token
	}
	return "Authorization", token
}

// PolicyRule defines an explicit RBAC access rule from offat-x.yml.
type PolicyRule struct {
	Op    string   `yaml:"op"`    // e.g. "DELETE /api/admin/users/{id}" or "/admin/*"
	Allow []string `yaml:"allow"` // e.g. ["admin"]
}

// Limits defines operational scan boundaries.
type Limits struct {
	RPS         int  `yaml:"rps"`         // Max requests per second
	Destructive bool `yaml:"destructive"` // Allow PUT/PATCH/DELETE on target resources
}

// ScopeConfig represents the complete offat-x.yml configuration.
type ScopeConfig struct {
	Target string              `yaml:"target"`
	Scope  []string            `yaml:"scope"`
	Roles  map[string]RoleAuth `yaml:"roles"`
	Policy []PolicyRule        `yaml:"policy"`
	Limits Limits              `yaml:"limits"`
}

// LoadScopeConfig parses an offat-x.yml configuration file.
func LoadScopeConfig(filePath string) (*ScopeConfig, error) {
	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read scope file: %w", err)
	}
	var cfg ScopeConfig
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("failed to parse scope yaml: %w", err)
	}

	// Validate target against scope
	if err := cfg.ValidateScope(); err != nil {
		return nil, err
	}
	return &cfg, nil
}

// ValidateScope checks if the configured target host is permitted by the scope allowlist.
func (cfg *ScopeConfig) ValidateScope() error {
	if cfg.Target == "" {
		return nil // No target specified in file, will be passed via CLI
	}
	u, err := url.Parse(cfg.Target)
	if err != nil {
		return fmt.Errorf("invalid target URL '%s': %w", cfg.Target, err)
	}

	targetHost := u.Hostname()
	if len(cfg.Scope) == 0 {
		return nil // No restrictions
	}

	allowed := false
	for _, s := range cfg.Scope {
		sClean := strings.TrimSpace(s)
		if strings.EqualFold(targetHost, sClean) || strings.HasSuffix(targetHost, "."+sClean) {
			allowed = true
			break
		}
	}

	if !allowed {
		return fmt.Errorf("target host '%s' is NOT in scope allowlist %v — aborting scan to protect unauthorized hosts", targetHost, cfg.Scope)
	}
	return nil
}

// IsAllowedByPolicy checks whether a given role name is authorized for an operation under explicit policies.
func (cfg *ScopeConfig) IsAllowedByPolicy(method, path, roleName string) (explicitMatch bool, isAllowed bool) {
	opPattern := fmt.Sprintf("%s %s", strings.ToUpper(method), path)

	for _, rule := range cfg.Policy {
		ruleOp := strings.TrimSpace(rule.Op)
		match := false
		if strings.EqualFold(ruleOp, opPattern) || strings.EqualFold(ruleOp, path) {
			match = true
		} else if strings.HasSuffix(ruleOp, "*") {
			prefix := strings.TrimSuffix(ruleOp, "*")
			if strings.HasPrefix(opPattern, prefix) || strings.HasPrefix(path, prefix) {
				match = true
			}
		}

		if match {
			for _, allowedRole := range rule.Allow {
				if strings.EqualFold(allowedRole, roleName) {
					return true, true
				}
			}
			return true, false // Matched rule, but role not in allowlist
		}
	}
	return false, true // No explicit rule, defaults to permissible or inferred
}
