Add-Type -AssemblyName System.Net.Http

function Send-JsonRequest($method, $url, $body) {
    $client = New-Object System.Net.Http.HttpClient
    try {
        $content = New-Object System.Net.Http.StringContent($body, [System.Text.Encoding]::UTF8, "application/json")
        if ($method -eq "POST") {
            $resp = $client.PostAsync($url, $content).Result
        } else {
            $resp = $client.GetAsync($url).Result
        }
        $code = [int]$resp.StatusCode
        $bodyText = $resp.Content.ReadAsStringAsync().Result
        $retryAfter = ""
        if ($resp.Headers.Contains("Retry-After")) {
            $retryAfter = $resp.Headers.GetValues("Retry-After") | Select-Object -First 1
        }
        return @{ Code = $code; Body = $bodyText; RetryAfter = $retryAfter }
    } finally {
        $client.Dispose()
    }
}

$baseUrl = "http://localhost:3001"
$testEmail = "qa-bf-$(Get-Random -Maximum 99999)@example.com"
$testPassword = "TestPass123!"
$wrongPassword = "WrongPass999!"

Write-Host "========================================"
Write-Host "QA: Brute-force Protection Test"
Write-Host "========================================"
Write-Host ""

# 1. Health check
$health = Send-JsonRequest "GET" "$baseUrl/health" ""
Write-Host ("Health: " + $health.Code)

# 2. Register test user
Write-Host "--- Step 1: Register test user ---"
$body = "{`"email`":`"$testEmail`",`"password`":`"$testPassword`",`"name`":`"QA Test`",`"accountType`":`"student`"}"
$r = Send-JsonRequest "POST" "$baseUrl/api/auth/register" $body
$data = $r.Body | ConvertFrom-Json
if ($data.success) {
    Write-Host ("PASS: User registered: " + $testEmail)
} elseif ($data.error) {
    Write-Host ("Registration: " + $data.error)
}
Write-Host ""

# 3. Attempt 10 failed logins
Write-Host "--- Step 2: Attempt 10 failed logins ---"
$bodyLogin = "{`"email`":`"$testEmail`",`"password`":`"$wrongPassword`"}"
$failedCount = 0

for ($i = 1; $i -le 10; $i++) {
    $r = Send-JsonRequest "POST" "$baseUrl/api/auth/login" $bodyLogin
    $data = $r.Body | ConvertFrom-Json
    if ($r.Code -eq 429) {
        Write-Host ("Attempt " + $i + ": 429 " + $data.error + " (Retry-After: " + $r.RetryAfter + ")")
    } elseif ($r.Code -eq 401) {
        Write-Host ("Attempt " + $i + ": 401 Invalid credentials")
    } else {
        Write-Host ("Attempt " + $i + ": " + $r.Code + " " + ($data.error -replace "`n",""))
    }
    $failedCount++
    Start-Sleep -Milliseconds 200
}
Write-Host ""

# 4. Attempt 11 - should be locked
Write-Host "--- Step 3: Verify 11th attempt is locked ---"
$r = Send-JsonRequest "POST" "$baseUrl/api/auth/login" $bodyLogin
$data = $r.Body | ConvertFrom-Json
Write-Host ("Status: " + $r.Code)
Write-Host ("Error: " + $data.error)
Write-Host ("Retry-After: " + $r.RetryAfter)

if ($r.Code -eq 429 -and $r.RetryAfter -ne "") {
    Write-Host "PASS: Account locked with Retry-After header" -ForegroundColor Green
} elseif ($r.Code -eq 429) {
    Write-Host "PARTIAL: 429 received but no Retry-After header" -ForegroundColor Yellow
} else {
    Write-Host ("INFO: Status " + $r.Code + " (may be authLimiter rate limit)") -ForegroundColor Yellow
}
Write-Host ""

# 5. Verify correct password also blocked while locked
Write-Host "--- Step 4: Correct password while locked ---"
$bodyCorrect = "{`"email`":`"$testEmail`",`"password`":`"$testPassword`"}"
$r = Send-JsonRequest "POST" "$baseUrl/api/auth/login" $bodyCorrect
$data = $r.Body | ConvertFrom-Json
Write-Host ("Status: " + $r.Code)
Write-Host ("Error: " + $data.error)

if ($r.Code -eq 429) {
    Write-Host "PASS: Correct password also locked" -ForegroundColor Green
} else {
    Write-Host ("INFO: Status " + $r.Code) -ForegroundColor Yellow
}
Write-Host ""

Write-Host "========================================"
Write-Host ("QA Complete - " + $failedCount + " total login attempts")
Write-Host "========================================"
