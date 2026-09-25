# Revise Expert Mode into an algorithm tutorial

## What will change
- Replace the current animated diagram popup with two clear groups: **Core Algorithms** and **Hybrid Algorithm**.
- Include the real system stages: visual saliency, object detection, fire/smoke, face distress, CCTV audio/Whisper safety speech, and multimodal fusion.
- Keep explanations simple while showing a short, accurate code excerpt and the real implementation file for each stage.
- When an algorithm is selected, close Expert Mode, move to the dashboard area where its result appears, and start a spotlight tutorial focused on that area.
- The tutorial card will show the explanation, implementation file, and code excerpt, with Back/Next, narration, mute, and finish controls.

## Dashboard mapping
- Camera analysis algorithms will focus the live camera/fused-detection area.
- Audio and speech algorithms will focus live transcription and audio status.
- The hybrid algorithm will walk through camera signals, attention score, and event/alert output as one guided sequence.
- Missing or hidden targets will fall back to a centered tutorial card instead of breaking the tour.

## Technical details
- Extend the existing tutorial step model to support optional implementation labels and code blocks.
- Give relevant dashboard regions stable tutorial selectors.
- Pass an algorithm-selection callback from the dashboard into Expert Mode and build the selected tutorial steps from the actual implementation map.
- Preserve all camera, RTSP, Whisper, detection, alert, and Electron behavior; this change is presentation and navigation only.
- Verify the TypeScript build and the Expert Mode interaction in the preview.
