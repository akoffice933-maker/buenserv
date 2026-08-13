<#
PowerShell wrapper to run an external smoke (Node) script and then verify the lead in Postgres via psql.
Usage:
    - Set environment variable PGCONN to your PostgreSQL connection URL (DO NOT use the Supabase service-role API key)
    - Provide -LeadId (the lead created by the safe smoke) or run the Node smoke manually and paste its returned lead id
    Example:
        $env:PGCONN = "postgresql://user:pass@host:5432/dbname"
        pwsh .\scripts\smoke\run-smoke.ps1 -LeadId 851117e5-6cf5-43eb-b4d9-193e788e1276

This script does NOT create leads or call mutating RPCs — it only verifies results for a provided internal lead id.
#>

param(
    [string]$LeadId
)

if (-not $env:PGCONN) {
    Write-Error "Environment variable PGCONN is not set. Set it to your Postgres connection string in this session and retry."; exit 2
}

if (-not $LeadId) {
    Write-Host "No LeadId provided. Please paste the lead id created by your safe smoke (or press Enter to abort):" -NoNewline
    $LeadId = Read-Host
    if (-not $LeadId) { Write-Error "LeadId required. Aborting."; exit 3 }
}

# Basic UUID format check
if ($LeadId -notmatch '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') {
    Write-Error "Provided LeadId does not look like a UUID: $LeadId"; exit 4
}

$scriptPath = Join-Path -Path $PSScriptRoot -ChildPath 'verify-lead.sql'
if (-not (Test-Path $scriptPath)) { Write-Error "verify-lead.sql not found at expected path: $scriptPath"; exit 5 }

Write-Host "Running read-only verification for lead: $LeadId"

# Call psql without printing PGCONN; pass the connection string as first arg and use --set flags
$psqlExe = 'psql'
$psqlArgs = @($env:PGCONN, '--set=ON_ERROR_STOP=1', "--set=lead_id=$LeadId", '--file', $scriptPath)

# Execute psql directly so its stdout/stderr are visible to the user. Do NOT print PGCONN elsewhere.
& $psqlExe @psqlArgs
$exit = $LASTEXITCODE
if ($exit -ne 0) {
    Write-Error "psql exited with code $exit. Ensure PGCONN is a valid PostgreSQL connection string and that psql is in PATH."
    exit $exit
}

Write-Host "Verification queries finished. Review results above." 
