#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SEGMENTS = [
  { id: 'CourseOverview-1A-EntryDiscovery', name: '1A_entry_discovery', file: '1A_entry_discovery.mp4' },
  { id: 'CourseOverview-1B-TheQuestion', name: '1B_the_question', file: '1B_the_question.mp4' },
  { id: 'CourseOverview-2A-FirefightingChaos', name: '2A_firefighting_chaos', file: '2A_firefighting_chaos.mp4' },
  { id: 'CourseOverview-2B-CalmSystems', name: '2B_calm_systems', file: '2B_calm_systems.mp4' },
  { id: 'CourseOverview-3A-MentalModels', name: '3A_mental_models', file: '3A_mental_models.mp4' },
  { id: 'CourseOverview-3B-MemoryArchitecture', name: '3B_memory_architecture', file: '3B_memory_architecture.mp4' },
  { id: 'CourseOverview-3C-SkillsSuperpowers', name: '3C_skills_superpowers', file: '3C_skills_superpowers.mp4' },
  { id: 'CourseOverview-3D-RealWorldSystems', name: '3D_real_world_systems', file: '3D_real_world_systems.mp4' },
  { id: 'CourseOverview-4A-Week1Foundation', name: '4A_week1_foundation', file: '4A_week1_foundation.mp4' },
  { id: 'CourseOverview-4B-Week23Building', name: '4B_week23_building', file: '4B_week23_building.mp4' },
  { id: 'CourseOverview-4C-Week45Integration', name: '4C_week45_integration', file: '4C_week45_integration.mp4' },
  { id: 'CourseOverview-4D-Week6Mastery', name: '4D_week6_mastery', file: '4D_week6_mastery.mp4' },
  { id: 'CourseOverview-5A-TheRarity', name: '5A_the_rarity', file: '5A_the_rarity.mp4' },
  { id: 'CourseOverview-5B-TheValue', name: '5B_the_value', file: '5B_the_value.mp4' },
  { id: 'CourseOverview-6A-Recognition', name: '6A_recognition', file: '6A_recognition.mp4' },
  { id: 'CourseOverview-6B-Invitation', name: '6B_invitation', file: '6B_invitation.mp4' },
];

const OUT_DIR = path.join(__dirname, 'course-overview-video-output');
const REMOTION_DIR = path.join(__dirname, 'drawing-room-video', 'drawing-room-remotion');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function renderSegment(segment, index, total) {
  console.log(`\n[${index}/${total}] Rendering: ${segment.name}...`);

  try {
    const outputPath = path.join(OUT_DIR, segment.file);

    // Use remotion render command from the Remotion project
    const cmd = `cd "${REMOTION_DIR}" && npx remotion render "${segment.id}" "${outputPath}"`;

    execSync(cmd, { stdio: 'inherit' });

    if (!fs.existsSync(outputPath)) {
      throw new Error(`Failed to generate video: ${outputPath}`);
    }

    console.log(`✓ Rendered: ${segment.file}`);
    return true;
  } catch (error) {
    console.error(`✗ Error rendering ${segment.name}: ${error.message}`);
    return false;
  }
}

async function combineSegments() {
  console.log('\n🎬 Combining all segments into final video...');

  // Create concat file for ffmpeg
  const concatFile = path.join(OUT_DIR, 'concat.txt');
  const concatContent = SEGMENTS
    .map(seg => `file '${seg.file}'`)
    .join('\n');

  fs.writeFileSync(concatFile, concatContent);

  const finalOutput = path.join(__dirname, 'course-overview-final-animated.mp4');

  try {
    const cmd = `ffmpeg -f concat -safe 0 -i "${concatFile}" -c copy "${finalOutput}"`;
    execSync(cmd, { stdio: 'inherit' });
    console.log(`✓ Final video created: ${finalOutput}`);
    return finalOutput;
  } catch (error) {
    console.error(`✗ Error combining segments: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('\n🎨 RENDERING COURSE OVERVIEW VIDEO');
  console.log('School of Life Aesthetic - 12 Animated Segments\n');

  let successCount = 0;

  // Render all segments
  for (let i = 0; i < SEGMENTS.length; i++) {
    const success = await renderSegment(SEGMENTS[i], i + 1, SEGMENTS.length);
    if (success) successCount++;
  }

  console.log(`\n✓ Rendered ${successCount}/${SEGMENTS.length} segments`);

  if (successCount === SEGMENTS.length) {
    const finalVideo = await combineSegments();

    if (finalVideo) {
      console.log('\n✅ SUCCESS! Course overview video is ready!');
      console.log(`📁 Output: ${finalVideo}`);
      console.log('\nNext steps:');
      console.log('1. Add voiceover: mux with voiceover audio once available');
      console.log('2. Add titles and branding');
      console.log('3. Upload to Taleemabad LMS');
    }
  } else {
    console.log(`\n⚠️  Warning: ${SEGMENTS.length - successCount} segments failed to render`);
    console.log('Check errors above and try re-rendering failed segments');
  }
}

main().catch(console.error);
