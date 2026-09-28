# Mix voiceovers with Autonomous Systems videos

$ffmpeg = "C:\Users\Aroma Tahir\Downloads\Content Queen\drawing-room-video\drawing-room-remotion\node_modules\@remotion\compositor-win32-x64-msvc\ffmpeg.exe"
$videoDir = "C:\Users\Aroma Tahir\Downloads\Content Queen\output"
$voDir = "C:\Users\Aroma Tahir\Downloads\Content Queen\voiceovers\autonomous_systems"
$tempDir = "C:\Users\Aroma Tahir\Downloads\Content Queen\temp_audio"

New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

if (-not (Test-Path $ffmpeg)) {
    Write-Host "ERROR: ffmpeg not found at $ffmpeg"
    exit 1
}

Write-Host "=========================================="
Write-Host "MIXING VOICEOVERS WITH VIDEOS"
Write-Host "=========================================="
Write-Host ""

# Define parts with their scenes and durations
$parts = @(
    @{
        name = "Part 2"
        video = "$videoDir\autonomous_systems_part_2.mp4"
        output = "$videoDir\autonomous_systems_part_2_with_vo.mp4"
        scenes = @(
            @{ id = 'part2_scene1'; duration = 13 },
            @{ id = 'part2_scene2'; duration = 18 },
            @{ id = 'part2_scene3'; duration = 13 },
            @{ id = 'part2_scene4'; duration = 16 }
        )
    },
    @{
        name = "Part 3"
        video = "$videoDir\autonomous_systems_part_3.mp4"
        output = "$videoDir\autonomous_systems_part_3_with_vo.mp4"
        scenes = @(
            @{ id = 'part3_scene1'; duration = 13 },
            @{ id = 'part3_scene2'; duration = 13 },
            @{ id = 'part3_scene3'; duration = 13 },
            @{ id = 'part3_scene4'; duration = 11 },
            @{ id = 'part3_scene5'; duration = 15 }
        )
    },
    @{
        name = "Part 4"
        video = "$videoDir\autonomous_systems_part_4.mp4"
        output = "$videoDir\autonomous_systems_part_4_with_vo.mp4"
        scenes = @(
            @{ id = 'part4_scene1'; duration = 13 },
            @{ id = 'part4_scene2'; duration = 13 },
            @{ id = 'part4_scene3'; duration = 13 },
            @{ id = 'part4_scene4'; duration = 13 },
            @{ id = 'part4_scene5'; duration = 8 }
        )
    }
)

foreach ($part in $parts) {
    Write-Host "Processing $($part.name)..."
    Write-Host "  Video: $($part.video)"

    if (-not (Test-Path $part.video)) {
        Write-Host "  ERROR: Video file not found"
        continue
    }

    # Create concat file for audio
    $concatFile = "$tempDir\$($part.name.Replace(' ', '_'))_concat.txt"
    $audioList = @()

    foreach ($scene in $part.scenes) {
        $scenePath = "$voDir\$($scene.id).mp3"
        if (Test-Path $scenePath) {
            $audioList += "file '$scenePath'"
        }
    }

    $audioList | Out-File -Encoding ASCII $concatFile

    # Concatenate audio files
    $combinedAudio = "$tempDir\$($part.name.Replace(' ', '_'))_combined.wav"
    Write-Host "  Concatenating audio..."

    & $ffmpeg -f concat -safe 0 -i $concatFile -c:a pcm_s16le -q:a 9 $combinedAudio -y 2>&1 | Out-Null

    if (-not (Test-Path $combinedAudio)) {
        Write-Host "  ERROR: Audio concatenation failed"
        continue
    }

    # Mix audio with video
    Write-Host "  Mixing with video..."
    $finalVideo = $part.output

    & $ffmpeg -i $part.video -i $combinedAudio -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 $finalVideo -y 2>&1 | Out-Null

    if (Test-Path $finalVideo) {
        $fileSize = (Get-Item $finalVideo).Length / 1MB
        Write-Host "  SUCCESS: $($part.name) with voiceover created"
        Write-Host "  Output: $finalVideo"
        Write-Host "  Size: $([Math]::Round($fileSize, 2)) MB"
    } else {
        Write-Host "  ERROR: Video mixing failed"
    }

    Write-Host ""
}

Write-Host "=========================================="
Write-Host "MIXING COMPLETE"
Write-Host "=========================================="
Write-Host ""
Write-Host "Final videos with voiceovers:"
foreach ($part in $parts) {
    if (Test-Path $part.output) {
        $fileSize = (Get-Item $part.output).Length / 1MB
        Write-Host "  [OK] $($part.name)"
        Write-Host "       $($part.output)"
        Write-Host "       Size: $([Math]::Round($fileSize, 2)) MB"
    }
}

Write-Host ""
Write-Host "Cleaning up temp files..."
Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "Done!"
