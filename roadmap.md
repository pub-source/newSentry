# MSDS roadmap

## Done
- [x] CAM 2–4 have independent attention/saliency displays, safety alerts, speaker output, and push-to-talk controls
- [x] Get Started redesigned around indoor CCTV safety with adaptive layout and a Back to welcome action
- [x] Massive Tagalog + English safety/awareness phrase library used for transcription recognition (`src/lib/safetyLexicon.ts`, mirrored keywords in `local-server/msds/config.py`)
- [x] Stop Monitoring disconnects CAM 1–4 on the local service
- [x] Live CCTV transcript replaces the previous one and clears after 5 s (merging helper removed)
- [x] Expert Mode teaches the real core and hybrid algorithms with code, narration, and dashboard spotlights

## Standing rules (handoff spec)
- Keep real RTSP/MediaMTX/FFmpeg/Whisper/Electron/GPU logic — no mocks.
- CCTV mic is the transcription source; browser mic only push-to-talk/fallback.
- Full Whisper sentence shown; safety keyword kept separate from the transcript.
- No new external email system; in-app notifications are the priority.
- HashRouter for Electron; don't require all 4 cameras connected.

## Open (needs your PC)
- Verify on the packaged Windows app: CCTV audio chunks, Whisper transcripts in English and Tagalog, GPU diagnostics.

