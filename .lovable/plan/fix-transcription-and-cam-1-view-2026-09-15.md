# Fix transcription and CAM 1 view

## Changes
- Filter repeated Whisper phrases at the source and prevent duplicate transcript events from being stored.
- Deduplicate rolling transcript text in both camera speech hooks so repeated polls or overlapping audio chunks do not repeat sentences.
- Make CAM 1 use the same camera frame proportions, header treatment, transcription panel, diagnostics, and controls as CAM 2 while preserving CAM 1 detection behavior.
- Correct the CAM 1 label and keep its existing live video, saliency, fire, audio, and talk controls intact.

## Verification
- Run Python syntax checks and the TypeScript project checks.
- Confirm the preview renders CAM 1 without overlap and shows cleaned transcription output.
