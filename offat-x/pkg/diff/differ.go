// Package diff implements the mathematical Semantic Response Diffing Engine for OFFAT-X.
// As formalized in Equation (2) of the OFFAT-X IEEE paper and Phase 1 Report:
//
//	J = |K(a) ∩ K(v)| / |K(a) ∪ K(v)|                    (Jaccard schema key similarity)
//	O = |V(v) ∩ V(a)| / |V(v)|                          (Owner identifier value overlap)
//	D = w_k · J + w_o · O + w_s · 1[2xx] - w_e · E(a)    (Composite Semantic Score)
//
// Default weights: w_k = 0.3, w_o = 0.5, w_s = 0.2, w_e = 0.6, with threshold τ = 0.70.
package diff

import (
	"encoding/json"
	"fmt"
	"math"
	"regexp"
	"strings"
)

// Weights defines the term weights and threshold for Equation (2).
type Weights struct {
	Wk  float64 `json:"w_k"` // Schema key overlap weight (default: 0.30)
	Wo  float64 `json:"w_o"` // Owner identifier overlap weight (default: 0.50)
	Ws  float64 `json:"w_s"` // HTTP 2xx status weight (default: 0.20)
	We  float64 `json:"w_e"` // Error signature penalty weight (default: 0.60)
	Tau float64 `json:"tau"` // Decision threshold (default: 0.70)
}

// DefaultWeights returns the calibrated weights published in the OFFAT-X paper.
func DefaultWeights() Weights {
	return Weights{
		Wk:  0.30,
		Wo:  0.50,
		Ws:  0.20,
		We:  0.60,
		Tau: 0.70,
	}
}

// DiffResult encapsulates the complete analytical breakdown of a semantic diff.
type DiffResult struct {
	ScoreD          float64 `json:"score_d"`          // Composite score D
	JaccardKeySim   float64 `json:"jaccard_key_sim"`  // J: schema key overlap [0, 1]
	OwnerIdOverlap  float64 `json:"owner_id_overlap"` // O: victim identifier overlap [0, 1]
	Is2xx           bool    `json:"is_2xx"`           // 1[2xx]
	HasErrorSig     bool    `json:"has_error_sig"`    // E(a): error penalty triggered
	Verdict         string  `json:"verdict"`          // "CONFIRMED VULNERABLE", "SUSPECTED VULNERABLE", "SAFE"
	IsVulnerable    bool    `json:"is_vulnerable"`    // True if D >= tau
	BaselineKeys    int     `json:"baseline_keys"`
	AttackerKeys    int     `json:"attacker_keys"`
	MatchedKeys     int     `json:"matched_keys"`
	BaselineValues  int     `json:"baseline_values"`
	AttackerValues  int     `json:"attacker_values"`
	MatchedValues   int     `json:"matched_values"`
	EvidenceSummary string  `json:"evidence_summary"`
}

// Error signature patterns commonly returned inside HTTP 200 error envelopes.
var errorPatterns = []*regexp.Regexp{
	regexp.MustCompile(`(?i)"(?:error|err|errorMessage|error_description)"\s*:`),
	regexp.MustCompile(`(?i)"success"\s*:\s*false`),
	regexp.MustCompile(`(?i)"status"\s*:\s*"(?:error|failed|failure|unauthorized|forbidden)"`),
	regexp.MustCompile(`(?i)\b(?:unauthorized|access\s+denied|permission\s+denied|forbidden|authentication\s+failed)\b`),
	regexp.MustCompile(`(?i)\b(?:user\s+not\s+found|resource\s+not\s+found|record\s+not\s+found)\b`),
	regexp.MustCompile(`(?i)\b(?:invalid\s+token|expired\s+token|jwt\s+expired|signature\s+verification\s+failed)\b`),
}

// Differ computes semantic diffs between responses.
type Differ struct {
	weights Weights
}

// NewDiffer creates a new semantic differ with the given weights.
func NewDiffer(w Weights) *Differ {
	if w.Tau <= 0 {
		w = DefaultWeights()
	}
	return &Differ{weights: w}
}

// Evaluate evaluates an attacker response body against a victim/owner baseline response body.
func (d *Differ) Evaluate(baselineBody string, attackerBody string, attackerStatus int) DiffResult {
	res := DiffResult{}
	res.Is2xx = attackerStatus >= 200 && attackerStatus < 300

	// 1. Detect Error Signatures in attacker response E(a)
	res.HasErrorSig = DetectErrorSignature(attackerBody)

	// 2. Extract Schema Keys K(v) and K(a)
	bKeys := extractJSONKeys(baselineBody)
	aKeys := extractJSONKeys(attackerBody)
	res.BaselineKeys = len(bKeys)
	res.AttackerKeys = len(aKeys)

	// Jaccard similarity: |K(a) ∩ K(v)| / |K(a) ∪ K(v)|
	matchedK := 0
	for k := range aKeys {
		if bKeys[k] {
			matchedK++
		}
	}
	res.MatchedKeys = matchedK
	unionK := len(bKeys) + len(aKeys) - matchedK
	if unionK > 0 {
		res.JaccardKeySim = float64(matchedK) / float64(unionK)
	} else if len(bKeys) == 0 && len(aKeys) == 0 && len(baselineBody) > 0 && baselineBody == attackerBody {
		res.JaccardKeySim = 1.0
	}

	// 3. Extract Identifying Values V(v) and V(a)
	bVals := extractIdentifyingValues(baselineBody)
	aVals := extractIdentifyingValues(attackerBody)
	res.BaselineValues = len(bVals)
	res.AttackerValues = len(aVals)

	// Value overlap: |V(v) ∩ V(a)| / |V(v)|
	matchedV := 0
	for v := range bVals {
		if aVals[v] {
			matchedV++
		}
	}
	res.MatchedValues = matchedV
	if len(bVals) > 0 {
		res.OwnerIdOverlap = float64(matchedV) / float64(len(bVals))
	} else if len(aVals) > 0 {
		res.OwnerIdOverlap = 0.5
	}

	// 4. Compute Composite Score D via Equation (2)
	statusIndicator := 0.0
	if res.Is2xx {
		statusIndicator = 1.0
	}
	errorPenalty := 0.0
	if res.HasErrorSig {
		errorPenalty = 1.0
	}

	D := (d.weights.Wk * res.JaccardKeySim) +
		(d.weights.Wo * res.OwnerIdOverlap) +
		(d.weights.Ws * statusIndicator) -
		(d.weights.We * errorPenalty)

	// Bound D to [-1.0, 1.0]
	D = math.Round(D*100) / 100
	res.ScoreD = D

	// 5. Verdict Classification
	if D >= d.weights.Tau {
		res.Verdict = "CONFIRMED VULNERABLE"
		res.IsVulnerable = true
		res.EvidenceSummary = fmt.Sprintf("High semantic exfiltration (D=%.2f ≥ τ=%.2f): Attacker received owner data (J=%.2f, O=%.2f).", D, d.weights.Tau, res.JaccardKeySim, res.OwnerIdOverlap)
	} else if D >= 0.50 {
		res.Verdict = "SUSPECTED VULNERABLE"
		res.IsVulnerable = true
		res.EvidenceSummary = fmt.Sprintf("Suspected unauthorized access (0.50 ≤ D=%.2f < τ=%.2f): Partial shape match or privilege discrepancy.", D, d.weights.Tau)
	} else {
		res.Verdict = "SAFE / NOT VULNERABLE"
		res.IsVulnerable = false
		if res.HasErrorSig {
			res.EvidenceSummary = fmt.Sprintf("Suppressed false positive (D=%.2f < 0.50): Error penalty w_e eliminated 200 OK error envelope.", D)
		} else {
			res.EvidenceSummary = fmt.Sprintf("Immune / safe response (D=%.2f < 0.50): Data shape or tenant IDs do not match owner baseline.", D)
		}
	}

	return res
}

// DetectErrorSignature tests whether a response string contains known error envelope signatures.
func DetectErrorSignature(body string) bool {
	if strings.TrimSpace(body) == "" {
		return false
	}
	for _, p := range errorPatterns {
		if p.MatchString(body) {
			return true
		}
	}
	return false
}

// extractJSONKeys recursively extracts all key paths from a JSON body.
func extractJSONKeys(body string) map[string]bool {
	keys := make(map[string]bool)
	var parsed interface{}
	if err := json.Unmarshal([]byte(body), &parsed); err != nil {
		return keys
	}
	collectKeys("", parsed, keys)
	return keys
}

func collectKeys(prefix string, val interface{}, keys map[string]bool) {
	switch v := val.(type) {
	case map[string]interface{}:
		for k, child := range v {
			fullKey := k
			if prefix != "" {
				fullKey = prefix + "." + k
			}
			keys[fullKey] = true
			collectKeys(fullKey, child, keys)
		}
	case []interface{}:
		for _, item := range v {
			collectKeys(prefix+"[]", item, keys)
		}
	}
}

// extractIdentifyingValues recursively extracts identifying property values from JSON.
// Targets identifier fields (id, uuid, email, order, user, etc.) and scalar primitives.
func extractIdentifyingValues(body string) map[string]bool {
	vals := make(map[string]bool)
	var parsed interface{}
	if err := json.Unmarshal([]byte(body), &parsed); err != nil {
		return vals
	}
	collectIdentifyingValues("", parsed, vals)
	return vals
}

var idKeyPattern = regexp.MustCompile(`(?i)(id|_id|uuid|key|code|token|email|username|phone|user|order|vehicle|account)`)

func collectIdentifyingValues(keyName string, val interface{}, vals map[string]bool) {
	switch v := val.(type) {
	case map[string]interface{}:
		for k, child := range v {
			collectIdentifyingValues(k, child, vals)
		}
	case []interface{}:
		for _, item := range v {
			collectIdentifyingValues(keyName, item, vals)
		}
	case string:
		strVal := strings.TrimSpace(v)
		if strVal != "" && (idKeyPattern.MatchString(keyName) || len(strVal) > 3) {
			vals[strVal] = true
		}
	case float64:
		// Numeric IDs or quantities
		vals[fmt.Sprintf("%.0f", v)] = true
	case bool:
		// Boolean flags generally not unique identifiers
	}
}
