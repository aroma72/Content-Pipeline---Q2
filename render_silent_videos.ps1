# Render Autonomous Systems Videos 2, 3, 4 (Silent - VO to be added later)

Write-Host "=========================================="
Write-Host "AUTONOMOUS SYSTEMS VIDEO RENDERING"
Write-Host "Videos 2, 3, 4 (Silent Tracks)"
Write-Host "=========================================="

$remotionDir = "C:\Users\Aroma Tahir\Downloads\Content Queen\drawing-room-video\drawing-room-remotion"
$outputDir = "C:\Users\Aroma Tahir\Downloads\Content Queen\output"

New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

if (-not (Test-Path $remotionDir)) {
    Write-Host "ERROR: Remotion directory not found at $remotionDir"
    exit 1
}

Push-Location $remotionDir

Write-Host ""
Write-Host "Checking dependencies..."

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing npm dependencies..."
    npm install --legacy-peer-deps
}

Write-Host ""
Write-Host "=========================================="
Write-Host "RENDERING VIDEOS"
Write-Host "=========================================="

$videos = @(
    @{
        component = "AutonomousSystemsPart2"
        output = "$outputDir\autonomous_systems_part_2.mp4"
        part = "Part 2 (Testing vs Evaluation)"
    },
    @{
        component = "AutonomousSystemsPart3"
        output = "$outputDir\autonomous_systems_part_3.mp4"
        part = "Part 3 (Four Methods)"
    },
    @{
        component = "AutonomousSystemsPart4"
        output = "$outputDir\autonomous_systems_part_4.mp4"
        part = "Part 4 (Building Systems)"
    }
)

$startTime = Get-Date

foreach ($video in $videos) {
    Write-Host ""
    Write-Host "Rendering $($video.part)..."
    Write-Host "  Component: $($video.component)"
    Write-Host "  Output: $($video.output)"
    Write-Host "  Starting: $(Get-Date -Format 'HH:mm:ss')"

    try {
        # Render with concurrency=4 for faster processing
        & npx remotion render $video.component --concurrency=4 --timeout=600 $video.output 2>&1

        if (Test-Path $video.output) {
            $fileSize = (Get-Item $video.output).Length / 1MB
            $duration = (Get-Item $video.output | % { $_.LastWriteTime })
            Write-Host "  Status: SUCCESS ($([Math]::Round($fileSize,2)) MB)"
            Write-Host "  Completed: $(Get-Date -Format 'HH:mm:ss')"
        } else {
            Write-Host "  Status: FAILED - Output file not created"
        }
    } catch {
        Write-Host "  Status: ERROR - $($_.Exception.Message)"
    }
}

Pop-Location

$endTime = Get-Date
$duration = $endTime - $startTime

Write-Host ""
Write-Host "=========================================="
Write-Host "RENDERING COMPLETE"
Write-Host "=========================================="
Write-Host "Total time: $($duration.Minutes)m $($duration.Seconds)s"
Write-Host ""
Write-Host "Output videos:"
foreach ($video in $videos) {
    if (Test-Path $video.output) {
        Write-Host "  [OK] $($video.part)"
        Write-Host "       $($video.output)"
    }
}
Write-Host ""
Write-Host "Next step: Add voiceovers to these video files"
Write-Host "Voiceover directory: C:\Users\Aroma Tahir\Downloads\Content Queen\voiceovers\autonomous_systems"
