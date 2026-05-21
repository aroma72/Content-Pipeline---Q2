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
  const version = execSync('npm ls remotion', { cwd: REMOTION_DIR }).toString();
  if (version.includes('remotion')) {
    console.log('   ✓ Remotion is installed locally');
  }
} catch (e) {
  console.log('   ✗ Remotion installation check failed');
}

console.log('\n2. Listing available compositions...');
try {
  const result = execSync('npx remotion compositions', { cwd: REMOTION_DIR }).toString();
  const lines = result.split('\n');
  const courseOverviewComps = lines.filter(l => l.includes('CourseOverview'));

  if (courseOverviewComps.length > 0) {
    console.log(`   ✓ Found ${courseOverviewComps.length} CourseOverview compositions`);
    courseOverviewComps.slice(0, 3).forEach(comp => console.log(`     - ${comp.trim()}`));
    if (courseOverviewComps.length > 3) {
      console.log(`     ... and ${courseOverviewComps.length - 3} more`);
    }
  } else {
    console.log('   ✗ No CourseOverview compositions found');
    console.log('   Please verify Root.tsx was updated with segment imports');
    process.exit(1);
  }
} catch (e) {
  console.log(`   ✗ Error: ${e.message}`);
}

console.log('\n3. Testing single segment render (Segment 1A)...');
console.log('   (This may take 1-3 minutes depending on system performance)...\n');

try {
  const testOutput = path.join(OUT_DIR, 'test_segment_1a.mp4');
  const cmd = `npx remotion render CourseOverview-1A-EntryDiscovery "${testOutput}" --concurrency 4`;

  execSync(cmd, { cwd: REMOTION_DIR, stdio: 'inherit' });

  if (fs.existsSync(testOutput)) {
    const stats = fs.statSync(testOutput);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`\n   ✓ Test render successful!`);
    console.log(`   📁 Output: ${testOutput}`);
    console.log(`   📊 File size: ${sizeMB} MB`);
    console.log(`   ⏱️  Duration: 8 seconds @ 30fps = 240 frames`);

    console.log('\n✅ SMOKE TEST PASSED!\n');
    console.log('The rendering pipeline is working correctly.');
    console.log('You can now run the full render:\n');
    console.log('   node render-course-overview-video.js\n');
  } else {
    console.log('   ✗ Test render completed but no output file was created');
    process.exit(1);
  }
} catch (error) {
  console.log(`\n   ✗ Test render failed: ${error.message}`);
  console.log('\n   Troubleshooting:');
  console.log('   - Make sure all segment files exist in drawing-room-video/drawing-room-remotion/src/segments/');
  console.log('   - Verify Root.tsx has segment imports');
  console.log('   - Check for TypeScript compilation errors');
  process.exit(1);
}
