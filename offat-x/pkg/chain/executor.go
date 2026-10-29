package chain

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/offat-x/offat-x/pkg/diff"
	"github.com/offat-x/offat-x/pkg/rolediff"
	"github.com/offat-x/offat-x/pkg/scorer"
	"github.com/valyala/fasthttp"
)

// ChainedTestResult records the outcome of a stateful chained differential test.
type ChainedTestResult struct {
	TargetEndpoint   string                  `json:"target_endpoint"`
	TargetMethod     string                  `json:"target_method"`
	ChainSequence    []string                `json:"chain_sequence"`
	InstantiatedID   string                  `json:"instantiated_id"`
	SetupStatus      string                  `json:"setup_status"` // "SUCCESS", "INCONCLUSIVE", "NOT_REQUIRED"
	OwnerRole        string                  `json:"owner_role"`
	AttackerRole     string                  `json:"attacker_role"`
	OwnerStatusCode  int                     `json:"owner_status_code"`
	AttackStatusCode int                     `json:"attack_status_code"`
	DiffResult       diff.DiffResult         `json:"diff_result"`
	IsVulnerable     bool                    `json:"is_vulnerable"`
	Severity         string                  `json:"severity"`
	CVSSScore        float64                 `json:"cvss_score"`
	OWASP            string                  `json:"owasp_category"`
	CWE              string                  `json:"cwe"`
	Evidence         string                  `json:"evidence"`
	Remediation      string                  `json:"remediation"`
}

// ChainExecutor executes stateful setup chains and differential replays.
type ChainExecutor struct {
	client     *fasthttp.Client
	baseURL    string
	scopeCfg   *rolediff.ScopeConfig
	differ     *diff.Differ
	roles      map[string]rolediff.RoleAuth
}

// NewChainExecutor initializes a stateful executor.
func NewChainExecutor(baseURL string, scopeCfg *rolediff.ScopeConfig) *ChainExecutor {
	if scopeCfg == nil {
		scopeCfg = &rolediff.ScopeConfig{}
	}
	return &ChainExecutor{
		client: &fasthttp.Client{
			ReadTimeout:  10 * time.Second,
			WriteTimeout: 10 * time.Second,
		},
		baseURL:  strings.TrimSuffix(baseURL, "/"),
		scopeCfg: scopeCfg,
		differ:   diff.NewDiffer(diff.DefaultWeights()),
		roles:    scopeCfg.Roles,
	}
}

// ExecuteStatefulBOLA executes a full stateful BOLA evaluation for an execution chain:
// 1. Runs setup sequence P(t) using owner credentials (e.g. Alice).
// 2. Extracts dynamic resource ID from setup response.
// 3. Executes consumer target t using owner credentials -> establishes baseline response v.
// 4. Replays consumer target t using attacker credentials (e.g. Bob) -> attacker response a.
// 5. Diff engine evaluates D = wk*J + wo*O + ws*1[2xx] - we*E(a).
func (ce *ChainExecutor) ExecuteStatefulBOLA(chain ExecutionChain, ownerRole, attackerRole string) ChainedTestResult {
	res := ChainedTestResult{
		TargetEndpoint: chain.TargetNode.Path,
		TargetMethod:   chain.TargetNode.Method,
		OwnerRole:      ownerRole,
		AttackerRole:   attackerRole,
	}

	for _, s := range chain.Steps {
		res.ChainSequence = append(res.ChainSequence, s.Node.ID)
	}

	createdID := ""
	setupSuccessful := true

	// 1. Execute Setup Steps using Owner Credentials
	if len(chain.Steps) > 0 {
		for _, step := range chain.Steps {
			stepURL := ce.baseURL + step.Node.Path
			bodyJSON := "{}"
			if step.Node.DocParam != nil && step.Node.DocParam.Body != nil {
				bodyJSON = fmt.Sprintf(`{"name": "test-%d", "title": "test-resource"}`, time.Now().UnixNano()%10000)
			}

			status, respBody, err := ce.sendRequest(step.Node.Method, stepURL, bodyJSON, ownerRole)
			if err != nil || status >= 400 {
				setupSuccessful = false
				res.SetupStatus = "INCONCLUSIVE"
				res.Evidence = fmt.Sprintf("Prerequisite setup step %s failed (HTTP %d). Marked Inconclusive.", step.Node.ID, status)
				return res
			}

			// Extract instantiated identifier
			extracted := extractIDFromJSON(respBody)
			if extracted != "" {
				createdID = extracted
			}
		}
	}

	if !setupSuccessful && len(chain.Steps) > 0 {
		res.SetupStatus = "INCONCLUSIVE"
		return res
	}

	if createdID == "" {
		// Fallback deterministic test ID if none generated
		createdID = "1"
	}
	res.InstantiatedID = createdID
	res.SetupStatus = "SUCCESS"

	// 2. Format Consumer Target URL with created dynamic ID
	targetPath := chain.TargetNode.Path
	targetPathWithID := injectParamIntoPath(targetPath, createdID)
	targetURL := ce.baseURL + targetPathWithID

	// 3. Request target as Owner (Baseline v)
	ownerStatus, ownerBody, _ := ce.sendRequest(chain.TargetNode.Method, targetURL, "", ownerRole)
	res.OwnerStatusCode = ownerStatus

	// 4. Request target as Attacker (Attacker response a)
	attackStatus, attackBody, _ := ce.sendRequest(chain.TargetNode.Method, targetURL, "", attackerRole)
	res.AttackStatusCode = attackStatus

	// 5. Evaluate via Semantic Differ (Equation 2)
	diffRes := ce.differ.Evaluate(ownerBody, attackBody, attackStatus)
	res.DiffResult = diffRes

	// Check BOLA verdict
	if diffRes.Is2xx && diffRes.IsVulnerable {
		res.IsVulnerable = true
		res.Severity = scorer.SeverityHigh
		res.CVSSScore = 8.6
		res.OWASP = "API1:2023 - Broken Object Level Authorization"
		res.CWE = "CWE-639"
		res.Evidence = fmt.Sprintf("Confirmed BOLA (D=%.2f ≥ τ=0.70): Attacker '%s' accessed %s's object %s at %s. Keys match (J=%.2f), IDs overlap (O=%.2f).",
			diffRes.ScoreD, attackerRole, ownerRole, createdID, targetPathWithID, diffRes.JaccardKeySim, diffRes.OwnerIdOverlap)
		res.Remediation = "Enforce tenant ownership boundary: prisma.order.findFirst({ where: { id: req.params.id, userId: currentUser.id } }); verify caller owns resource before returning payload."
	} else {
		res.IsVulnerable = false
		res.Evidence = diffRes.EvidenceSummary
	}

	return res
}

func (ce *ChainExecutor) sendRequest(method, reqURL, body, roleName string) (int, string, error) {
	req := fasthttp.AcquireRequest()
	resp := fasthttp.AcquireResponse()
	defer fasthttp.ReleaseRequest(req)
	defer fasthttp.ReleaseResponse(resp)

	req.Header.SetMethod(method)
	req.SetRequestURI(reqURL)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	if role, ok := ce.roles[roleName]; ok {
		hKey, hVal := role.GetHeader()
		if hKey != "" && hVal != "" {
			req.Header.Set(hKey, hVal)
		}
	}

	if body != "" && method != "GET" && method != "HEAD" {
		req.SetBodyString(body)
	}

	err := ce.client.Do(req, resp)
	if err != nil {
		return 0, "", err
	}

	statusCode := resp.StatusCode()
	bodyStr := string(resp.Body())
	return statusCode, bodyStr, nil
}

// extractIDFromJSON searches for primary identifier properties in JSON.
func extractIDFromJSON(body string) string {
	var parsed map[string]interface{}
	if err := json.Unmarshal([]byte(body), &parsed); err != nil {
		return ""
	}

	idKeys := []string{"id", "orderId", "order_id", "userId", "user_id", "vehicleId", "vehicle_id", "itemId", "uuid", "token"}
	for _, k := range idKeys {
		if val, ok := parsed[k]; ok {
			return fmt.Sprintf("%v", val)
		}
	}

	// Check one level nested data/item wrapper
	if data, ok := parsed["data"].(map[string]interface{}); ok {
		for _, k := range idKeys {
			if val, ok := data[k]; ok {
				return fmt.Sprintf("%v", val)
			}
		}
	}

	return ""
}

// injectParamIntoPath replaces {id} or {orderId} with real resource identifier.
func injectParamIntoPath(templatePath, idVal string) string {
	re := regexp.MustCompile(`\{[^}]+\}`)
	return re.ReplaceAllString(templatePath, idVal)
}
