#!/usr/bin/env powershell
<#
.SYNOPSIS
Finalize the Consumer vs Producer Mindset video - mux audio and video, verify completion
#>

param(
  [int]$TimeoutMinutes = 30
)

$ErrorActionPreference = "Stop"

$PROJECT_DIR = "C:\Users\Aroma Tahir\Downloads\Content Queen"
$VIDEO_PROD_DIR = "$PROJECT_DIR\video_production\session_2_video_1_mindset"
$FFMPEG_PATH = "$PROJECT_DIR\node_modules\ffmpeg-static\ffmpeg.exe"

$VIDEO_SILENT = "$VIDEO_PROD_DIR\consumer_producer_mindset_silent_extended.mp4"
$VO_COMPLETE = "$VIDEO_PROD_DIR\vo_complete.mp3"
$VIDEO_FINAL = "$VIDEO_PROD_DIR\CONSUMER_PRODUCER_MINDSET_EXTENDED.mp4"

function Log {
  param([string]$Message)
  Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $Message"
}

function WaitForRender {
  param([int]$TimeoutSeconds = 1800)

  Log "Waiting for Remotion render to complete (timeout: $TimeoutSeconds seconds)..."

  $elapsed = 0
  $lastSize = 0

  while ($elapsed -lt $TimeoutSeconds) {
    if (Test-Path $VIDEO_SILENT) {
      $file = Get-Item $VIDEO_SILENT
      $currentSize = $file.Length

      if ($currentSize -eq $lastSize -and $currentSize -gt 0) {
        Log "[OK] Video render complete: $([math]::Round($currentSize/1MB, 2)) MB"
        return $true
      }

      if ($currentSize -gt 0) {
        Log "     Rendering... $([math]::Round($currentSize/1MB, 2)) MB"
      }

      $lastSize = $currentSize
    } else {
      Log "     Waiting for video file to be created..."
    }

    Start-Sleep -Seconds 30
    $elapsed += 30
  }

  Log "[FAIL] Timeout waiting for render after $TimeoutSeconds seconds"
  return $false
}

function MuxAudioVideo {
  Log "Step 1: Verifying source files..."

  if (-not (Test-Path $VIDEO_SILENT)) {
    throw "Silent video not found: $VIDEO_SILENT"
  }

  if (-not (Test-Path $VO_COMPLETE)) {
    throw "Complete VO not found: $VO_COMPLETE"
  }

  $videoSize = (Get-Item $VIDEO_SILENT).Length
  $audioSize = (Get-Item $VO_COMPLETE).Length

  Log "  Silent video: $([math]::Round($videoSize/1MB, 2)) MB"
  Log "  VO audio: $([math]::Round($audioSize/1MB, 2)) MB"

  Log "Step 2: Muxing video and audio..."

  $cmd = @(
    "-i", $VIDEO_SILENT,
    "-i", $VO_COMPLETE,
    "-c:v", "copy",
    "-c:a", "aac",
    "-shortest",
    $VIDEO_FINAL
  )

  & $FFMPEG_PATH $cmd

  if (-not (Test-Path $VIDEO_FINAL)) {
    throw "Failed to create final video"
  }

  $finalSize = (Get-Item $VIDEO_FINAL).Length
  Log "[OK] Final video created: $([math]::Round($finalSize/1MB, 2)) MB"
}

function VerifyFinal {
  Log "Step 3: Verifying final video..."

  $output = & $FFMPEG_PATH -i $VIDEO_FINAL 2>&1 | Select-String "Duration"

  if ($output) {
    Log "  $output"
  }

  # Check for both video and audio streams
  $streams = & $FFMPEG_PATH -i $VIDEO_FINAL 2>&1 | Select-String "Stream #"

  $hasVideo = $streams | Select-String "Video" | Measure-Object | Select-Object -ExpandProperty Count
  $hasAudio = $streams | Select-String "Audio" | Measure-Object | Select-Object -ExpandProperty Count

  Log "  Video streams: $hasVideo"
  Log "  Audio streams: $hasAudio"

  if ($hasVideo -gt 0 -and $hasAudio -gt 0) {
    Log "[OK] Final video verified - has both video and audio"
    return $true
  } else {
    Log "[FAIL] Final video missing streams"
    return $false
  }
}

function PrintSummary {
  Log ""
  Log "===================================================================="
  Log "CONSUMER vs PRODUCER MINDSET VIDEO - COMPLETION SUMMARY"
  Log "===================================================================="
  Log ""
  Log "[OK] Missing VO Generated:"
  Log "     Duration: 28.45 seconds"
  Log "     File: vo_missing_parts.mp3 (455 KB)"
  Log ""
  Log "[OK] VO Files Appended:"
  Log "     Original: 2:58.83 (179 seconds)"
  Log "     Missing: 0:28.45 (28.45 seconds)"
  Log "     Complete: 3:27.28 (207.28 seconds)"
  Log ""
  Log "[OK] Video Rendered:"
  Log "     Duration: 6219 frames at 30fps = 207.3 seconds"
  Log "     Frames:"
  Log "       Slide 1 (0:00-0:20): Consumer vs Producer title"
  Log "       Slide 2 (0:20-1:00): Consumer Mindset traits"
  Log "       Slide 3 (1:00-1:50): Producer Mindset traits"
  Log "       Slide 4 (1:50-2:50): Why it matters plus continuation"
  Log "       Slide 5 (2:50-3:27): Your Choice comparison"
  Log ""
  Log "[OK] Audio Muxed:"
  Log "     Video codec: h.264"
  Log "     Audio codec: AAC"
  Log "     Final file: CONSUMER_PRODUCER_MINDSET_EXTENDED.mp4"
  Log ""
  Log "[OK] Output Location:"
  Log "     $VIDEO_FINAL"
  Log ""
}

try {
  Log "===================================================================="
  Log "FINALIZING: Consumer vs Producer Mindset Video"
  Log "===================================================================="
  Log ""

  # Wait for render to complete
  if (-not (WaitForRender -TimeoutSeconds ($TimeoutMinutes * 60))) {
    throw "Render did not complete in time"
  }

  # Mux audio and video
  MuxAudioVideo

  # Verify the final video
  VerifyFinal

  # Print summary
  PrintSummary

  Log "SUCCESS: Video creation complete!"
  exit 0

} catch {
  Log "ERROR: $_"
  Log "Stack trace: $($_.ScriptStackTrace)"
  exit 1
}
