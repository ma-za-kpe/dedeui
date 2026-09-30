"""Loopback synthetic voice candidate on Vast; no model/speech substitutions.

Run with PYTHONPATH set to the pinned core release, not the mutable current link.
Uses the existing hashed CPU Q4 model and warmed real perception service.
Never reads user-vault data or restarts the shared API. Credentials are not logged.
"""

import hashlib
import json
import os
from pathlib import Path

import uvicorn
from fastapi.responses import JSONResponse

from dede.api.app import create_app
from dede.config import Settings


def main() -> None:
    os.umask(0o077)
    artifact = Path("/opt/dede/workshop-baseline/artifacts/student-q4_k_m.gguf")
    expected = "f3f95818d324e151f85ba4278b8dba220812bcc25412dc54a421eabcef2cbe54"
    with artifact.open("rb") as stream:
        if hashlib.file_digest(stream, "sha256").hexdigest() != expected:
            raise SystemExit("Candidate artifact mismatch")
    private = Path("/opt/dede/pwa-candidate-private/token.json")
    if private.stat().st_mode & 0o077:
        raise SystemExit("Candidate credential must be private")
    token = json.loads(private.read_text())["token"]
    cfg = Settings(
        _env_file=None,
        api_token=token,
        dev_routes=True,
        user_data_allowed=False,
        llm_base_url="http://127.0.0.1:18081/v1",
        llm_model=str(artifact),
        llm_artifact_sha256=expected,
        llm_quantization="Q4_K_M",
        llm_first_token_timeout_s=120,
        llm_total_timeout_s=120,
        perception_url="http://127.0.0.1:8002",
    )
    app = create_app(cfg)

    @app.middleware("http")
    async def explicit_voice_mode(request, call_next):
        response = await call_next(request)
        if request.url.path not in {"/healthz", "/v1/model-info"} or response.status_code != 200:
            return response
        body = b"".join([chunk async for chunk in response.body_iterator])
        data = json.loads(body)
        data["mode"] = "voice"
        # Mode declares real perception use; health values are those of actual services.
        return JSONResponse(data, headers={"Cache-Control": "no-store"})

    uvicorn.run(app, host="127.0.0.1", port=18086, access_log=False)


if __name__ == "__main__":
    main()
