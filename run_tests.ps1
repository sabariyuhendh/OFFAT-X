# OFFAT-X Goal-Based Automated Test Runner (PowerShell)
param (
    [string]$Goal = ""
)

$scriptPath = Join-Path $PSScriptRoot "run_tests.js"

if ($Goal -ne "") {
    node $scriptPath "--goal=$Goal"
} else {
    node $scriptPath
}
