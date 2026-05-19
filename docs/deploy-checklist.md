# Deploy Checklist — Agent Auditor to Cloud Run

## Prerequisites

- [ ] GCP project exists and billing is enabled
- [ ] `gcloud` CLI installed and authenticated (`gcloud auth login`)
- [ ] Cloud Run, Artifact Registry, Cloud Build APIs enabled
- [ ] `.env` file exists in `backend/` with your keys

## One-time setup

```bash
gcloud config set project YOUR_PROJECT_ID
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com
```

## Build and deploy

```bash
# Set required env vars
export GCP_PROJECT_ID=your-project-id
export GCP_REGION=us-central1
export GOOGLE_API_KEY=your-gemini-api-key
export PHOENIX_COLLECTOR_ENDPOINT=https://app.phoenix.arize.com/s/your-tenant
export PHOENIX_API_KEY=your-phoenix-api-key

# Deploy
./deploy.sh
```

After deployment, Cloud Run outputs a URL like:
`https://agent-auditor-xxxxx-uc.a.run.app`

## Verify

```bash
export URL="https://agent-auditor-xxxxx-uc.a.run.app"

# Health check
curl -s $URL/health

# List victims
curl -s $URL/api/victims

# Test enterprise victim
curl -s -X POST $URL/api/victim/enterprise_support/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hi, my name is Alex Chen"}'
```

## Set up Phoenix tracing

The env vars above already include Phoenix credentials. After the first audit,
check `app.phoenix.arize.com/s/your-tenant` for traces.

## After deploy

- [ ] Update `README.md` with the live URL
- [ ] Record the demo video against the live URL
- [ ] Submit the hackathon entry
