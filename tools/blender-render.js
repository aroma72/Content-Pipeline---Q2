#!/usr/bin/env node

/**
 * Blender Render Automation
 * Renders Blender scenes and integrates output into Remotion
 * Usage: node tools/blender-render.js <script_name> [--output <path>]
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

class BlenderRenderer {
  static checkBlender() {
    try {
      const version = execSync("blender --version", { encoding: "utf-8" });
      console.log(`✅ Blender found: ${version.split("\n")[0]}`);
      return true;
    } catch (error) {
      console.error(
        "❌ Blender not found. Install from: https://www.blender.org/download/"
      );
      return false;
    }
  }

  static renderScene(scriptPath, outputPath) {
    if (!fs.existsSync(scriptPath)) {
      throw new Error(`Script not found: ${scriptPath}`);
    }

    const command = `blender -b -P "${scriptPath}" -- --render-anim`;

    console.log(`\n🎬 Rendering Blender scene...`);
    console.log(`📁 Script: ${scriptPath}`);
    console.log(`💾 Output: ${outputPath}\n`);

    try {
      execSync(command, { stdio: "inherit" });
      console.log(`\n✅ Render complete: ${outputPath}`);
      return true;
    } catch (error) {
      console.error(`\n❌ Render failed: ${error.message}`);
      return false;
    }
  }

  static getSceneInfo(scriptPath) {
    // Parse Blender script to get metadata
    const content = fs.readFileSync(scriptPath, "utf-8");

    const frameMatch = content.match(/scene\.frame_end = (\d+)/);
    const fpsMatch = content.match(/scene\.render\.fps = (\d+)/);
    const nameMatch = content.match(/# (.*?)(?:\n|$)/);

    return {
      name: nameMatch ? nameMatch[1] : "Unknown",
      frames: frameMatch ? parseInt(frameMatch[1]) : 0,
      fps: fpsMatch ? parseInt(fpsMatch[1]) : 30,
      duration: frameMatch && fpsMatch ? parseInt(frameMatch[1]) / parseInt(fpsMatch[1]) : 0,
    };
  }
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("Usage: node tools/blender-render.js <script_name> [options]\n");
    console.log("Options:");
    console.log("  --list              List available Blender scripts");
    console.log("  --info <script>     Show script metadata");
    console.log("\nExample:");
    console.log('  node tools/blender-render.js "measure_framework_3d.py"');
    process.exit(1);
  }

  if (!BlenderRenderer.checkBlender()) {
    process.exit(1);
  }

  const command = args[0];

  if (command === "--list") {
    const blenderDir = "./blender";
    if (fs.existsSync(blenderDir)) {
      const scripts = fs.readdirSync(blenderDir).filter((f) => f.endsWith(".py"));
      console.log("\n📜 Available Blender scripts:\n");
      scripts.forEach((script) => {
        console.log(`  • ${script}`);
      });
      console.log();
    }
    return;
  }

  if (command === "--info" && args[1]) {
    const scriptPath = path.join("./blender", args[1]);
    const info = BlenderRenderer.getSceneInfo(scriptPath);
    console.log(`\n📊 Scene Info: ${info.name}`);
    console.log(`   Frames: ${info.frames}`);
    console.log(`   FPS: ${info.fps}`);
    console.log(`   Duration: ${info.duration.toFixed(2)}s\n`);
    return;
  }

  // Render scene
  const scriptPath = path.join("./blender", command);
  const outputPath = path.join(
    "./video_production/blender_renders",
    command.replace(".py", ".mp4")
  );

  try {
    BlenderRenderer.renderScene(scriptPath, outputPath);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
