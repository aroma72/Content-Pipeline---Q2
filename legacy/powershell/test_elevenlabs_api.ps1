# Test ElevenLabs API

$envFile = "C:\Users\Aroma Tahir\Downloads\Content Queen\.env"
$apiKey = (Select-String -Path $envFile -Pattern 'ELEVENLABS_API_KEY=(.*)' | ForEach-Object { $_.Matches.Groups[1].Value }).Trim()

Write-Host "API Key: $apiKey"
Write-Host "API Key Length: $($apiKey.Length)"

$voiceId = "21m00Tcm4TlvDq8ikWAM"
$apiUrl = "https://api.elevenlabs.io/v1/text-to-speech"

$testText = "This is a test of the ElevenLabs API."

$body = @{
    text = $testText
    model_id = "eleven_monologue_v1"
    voice_settings = @{
        stability = 0.5
        similarity_boost = 0.75
        style = 0.3
        use_speaker_boost = $true
    }
} | ConvertTo-Json -Depth 10

Write-Host "Body: $body"
Write-Host ""

try {
    Write-Host "Sending request to: $apiUrl/$voiceId"
    $response = Invoke-WebRequest -Uri "$apiUrl/$voiceId" `
        -Method Post `
        -Headers @{
            "xi-api-key" = $apiKey
            "Content-Type" = "application/json"
        } `
        -Body $body `
        -TimeoutSec 60 `
        -ErrorAction Stop

    Write-Host "SUCCESS: $($response.StatusCode)"
    Write-Host "Response length: $($response.Content.Length) bytes"
} catch {
    Write-Host "ERROR: $($_.Exception.Message)"
    Write-Host "Status Code: $($_.Exception.Response.StatusCode)"
    Write-Host "Response Body: $($_.Exception.Response)"

    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $stream.Position = 0
        $reader = New-Object System.IO.StreamReader($stream)
        $body = $reader.ReadToEnd()
        Write-Host "Response Details: $body"
    }
}
