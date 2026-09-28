# Autonomous Systems Videos 2, 3, 4 - Complete Generation Pipeline
# Generates voiceovers and renders final MP4 videos

param(
    [switch]$SkipVO,
    [switch]$SkipRender
)

# Load API key from .env
$envFile = "C:\Users\Aroma Tahir\Downloads\Content Queen\.env"
$apiKey = (Select-String -Path $envFile -Pattern 'ELEVENLABS_API_KEY=(.*)' | ForEach-Object { $_.Matches.Groups[1].Value })

if (-not $apiKey) {
    Write-Host "❌ ERROR: ELEVENLABS_API_KEY not found in .env file"
    exit 1
}

Write-Host "✅ ElevenLabs API key loaded"

# Settings
$voiceId = "21m00Tcm4TlvDq8ikWAM"  # Professional male voice (Adam)
$apiUrl = "https://api.elevenlabs.io/v1/text-to-speech"
$voOutputDir = "C:\Users\Aroma Tahir\Downloads\Content Queen\voiceovers\autonomous_systems"
$videoOutputDir = "C:\Users\Aroma Tahir\Downloads\Content Queen\output"

# Create directories
New-Item -ItemType Directory -Force -Path $voOutputDir | Out-Null
New-Item -ItemType Directory -Force -Path $videoOutputDir | Out-Null

Write-Host ""
Write-Host "=========================================="
Write-Host "AUTONOMOUS SYSTEMS VIDEOS 2, 3, 4"
Write-Host "=========================================="

# Define scenes
$scenes = @(
    # PART 2
    @{ id = 'part2_scene1'; text = 'We just finished Part One. You learned about two mindsets: Consumer and Producer. Now comes the critical question. How do you know if a system is actually autonomous? That is what Part Two is about. Testing versus evaluation. Does it work, or is it right?'; duration = 13.0 },
    @{ id = 'part2_scene2'; text = 'Let me tell you a story. A company built an autonomous system. All their tests passed. Performance was excellent. They deployed it. Two weeks later, users report problems. The system makes decisions that seem right on paper but cause real harm. How did this happen? The tests passed. Here is the thing. Testing checks if your code works. But evaluation checks if your system actually solves the problem it is supposed to solve. That is the difference.'; duration = 16.0 },
    @{ id = 'part2_scene3'; text = 'Testing asks: Does the code run? Does it break? If I give it input X, do I get output Y? Testing is important. You definitely need it. But it is narrow. It is focused on the code. Evaluation asks a different question. Does the system achieve its goals? Does the output actually help users? Is it high quality?'; duration = 16.0 },
    @{ id = 'part2_scene4'; text = 'Think of it this way. Testing is like checking: Does the machine work? Does it turn on? Does it stop when I turn it off? Evaluation is like asking: Does the product that comes out of the machine actually work for customers? Can they use it? Do they like it? Both matter. But they are measuring different things.'; duration = 15.0 },
    @{ id = 'part2_scene5'; text = 'Here is the key insight. A test can pass, but evaluation can fail. And that means you have a problem. You need both. Testing ensures the system is technically sound. Evaluation ensures it is actually useful.'; duration = 13.0 },
    @{ id = 'part2_scene6'; text = 'When you build an autonomous system, you are responsible for what it does. If your system gives wrong information, harms users, or produces garbage, that is on you. Evaluation is how you catch these problems before they reach users. Evaluation is how you know: Is my system ready to ship? What should I improve? Am I making progress?'; duration = 16.0 },
    @{ id = 'part2_scene7'; text = 'Without evaluation, you are flying blind. With evaluation, you have data. You can say: Last week, success rate was ninety percent. Today it is eighty eight percent. Something broke. Let me investigate. Without evaluation, you do not know until users complain. With evaluation, you catch problems early. That is the power of evaluation.'; duration = 15.0 },

    # PART 3
    @{ id = 'part3_scene1'; text = 'Part Two taught you the difference between testing and evaluation. Now you need to know how to evaluate. There are four methods. Each one measures something different. Each one is useful in different situations. Your job is to pick the right methods for your system.'; duration = 13.0 },
    @{ id = 'part3_scene2'; text = 'Method one is code review. A human or another system looks at the code and asks: Does the logic make sense? Are there bugs? Are there edge cases that break it? Code review is powerful for finding logical errors, security issues, and performance problems.'; duration = 15.0 },
    @{ id = 'part3_scene3'; text = 'When should you use code review? Any system with explicit decision logic. If your system has rules, conditionals, or orchestration, code review catches problems before runtime. The limitation is that code review cannot catch behavioral problems. A system might have perfect code but still give users wrong answers or be too slow.'; duration = 15.0 },
    @{ id = 'part3_scene4'; text = 'Method two is end to end testing. You take real inputs, run them through the system, and check if the output is correct. This tests the whole system, not just the code. It answers the question: When real data flows through, does the system produce the right result?'; duration = 14.0 },
    @{ id = 'part3_scene5'; text = 'When should you use end to end testing? Multi stage systems, integrations, anything where the final output matters more than the logic. The limitation is that end to end testing is sample based. You cannot test every input combination. If an edge case exists that you did not test, it slips through.'; duration = 15.0 },
    @{ id = 'part3_scene6'; text = 'Method three is safety hooks. You add checks during execution. If something looks wrong, stop and alert instead of proceeding. Think of it as circuit breakers for your system. You prevent disasters by halting before they happen.'; duration = 13.0 },
    @{ id = 'part3_scene7'; text = 'When should you use safety hooks? High risk systems where failure has real consequences. Anything touching money, health, security, or user data should have safety hooks. Safety hooks do not prevent problems. They prevent disasters. They catch the ones that matter most.'; duration = 14.0 },
    @{ id = 'part3_scene8'; text = 'Method four is LLM as judge. You use another language model to evaluate your system output. Does this response sound helpful? Professional? Accurate? LLM as judge evaluates subjective qualities that are hard to measure with code.'; duration = 13.0 },
    @{ id = 'part3_scene9'; text = 'When should you use LLM as judge? Anything involving natural language generation, tone, helpfulness, alignment. The limitation is that you are using an LLM to judge an LLM. It works surprisingly well, but it is not perfect. You need careful prompt design.'; duration = 13.0 },
    @{ id = 'part3_scene10'; text = 'Here is the key: You do not use one method. You use all of them, but for different purposes. Code review for logic. End to end testing for correctness. Safety hooks for risk. LLM as judge for quality. Together, they give you confidence that your system is actually working.'; duration = 15.0 },

    # PART 4
    @{ id = 'part4_scene1'; text = 'You now understand what evaluation is. You know four methods to do it. But how do you actually build it? How do you make evaluation part of your system forever? That is what Part Four teaches you.'; duration = 13.0 },
    @{ id = 'part4_scene2'; text = 'First, understand your system. Not the code. The purpose. What is your system supposed to do? Be specific. Write it down. This is your north star. Everything else flows from this. Metrics come from this. Evaluation methods come from this.'; duration = 15.0 },
    @{ id = 'part4_scene3'; text = 'Second, define three to five metrics that measure success. Not just any metrics. Metrics that matter for your system purpose. Do not measure what is easy to measure. Measure what matters. Set baselines. You will refine as you measure.'; duration = 14.0 },
    @{ id = 'part4_scene4'; text = 'Third, pick evaluation methods for your system. Different systems need different methods. Look at your system. Ask: What could go wrong? Which method catches that? You probably pick two to three methods, not all four.'; duration = 13.0 },
    @{ id = 'part4_scene5'; text = 'Fourth, build infrastructure to collect and track metrics. You need logs from your system, storage for historical data, and visualization so anyone can see the trend. Start simple. Log success or failure for every run. Store it. Plot weekly trends.'; duration = 15.0 },
    @{ id = 'part4_scene6'; text = 'Fifth, run the MEASURE loop regularly. Every week: Pull your metrics. How are we doing? Look at failures. What went wrong? Understand why. Compile a summary. Plan one fix. Deploy. Measure again. Repeat. The loop is continuous.'; duration = 15.0 },
    @{ id = 'part4_scene7'; text = 'You do not build the entire system at once. Week one to two: Define metrics and establish baselines. Week three to four: Implement your first evaluation method. Week five to six: Run your first MEASURE cycle. Week seven and beyond: Add more methods, expand monitoring. In two months, you have a working evaluation system.'; duration = 16.0 }
)

# ========================================
# PHASE 1: Generate Voiceovers
# ========================================

if (-not $SkipVO) {
    Write-Host ""
    Write-Host "PHASE 1: Generating Voiceovers (24 scenes)"
    Write-Host "=========================================="

    $successful = 0
    $trimmed = 0
    $failed = 0

    foreach ($i in 0..($scenes.Count - 1)) {
        $scene = $scenes[$i]
        $outputFile = Join-Path $voOutputDir "$($scene.id).mp3"

        Write-Host -NoNewline "[$($i+1)/$($scenes.Count)] $($scene.id)... "

        try {
            # Call ElevenLabs API
            $body = @{
                text = $scene.text
                model_id = "eleven_monologue_v1"
                voice_settings = @{
                    stability = 0.5
                    similarity_boost = 0.75
                    style = 0.3
                    use_speaker_boost = $true
                }
            } | ConvertTo-Json

            $response = Invoke-WebRequest -Uri "$apiUrl/$voiceId" `
                -Method Post `
                -Headers @{ "xi-api-key" = $apiKey; "Content-Type" = "application/json" } `
                -Body $body `
                -OutFile $outputFile `
                -TimeoutSec 60

            # Check duration using ffprobe
            $ffprobe = Get-Command ffprobe -ErrorAction SilentlyContinue
            if ($ffprobe) {
                $duration = & ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 $outputFile 2>$null
                $duration = [double]$duration
                $deviation = [Math]::Abs($duration - $scene.duration)

                if ($deviation -le 0.5) {
                    Write-Host "✅ ($([Math]::Round($duration,2))s)"
                    $successful++
                } elseif ($duration -gt $scene.duration) {
                    Write-Host "📌 Trimming ($([Math]::Round($duration,2))s → $($scene.duration)s)"
                    # Trim audio
                    & ffmpeg -i $outputFile -t $scene.duration -acodec libmp3lame -ab 128k -y "$($outputFile -replace '.mp3$', '_trim.mp3')" 2>$null
                    Move-Item -Path "$($outputFile -replace '.mp3$', '_trim.mp3')" -Destination $outputFile -Force
                    $trimmed++
                    $successful++
                } else {
                    Write-Host "⚠️ Too short ($([Math]::Round($duration,2))s < $($scene.duration)s)"
                    $successful++
                }
            } else {
                Write-Host "✅"
                $successful++
            }
        } catch {
            Write-Host "❌ Error: $($_.Exception.Message)"
            $failed++
        }

        # Rate limiting (avoid hitting API limits)
        Start-Sleep -Milliseconds 500
    }

    Write-Host ""
    Write-Host "Voiceover Generation Summary:"
    Write-Host "  ✅ Successful: $successful"
    if ($trimmed -gt 0) { Write-Host "  📌 Trimmed: $trimmed (saved $(($trimmed)) API calls)" }
    if ($failed -gt 0) { Write-Host "  ❌ Failed: $failed" }
    Write-Host "  📁 Saved to: $voOutputDir"
}

# ========================================
# PHASE 2: Render Videos in Remotion
# ========================================

if (-not $SkipRender) {
    Write-Host ""
    Write-Host "PHASE 2: Rendering Videos in Remotion"
    Write-Host "====================================="

    $remotionDir = "C:\Users\Aroma Tahir\Downloads\Content Queen\drawing-room-video\drawing-room-remotion"

    if (-not (Test-Path $remotionDir)) {
        Write-Host "❌ ERROR: Remotion directory not found at $remotionDir"
        exit 1
    }

    Push-Location $remotionDir

    # Check if Node modules are installed
    if (-not (Test-Path "node_modules")) {
        Write-Host "📦 Installing dependencies..."
        npm install
    }

    # Render each video
    $videos = @(
        @{ component = "AutonomousSystemsPart2"; output = "$videoOutputDir\autonomous_systems_part_2.mp4"; part = "Part 2" },
        @{ component = "AutonomousSystemsPart3"; output = "$videoOutputDir\autonomous_systems_part_3.mp4"; part = "Part 3" },
        @{ component = "AutonomousSystemsPart4"; output = "$videoOutputDir\autonomous_systems_part_4.mp4"; part = "Part 4" }
    )

    foreach ($video in $videos) {
        Write-Host ""
        Write-Host "🎬 Rendering $($video.part)..."
        Write-Host "   Component: $($video.component)"
        Write-Host "   Output: $($video.output)"

        try {
            npx remotion render $video.component --concurrency=4 $video.output --props='{"voOutputDir":"'$voOutputDir'"}'

            if (Test-Path $video.output) {
                $fileSize = (Get-Item $video.output).Length / 1MB
                Write-Host "✅ Rendered successfully ($([Math]::Round($fileSize,2)) MB)"
            } else {
                Write-Host "❌ Render failed - output file not created"
            }
        } catch {
            Write-Host "❌ Render error: $($_.Exception.Message)"
        }
    }

    Pop-Location

    Write-Host ""
    Write-Host "✅ All videos rendered!"
    Write-Host "📁 Output directory: $videoOutputDir"
}

Write-Host ""
Write-Host "=========================================="
Write-Host "PIPELINE COMPLETE"
Write-Host "=========================================="
Write-Host "VO Directory: $voOutputDir"
Write-Host "Video Directory: $videoOutputDir"
