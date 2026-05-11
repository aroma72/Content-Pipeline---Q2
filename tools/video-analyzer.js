#!/usr/bin/env node

/**
 * Video Analyzer - Extract metadata and frames from video files
 * Requires: ffmpeg installed
 * Usage: node tools/video-analyzer.js "path/to/video.mp4"
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

class VideoAnalyzer {
  static checkFFmpeg() {
    try {
      execSync("ffmpeg -version", { stdio: "ignore" });
      return true;
    } catch {
      console.error(
        "❌ ffmpeg not found. Install ffmpeg to use this tool.\n"
      );
      console.error("Install via:");
      console.error("  Windows: choco install ffmpeg (requires Chocolatey)");
      console.error("  macOS: brew install ffmpeg");
      console.error("  Linux: sudo apt-get install ffmpeg");
      return false;
    }
  }

  static getVideoMetadata(videoPath) {
    try {
      const command = `ffmpeg -v error -select_streams v:0 -show_entries format=duration -show_entries stream=width,height,r_frame_rate -of default=noprint_wrappers=1 "${videoPath}"`;
      const output = execSync(command, { encoding: "utf-8" });

      const lines = output.split("\n");
      const metadata = {};

      lines.forEach((line) => {
        const [key, value] = line.split("=");
        if (key && value) {
          metadata[key.trim()] = value.trim();
        }
      });

      return {
        filepath: videoPath,
        filename: path.basename(videoPath),
        duration: parseFloat(metadata.duration) || "unknown",
        width: metadata.width || "unknown",
        height: metadata.height || "unknown",
        frameRate: metadata.r_frame_rate || "unknown",
        fileSize: (fs.statSync(videoPath).size / 1024 / 1024).toFixed(2) + " MB",
      };
    } catch (error) {
      throw new Error(`Failed to extract metadata: ${error.message}`);
    }
  }

  static extractFrames(videoPath, outputDir, count = 6) {
    try {
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const metadata = this.getVideoMetadata(videoPath);
      const duration = parseFloat(metadata.duration);

      if (isNaN(duration)) {
        throw new Error("Could not determine video duration");
      }

      const interval = duration / (count - 1);
      console.log(
        `\n📸 Extracting ${count} frames from ${metadata.filename}...\n`
      );

      for (let i = 0; i < count; i++) {
        const time = (i * interval).toFixed(2);
        const outputPath = path.join(
          outputDir,
          `frame-${i + 1}-${time}s.jpg`
        );

        const command = `ffmpeg -ss ${time} -i "${videoPath}" -vf "scale=320:-1" -vframes 1 "${outputPath}" -y`;
        execSync(command, { stdio: "ignore" });

        console.log(`  ✓ Frame ${i + 1}/${count} at ${time}s`);
      }

      console.log(`\n✅ Frames extracted to: ${outputDir}\n`);
      return outputDir;
    } catch (error) {
      throw new Error(`Frame extraction failed: ${error.message}`);
    }
  }

  static getColorPalette(videoPath) {
    try {
      const command = `ffmpeg -i "${videoPath}" -vf "scale=64:64,palettegen" -y /tmp/palette.png 2>/dev/null && ffmpeg -i "${videoPath}" -i /tmp/palette.png -lavfi "scale=64:64[x];[x][1:v]paletteuse=alpha_threshold=128" -y /tmp/dominant_colors.png 2>/dev/null`;
      execSync(command, { stdio: "ignore" });
      return "Color palette analysis requires additional image processing";
    } catch {
      return "Color palette analysis requires ImageMagick";
    }
  }
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("Usage: node tools/video-analyzer.js <video_file> [options]\n");
    console.log("Options:");
    console.log("  --frames N       Extract N frames (default: 6)");
    console.log("  --output DIR     Save frames to DIR (default: ./frames)");
    console.log("\nExample:");
    console.log('  node tools/video-analyzer.js "video.mp4" --frames 12');
    process.exit(1);
  }

  if (!VideoAnalyzer.checkFFmpeg()) {
    process.exit(1);
  }

  const videoPath = args[0];

  if (!fs.existsSync(videoPath)) {
    console.error(`❌ File not found: ${videoPath}`);
    process.exit(1);
  }

  try {
    console.log("\n📹 VIDEO ANALYZER\n");
    const metadata = VideoAnalyzer.getVideoMetadata(videoPath);

    console.log("━".repeat(60));
    console.log("📊 METADATA");
    console.log("━".repeat(60));
    Object.entries(metadata).forEach(([key, value]) => {
      console.log(`${key.padEnd(15)}: ${value}`);
    });
    console.log("━".repeat(60));

    // Parse options
    let frameCount = 6;
    let outputDir = "./frames";

    for (let i = 1; i < args.length; i++) {
      if (args[i] === "--frames" && args[i + 1]) {
        frameCount = parseInt(args[i + 1]);
        i++;
      }
      if (args[i] === "--output" && args[i + 1]) {
        outputDir = args[i + 1];
        i++;
      }
    }

    VideoAnalyzer.extractFrames(videoPath, outputDir, frameCount);
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}\n`);
    process.exit(1);
  }
}

main();
