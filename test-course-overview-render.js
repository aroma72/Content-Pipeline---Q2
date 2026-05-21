#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REMOTION_DIR = path.join(__dirname, 'drawing-room-video', 'drawing-room-remotion');
const OUT_DIR = path.join(__dirname, 'course-overview-test-output');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

console.log('\n🧪 SMOKE TEST - Course Overview Rendering\n');

console.log('1. Checking Remotion installation...');
try {
  const version = execSync('npx remotion --version', { cwd: REMOTION_DIR }).toString().trim();
  console.log(`   ✓ Remotion ${version} installed`);
} catch (e) {
  console.log('   ✗ Remotion not found. Install with: npm install -g remotion');
  process.exit(1);
}

console.log('\n2. Checking composition availability...');
try {
  const comps = execSync('npx remotion compositions', { cwd: REMOTION_DIR }).toString();
  if (comps.includes('CourseOverview_1A_EntryDiscovery')) {
    console.log('   ✓ CourseOverview compositions found');
  } else {
    console.log('   ✗ CourseOverview compositions NOT found in Root.tsx');
    console.log('   Try: npx remotion compositions');
    process.exit(1);
  }
} catch (e) {
  console.log('   ✗ Error listing compositions:', e.message);
  process.exit(1);
}

console.log('\n3. Testing single segment render (Segment 1A - Entry Discovery)...');
try {
  const testOutput = path.join(OUT_DIR, 'test_segment_1a.mp4');
  console.log(`   Rendering to: ${testOutput}`);
  console.log('   (This may take 1-3 minutes depending on system performance)...\n');

  execSync(
    `npx remotion render CourseOverview_1A_EntryDiscovery "${testOutput}"`,
    { cwd: REMOTION_DIR, stdio: 'inherit' }
  );

  if (fs.existsSync(testOutput)) {
    const stats = fs.statSync(testOutput);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`\n   ✓ Test render successful!`);
    console.log(`   📁 Output: ${testOutput}`);
    console.log(`   📊 File size: ${sizeMB} MB`);
    console.log(`   ⏱️  Duration: 8 seconds @ 30fps = 240 frames`);
  } else {
    console.log('   ✗ Test render failed - no output file');
    process.exit(1);
  }
} catch (error) {
  console.log(`\n   ✗ Test render failed: ${error.message}`);
  console.log('\n   Troubleshooting:');
  console.log('   - Check that all segment components exist in src/segments/');
  console.log('   - Verify Root.tsx was updated with segment imports');
  console.log('   - Try: cd drawing-room-video/drawing-room-remotion && npm install');
  process.exit(1);
}

console.log('\n4. Checking ffmpeg for concatenation...');
try {
  const version = execSync('ffmpeg -version').toString().split('\n')[0];
  console.log(`   ✓ ${version}`);
} catch (e) {
  console.log('   ⚠️  ffmpeg not found. Install with: choco install ffmpeg');
  console.log('   (Needed for combining segments into final video)');
}

console.log('\n✅ SMOKE TEST PASSED!\n');
console.log('Ready to render full course overview video.');
console.log('Run: node render-course-overview-video.js\n');
