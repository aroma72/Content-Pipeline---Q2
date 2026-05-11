# Master Blender Rendering Script
# Renders all 3D animations for Systems Evaluations videos

param(
    [string]$BlenderExe = "C:\Users\Aroma Tahir\Downloads\Content Queen\blender\Blender\blender.exe",
    [switch]$Sequential = $false
)

# Blender scripts to render
$scripts = @(
    @{
        Name = "MEASURE Framework 3D"
        Script = "C:\Users\Aroma Tahir\Downloads\Content Queen\blender\measure_framework_3d.py"
        Output = "C:\Users\Aroma Tahir\Downloads\Content Queen\video_production\blender_renders\measure_framework.mp4"
    },
    @{
        Name = "Bias Visualization 3D"
        Script = "C:\Users\Aroma Tahir\Downloads\Content Queen\blender\bias_visualization_3d.py"
        Output = "C:\Users\Aroma Tahir\Downloads\Content Queen\video_production\blender_renders\bias_visualization.mp4"
    },
    @{
        Name = "Data Visualization 3D"
        Script = "C:\Users\Aroma Tahir\Downloads\Content Queen\blender\data_visualization_3d.py"
        Output = "C:\Users\Aroma Tahir\Downloads\Content Queen\video_production\blender_renders\data_visualization.mp4"
    }
)

# Verify Blender exists
if (-not (Test-Path $BlenderExe)) {
    Write-Host "❌ Blender not found at: $BlenderExe"
    exit 1
}

Write-Host "🎬 Starting Blender 3D Rendering"
Write-Host "   Blender: $BlenderExe`n"

# Create output directory
$outputDir = "C:\Users\Aroma Tahir\Downloads\Content Queen\video_production\blender_renders"
New-Item -ItemType Directory -Path $outputDir -Force -ErrorAction SilentlyContinue | Out-Null

# Render each script
$scriptCount = $scripts.Count
$startTime = Get-Date

foreach ($idx, $item in $scripts | ForEach-Object { $_ } {
    $num = [array]::IndexOf($scripts, $item) + 1

    Write-Host "[$num/$scriptCount] Rendering: $($item.Name)"
    Write-Host "   Script: $($item.Script)"
    Write-Host "   Output: $($item.Output)"

    # Render with Blender
    $process = Start-Process -FilePath $BlenderExe `
        -ArgumentList "-b -P `"$($item.Script)`" --render-anim" `
        -PassThru -Wait -NoNewWindow

    if ($process.ExitCode -eq 0) {
        if (Test-Path $item.Output) {
            $size = [math]::Round((Get-Item $item.Output).Length/1MB, 2)
            Write-Host "   ✅ Complete: $size MB`n"
        } else {
            Write-Host "   ⚠️  File not created yet (rendering in progress)`n"
        }
    } else {
        Write-Host "   ❌ Render failed (exit code: $($process.ExitCode))`n"
    }
}

$endTime = Get-Date
$duration = ($endTime - $startTime).TotalSeconds

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host "✅ All renders complete!"
Write-Host "   Total time: $([math]::Round($duration, 2))s"
Write-Host "   Output directory: $outputDir"
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# List output files
Write-Host "`n📁 Generated videos:"
Get-ChildItem $outputDir -Filter "*.mp4" 2>$null | ForEach-Object {
    $size = [math]::Round($_.Length/1MB, 2)
    Write-Host "   • $($_.Name) ($size MB)"
}
