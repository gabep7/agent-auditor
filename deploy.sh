#!/bin/bash
set -euo pipefail

# ── Agent Auditor — Cloud Run Deployment Script ──────────────
# Prerequisites:
#   1. gcloud CLI installed and authenticated
#   2. A GCP project with Cloud Run, Artifact Registry, and Cloud Build enabled
#   3. .env file with GOOGLE_API_KEY, PHOENIX_API_KEY, PHOENIX_COLLECTOR_ENDPOINT

PROJECT_ID="${GCP_PROJECT_ID:?Set GCP_PROJECT_ID}"
REGION="${GCP_REGION:-us-central1}"
SERVICE_NAME="agent-auditor"

echo "═══════════════════════════════════════════"
echo "  Agent Auditor — Cloud Run Deploy"
echo "  Project: ${PROJECT_ID}"
echo "  Region:  ${REGION}"
echo "═══════════════════════════════════════════"

# Build and deploy in one step (auto-detects Dockerfile.cloudrun)
echo "🔨 Building and deploying to Cloud Run..."
gcloud run deploy "${SERVICE_NAME}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --source="." \
  --allow-unauthenticated \
  --memory=2Gi \
  --cpu=2 \
  --timeout=300 \
  --set-env-vars="GOOGLE_API_KEY=${GOOGLE_API_KEY:?Set GOOGLE_API_KEY}" \
  --set-env-vars="PHOENIX_COLLECTOR_ENDPOINT=${PHOENIX_COLLECTOR_ENDPOINT:-}" \
  --set-env-vars="PHOENIX_API_KEY=${PHOENIX_API_KEY:-}" \
  --set-env-vars="PHOENIX_PROJECT_NAME=${PHOENIX_PROJECT_NAME:-agent-auditor}"

URL=$(gcloud run services describe "${SERVICE_NAME}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --format='value(status.url)')

echo ""
echo "═══════════════════════════════════════════"
echo "  ✅ Deployed successfully!"
echo "  🌐 URL: ${URL}"
echo "═══════════════════════════════════════════"
