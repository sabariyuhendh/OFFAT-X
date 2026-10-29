// Package report provides OASIS SARIF 2.1.0 JSON export for OFFAT-X.
// Formulated in Section 4.3.7 and Figure B.5b of the OFFAT-X IEEE Paper and Phase 1 Report.
package report

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/offat-x/offat-x/pkg/remediation"
	"github.com/offat-x/offat-x/pkg/scorer"
	"github.com/offat-x/offat-x/pkg/tgen"
)

const SarifSchema = "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json"
const SarifVersion = "2.1.0"

// SARIFReport represents the root document of an OASIS SARIF 2.1.0 report.
type SARIFReport struct {
	Schema  string     `json:"$schema"`
	Version string     `json:"version"`
	Runs    []SARIFRun `json:"runs"`
}

// SARIFRun represents a single execution of the analysis tool.
type SARIFRun struct {
	Tool      SARIFTool     `json:"tool"`
	Results   []SARIFResult `json:"results"`
	Artifacts []Artifact    `json:"artifacts,omitempty"`
}

type SARIFTool struct {
	Driver SARIFDriver `json:"driver"`
}

type SARIFDriver struct {
	Name           string           `json:"name"`
	Version        string           `json:"version"`
	InformationURI string           `json:"informationUri"`
	Rules          []ReportingRule  `json:"rules"`
}

type ReportingRule struct {
	ID               string                 `json:"id"`
	Name             string                 `json:"name"`
	ShortDescription MultiformatMessage     `json:"shortDescription"`
	FullDescription  MultiformatMessage     `json:"fullDescription"`
	HelpURI          string                 `json:"helpUri,omitempty"`
	Properties       map[string]interface{} `json:"properties,omitempty"`
}

type MultiformatMessage struct {
	Text     string `json:"text"`
	Markdown string `json:"markdown,omitempty"`
}

type SARIFResult struct {
	RuleID       string                 `json:"ruleId"`
	RuleIndex    int                    `json:"ruleIndex"`
	Level        string                 `json:"level"` // "error", "warning", "note", "none"
	Message      MultiformatMessage     `json:"message"`
	Locations    []Location             `json:"locations,omitempty"`
	Fixes        []Fix                  `json:"fixes,omitempty"`
	Properties   map[string]interface{} `json:"properties,omitempty"`
}

type Location struct {
	PhysicalLocation PhysicalLocation `json:"physicalLocation"`
}

type PhysicalLocation struct {
	ArtifactLocation ArtifactLocation `json:"artifactLocation"`
	Region           *Region          `json:"region,omitempty"`
}

type ArtifactLocation struct {
	URI   string `json:"uri"`
	Index int    `json:"index,omitempty"`
}

type Region struct {
	StartLine   int `json:"startLine,omitempty"`
	StartColumn int `json:"startColumn,omitempty"`
}

type Fix struct {
	Description     MultiformatMessage `json:"description"`
	FileChanges     []FileChange       `json:"fileChanges"`
}

type FileChange struct {
	ArtifactLocation ArtifactLocation `json:"artifactLocation"`
	Replacements     []Replacement    `json:"replacements"`
}

type Replacement struct {
	DeletedRegion   Region `json:"deletedRegion"`
	InsertedContent struct {
		Text string `json:"text"`
	} `json:"insertedContent"`
}

type Artifact struct {
	Location ArtifactLocation `json:"location"`
	MimeType string           `json:"mimeType,omitempty"`
}

// GenerateSARIF transforms OFFAT-X test results into a standard OASIS SARIF 2.1.0 JSON document.
func GenerateSARIF(tests []*tgen.ApiTest, specPath, version string) ([]byte, error) {
	if version == "" {
		version = "v1.0.0"
	}
	if specPath == "" {
		specPath = "openapi.json"
	}

	run := SARIFRun{
		Tool: SARIFTool{
			Driver: SARIFDriver{
				Name:           "OFFAT-X",
				Version:        version,
				InformationURI: "https://github.com/offat-x/offat-x",
			},
		},
		Artifacts: []Artifact{
			{
				Location: ArtifactLocation{URI: specPath},
				MimeType: "application/json",
			},
		},
	}

	ruleMap := make(map[string]int)
	ruleIndex := 0

	for _, t := range tests {
		if !t.IsVulnerable {
			continue // SARIF reports vulnerabilities and code scanning findings
		}

		cwe := t.CWE
		if cwe == "" {
			cwe = "CWE-285"
		}
		ruleID := fmt.Sprintf("OFFATX-%s", strings.ReplaceAll(cwe, "CWE-", ""))

		if _, exists := ruleMap[ruleID]; !exists {
			ruleMap[ruleID] = ruleIndex
			ruleIndex++

			rule := ReportingRule{
				ID:   ruleID,
				Name: t.TestName,
				ShortDescription: MultiformatMessage{
					Text: fmt.Sprintf("%s (%s)", t.TestName, t.OWASP),
				},
				FullDescription: MultiformatMessage{
					Text: fmt.Sprintf("Detected %s on endpoint. OWASP: %s. CWE: %s. CVSS Score: %.1f", t.TestName, t.OWASP, cwe, t.CVSSScore),
				},
				HelpURI: fmt.Sprintf("https://cwe.mitre.org/data/definitions/%s.html", strings.TrimPrefix(cwe, "CWE-")),
				Properties: map[string]interface{}{
					"cwe":            cwe,
					"owasp_category": t.OWASP,
					"cvss_score":     t.CVSSScore,
					"severity":       t.Severity,
					"precision":      0.941,
				},
			}
			run.Tool.Driver.Rules = append(run.Tool.Driver.Rules, rule)
		}

		// Map CVSS severity to SARIF level
		level := "warning"
		switch t.Severity {
		case scorer.SeverityCritical, scorer.SeverityHigh:
			level = "error"
		case scorer.SeverityMedium:
			level = "warning"
		case scorer.SeverityLow:
			level = "note"
		}

		// Generate context-aware source code remediation directive
		directive := remediation.GenerateDirective(cwe, t.OWASP, t.Path, t.Method)

		msgMarkdown := fmt.Sprintf("**%s** detected on `%s %s`\n\n* **Severity:** %s (CVSS %.1f)\n* **OWASP Category:** %s\n* **CWE:** %s\n\n### Recommended Remediation:\n```javascript\n%s\n```",
			t.TestName, t.Method, t.Path, t.Severity, t.CVSSScore, t.OWASP, cwe, directive.FixedSnippet)

		sarifResult := SARIFResult{
			RuleID:    ruleID,
			RuleIndex: ruleMap[ruleID],
			Level:     level,
			Message: MultiformatMessage{
				Text:     fmt.Sprintf("%s detected on %s %s (Severity: %s, CVSS: %.1f). %s", t.TestName, t.Method, t.Path, t.Severity, t.CVSSScore, directive.Rationale),
				Markdown: msgMarkdown,
			},
			Locations: []Location{
				{
					PhysicalLocation: PhysicalLocation{
						ArtifactLocation: ArtifactLocation{
							URI: specPath,
						},
						Region: &Region{
							StartLine: 1,
						},
					},
				},
			},
			Properties: map[string]interface{}{
				"method":          t.Method,
				"path":            t.Path,
				"status_code":     t.ResponseStatusCode,
				"cvss_score":      t.CVSSScore,
				"severity":        t.Severity,
				"owasp":           t.OWASP,
				"cwe":             cwe,
				"fingerprint":     fmt.Sprintf("%s:%s:%s", t.Method, t.Path, cwe),
				"remediation_fix": directive.FixedSnippet,
			},
		}

		run.Results = append(run.Results, sarifResult)
	}

	report := SARIFReport{
		Schema:  SarifSchema,
		Version: SarifVersion,
		Runs:    []SARIFRun{run},
	}

	return json.MarshalIndent(report, "", "  ")
}
