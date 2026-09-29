# =========================================================================
# 🚚 SHINEX TRANSPORT (SR_T) - AUTOMATED VERIFICATION SUITE
# =========================================================================

$ErrorActionPreference = "Stop"
$srtDir = "D:\Repo\SR_T"
$codeGs = Join-Path $srtDir "backend\Code.gs"
$apiJs = Join-Path $srtDir "js\api.js"
$appJs = Join-Path $srtDir "js\app.js"
$advJs = Join-Path $srtDir "js\advances.js"
$trspJs = Join-Path $srtDir "js\transport.js"
$authJs = Join-Path $srtDir "js\auth.js"
$bkpJs = Join-Path $srtDir "js\backup.js"
$sheetJs = Join-Path $srtDir "js\sheetview.js"

$totalTests = 0
$passedTests = 0

function Assert-Test([string]$testName, [bool]$condition, [string]$details) {
    $script:totalTests++
    if ($condition) {
        $script:passedTests++
        Write-Host "✅ [PASS] $testName" -ForegroundColor Green
    } else {
        Write-Host "❌ [FAIL] $testName : $details" -ForegroundColor Red
    }
}

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "SHINEX SR_T AUTOMATED VERIFICATION SUITE" -ForegroundColor Cyan
Write-Host "==========================================================`n" -ForegroundColor Cyan

# 1. Inspect Files Exist
Assert-Test "All Core Files Exist" (
    (Test-Path $codeGs) -and (Test-Path $apiJs) -and (Test-Path $appJs) -and 
    (Test-Path $advJs) -and (Test-Path $trspJs) -and (Test-Path $authJs) -and 
    (Test-Path $bkpJs) -and (Test-Path $sheetJs)
) "One or more core files are missing."

$codeContent = Get-Content $codeGs -Raw
$apiContent = Get-Content $apiJs -Raw
$appContent = Get-Content $appJs -Raw
$advContent = Get-Content $advJs -Raw
$trspContent = Get-Content $trspJs -Raw
$authContent = Get-Content $authJs -Raw
$bkpContent = Get-Content $bkpJs -Raw
$sheetContent = Get-Content $sheetJs -Raw

# 2. Test Backend LockService Concurrency Guard
Assert-Test "LockService Concurrency Guard" (
    $codeContent.Contains("LockService.getScriptLock()") -and
    $codeContent.Contains("lock.waitLock(30000)") -and
    $codeContent.Contains("lock.releaseLock()")
) "Code.gs must acquire and release 30s ScriptLock on mutations."

# 3. Test Metadata & DATA_VERSION Management in Code.gs
Assert-Test "Metadata & DATA_VERSION Tracking" (
    $codeContent.Contains("SHEET_META = '_Meta'") -and
    $codeContent.Contains("getDataVersion") -and
    $codeContent.Contains("incrementDataVersion") -and
    $codeContent.Contains("action === 'getVersion'")
) "Code.gs must maintain _Meta sheet, getDataVersion, and incrementDataVersion."

# 4. Test Lightweight Version Polling Endpoint in Backend
Assert-Test "Lightweight Version Polling Endpoint" (
    $codeContent.Contains("if (action === 'getVersion')") -and
    $codeContent.Contains("version: currentVersion")
) "doGet must support fast 'getVersion' action returning version and lastUpdated."

# 5. Test Central Recalculation Engine in Backend
Assert-Test "Central Recalculation Engine (recalculateFinancials)" (
    $codeContent.Contains("function recalculateFinancials(ss)") -and
    $codeContent.Contains("function calculateSummary(ss, transport, advances)") -and
    $codeContent.Contains("function calculateTransportRow(item)")
) "Code.gs must have central recalculateFinancials, calculateSummary, and calculateTransportRow."

# 6. Test Admin vs Rudra Permission Enforcement in Backend
Assert-Test "Backend Delete Security Guard (userCanDelete)" (
    $codeContent.Contains("function userCanDelete(envelope)") -and
    $codeContent.Contains("user === 'rudra'") -and
    $codeContent.Contains("DELETE_NOT_ALLOWED")
) "Code.gs must reject delete requests from Rudra with DELETE_NOT_ALLOWED."

# 7. Test Admin-Only Dataset Restore Guard in Backend
Assert-Test "Backend Restore Security Guard" (
    $codeContent.Contains("action === 'restoreFullDataset'") -and
    $codeContent.Contains("RESTORE_NOT_ALLOWED") -and
    $codeContent.Contains("createCloudBackup(ss, 'Pre-Restore-Safety-Backup')")
) "Code.gs must create safety backup and verify Admin permissions before restore."

# 8. Test Cloud-First Write Architecture (No Silent Local-Only Save)
Assert-Test "Cloud-First Transport Save in api.js" (
    $apiContent.Contains("saveTransport(record)") -and
    $apiContent.Contains("action: isEdit ? 'updateTransport' : 'addTransport'") -and
    (-not $apiContent.Contains("mode: 'no-cors'")) -and
    $apiContent.Contains("Cloud connection unavailable. Transport record was NOT saved.")
) "api.js saveTransport must write to cloud first without no-cors and throw on failure."

# 9. Test Cloud-First Advance Save in api.js
Assert-Test "Cloud-First Advance Save in api.js" (
    $apiContent.Contains("saveAdvance(advance)") -and
    $apiContent.Contains("action: isEdit ? 'updateAdvance' : 'addAdvance'") -and
    $apiContent.Contains("Cloud connection unavailable. Advance record was NOT saved.")
) "api.js saveAdvance must write to cloud first and throw on failure."

# 10. Test Delete Operations in api.js Block Rudra
Assert-Test "Frontend Delete Guards Block Rudra" (
    $apiContent.Contains("deleteTransport(id)") -and
    $apiContent.Contains("deleteAdvance(id)") -and
    $apiContent.Contains("!AuthService.isAdmin()") -and
    $apiContent.Contains("Rudra can add and edit records but cannot delete them.")
) "api.js deleteTransport and deleteAdvance must enforce AuthService.isAdmin()."

# 11. Test Realtime Background Polling in app.js
Assert-Test "Realtime Background Polling with DATA_VERSION" (
    $appContent.Contains("checkCloudVersionAndSync()") -and
    $appContent.Contains("ApiService.getDataVersion()") -and
    $appContent.Contains("ApiService.getCurrentVersion()") -and
    $appContent.Contains("setInterval")
) "app.js must poll getDataVersion() and sync full dataset when version changes."

# 12. Test Advance UI Form Error Handling
Assert-Test "Advances Form Error Handling" (
    $advContent.Contains("Cloud Notice:") -and
    $advContent.Contains("AdvancesModule.confirmDelete") -and
    $advContent.Contains("Rudra can add and edit records but cannot delete them.")
) "advances.js must handle cloud errors properly and block Rudra deletions."

# 13. Test Transport UI Form Error Handling
Assert-Test "Transport Form Error Handling" (
    $trspContent.Contains("Cloud Notice:") -and
    $trspContent.Contains("TransportModule.confirmDelete") -and
    $trspContent.Contains("Rudra can add and edit records but cannot delete them.")
) "transport.js must handle cloud errors properly and block Rudra deletions."

# 14. Test Live Password Update via Cloud
Assert-Test "Live Cloud Password Sync" (
    $authContent.Contains("action: 'updatePassword'") -and
    $authContent.Contains("'Content-Type': 'text/plain;charset=utf-8'") -and
    (-not $authContent.Contains("mode: 'no-cors'"))
) "auth.js must push password updates to cloud using text/plain without no-cors."

# 15. Test Excel Sheet Chaining Calculation Parity
Assert-Test "Chained Section Calculations in sheetview.js" (
    $sheetContent.Contains("computeAllSectionsData") -and
    $sheetContent.Contains("totalAmount + toPayBal") -and
    $sheetContent.Contains("netOutstanding = totalPayable - advSum") -and
    $sheetContent.Contains("oldBal = prevOutBal")
) "sheetview.js must compute sequential section chaining accurately."

# 16. Test Normalization Bug Fix (No undefined balance)
Assert-Test "normalizeTransportRecord Balance Bug Fix" (
    $apiContent.Contains("const balance = isPaid ? 0 : Math.max(0, toPay - paidNum);") -and
    $apiContent.Contains("if (balance <= 0 && toPay > 0) status = 'Paid';")
) "api.js normalizeTransportRecord must define balance before status evaluation."

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "RESULT: $passedTests / $totalTests TESTS PASSED" -ForegroundColor $(if ($passedTests -eq $totalTests) { "Green" } else { "Red" })
Write-Host "==========================================================`n" -ForegroundColor Cyan

if ($passedTests -ne $totalTests) {
    exit 1
} else {
    exit 0
}
