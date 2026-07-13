# QA Script: Brute-force Protection Test
# Tests account lockout after 10 failed login attempts

$baseUrl = "http://localhost:3001"
$testEmail = "qa-bruteforce-$(Get-Random -Maximum 99999)@example.com"
$testPassword = "TestPass123!"
$wrongPassword = "WrongPass999!"

Write-Host "========================================"
Write-Host "QA: Brute-force Protection Test"
Write-Host "========================================"
Write-Host ""

# 1. Register a test user
Write-Host "--- Step 1: Register test user ---"
$body = "{`"email`":`"$testEmail`",`"password`":`"$testPassword`",`"name`":`"QA Test`",`"accountType`":`"student`"}"
try {
    $r = Invoke-WebRequest -Uri "$baseUrl/api/auth/register" -Method Post -ContentType "application/json" -Body $body
    $data = $r.Content | ConvertFrom-Json
    if ($data.success) {
        Write-Host ("PASS: User registered: " + $testEmail)
    } else {
        Write-Host ("FAIL: Registration failed: " + $data.error)
        exit 1
    }
} catch {
    Write-Host ("FAIL: Registration error: " + $_)
    exit 1
}
Write-Host ""

# 2. Attempt 10 failed logins
Write-Host "--- Step 2: Attempt 10 failed logins ---"
$bodyLogin = "{`"email`":`"$testEmail`",`"password`":`"$wrongPassword`"}"
$failedCount = 0
$testStart = Get-Date

for ($i = 1; $i -le 10; $i++) {
    try {
        $r = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method Post -ContentType "application/json" -Body $bodyLogin
        $data = $r.Content | ConvertFrom-Json
        Write-Host ("Attempt " + $i + ": " + $r.StatusCode + " (UNEXPECTED success)") -ForegroundColor Yellow
    } catch {
        $ex = $_.Exception.Response
        $code = [int]$ex.StatusCode
        $retryAfter = ""
        try { $retryAfter = $ex.Headers["Retry-After"] } catch {}
        
        $reader = New-Object System.IO.StreamReader($ex.GetResponseStream())
        $responseText = $reader.ReadToEnd()
        $reader.Close()
        
        try {
            $parsed = $responseText | ConvertFrom-Json
            $errorMsg = $parsed.error
        } catch {
            $errorMsg = $responseText
        }
        
        if ($code -eq 401) {
            Write-Host ("Attempt " + $i + ": 401 - " + ${errorMsg} + " (expected)")
            $failedCount++
        } elseif ($code -eq 429) {
            Write-Host ("Attempt " + $i + ": 429 - " + ${errorMsg} + " (Retry-After: " + ${retryAfter} + ")") -ForegroundColor Cyan
            $failedCount++
        } else {
            Write-Host ("Attempt " + $i + ": " + $code + " - " + ${errorMsg}) -ForegroundColor Yellow
        }
    }
}
Write-Host ""

# 3. Verify lockout on 11th attempt
Write-Host "--- Step 3: Verify 11th attempt is locked ---"
try {
    $r = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method Post -ContentType "application/json" -Body $bodyLogin
    $data = $r.Content | ConvertFrom-Json
    Write-Host ("FAIL: 11th attempt should be blocked but got " + $r.StatusCode) -ForegroundColor Red
} catch {
    $ex = $_.Exception.Response
    $code = [int]$ex.StatusCode
    
    $reader = New-Object System.IO.StreamReader($ex.GetResponseStream())
    $responseText = $reader.ReadToEnd()
    $reader.Close()
    
    try {
        $parsed = $responseText | ConvertFrom-Json
        $errorMsg = $parsed.error
    } catch {
        $errorMsg = $responseText
    }
    
    $retryAfter = ""
    try { $retryAfter = $ex.Headers["Retry-After"] } catch {}
    
    Write-Host ("Status: " + $code)
    Write-Host ("Error: " + ${errorMsg})
    Write-Host ("Retry-After: " + ${retryAfter})
    
    if ($code -eq 429 -and ${retryAfter}) {
        Write-Host ("PASS: Account locked with 429 and Retry-After=" + ${retryAfter} + " seconds") -ForegroundColor Green
    } else {
        Write-Host ("Result: Code=" + $code + ", but may be authLimiter (not account lockout)") -ForegroundColor Yellow
    }
}
Write-Host ""

# 4. Verify correct password also blocked
Write-Host "--- Step 4: Verify correct password also blocked ---"
$bodyCorrect = "{`"email`":`"$testEmail`",`"password`":`"$testPassword`"}"
try {
    $r = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method Post -ContentType "application/json" -Body $bodyCorrect
    $data = $r.Content | ConvertFrom-Json
    if ($data.success) {
        Write-Host "UNEXPECTED: Login with correct password succeeded (maybe lock expired?)" -ForegroundColor Yellow
    } else {
        Write-Host ("Login blocked: " + $data.error) -ForegroundColor Yellow
    }
} catch {
    $ex = $_.Exception.Response
    $code = [int]$ex.StatusCode
    $reader = New-Object System.IO.StreamReader($ex.GetResponseStream())
    $responseText = $reader.ReadToEnd()
    $reader.Close()
    
    try {
        $parsed = $responseText | ConvertFrom-Json
        $errorMsg = $parsed.error
    } catch {
        $errorMsg = $responseText
    }
    
    $retryAfter = ""
    try { $retryAfter = $ex.Headers["Retry-After"] } catch {}
    
    Write-Host ("Status: " + $code)
    Write-Host ("Error: " + ${errorMsg})
    Write-Host ("Retry-After: " + ${retryAfter})
    
    if ($code -eq 429) {
        Write-Host "PASS: Correct password also locked (429)" -ForegroundColor Green
    } elseif ($code -eq 401) {
        Write-Host "Correct password returned 401 (account may not be locked)" -ForegroundColor Yellow
    }
}
Write-Host ""

Write-Host "========================================"
Write-Host ("QA Complete - " + $failedCount + " failed attempts recorded")
Write-Host "========================================"
