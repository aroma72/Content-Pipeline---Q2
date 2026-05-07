---
name: Taleemabad LMS Integration Reference
description: Platform endpoint, publishing API, and integration requirements
type: reference
---

## Platform Details
- **Name**: Taleemabad LMS
- **Organization**: Internal learning management system for Agentic AI course and other modules
- **URL**: (TBD in Week 1)
- **Contact**: Course lead for API credentials + endpoint validation

## Publishing Integration

### API Endpoint (TBD Week 1)
- **Base URL**: (to be confirmed)
- **Method**: Batch upload (preferred) or per-asset upload (fallback)
- **Authentication**: API key (store in `.env`, never commit)
- **Rate limits**: (TBD)

### Asset Format Requirements
- **Video**: MP4, H.264 codec, AAC stereo, 1080p preferred
- **Metadata**: JSON with title, description, tags, duration, transcript (SRT)
- **Captions**: VTT or SRT format (check platform standard)
- **Thumbnail**: Optional; auto-generate from first frame if missing

### Publishing Workflow
1. SessionAssetBundle marked `publish_ready` after human approval
2. `LearnerPackPublisherAgent` batches assets → metadata JSON
3. Batch uploaded to Taleemabad API endpoint
4. Platform returns asset IDs and URLs
5. Watch order page auto-generated from metadata
6. Learners notified of new session materials (TBD)

### Known Limitations
- (TBD — discover in Week 1 API integration work)

## Contact & Escalation
- **Technical questions**: (Course lead or LMS admin)
- **Integration blockers**: Escalate to Aroma + course lead for workaround
- **Publishing delays**: If API is down, publish to Google Drive + notify learners (manual fallback)

## Examples (From Prior Sessions)
- (To be collected after first live session publish in Week 3)
