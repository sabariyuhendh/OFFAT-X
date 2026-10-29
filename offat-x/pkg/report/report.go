// Package report generates JSON and HTML security test reports for OFFAT-X.
package report

import (
	"encoding/json"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/offat-x/offat-x/pkg/scorer"
	"github.com/offat-x/offat-x/pkg/tgen"
	"github.com/olekukonko/tablewriter"
)

// Report serialises all test results to JSON.
func Report(tests []*tgen.ApiTest) ([]byte, error) {
	return json.MarshalIndent(tests, "", "  ")
}

// Summary holds aggregate statistics over a test run.
type Summary struct {
	TotalTests      int     `json:"total_tests"`
	Vulnerable      int     `json:"vulnerable"`
	DataLeaks       int     `json:"data_leaks"`
	Immune          int     `json:"immune"`
	Critical        int     `json:"critical"`
	High            int     `json:"high"`
	Medium          int     `json:"medium"`
	Low             int     `json:"low"`
	Info            int     `json:"info"`
	CoveragePercent float64 `json:"coverage_percent"`
}

// BuildSummary computes aggregate stats from results.
func BuildSummary(tests []*tgen.ApiTest) Summary {
	s := Summary{TotalTests: len(tests)}
	for _, t := range tests {
		if t.IsVulnerable {
			s.Vulnerable++
			switch t.Severity {
			case scorer.SeverityCritical:
				s.Critical++
			case scorer.SeverityHigh:
				s.High++
			case scorer.SeverityMedium:
				s.Medium++
			case scorer.SeverityLow:
				s.Low++
			default:
				s.Info++
			}
		}
		if t.IsDataLeak {
			s.DataLeaks++
		}
		if t.IsImmune {
			s.Immune++
		}
	}
	if s.TotalTests > 0 {
		s.CoveragePercent = float64(s.Vulnerable+s.Immune) / float64(s.TotalTests) * 100
	}
	return s
}

// Table prints a colour-annotated ASCII table to stdout.
// writer is unused (kept for future extensibility); output always goes to stdout.
func Table(tests []*tgen.ApiTest, _ interface{}) {
	// Sort by severity descending
	sorted := make([]*tgen.ApiTest, len(tests))
	copy(sorted, tests)
	sort.Slice(sorted, func(i, j int) bool {
		si := scorer.SortBySeverity(sorted[i].Severity)
		sj := scorer.SortBySeverity(sorted[j].Severity)
		return si < sj
	})

	sb := &strings.Builder{}
	tw := tablewriter.NewWriter(sb)
	tw.SetHeader([]string{"Test Name", "Method", "Path", "Status", "Vulnerable", "Severity", "CVSS", "OWASP"})
	tw.SetBorder(true)
	tw.SetRowLine(false)
	tw.SetAutoWrapText(false)
	tw.SetColWidth(30)

	for _, t := range sorted {
		vuln := "NO"
		if t.IsVulnerable {
			vuln = "YES ⚠"
		}
		if t.IsDataLeak {
			vuln = "DATA LEAK 🔓"
		}

		cvss := ""
		if t.CVSSScore > 0 {
			cvss = fmt.Sprintf("%.1f", t.CVSSScore)
		}

		tw.Append([]string{
			truncate(t.TestName, 30),
			t.Method,
			truncate(t.Path, 35),
			fmt.Sprintf("%d", t.ResponseStatus),
			vuln,
			t.Severity,
			cvss,
			truncate(t.OWASPCategory, 35),
		})
	}
	tw.Render()
	fmt.Print(sb.String())
}

// HTMLReport generates a self-contained HTML security report.
func HTMLReport(tests []*tgen.ApiTest, toolVersion string) []byte {
	summary := BuildSummary(tests)

	// Sort tests by CVSS descending for report
	sorted := make([]*tgen.ApiTest, len(tests))
	copy(sorted, tests)
	sort.Slice(sorted, func(i, j int) bool {
		return sorted[i].CVSSScore > sorted[j].CVSSScore
	})

	rows := &strings.Builder{}
	for _, t := range sorted {
		if !t.IsVulnerable && !t.IsDataLeak {
			continue
		}
		rowClass := severityClass(t.Severity)
		badge := badgeHTML(t.Severity)
		leak := ""
		if t.IsDataLeak {
			leak = `<span class="badge leak">DATA LEAK</span>`
		}
		rows.WriteString(fmt.Sprintf(`
		<tr class="%s">
			<td>%s %s</td>
			<td><code>%s %s</code></td>
			<td>%d</td>
			<td>%s</td>
			<td>%.1f</td>
			<td>%s</td>
			<td>%s</td>
			<td>%s</td>
		</tr>`,
			rowClass,
			badge, leak,
			htmlEsc(t.Method), htmlEsc(t.Path),
			t.ResponseStatus,
			htmlEsc(t.TestName),
			t.CVSSScore,
			htmlEsc(t.OWASPCategory),
			htmlEsc(t.CWE),
			htmlEsc(t.Remediation),
		))
	}

	html := fmt.Sprintf(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>OFFAT-X Security Report</title>
<style>
  :root {
    --bg: #0f1117; --surface: #1a1d27; --border: #2d3143;
    --text: #e2e8f0; --muted: #94a3b8;
    --critical: #ef4444; --high: #f97316; --medium: #eab308;
    --low: #22c55e; --info: #3b82f6;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 2rem; }
  h1 { font-size: 2rem; color: #60a5fa; margin-bottom: 0.25rem; }
  .subtitle { color: var(--muted); margin-bottom: 2rem; font-size: 0.9rem; }
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 1.25rem; text-align: center; }
  .card .num { font-size: 2.2rem; font-weight: 700; }
  .card .lbl { color: var(--muted); font-size: 0.8rem; text-transform: uppercase; letter-spacing: .05em; margin-top: 0.25rem; }
  .card.c-critical .num { color: var(--critical); }
  .card.c-high .num { color: var(--high); }
  .card.c-medium .num { color: var(--medium); }
  .card.c-low .num { color: var(--low); }
  .card.c-info .num { color: var(--info); }
  table { width: 100%%; border-collapse: collapse; background: var(--surface); border-radius: 10px; overflow: hidden; }
  th { background: #2d3143; padding: 0.75rem 1rem; text-align: left; font-size: 0.8rem; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); }
  td { padding: 0.65rem 1rem; border-bottom: 1px solid var(--border); font-size: 0.85rem; vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  tr.sev-critical td { border-left: 3px solid var(--critical); }
  tr.sev-high td { border-left: 3px solid var(--high); }
  tr.sev-medium td { border-left: 3px solid var(--medium); }
  tr.sev-low td { border-left: 3px solid var(--low); }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; margin-right: 4px; }
  .badge.CRITICAL { background: var(--critical); color: #fff; }
  .badge.HIGH { background: var(--high); color: #fff; }
  .badge.MEDIUM { background: var(--medium); color: #000; }
  .badge.LOW { background: var(--low); color: #000; }
  .badge.INFO { background: var(--info); color: #fff; }
  .badge.leak { background: #a855f7; color: #fff; }
  code { font-family: monospace; background: #0f1117; padding: 1px 5px; border-radius: 3px; font-size: 0.8rem; }
  footer { margin-top: 2rem; text-align: center; color: var(--muted); font-size: 0.8rem; }
</style>
</head>
<body>
<h1>🛡 OFFAT-X Security Report</h1>
<p class="subtitle">Generated %s &nbsp;|&nbsp; Version %s</p>

<div class="cards">
  <div class="card"><div class="num">%d</div><div class="lbl">Total Tests</div></div>
  <div class="card c-critical"><div class="num">%d</div><div class="lbl">Critical</div></div>
  <div class="card c-high"><div class="num">%d</div><div class="lbl">High</div></div>
  <div class="card c-medium"><div class="num">%d</div><div class="lbl">Medium</div></div>
  <div class="card c-low"><div class="num">%d</div><div class="lbl">Low</div></div>
  <div class="card c-info"><div class="num">%d</div><div class="lbl">Data Leaks</div></div>
</div>

<table>
<thead>
<tr>
  <th>Severity</th><th>Endpoint</th><th>Status</th><th>Test</th>
  <th>CVSS</th><th>OWASP Category</th><th>CWE</th><th>Remediation</th>
</tr>
</thead>
<tbody>
%s
</tbody>
</table>

<footer>OFFAT-X — OFFensive API Tester eXtended &nbsp;|&nbsp; Built on OWASP OFFAT</footer>
</body>
</html>`,
		time.Now().Format("2006-01-02 15:04:05 MST"),
		toolVersion,
		summary.TotalTests,
		summary.Critical,
		summary.High,
		summary.Medium,
		summary.Low,
		summary.DataLeaks,
		rows.String(),
	)

	return []byte(html)
}

// --- helpers ---

func severityClass(sev string) string {
	switch sev {
	case "CRITICAL":
		return "sev-critical"
	case "HIGH":
		return "sev-high"
	case "MEDIUM":
		return "sev-medium"
	case "LOW":
		return "sev-low"
	default:
		return ""
	}
}

func badgeHTML(sev string) string {
	if sev == "" {
		sev = "INFO"
	}
	return fmt.Sprintf(`<span class="badge %s">%s</span>`, sev, sev)
}

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max-1] + "…"
}

func htmlEsc(s string) string {
	s = strings.ReplaceAll(s, "&", "&amp;")
	s = strings.ReplaceAll(s, "<", "&lt;")
	s = strings.ReplaceAll(s, ">", "&gt;")
	s = strings.ReplaceAll(s, "\"", "&#34;")
	return s
}

// DiscoveryReport serialises DIRB discovery results to JSON.
func DiscoveryReport(dirbResult interface{}, comparison interface{}) ([]byte, error) {
	combined := map[string]interface{}{
		"dirb_scan":          dirbResult,
		"comparison_report":  comparison,
	}
	return json.MarshalIndent(combined, "", "  ")
}
