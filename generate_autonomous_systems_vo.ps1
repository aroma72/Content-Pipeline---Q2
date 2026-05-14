# Generate Voiceovers for Autonomous Systems Parts 2, 3, 4

$envFile = "C:\Users\Aroma Tahir\Downloads\Content Queen\.env"
$apiKey = (Select-String -Path $envFile -Pattern 'ELEVENLABS_API_KEY=(.*)' | ForEach-Object { $_.Matches.Groups[1].Value })

if (-not $apiKey) {
    Write-Host "ERROR: ELEVENLABS_API_KEY not found in .env"
    exit 1
}

Write-Host "API Key Found"
Write-Host ""

$voiceId = "21m00Tcm4TlvDq8ikWAM"
$apiUrl = "https://api.elevenlabs.io/v1/text-to-speech"
$voOutputDir = "C:\Users\Aroma Tahir\Downloads\Content Queen\voiceovers\autonomous_systems"

New-Item -ItemType Directory -Force -Path $voOutputDir | Out-Null

Write-Host "=========================================="
Write-Host "AUTONOMOUS SYSTEMS VOICEOVER GENERATION"
Write-Host "Parts 2, 3, 4"
Write-Host "=========================================="
Write-Host ""

# Part 2 scenes
$part2_scenes = @(
    @{ id = 'part2_scene1'; text = "You've built an autonomous system. You ran your tests. Every one passed. You feel confident. You deploy. Then something unexpected happens in production. Your system makes a decision that breaks. It misses an edge case. It's slower than expected. How did this happen? Your tests all passed. The answer is simple: You were testing, but you weren't evaluating." },
    @{ id = 'part2_scene2'; text = "Testing asks: Does the code work? Does it run? If I give it input X, do I get output Y? Testing is essential. You definitely need it. But it's narrow. It only checks the mechanism itself. Testing verifies that your code is technically correct. It catches bugs. It ensures the system functions." },
    @{ id = 'part2_scene3'; text = "Evaluation asks a different question entirely: Is this system right? Does it actually solve the problem? Does the output help users? Does it meet real-world needs? Evaluation is broader. It checks whether the system achieves its actual purpose, not just whether the code works." },
    @{ id = 'part2_scene4'; text = "Here's the key: Your code can pass every test and still fail in the real world. A system can work perfectly, technically sound, and still be wrong. Testing ensures it runs. Evaluation ensures it should run. Both are necessary. One without the other leaves you blind. This distinction is everything." }
)

# Part 3 scenes
$part3_scenes = @(
    @{ id = 'part3_scene1'; text = "Now that you understand evaluation, you need to know how to do it. There are four proven methods. Each measures something different. Each works best in different situations. The systems that stay reliable are the ones using all four together." },
    @{ id = 'part3_scene2'; text = "Method One: Code Review. A human or another system examines your code and asks: Does this logic make sense? Are there bugs? Edge cases? Code review is powerful for finding logical errors, security problems, and inefficiencies. It catches issues before they run." },
    @{ id = 'part3_scene3'; text = "Method Two: End-to-End Testing. You take real data, run it through the entire system, and check if the output is correct. This tests the whole workflow, not just pieces. When real data flows through, does your system produce the right result? End-to-End testing answers that." },
    @{ id = 'part3_scene4'; text = "Method Three: Safety Hooks. You add guardrails during execution. If something looks dangerous, the system stops and alerts instead of proceeding. Safety hooks prevent disasters. They don't fix problems, they prevent the catastrophic ones." },
    @{ id = 'part3_scene5'; text = "Method Four: LLM as Judge. You use an AI to evaluate your AI's outputs. Is the response helpful? Accurate? Professional? When human judgment is hard to code, LLM evaluation works surprisingly well. The four methods together give you complete coverage. Code review for logic. Testing for correctness. Safety hooks for risk. LLM-as-judge for quality. Use all four." }
)

# Part 4 scenes
$part4_scenes = @(
    @{ id = 'part4_scene1'; text = "You now understand what evaluation is. You know four methods to do it. But how do you actually build an autonomous system that stays good? It requires three foundational pillars working together. Without any one of them, the system fails." },
    @{ id = 'part4_scene2'; text = "Pillar One: Skills. These are your system's capabilities. What can it do? What actions can it take? Skills are composable, they build on each other. A system is only as autonomous as its skills allow it to be. Skills give it the power to act." },
    @{ id = 'part4_scene3'; text = "Pillar Two: Evaluation Hooks. These are the system's conscience. Real-time checks that ask: Is this safe? Before the system acts, hooks evaluate. They guard against harm. They ensure the system respects boundaries. Without hooks, skills become dangerous." },
    @{ id = 'part4_scene4'; text = "Pillar Three: Self-Improvement. The system learns from what happens. It reflects on outcomes. It feeds data back into decision-making. The system gets better over time because it measures, learns, and adapts. Without this loop, progress stops." },
    @{ id = 'part4_scene5'; text = "Three pillars. Skills, hooks, learning. When they work together, you have a truly autonomous system. One that acts independently, stays safe, and continuously improves. That's what autonomy looks like." }
)

$allScenes = @()
$allScenes += $part2_scenes
$allScenes += $part3_scenes
$allScenes += $part4_scenes

Write-Host "Generating $($allScenes.Count) voiceovers..."
Write-Host ""

$successful = 0
foreach ($i in 0..($allScenes.Count - 1)) {
    $scene = $allScenes[$i]
    $outFile = Join-Path $voOutputDir "$($scene.id).mp3"

    Write-Host -NoNewline "[$($i+1)/$($allScenes.Count)] $($scene.id)... "

    try {
        $body = @{
            text = $scene.text
            model_id = "eleven_turbo_v2_5"
            voice_settings = @{
                stability = 0.5
                similarity_boost = 0.75
            }
        } | ConvertTo-Json -Depth 5

        $response = Invoke-WebRequest -Uri "$apiUrl/$voiceId" `
            -Method Post `
            -Headers @{ "xi-api-key" = $apiKey; "Content-Type" = "application/json" } `
            -Body $body `
            -OutFile $outFile `
            -TimeoutSec 60 `
            -ErrorAction Stop

        Write-Host "DONE"
        $successful++
    } catch {
        Write-Host "FAILED: $($_.Exception.Message)"
    }

    Start-Sleep -Milliseconds 300
}

Write-Host ""
Write-Host "=========================================="
Write-Host "VOICEOVER GENERATION COMPLETE"
Write-Host "=========================================="
Write-Host "Generated: $successful / $($allScenes.Count)"
Write-Host "Saved to: $voOutputDir"
Write-Host ""
Write-Host "Generated voiceovers:"
Get-ChildItem -Path $voOutputDir -Filter "*.mp3" | ForEach-Object {
    Write-Host "  [OK] $($_.Name)"
}
