# Changelog

Frontend releases are independent of backend and student-model versions. This project is experimental; a published release is not a model, safety or physical-device qualification.

## 0.1.0 — 2026-09-30

First published frontend preview.

### Included

- Mobile-first, audio-first conversation interface with optional text/audio-file input and light/dark themes.
- Google sign-in required before sending; interim adults-only declaration and explicit minor-age guard.
- Browser-local reference-model download, transcription, text generation and speech synthesis infrastructure; no automatic Vast fallback.
- Static GitHub Pages deployment following green main CI, with subpath-aware assets and service worker.
- Docker-only staged pre-commit checks: repository security checks, zero-warning lint, unit tests, dependency audit and production build.

### Verification

- 26 unit tests, lint, dependency audit and production compilation passed.
- Pages export and mobile-browser checks passed: assets/font, Settings navigation, scoped service worker and no failed requests or page errors.
- Player-only soak passed 20 rounds / 40 audio chunks; this is not a complete speech-model integration test.

### Known limitations

- Conversations live only in tab memory: no encrypted vault, durable notes or backup. Do not use as the only copy of important information.
- The current reference model is not the trained DeDe student. Student-v3 is not bundled, published or connected by this release.
- Actual Google OAuth, full-model voice integration and physical-phone qualification remain unverified.
- Age declaration is not verified age; persistent age state and backend age-signal parity remain unfinished.
- No emergency call or beacon delivery. Urgent-help instructions are informational only.
- Reference speech synthesis is non-commercial; production model/runtime/licence review remains open.

### Release procedure

1. Update package/lockfile versions together when changing the version, and add a changelog entry.
2. Submit a PR into `main`; merge only after CI passes. Never push release changes directly to `main`.
3. Verify the merge commit's CI and Pages deployment.
4. Publish the matching `vX.Y.Z` tag and GitHub release against that exact merge commit. Mark previews as pre-releases.
5. Do not attach model weights, credentials, conversations or vault data to frontend releases.
