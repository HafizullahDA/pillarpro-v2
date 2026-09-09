# ==============================================================================
# PillarPro Database Pre-Deployment Backup Script (PowerShell)
# Usage:
#   .\scripts\backup-db.ps1
#   .\scripts\backup-db.ps1 -SchemaOnly
# ==============================================================================

param (
    [switch]$SchemaOnly,
    [string]$OutputDir = ".\backups"
)

$ErrorActionPreference = "Stop"

if (!(Test-Path -Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$DumpFileName = if ($SchemaOnly) { "pillarpro_schema_$Timestamp.sql" } else { "pillarpro_full_$Timestamp.sql" }
$OutputPath = Join-Path -Path $OutputDir -ChildPath $DumpFileName

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " PillarPro Pre-Deploy Database Backup" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Target output: $OutputPath" -ForegroundColor Yellow

# Check if Supabase CLI or pg_dump is available
if (Get-Command "supabase" -ErrorAction SilentlyContinue) {
    Write-Host "Using Supabase CLI to create backup..." -ForegroundColor Green
    if ($SchemaOnly) {
        supabase db dump --schema public -f $OutputPath
    } else {
        supabase db dump --data-only -f $OutputPath
    }
} elseif (Get-Command "pg_dump" -ErrorAction SilentlyContinue) {
    Write-Host "Using pg_dump..." -ForegroundColor Green
    if (-not $env:DATABASE_URL) {
        Write-Error "DATABASE_URL environment variable is required when using pg_dump."
    }
    $args = @($env:DATABASE_URL, "-f", $OutputPath)
    if ($SchemaOnly) { $args += "--schema-only" }
    & pg_dump $args
} else {
    Write-Host "Notice: Neither 'supabase' CLI nor 'pg_dump' found in system PATH." -ForegroundColor Yellow
    Write-Host "To back up manually from Supabase Dashboard:" -ForegroundColor White
    Write-Host "1. Open https://supabase.com/dashboard/project/_/database/backups" -ForegroundColor White
    Write-Host "2. Click 'Backup now' or schedule daily PITR snapshots." -ForegroundColor White
    Write-Host ""
    Write-Host "Alternatively, install the Supabase CLI via:" -ForegroundColor White
    Write-Host "  npm install -g supabase" -ForegroundColor Gray
    Write-Host "  npx supabase db dump -f $OutputPath" -ForegroundColor Gray
    exit 0
}

if (Test-Path -Path $OutputPath) {
    $FileSize = (Get-Item $OutputPath).Length / 1MB
    Write-Host "SUCCESS: Database snapshot created ($([math]::Round($FileSize, 2)) MB)" -ForegroundColor Green
} else {
    Write-Error "Failed to generate backup file."
}

