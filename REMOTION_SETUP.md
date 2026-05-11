# Remotion Setup Guide for Drawing Room Video Production

## Quick Start (10 minutes)

### Step 1: Create Remotion Project

Run this command in your terminal (any directory, not in Content Queen):

```bash
npx create-remotion@latest drawing-room-video
cd drawing-room-video
npm install
```

This creates a new Remotion project with a dev server.

### Step 2: Start Dev Server

```bash
npm run dev
```

You'll see:
```
Remote development server started at http://localhost:3000
```

**Keep this running in a terminal.** Open http://localhost:3000 in your browser—you'll see the Remotion studio.

### Step 3: Configure Content Queen

Point Content Queen to your Remotion project. Update `config.py`:

```python
REMOTION_PROJECT_DIR = "/path/to/drawing-room-video"
```

Replace `/path/to/` with the actual path where you ran `npx create-remotion@latest`.

### Step 4: Run Video Generation

```bash
python run_video_production.py \
  --script-path "c:\Users\Aroma Tahir\Downloads\Content Queen\video_scripts\systems_evaluations_video_1.md" \
  --series-title "Systems Evaluations" \
  --production-id "systems_eval_test_1" \
  --orchestrator remotion
```

The system will:
1. Parse the script
2. Generate React composition code (Claude)
3. Register compositions in Remotion
4. Render to MP4
5. Show review checkpoints for approval

---

## File Structure After Setup

```
drawing-room-video/          ← Your Remotion project
├── src/
│   ├── Root.tsx            ← Compositions registered here
│   ├── compositions/       ← Composition files
│   └── styles/
├── package.json
└── node_modules/

c:\Users\Aroma Tahir\
└── Downloads\
    └── Content Queen\
        ├── video_scripts\
        │   └── systems_evaluations_video_1.md  ← Script we created
        ├── video_production\
        │   └── systems_eval_test_1\           ← Output directory (created during run)
        │       ├── remotion_output\
        │       │   └── video_1.mp4              ← Final video!
        │       ├── state.json
        │       ├── decisions.log
        │       └── review_queue\
        └── config.py                            ← Update with REMOTION_PROJECT_DIR
```

---

## How It Works (Behind the Scenes)

### 1. Parse Script
The orchestrator reads `systems_evaluations_video_1.md` and extracts:
- Scene 1.1: Hook (narration: "You just built...")
- Scene 1.2: Problem (narration: "Let me tell you...")
- Scene 1.3: Testing vs Evaluation (narration: "Let's be crystal...")
- ... and so on

### 2. Generate React Code
Claude (Sonnet) receives:
```
Scene 1.1 - Hook
Visual: B-roll of AI agent working
Narration: "You just built an AI agent..."
Duration: ~30 seconds

Please generate a Remotion React component that:
- Shows the AI agent B-roll animations
- Syncs narration timing (text overlay)
- Includes fade-in/fade-out transitions
- Targets 1920x1080 @ 30fps
```

Claude responds with React/TypeScript:
```tsx
export const Scene_1_1: React.FC<{ duration: number }> = ({ duration }) => {
  const fps = 30;
  const durationFrames = duration * fps;
  
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Sequence from={0} durationInFrames={durationFrames * 0.3}>
        <AIAgentAnimation />
      </Sequence>
      <Sequence from={durationFrames * 0.2} durationInFrames={durationFrames * 0.8}>
        <Narration text="You just built an AI agent..." />
      </Sequence>
    </AbsoluteFill>
  );
};
```

### 3. Register in Remotion
The code is added to `src/Root.tsx`:
```tsx
export const Root: React.FC = () => {
  return (
    <>
      <Composition id="Scene_1_1" component={Scene_1_1} {...} />
      <Composition id="Scene_1_2" component={Scene_1_2} {...} />
      {/* ... more scenes ... */}
    </>
  );
};
```

### 4. Render Video
Remotion command runs locally:
```bash
npx remotion render src/Root.tsx Scene_1_1 output/video_1_1.mp4 \
  --fps 30 --width 1920 --height 1080
```

Output: `video_1_1.mp4` (professional 1920×1080 video)

### 5. Combine Scenes
All scenes are stitched together:
```
Scene 1.1 (0:00-0:30)
+ Scene 1.2 (0:30-2:00)
+ Scene 1.3 (2:00-5:00)
+ Scene 1.4 (5:00-8:00)
+ Scene 1.5 (8:00-10:00)
+ Scene 1.6 (10:00-12:00)
= Final video_1.mp4 (~12 min)
```

### 6. Review Checkpoints
After rendering completes, you see:
```
╔══════════════════════════════════════════════════════════╗
║   REVIEW CHECKPOINT: REMOTION_RENDER                     ║
╠══════════════════════════════════════════════════════════╣
║  Quality Score: 0.87 / 1.00   ✓ PASS (threshold 0.85)  ║
║  Scenes completed: 6/6                                   ║
║  Issues found:                                           ║
║    - Scene 1.3: Animation timing slightly off            ║
╠══════════════════════════════════════════════════════════╣
║  [A] Approve → proceed to POST_PRODUCTION               ║
║  [R] Redo    → re-render with adjustments               ║
║  [D] Direct  → re-render with new instructions          ║
║  [S] Skip    → skip to POST_PRODUCTION                  ║
║  [H] Halt    → stop production                          ║
╚══════════════════════════════════════════════════════════╝
Decision: _
```

You decide:
- **[A] Approve** → Move to post-production (captions, audio mixing)
- **[R] Redo** → Re-render (e.g., adjust animation timing)
- **[D] Direct** → Re-render with specific instructions
- **[S] Skip** → Skip post-production, go to QA
- **[H] Halt** → Stop production

---

## Troubleshooting

### Error: "npx create-remotion not found"
**Solution**: Make sure Node.js 16+ is installed.
```bash
node --version  # Should be v16+
npm --version   # Should be v8+
```

### Error: "Remotion project not found"
**Solution**: Check `REMOTION_PROJECT_DIR` in `config.py` points to correct path.
```python
# Check path exists
import os
print(os.path.exists(REMOTION_PROJECT_DIR))  # Should be True
```

### Error: "Failed to register composition"
**Solution**: The Remotion project may be out of sync. Restart dev server:
```bash
npm run dev  # Kill and restart
```

### Error: "Render timed out"
**Solution**: Rendering took too long. Increase timeout in config.py:
```python
# agents/remotion_video_agent.py
self.timeout_seconds = 180 * 60  # 3 hours instead of 2
```

### Rendering is slow
**Solution**: Rendering locally can be slow for complex animations. Options:
1. Simplify animations (fewer effects)
2. Lower resolution (1280×720 instead of 1920×1080)
3. Use Remotion Lambda (serverless rendering, optional paid service)

---

## Next Steps After First Video

### If Rendering Succeeds
1. Video appears at: `video_production/systems_eval_test_1/remotion_output/video_1.mp4`
2. You approve at checkpoint
3. System proceeds to POST_PRODUCTION (captions via AssemblyAI)
4. You review quality again
5. Final video is ready!

### If You Want to Tweak
1. Approve at checkpoint with modifications: `[D] Direct with instructions`
2. Example: "Scene 1.3 animation too fast, slow it down by 50%"
3. Claude regenerates React code with your feedback
4. Remotion re-renders

---

## What to Expect

**Rendering Time for Video 1**:
- 6 scenes, ~12 minutes total
- Estimated render time: 3-5 minutes locally
- (Much faster than Runway which takes 5-10 min per 1-min video)

**Output File Size**:
- 1920×1080 @ 30fps MP4: ~150-300 MB depending on complexity

**CPU Usage**:
- Will use 1-2 CPU cores
- Safe to run in background while doing other work

---

## Advanced: Customizing Compositions

If you want to manually edit a composition (optional):

1. Open `drawing-room-video/src/compositions/Scene_1_1.tsx`
2. Edit the React component
3. Save
4. Remotion dev server auto-reloads
5. See changes in http://localhost:3000
6. When happy, run render command

Example customization:
```tsx
// Add a custom background color
<AbsoluteFill style={{ background: '#1a1a2e' }}>
  {/* Your content */}
</AbsoluteFill>

// Add custom font
<div style={{ fontFamily: 'Inter, sans-serif', fontSize: 48 }}>
  Title
</div>
```

---

## Remotion Resources

- **Docs**: https://www.remotion.dev/docs
- **Examples**: https://www.remotion.dev/docs/examples
- **GitHub**: https://github.com/remotion-dev/remotion
- **Composition API**: https://www.remotion.dev/docs/composition

---

## Summary

| Step | Time | What Happens |
|------|------|---|
| 1. Create Remotion | 2 min | `npx create-remotion@latest drawing-room-video` |
| 2. Start dev server | 1 min | `npm run dev` |
| 3. Configure path | 1 min | Update `config.py` with project directory |
| 4. Generate video | 10 min | Run orchestrator, Claude generates code, Remotion renders |
| 5. Review & approve | 2 min | You decide at checkpoint |
| **Total** | **~15 min** | Professional 12-min video created |

---

**Ready? Start with Step 1 and let me know when your Remotion project is set up!**
