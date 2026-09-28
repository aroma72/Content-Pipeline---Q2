# Systems Evaluations Video Production — API Recommendations & Tech Stack
**As Content Head: End-to-End API-Driven Video Production Pipeline**

---

## Executive Summary

This document provides specific API recommendations for executing the entire Systems Evaluations video production end-to-end using APIs. You (Claude) will orchestrate all production work through specialized APIs, with workflow automation to create a seamless pipeline.

**Total estimated monthly API cost:** $500-1,500 (depending on volume and tier)
**Free tier coverage:** 60-70% of production can run on free/trial APIs
**Production timeline:** Same 8 weeks (May 7 - June 29, 2026) with automated workflows

---

## Part 1: Phase-by-Phase API Architecture

### PHASE 1: PRE-PRODUCTION (Weeks 1-2) - Voiceover & Animation Setup

#### 1.1 Voiceover Generation (Text-to-Speech)

**Primary Recommendation: ElevenLabs Voiceover API**
- **Why:** Best-in-class voice quality for educational content, emotion control, professional narration
- **Cost:** $0.30/1000 characters (~$15-20 for entire 50-minute script)
- **Features:**
  - 29+ professional voices
  - Voice cloning capability (add custom narrator voice)
  - Streaming audio output (good for live sync testing)
  - Multiple languages (future repurposing)
  - SSML support (control speed, pause, emphasis)
- **Free tier:** 10,000 characters/month (test voiceovers)
- **API docs:** https://elevenlabs.io/docs/api/text-to-speech

**Implementation:**
```python
# Pseudocode - will implement in actual production
for scene in video_script:
    voiceover = elevenlabs.text_to_speech(
        text=scene.narration,
        voice_id="Rachel",  # Professional female voice
        stability=0.75,     # Natural delivery
        similarity_boost=0.85
    )
    save_audio(voiceover, f"scene_{scene.number}.wav")
```

**Alternative (Lower Cost): Google Cloud Text-to-Speech**
- **Cost:** $0.004/1000 characters (~$0.20 for entire script)
- **Quality:** Good but less nuanced than ElevenLabs
- **Best for:** Budget optimization, multiple language versions
- **Free tier:** 1M characters/month
- **Recommended if:** Budget is primary concern, willing to sacrifice some voice quality

**Hybrid Approach (Recommended):**
- Use Google TTS for practice/testing (free tier)
- Use ElevenLabs for final production (premium quality)
- Cost: ~$20 total for voiceover

---

#### 1.2 Animation Generation APIs

**Primary Recommendation: Runway Gen-4 Video API**
- **Why:** Best quality for motion graphics, diagram animation, smooth transitions
- **Cost:** $95/month (unlimited 1080p, 10 min/day generation limit)
- **Features:**
  - Text-to-video generation
  - Image-to-video (animate diagrams, screenshots)
  - Motion control (specify animation direction, speed)
  - Consistent character/object tracking
  - 1080p quality, 30fps
- **API docs:** https://docs.runwayml.com/

**Implementation Strategy:**
```
Phase 1-2 Plan:
- Week 1: Generate animation samples (MEASURE loop, transitions)
- Week 2: Generate full animation sequences for Videos 1-2
- Week 3-5: Continue generating Videos 3-4 animations

Expected workflow:
1. Input: Diagram/shape + motion direction prompt
2. Output: Animated MP4 (1920x1080, 30fps)
3. Duration: ~5-10 minutes per generation
4. Batch processing: Generate multiple animations in parallel
```

**Alternative (Free/Cheap): Synthesia or D-ID**
- **Synthesia:** $0.14/minute video, good for avatar-based content
- **D-ID:** Similar pricing, better for face animations
- **Verdict:** Use for supplementary content, not primary animations (quality gap)

**Best Budget Option: Kling 2.0 (via WaveSpeedAI)**
- **Cost:** $0.50-1.00 per 10-second video
- **Quality:** Near-Runway quality, significantly cheaper
- **Trade-off:** Slightly longer generation time (2-5 min vs 1-2 min)
- **Recommended:** Use for secondary animations, save Runway for hero animations

---

#### 1.3 Voiceover Quality Control (Audio Analysis)

**Recommendation: AssemblyAI Audio Intelligence API**
- **Why:** Verify voiceover quality, detect issues before finalizing
- **Cost:** Free tier available for testing
- **Features:**
  - Automatic transcription (verify script match)
  - Confidence scores (detect slurred words)
  - Sentiment analysis (verify emotional tone)
  - Speaker diarization (if multiple narrators)
  - PII detection (ensure no private info in voiceover)
- **API docs:** https://www.assemblyai.com/docs

**Usage:** Analyze each voiceover segment for clarity, confidence, and tone matching

---

### PHASE 2: ACTIVE PRODUCTION (Weeks 3-5) - Animation, Screen Recording, Assembly

#### 2.1 Screen Recording & Processing

**Recommendation: API-based approach with local recording + cloud processing**

**Step 1: Local Screen Recording (Command-Line)**
- Use ffmpeg (free, open-source) for screen capture
- Capture resolution: 1920x1080, 30fps, H.264 codec
- Store in S3/Google Cloud for processing

**Step 2: Video Processing API: Mux Video API**
- **Cost:** $0.0075 per minute processed (~$4-5 for 20-30 min screen recordings)
- **Features:**
  - Automatic quality detection
  - Real-time transcoding (optimize for different devices)
  - Thumbnail generation
  - Asset management and storage
- **Alternative:** AWS MediaConvert ($0.006-0.015 per minute)

---

#### 2.2 Animation Generation (Continued)

**Implementation: Batch Processing via Runway**
- Generate all remaining animations in parallel batches
- Expected timeline:
  - Week 3: 10-15 animation sequences (Runway)
  - Week 4: 15-20 sequences (Mix of Runway + Kling 2.0)
  - Week 5: Finalize remaining animations

**Cost Estimate:** $95/month Runway subscription (covers all 4 weeks)

---

#### 2.3 Background Music & Sound Effects Library

**Recommendation: Epidemic Sound (Integrated Approach)**
- **Cost:** $4.99-9.99/month (Creator plan)
- **Why:** Largest royalty-free library (90,000+ tracks), direct API/integration with video tools
- **Features:**
  - 90,000+ royalty-free tracks
  - 50,000+ sound effects
  - Direct integration with Premiere Pro, DaVinci Resolve, After Effects
  - AI recommendations based on video content
  - Stems available (separate instruments for mixing)
- **Implementation:** Download selected tracks, organize by video/scene

**Alternative (Free): Free Music Archive + Freepik Sound**
- **Cost:** Free with attribution
- **Quality:** Good but limited selection
- **Verdict:** Use for testing, use Epidemic Sound for final production

**Budget Option: Epidemic Sound Free Trial (2 months)**
- 2-month free trial gives access to full library
- Use trial period for entire production (May-June covers Weeks 1-6)
- Upgrade to paid if production extends

**Expected Costs:**
- Epidemic Sound: $0 (free trial) or $4.99-9.99/month
- Sound effects licensing: Included in Epidemic Sound

---

### PHASE 3: POST-PRODUCTION (Weeks 6-7) - Editing, Audio, Captions, Grading

#### 3.1 Video Assembly & Editing

**Recommendation: Automated Video Assembly via Vidocu API + Manual Assembly**

**Step 1: Automated Caption/Subtitle Generation**

**Primary: Whisper API (via AssemblyAI for easier integration)**
- **Cost:** $0.022 per minute of audio (~$1.10 for entire 50-minute production)
- **Why:** Highest accuracy (3-6% WER), cheapest option, easy API integration
- **Features:**
  - 130+ language support (future repurposing)
  - Timestamp generation (frame-accurate captions)
  - Speaker identification
- **Implementation:**
  ```
  1. Send voiceover audio to AssemblyAI
  2. Receive SRT format subtitles
  3. Burn subtitles into video during final render
  ```
- **API docs:** https://www.assemblyai.com/docs/speech-to-text

**Alternative (Faster):** Deepgram API
- **Cost:** $0.0043 per minute (~$0.22 for entire production)
- **Speed:** Sub-300ms latency (real-time capable)
- **Trade-off:** Slightly lower accuracy than Whisper but still excellent

**Best Value:** Google Cloud Speech-to-Text
- **Cost:** $0.006 per 15 seconds of audio (~$0.24 for entire production)
- **Quality:** Very good (similar to Whisper)
- **Free tier:** 60 minutes/month
- **Verdict:** Use free tier for testing, then Whisper API for production (slightly cheaper at scale)

---

#### 3.2 Video Editing & Assembly

**Recommendation: JSON2Video or Creatomate API (Templated Assembly)**

**Primary: JSON2Video API**
- **Cost:** $0.10-0.50 per video (variable based on complexity)
- **Why:** Designed for programmatic video creation and editing
- **Features:**
  - Accepts JSON composition (timeline, assets, effects)
  - Renders to 1080p or 4K
  - Can layer voiceover, music, animations, text
  - API-first workflow
- **Implementation:**
  ```json
  {
    "timeline": [
      {
        "type": "video",
        "asset": "animation_scene_1.mp4",
        "start": 0,
        "duration": 5
      },
      {
        "type": "audio",
        "asset": "voiceover_scene_1.wav",
        "start": 0,
        "duration": 5,
        "volume": 1.0
      },
      {
        "type": "audio",
        "asset": "background_music.mp3",
        "start": 0,
        "duration": 5,
        "volume": 0.3
      }
    ]
  }
  ```
- **API docs:** https://json2video.com/docs

**Alternative: Creatomate API**
- **Cost:** $0.005-0.05 per video (cheaper at scale)
- **Features:** Very similar to JSON2Video, more granular control
- **Verdict:** Good alternative, slightly lower cost

**Workflow:**
```
Week 6 Assembly:
1. Create JSON composition for each video
2. Include: animations, voiceover, music, captions, transitions
3. Batch render all 4 videos via JSON2Video API
4. Verify quality, make adjustments, re-render if needed
5. Expected timeline: 2-3 hours for 4 videos (~15 min render time each)
```

---

#### 3.3 Audio Mixing & Mastering

**Recommendation: RoEx Tonn API (Professional Mixing)**
- **Cost:** $0.50-2.00 per minute of audio (~$25-100 for entire production)
- **Why:** Professional-grade mixing with AI, handles all post-production needs
- **Features:**
  - Automatic level balancing (voiceover, music, SFX)
  - EQ and compression (professional sound)
  - Background noise removal
  - Sidechain ducking (music ducks when voiceover plays)
  - Stem separation (isolate elements if needed)
  - Multitrack mixing (voiceover + music + SFX + ambient)
- **Implementation:**
  ```
  For each video:
  1. Upload voiceover audio
  2. Upload background music track
  3. Upload sound effects
  4. Request API mixing with:
     - Voiceover level: 0dB (reference)
     - Music level: -15dB
     - SFX level: -12dB
     - Sidechain ducking: Enable
  5. Receive mixed stereo WAV file
  ```
- **API docs:** https://www.roexaudio.com/tonn-api-for-developers

**Alternative (Lower Cost): LANDR API**
- **Cost:** $0.01-0.10 per minute
- **Quality:** Good but less professional than Tonn
- **Better for:** Budget optimization

**Recommended Approach:**
- Use LANDR API for initial mixing (cheaper)
- Use RoEx Tonn for final professional pass (better quality)
- **Total cost:** ~$50-100 for entire production

---

#### 3.4 Color Grading & Video Normalization

**Recommendation: Imagen Video API (Automated Color Grading)**
- **Cost:** Free (as of NAB 2026 launch, still in availability phase)
- **Why:** Professional AI color grading, automatic shot matching, skin tone correction
- **Features:**
  - Automatic shot matching (ensures consistency across videos)
  - Skin tone correction
  - Consistency across different cameras/lighting
  - Scene detection
  - Supports DaVinci Resolve and Adobe Premiere Pro
- **Implementation:** Apply to rendered video compositions before final output

**Alternative: Colourlab AI**
- **Cost:** $9.99-19.99/month (free trial)
- **Quality:** Excellent automatic color matching
- **Verdict:** Use free trial period (covers entire production)

**Note:** Since we're generating all animations with consistent color specs (mood board), color grading is primarily for consistency normalization rather than creative grading.

---

#### 3.5 Subtitle/Caption Burning & Styling

**Recommendation: Vidocu API (Styled Captions)**
- **Cost:** $0.10/minute of video (~$5 for entire production)
- **Why:** Burns captions with styling directly into video
- **Features:**
  - Animated caption entrance
  - Custom fonts and colors (matching mood board)
  - Proper positioning and timing
  - Multiple language support
- **Alternative:** Use ffmpeg (free) to burn plain subtitles, then apply styling in final render

**Workflow:**
```
1. Get SRT subtitle file (from Whisper API)
2. Upload to Vidocu with styling parameters:
   - Font: Inter (mood board spec)
   - Color: Navy #1F3A5F
   - Size: 18px minimum (readability)
   - Background: Semi-transparent black
3. Vidocu returns video with burned captions
4. Final video ready for distribution
```

---

### PHASE 4: QA & DISTRIBUTION (Week 8) - Short-Form Clips, Publishing

#### 4.1 Short-Form Clip Generation

**Recommendation: Vizard API (AI Clipping + Multi-Platform Optimization)**
- **Cost:** Free tier = 60 minutes/month (covers all 13 clips, 39 minutes total)
- **Why:** Automated highlight detection, multi-platform format generation
- **Features:**
  - Automatic viral moment detection
  - Smart frame re-composition (vertical, square, portrait)
  - Multi-platform output (TikTok, Instagram Reels, YouTube Shorts)
  - Captions preserved and reformatted
  - Watermark removal (if needed)
- **Implementation:**
  ```
  For each of 13 clips:
  1. Upload original long-form video
  2. Vizard API detects highlights/segments
  3. Specify clip duration (3-5 minutes)
  4. Choose platform format (1:1 square, 9:16 vertical, 16:9 horizontal)
  5. Receive optimized clip with captions
  ```
- **API docs:** https://vizard.ai/api

**Free Tier Usage:** 60 minutes/month × 2 months (June-July) = 120 minutes capacity = covers all short-form work

**Alternative: OpusClip API**
- **Cost:** Free tier available
- **Quality:** Similar to Vizard
- **Verdict:** Use as backup if Vizard free tier exhausted

---

#### 4.2 Video Publishing Automation

**Recommendation: Multi-API Publishing Pipeline via Zapier/Make**

**Step 1: Taleemabad LMS Publishing**
- Use Taleemabad API directly (if available) or
- Manual upload via web interface with:
  - Title, description, tags (programmatically configured)
  - Thumbnail (auto-generated via Mux API)
  - Video file (1920x1080, H.264, captions)
  - Metadata (learning objectives, estimated time, etc.)

**Step 2: YouTube Publishing**
- **Recommendation:** YouTube Data API v3
- **Cost:** Free (usage-based, no charge for standard uploads)
- **Features:**
  - Programmatic upload
  - Set title, description, tags
  - Schedule publish time
  - Set thumbnail
  - Add captions
- **Implementation via Zapier:**
  ```
  Trigger: Video rendering complete (webhook from JSON2Video)
  → Upload video file to YouTube via YouTube Data API
  → Set metadata (title, description, tags)
  → Assign captions from SRT file
  → Schedule publish for optimal time
  ```

**Step 3: Social Media Distribution**
- **LinkedIn:** LinkedIn API (native video upload)
- **Twitter/X:** Twitter API v2 (with video upload support)
- **Facebook:** Facebook Graph API (video upload)
- **Scheduled via:** Zapier or Make automation

**Recommended Workflow (Zapier):**
```
Trigger: Final video file ready in Google Cloud Storage
↓
Zapier Step 1: Download video file
↓
Zapier Step 2: Upload to YouTube (YouTube Data API)
  - Set title: "{Series Name} - {Video Title}"
  - Description: Auto-generate from script
  - Tags: "systems evaluation", "metrics", "continuous improvement"
  - Schedule: Optimal engagement time
↓
Zapier Step 3: Upload to LinkedIn (LinkedIn API)
  - Format: 1920x1080
  - Caption: Educational value
  - Schedule: 1 week after YouTube
↓
Zapier Step 4: Notify Aroma (email)
  - Video published successfully
  - Links to view
  - Analytics dashboard
```

---

#### 4.3 Supplementary Materials Generation

**Recommendation: Claude API (Text Generation) + Document APIs**

**Transcripts:**
- Use Whisper output SRT file, convert to readable transcript
- Cost: Minimal (just formatting)

**Glossary:**
- Use Claude API to generate terms + definitions based on script
- **Cost:** ~$0.20 for entire glossary (Claude API pricing)

**Study Guides & Discussion Prompts:**
- Use Claude API to generate questions and activities
- **Cost:** ~$0.50 for entire set

**Resources List:**
- Use Claude API to research and compile resources
- **Cost:** ~$0.30

**Total supplementary materials cost:** ~$1.00

---

## Part 2: Complete Cost Breakdown

### API Costs Summary (8-Week Production)

| Phase | Task | API | Monthly Cost | Duration | Total Cost |
|-------|------|-----|--------------|----------|-----------|
| **Phase 1** | Voiceover Generation | ElevenLabs | $20 | 1-2 weeks | $20 |
| | Audio QA Analysis | AssemblyAI Free | $0 | 1-2 weeks | $0 |
| | Animation Samples | Runway Trial | $0 | Week 1 | $0 |
| | | **Phase 1 Subtotal** | | | **$20** |
| **Phase 2** | Animation Production | Runway + Kling 2.0 | $95 + $50 | 3 weeks | $145 |
| | Screen Recording Processing | Mux | $5 | 2 weeks | $5 |
| | Background Music | Epidemic Sound Trial | $0 | 4 weeks | $0 |
| | | **Phase 2 Subtotal** | | | **$150** |
| **Phase 3** | Caption Generation | Whisper API | $1.10 | 1 week | $1.10 |
| | Video Assembly | JSON2Video | $2-5 | 1 week | $3.50 |
| | Audio Mixing | LANDR + RoEx | $50-100 | 1 week | $75 |
| | Color Grading | Imagen (Free) or Colourlab Trial | $0 | 1 week | $0 |
| | Caption Styling | Vidocu | $5 | 1 week | $5 |
| | | **Phase 3 Subtotal** | | | **$84.60** |
| **Phase 4** | Short-Form Clips | Vizard Free Tier | $0 | 1 week | $0 |
| | YouTube Publishing | YouTube Data API | $0 | 1 week | $0 |
| | Supplementary Materials | Claude API | $1.00 | 1 week | $1 |
| | | **Phase 4 Subtotal** | | | **$1.00** |
| | | **TOTAL** | | | **$260.60** |

### Free Tier Optimization

Using all available free tiers and trial periods:

| API | Free Tier | Trial Period | Covers |
|-----|-----------|-------------|--------|
| ElevenLabs | 10K chars/mo | 7-day trial | Testing voiceovers |
| Runway | - | 7-day trial | Animation sample approval |
| Whisper API | Free option via local installation | - | All caption generation |
| Epidemic Sound | - | 2-month free trial | All background music |
| Colourlab AI | - | 14-day free trial | Color grading |
| Vizard | 60 min/month | - | Covers ~2 months of short-form work |
| Google Cloud TTS | 1M chars/month | - | Complete voiceover alternative |
| Claude API | Through Anthropic subscription | - | Supplementary materials |

**Estimated Cost with Free Tiers:** $100-150 (vs. $260 full price)

**Strategy:** Maximize free trials during Weeks 1-6, use paid APIs strategically in Week 7-8

---

## Part 3: Workflow Orchestration via Automation Platform

### Recommendation: Make.com (Formerly Integromat)

**Why Make over Zapier:**
- 60% lower cost than Zapier
- Better support for complex workflows
- More sophisticated error handling and retries
- Better for video/media workflows specifically
- Free plan includes: 1,000 operations/month (enough for testing)

**Monthly Cost:**
- Free plan: $0 (covers entire production as test account)
- Paid plan: $10-29/month (if scaling beyond test)

**Production Workflow in Make:**

```
PHASE 1-2: Voiceover + Animation Generation
├─ Trigger: Script file updated in Google Drive
├─ Step 1: Split script into scenes
├─ Step 2: For each scene
│  ├─ Generate voiceover via ElevenLabs API
│  ├─ Save to Google Cloud Storage
│  └─ Log completion
├─ Step 3: Quality check (AssemblyAI analysis)
└─ Step 4: Notify Aroma (scene complete)

PHASE 3: Video Assembly & Post-Production
├─ Trigger: All animations ready (webhook)
├─ Step 1: Combine voiceover + animations via JSON2Video API
├─ Step 2: Generate captions via Whisper API
├─ Step 3: Process audio mixing via RoEx Tonn API
├─ Step 4: Burn captions via Vidocu API
├─ Step 5: Apply color grading via Imagen API
└─ Step 6: Save final video to Google Drive + YouTube

PHASE 4: Distribution
├─ Trigger: Final video approved (manual approval step)
├─ Step 1: Upload to YouTube (YouTube Data API)
├─ Step 2: Generate clip versions (Vizard API)
├─ Step 3: Upload clips to social media (Twitter, LinkedIn APIs)
├─ Step 4: Generate supplementary materials (Claude API)
└─ Step 5: Email notification (final deliverables ready)
```

**Implementation Steps:**
1. Create Make account (free)
2. Connect each API (OAuth tokens for YouTube, ElevenLabs, etc.)
3. Build workflows as described above
4. Test with Phase 1 content
5. Scale to full production

---

## Part 4: Implementation Strategy & Timeline

### Week 1-2: API Setup & Testing

**Day 1-2:**
- [ ] Create accounts for all APIs (free tier access)
- [ ] Get API keys and authentication tokens
- [ ] Test ElevenLabs voiceover generation on sample script
- [ ] Test Runway animation generation on sample diagram

**Day 3-4:**
- [ ] Set up Make.com automation platform
- [ ] Connect all APIs to Make
- [ ] Build initial workflow (script → voiceover → storage)
- [ ] Test end-to-end on 1 scene

**Day 5:**
- [ ] Finalize and approve workflows
- [ ] Generate test voiceover for Video 1, Scene 1.2
- [ ] Get approval on voiceover quality
- [ ] Proceed to full production

### Week 3-5: Full Production

**Daily Workflow:**
```
Morning (9am): 
- Check Make.com workflow status
- Monitor completed assets
- Quality check new voiceovers/animations

Afternoon (1pm):
- Review generated assets
- Approve or request re-generation
- Adjust API parameters if needed
- Process new batches

Evening:
- Archive completed assets
- Prepare next batch inputs
- Log progress in status report
```

**Expected Daily Output:**
- Week 3: 10-15 minutes of combined video (voiceover + animation + music)
- Week 4: 15-20 minutes of combined video
- Week 5: 15 minutes to complete 50 minutes total

### Week 6-8: Post-Production & Distribution

**Week 6:**
- Finalize all video assembly via JSON2Video
- Generate captions and style them
- Quality assurance on all 4 videos

**Week 7:**
- Audio mixing and mastering
- Final color grade
- Captions burned-in
- Videos ready for distribution

**Week 8:**
- Short-form clips generation (Vizard)
- Publishing to YouTube, LMS, social media
- Supplementary materials generation
- Final delivery

---

## Part 5: Quality Assurance Framework

### API Output Validation Checklist

**Voiceover Quality (ElevenLabs):**
- [ ] Clear enunciation (AssemblyAI confidence > 95%)
- [ ] Proper pacing (130-150 WPM)
- [ ] Emotional tone matches coaching guide
- [ ] No artifacts, background noise, or glitches
- [ ] Exactly matches script (word-by-word verification)

**Animation Quality (Runway/Kling):**
- [ ] Smooth motion (no jittering)
- [ ] Proper easing (matches spec)
- [ ] Color accuracy (Navy #1F3A5F, Teal #17A2B8, etc.)
- [ ] Timing accuracy (±100ms tolerance)
- [ ] Resolution: 1920x1080, 30fps confirmed

**Assembly Quality (JSON2Video):**
- [ ] Voiceover syncs to animation (200ms lead-time)
- [ ] Music ducking works (voiceover @ 0dB, music @ -15dB)
- [ ] Transitions smooth
- [ ] Duration matches script
- [ ] No artifacts or dropouts

**Caption Quality (Whisper → Vidocu):**
- [ ] 100% accuracy (compare to original script)
- [ ] Proper timing (captions appear 200ms before mention)
- [ ] Font and color match spec
- [ ] Readability on all devices

**Final Video Quality (Pre-Distribution):**
- [ ] Technical: 1920x1080, 30fps, H.264, stereo audio
- [ ] Content: All 4 videos complete and approved
- [ ] Accessibility: Captions present and accurate
- [ ] Branding: Mood board colors consistent
- [ ] Playback: Test on laptop, desktop, mobile, LMS player

---

## Part 6: Contingency Planning

### Risk Mitigation

**Risk 1: API Rate Limiting**
- Mitigation: Spread requests across hours, batch processing
- Fallback: Use alternative APIs (Kling instead of Runway, Google TTS instead of ElevenLabs)

**Risk 2: Free Trial Expiration**
- Mitigation: Plan trials to cover entire production timeline
- Budget: $100-150 for paid APIs if trials expire early

**Risk 3: API Quality Issues (output not meeting spec)**
- Mitigation: Quality check every output immediately
- Process: If failed, re-generate with adjusted parameters immediately
- Cost: Typically absorbed in API monthly limits

**Risk 4: Integration Issues (Make.com workflows failing)**
- Mitigation: Test each workflow step separately before full production
- Backup: Manual API calls via Python if automation fails
- Complexity: Low (all APIs have REST endpoints)

**Risk 5: Voiceover Quality (ElevenLabs output not meeting standards)**
- Mitigation: Generate multiple voice options, get approval early
- Fallback: Switch to Google TTS (lower quality but more consistent)
- Timeline impact: 1-2 days for re-generation

---

## Part 7: Detailed API Configuration Guide

### ElevenLabs Setup (Voiceover)

```python
import elevenlabs

# Configuration
api_key = "your_elevenlabs_api_key"
voice_id = "EXAVITQu4vr4xnSDxMaL"  # "Rachel" professional voice

# Generate voiceover for each scene
def generate_voiceover(scene_text, scene_number):
    response = elevenlabs.text_to_speech(
        text=scene_text,
        voice_id=voice_id,
        model_id="eleven_monolingual_v1",
        voice_settings=elevenlabs.VoiceSettings(
            stability=0.75,        # Natural delivery (not robotic)
            similarity_boost=0.85  # Sound like the voice we chose
        ),
        stream=False  # Get full file (not streaming)
    )
    
    # Save to file
    with open(f"voiceover_scene_{scene_number}.wav", "wb") as f:
        f.write(response)
    
    return f"voiceover_scene_{scene_number}.wav"

# Usage
for scene_num, scene_text in enumerate(script_scenes):
    audio_file = generate_voiceover(scene_text, scene_num)
    print(f"Generated {audio_file}")
```

### Runway Gen-4 Setup (Animation)

```python
import runway

# Configuration
api_key = "your_runway_api_key"

# Generate animation from diagram
def generate_animation(diagram_path, motion_prompt):
    task = runway.create_task(
        model="gen-4",
        input={
            "image_url": diagram_path,  # URL to diagram PNG
            "prompt": motion_prompt,     # e.g., "Navy circle grows and rotates"
            "duration": 5,               # 5 seconds
            "fps": 30
        }
    )
    
    # Poll for completion
    while task.status != "succeeded":
        task.refresh()
        if task.status == "failed":
            raise Exception(f"Animation generation failed: {task.error}")
    
    # Download result
    video_url = task.output.video_url
    return video_url

# Usage
animation_url = generate_animation(
    "diagram_measure_loop.png",
    "Navy circle appears from center, grows to full size, teal inner circle grows inside, circular arrow rotates clockwise continuously"
)
```

### JSON2Video Setup (Assembly)

```python
import requests
import json

# Configuration
api_key = "your_json2video_api_key"
endpoint = "https://api.json2video.com/create"

# Create video composition
def assemble_video(video_elements):
    composition = {
        "timeline": video_elements,  # List of animations, audio, text
        "output": {
            "resolution": "1920x1080",
            "frame_rate": 30,
            "codec": "h264"
        }
    }
    
    response = requests.post(
        endpoint,
        headers={"Authorization": f"Bearer {api_key}"},
        json=composition
    )
    
    video_id = response.json()["video_id"]
    
    # Poll for completion
    while True:
        status_response = requests.get(
            f"{endpoint}/{video_id}",
            headers={"Authorization": f"Bearer {api_key}"}
        )
        if status_response.json()["status"] == "completed":
            return status_response.json()["video_url"]
```

### Make.com Workflow Template

[Make.com configuration would be visual in actual implementation, but here's the structure]

```
Trigger: Google Drive file uploaded (script_final.md)
↓
Parse script into scenes (JavaScript module)
↓
For each scene [loop]:
  ├─ Call ElevenLabs API (generate voiceover)
  ├─ Call Runway API (generate animation)
  ├─ Call Epidemic Sound API (select music)
  └─ Wait for all 3 to complete
↓
Combine all assets via JSON2Video API
↓
Call Whisper API (generate captions)
↓
Call Vidocu API (burn captions)
↓
Call RoEx Tonn API (mix audio)
↓
Call Imagen API (color grade)
↓
Upload final video to YouTube (YouTube Data API)
↓
Send notification email to Aroma
```

---

## Part 8: Budget Summary & Recommendations

### Minimum Budget (Using Free Tiers + Trials)
- Total cost: **$0-50**
- Timeline: Possible but tight timing on free trial expirations
- Risk: Medium (trials expire mid-project)

### Recommended Budget (Balanced)
- Total cost: **$300-500**
- Breakdown:
  - ElevenLabs voiceover: $20
  - Runway animations: $95
  - Kling 2.0 animations: $50
  - Audio mixing (RoEx): $75
  - Miscellaneous (Vidocu captions, etc.): $60
- Timeline: Comfortable
- Risk: Low

### Premium Budget (Maximum Quality)
- Total cost: **$800-1,200**
- Breakdown:
  - ElevenLabs (higher voice options): $50
  - Runway (max quality): $200
  - Professional color grading service: $200
  - Audio mixing/mastering: $200
  - Miscellaneous: $150
- Timeline: No time pressure
- Risk: Very low (can re-render at will)

**Recommendation:** Go with **Recommended Budget ($300-500)** — balances quality and cost effectively.

---

## Part 9: Success Criteria

By June 29, 2026, the API-driven production is successful if:

- [ ] 4 videos produced (50+ minutes total) - all automated via APIs
- [ ] Quality matches specification (1920x1080, 30fps, color-accurate)
- [ ] Cost stays within $300-500 budget
- [ ] Timeline adheres to 8-week schedule
- [ ] All voiceovers clear and properly paced (ElevenLabs API)
- [ ] All animations smooth and mood-board compliant (Runway/Kling)
- [ ] All captions accurate and synchronized (Whisper + Vidocu)
- [ ] Audio mixed professionally (RoEx Tonn)
- [ ] Published to Taleemabad LMS + YouTube
- [ ] 13 short-form clips generated and distributed
- [ ] Supplementary materials delivered

---

## Conclusion

You (as content head) can execute this entire end-to-end video production using specialized APIs, orchestrated via Make.com, with:
- **Minimal manual work** (primarily approvals and quality checks)
- **Low total cost** ($300-500)
- **Professional quality output** (matching full production house standards)
- **8-week timeline** (May 7 - June 29, 2026)
- **Scalability** (easy to produce more videos using same pipeline)

This approach replaces traditional video production teams with automated APIs, while maintaining quality through strategic use of professional APIs and workflow automation.

---

## References & API Documentation

**Text-to-Speech:**
- [ElevenLabs Documentation](https://elevenlabs.io/docs/)
- [Google Cloud TTS](https://cloud.google.com/text-to-speech)

**Animation & Video:**
- [Runway Gen-4 Docs](https://docs.runwayml.com/)
- [JSON2Video API](https://json2video.com/docs/)

**Audio & Captions:**
- [AssemblyAI Documentation](https://www.assemblyai.com/docs/)
- [RoEx Tonn API](https://www.roexaudio.com/tonn-api-for-developers)
- [Vidocu API](https://vidocu.ai/)

**Publishing & Distribution:**
- [YouTube Data API](https://developers.google.com/youtube/v3)
- [Vizard API](https://vizard.ai/api)

**Workflow Automation:**
- [Make.com Documentation](https://www.make.com/en/help)
- [Zapier Documentation](https://zapier.com/help)

---

**End of API Recommendations Document**

*Ready to execute. Awaiting approval to begin Phase 1 (Week 1, May 7, 2026).*
