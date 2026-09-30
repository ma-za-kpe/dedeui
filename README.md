# DeDe testing room

**Current implementation update, 2026-09-30:** the new browser-only path supersedes the workshop setup below. Google sign-in is required before sending. Model downloads are explicit; speech recognition, reply generation and speech synthesis run in a worker on the device, with no Vast fallback. `/api/turn` is retired (410). This reference-model bundle is not a trained or law-qualified DeDe release, and tab history is not backed up. Read [browser inference and authentication](docs/local-inference.md) and the task ledger for verification status. The older workshop instructions below describe historical testing, not the new send path.

Temporary synthetic-only PWA, not the production mobile app. Brand/font reused from DeDe;
font licence: `public/fonts/OFL-Next.txt`. No model replies are mocked.

The UI opens directly into one household conversation: DeDe as a contact, an open thread,
and a bottom voice-note composer. Tap to record, stop, listen back, then explicitly send.
Text and audio-file attachment are nearby options; settings, memory and safety live in the contact menu. Microphone preview
works locally in a supported browser; sending a recording requires a configured speech-capable
core. The current CPU candidate remains explicitly text-only during the protected sweep.
Photo/document reading, persistent vault and beacon delivery remain pending, with status shown
in the UI. See the [household design audit](docs/household-ui-audit.md) and
[Firebase and R2 backend proposal](docs/firebase-r2-plan.md).

## Background runtime (Docker only)

```sh
docker compose up --build -d
```

Open http://localhost:3000. User approved stopping `crown-app` for this port; its validation
container is untouched. Logs: `docker compose logs --tail 60 web`. Stop this app only:
`docker compose stop web`. Restore crown later with `docker start crown-app` after freeing port 3000.

Default: **live inference disabled**. Navigation, composer and recording preview do not send model
requests. Messages live in tab memory only; refreshing loses them. Nothing is backed up. No biometric
authentication, persistent memory or beacon delivery. Offline fallback is a notice, not inference.

## Real backend testing — operator setup required

After coordinating with the population sweep, supply `DEDE_ENABLE_LIVE=true`, `DEDE_CORE_URL`
pointing to a private SSH tunnel, and `DEDE_API_TOKEN` through runtime-only external configuration.
Never put tokens in public variables, browser settings, Git, build arguments or logs. Override the
compose disabled flag explicitly; do not expose the app beyond loopback without authentication.
Docker Desktop can reach a separately configured host tunnel via `host.docker.internal`.

Candidate setup: Compose optionally reads the owner-only external
`~/.config/dede/ui.env` (override path with `DEDE_UI_ENV_FILE`). It must provide the core URL/token
and `DEDE_EXPECTED_MODEL`, `DEDE_EXPECTED_QUANTIZATION`, `DEDE_EXPECTED_ARTIFACT_SHA256`.
Do not use the shared teacher API as though it were the student. A separate candidate core must
point at the intended quantized server and publish matching `DEDE_LLM_MODEL`,
`DEDE_LLM_QUANTIZATION`, `DEDE_LLM_ARTIFACT_SHA256` configuration. The authenticated
`/v1/model-info` endpoint identifies the isolated candidate. An alias alone is insufficient;
the operator must independently hash the actual loaded artifact. Matching metadata is not attestation.

The Settings connection button checks only that metadata, with no model or speech request. Sending additionally
requires `DEDE_ENABLE_LIVE=true` in the Compose invocation, matching identity, and synthetic-only
service health. During the sweep, use only the separately inspected isolated CPU candidate,
not the shared GPU/speech services. No model or speech requests were made for the household UI audit.

The server verifies synthetic-only health, submits `/v1/shares`, then runs the real
`/v1/dev/turns/{id}/run` endpoint. This is a **buffered dev adapter**, not production streaming.
Audio sentences are playable after completion. No fallback-generated replies or automatic retries.
The core currently starts without persistent context: displaying a chat history is not memory.
Recordings stop at 30 seconds. Fictional input only; never use this for emergencies.

Origin checks and one-process concurrency limits are not production auth/rate limiting. Phone access
needs an approved HTTPS hosting/tunnel and authentication plan; localhost on a phone is not the Mac.

Docker build runs ESLint and production build/type checks. Browser installation, microphone and
audio behavior require actual device tests. Service worker caches only the public offline notice.
See `TASKS.md` for remaining work and evidence.

## Isolated experimental text-only candidate

`DEDE_TEST_MODE=experimental_text` selects an explicit no-speech path using the same real
shares/graph/model protocol. The isolated core must advertise `mode: text_only` in authenticated
model metadata and health, with `perception: null`. Missing or mismatched mode blocks submission.
The browser allows local recording preview, identifies voice sending as pending, and the server rejects
audio uploads before contacting the core. Audio events in a text-only response are a contract error;
there is no substitute speech or stub. `DEDE_ENABLE_LIVE=true` and the artifact identity checks are
still required. The default mode is `voice`; unknown values fail closed.

This does not run a model on the Mac or in the browser. The operator must separately verify the
Vast candidate's actual artifact, CPU-only serving configuration, isolated core/tunnel and resource
budget before enabling it during a sweep. Do not point this mode at the shared voice core or restart
the sweep's services. Training a fresh model and qualifying it are separate tasks. These code changes
alone neither generate weights nor enable a connection. Connection metadata may be fetched on page
load; it never requests model inference. Real turns only happen after pressing Send.
