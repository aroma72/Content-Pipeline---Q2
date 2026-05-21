# Generate voiceover using Windows TTS (Free)

$outDir = "voiceover-windows-formal"
if (!(Test-Path $outDir)) { New-Item -ItemType Directory $outDir -Force | Out-Null }

$segments = @(
    @{ name = "01_opening"; text = "Hello. I imagine you have been exploring AI platforms like ChatGPT or Claude. But here is the distinction. Using AI is one skill. Building with AI is something entirely different. This course teaches you how to build." },
    @{ name = "02_problem"; text = "Think about your last week. How much time did you spend solving problems as they appeared? Responding to crises. Reacting. No time to actually construct anything lasting? That is the reality for most teams. They are stuck in a cycle of response. But some teams have figured something out. They do not respond to fires. They build systems that prevent fires from occurring in the first place. That is the difference. And that is what we teach here." },
    @{ name = "03_foundations"; text = "There are five essential components to building AI systems that actually function. Mental Models. First, you must understand how AI actually operates. Not how you assume it works, but what it genuinely does. Most people make the same mistake. They assume AI remembers. It does not. That is the first problem. Memory Architecture. So we correct that. We teach your AI to remember. We provide it with a system. A structured notebook. Something that maintains knowledge across conversations. Skills and Patterns. Then we enable your AI to perform real tasks. Not merely conversation. Actual action. Think of it as providing your AI with genuine capabilities. Real World Systems. We connect it to databases. To APIs. To actual tools. Your AI transforms from a chatbot into something genuinely useful. Advanced Patterns. Finally, we test thoroughly. We ensure the system is robust. Because delivering something broken is worse than delivering nothing." },
    @{ name = "04_journey"; text = "Here is how this progresses, week by week. Week one, you establish your foundation. Tools. Mindset. You transition from being a consumer to becoming a producer. That shift alone transforms everything. Weeks two and three, you build memory systems. You create the infrastructure that allows your AI to retain information accurately. You move beyond repetitive prompting. You are architecting something real. Weeks four and five, you integrate everything. Databases. APIs. Your AI transitions from being an experimental notebook project into a tool that performs actual work. Week six and beyond, you refine. You test rigorously. You iterate. You observe your system become more capable. And here is what is remarkable. By completion? You will not simply understand AI. You will know how to construct something that functions. Something that people genuinely need and use." },
    @{ name = "05_why_matters"; text = "Anyone can engage with AI now. That is no longer a valuable skill. That is simply conversation. But constructing an AI system that solves real problems? That scales properly? That continues working reliably? That is rare. That is valuable. That is what separates those building the future from everyone else." },
    @{ name = "06_closing"; text = "Everything we teach you here, we have built. Real projects. Real challenges. Real solutions. This is not theory. This is not hypothetical. You are not learning in isolation. You are learning what actually works in practice. So, are you ready?" }
)

Write-Host "Generating Voiceover using Windows TTS (Free)"
Write-Host ""

Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SelectVoiceByHints([System.Speech.Synthesis.VoiceGender]::Female)
$synth.Rate = -1

$successCount = 0

foreach ($segment in $segments) {
    $outputPath = Join-Path $outDir "$($segment.name).wav"
    Write-Host "  Generating: $($segment.name)..." -NoNewline

    $synth.SetOutputToWaveFile($outputPath)
    $synth.Speak($segment.text)

    if (Test-Path $outputPath) {
        $file = Get-Item $outputPath
        Write-Host " [OK]"
        $successCount++
    }
}

Write-Host ""
Write-Host "Generated $successCount voiceover segments"
