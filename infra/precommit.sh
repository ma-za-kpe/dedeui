#!/usr/bin/env bash
# Check the exact index tree without stashing or changing the working directory.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
command -v docker >/dev/null || { echo 'BLOCKED: Docker is required.' >&2; exit 1; }
docker info >/dev/null 2>&1 || { echo 'BLOCKED: Start Docker before committing.' >&2; exit 1; }
if [[ "${1:-}" == '--head' ]]; then
  snapshot=$(git rev-parse HEAD^{tree})
else
  git diff --cached --check
  snapshot=$(git write-tree)
fi
echo "Checking exact Git snapshot $snapshot in Docker (no model calls)."
git archive "$snapshot" | docker build --file Dockerfile.gates --build-arg "AUDIT_EPOCH=$(date +%s)" --tag "dede-ui-gates:$snapshot" -
echo 'PASS: snapshot security, zero-warning lint, unit tests, dependency audit and production build.'
