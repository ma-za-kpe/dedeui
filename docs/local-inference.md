# Browser inference and authentication

The PWA is being moved from the Vast workshop proxy to device-only inference. Google sign-in is required before the UI submits a text or voice turn. The old `/api/turn` upload endpoint returns 410 without reading or forwarding a body. There is no cloud fallback when a device cannot run a model.

This is a reference runtime, not a qualified DeDe release. It does not include the Python decision graph, a trained DeDe student, durable memory, an encrypted vault, R2 sync or beacon delivery. A model prompt is not a replacement for the law-conformance suite. Do not use this build for emergency assistance or as the only copy of important information.

## Local processing

After an explicit download action, a module worker loads pinned ONNX weights with Transformers.js 4.3.0 and single-threaded WASM. Audio is decoded and resampled to mono 16 kHz on the device. Whisper transcribes it, the language model generates a reply, and MMS generates PCM audio encoded as WAV for the existing player. No browser SpeechRecognition service or cloud speech voice is used. Text is retained if speech generation fails.

The worker disables network access after model loading. During installation it permits only pinned public model paths and runtime assets. ONNX files are checked against recorded SHA-256 values on download and cache retrieval. Model configuration is revision-pinned. This is not yet a signed model-release or rollback system.

The model cache contains public artifacts, not recordings, transcripts or replies. Download cancellation terminates the worker; completed cached files can be reused. Removal deletes only `dede-local-models-v1`. Browser eviction remains possible. Conversation history lives only in memory, and a bounded recent slice is supplied to the model. Refresh, sign-out or account change can lose that history; nothing is claimed backed up.

## Reference models

- Language: `onnx-community/SmolLM2-135M-Instruct-ONNX-MHA`, revision `5b6682c7c9df18f004bfb7e635cba3f3d98537d8`, Q4. This is not the Qwen student previously served on Vast and is not evidence of equivalent quality.
- Recognition: `Xenova/whisper-tiny.en`, revision `79fb389fc764e7c395bd330e9531d9d32ada7049`, Q8, English only.
- Synthesis: `Xenova/mms-tts-eng`, revision `3f8955a2adbd6487ce57420620d4916de22b9dac`, Q8. The upstream MMS license is non-commercial; this development reference bundle must not ship commercially. A production voice needs a compatible license and separate qualification.

Budget roughly 300 MB for initial model/runtime downloads and at least 450 MB free browser storage. Those are download/storage estimates, not peak RAM claims. Physical phone speed, memory, battery, thermals and accents remain unmeasured.

## Authentication boundary

Both the Send buttons and the submission handler require a resolved Firebase user. Enter-to-send follows the same handler. Identity changes terminate the worker and clear tab state; late replies are rejected by account generation. No authentication token or Google identity is sent to the model download service or Vast.

This gate controls the app's user flow, not ownership of public model files: a device owner can run downloaded public weights independently. Firebase authentication is not encryption, vault unlock, durable storage or server-side authorization for a future R2 API. Those future APIs must verify ID tokens independently. Real Google popup, cancellation and account-switch verification require an authenticated browser and are not replaced by mock auth.

## First conversation handoff

The user reports backend release `b65d96e` includes PRs 15–17 and live first-contact/name-cadence verification. The UI must implement that experience locally, not upload personal names to the workshop. T-364/T-366 remain open here: durable grounded note storage, restoration, rename, deletion and multi-day cadence are not implemented by displaying a greeting. A separate onboarding-complete marker is required so deleting a name does not restart onboarding. Urgent first answers and negated/reported renames need regression tests before the backend behavior is adopted. The exact proposed opening still awaits founder review.

## Verification

Docker lint, TypeScript, build and real-browser tests are used. `tests/local-browser.mjs` exercises actual downloaded models with synthetic audio and an offline inference phase. Its evidence is recorded separately from signed-out UI checks and real Google authentication. No task is complete merely because source code exists or the download began. See TASKS.md for current evidence and remaining qualification.

## Primary references

- [Transformers.js repository](https://github.com/huggingface/transformers.js/)
- [Reference language model](https://huggingface.co/onnx-community/SmolLM2-135M-Instruct-ONNX-MHA)
- [Recognition model](https://huggingface.co/Xenova/whisper-tiny.en)
- [MMS upstream model and license](https://huggingface.co/facebook/mms-tts-eng)
