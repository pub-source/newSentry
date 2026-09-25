# Repair CAM 2–4 monitoring and refresh Get Started

## Changes
- Give CAM 2, CAM 3, and CAM 4 independent saliency and attention scores derived from each camera’s own video, objects, and CCTV audio state.
- Add working speaker output and hold-to-talk microphone controls to each secondary camera without changing CCTV transcription’s RTSP audio source.
- Surface each camera’s fire, smoke, facial distress, audio distress, and high-attention events in the shared alert log and in the active camera view.
- Keep inactive camera pipelines mounted so switching camera tabs does not stop monitoring.
- Redesign the Get Started choice screen as a welcoming, adaptive indoor-safety/CCTV experience using the existing design system and imagery.
- Add a clear Back button from Get Started to the welcome page, while preserving account creation, household joining, sign-in, and protected dashboard access.

## Technical details
- Extend the existing per-camera runtime with a calculated attention score rather than sharing CAM 1’s global score.
- Reuse the existing CCTV talk hook and camera video audio output for CAM 2–4; the laptop microphone remains push-to-talk only.
- Reuse the existing central alert handler and cooldown behavior.
- Use existing semantic color tokens, shared controls, and responsive layout patterns.

## Verification
- Check TypeScript and Python syntax.
- Verify the preview at desktop and mobile widths: Get Started navigation, Back action, CAM switching, score labels, and sound controls.
- Confirm the latest preview build and runtime logs are clean.
