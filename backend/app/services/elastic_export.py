"""Elasticsearch export for audit results.

Optional integration that pushes audit findings to Elasticsearch for
search, dashboards, and alerting. Activated by setting the
ELASTIC_ENDPOINT environment variable.

Uses the Elasticsearch REST API directly via httpx to avoid adding
a heavyweight dependency (elasticsearch-py is ~50MB).
"""

from __future__ import annotations

import json
import os
from typing import Optional

import httpx


def _elastic_config() -> tuple[Optional[str], Optional[str]]:
    """Return (endpoint, api_key) from env. Returns (None, None) if not configured."""
    endpoint = (os.environ.get("ELASTIC_ENDPOINT") or "").strip().rstrip("/")
    api_key = (os.environ.get("ELASTIC_API_KEY") or "").strip()
    if not endpoint:
        return None, None
    return endpoint, api_key


async def export_audit_to_elastic(audit_id: str, audit_data: dict) -> Optional[dict]:
    """Export a completed audit to Elasticsearch.

    Indexes the full audit as a single document under the
    'agent-auditor-audits' index. Returns the ES response on success,
    None on failure or if Elastic is not configured.
    """
    endpoint, api_key = _elastic_config()
    if not endpoint:
        return None

    index_name = "agent-auditor-audits"
    url = f"{endpoint}/{index_name}/_doc/{audit_id}"

    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"ApiKey {api_key}"

    # flatten for ES: extract key metrics as top-level fields
    doc = {
        "audit_id": audit_id,
        "agent_name": audit_data.get("agent_name", ""),
        "overall_score": audit_data.get("overall_score"),
        "vulnerabilities_found": audit_data.get("vulnerabilities_found", 0),
        "scenarios_run": audit_data.get("scenarios_run", 0),
        "category_scores": audit_data.get("category_scores", {}),
        "critical_findings": audit_data.get("critical_findings", []),
        "started_at": str(audit_data.get("started_at", "")),
        "completed_at": str(audit_data.get("completed_at", "")),
        "scenarios": [
            {
                "id": s.get("id"),
                "category": s.get("category"),
                "name": s.get("name"),
                "severity": s.get("severity"),
                "score": s.get("score"),
                "vulnerability_found": s.get("vulnerability_found"),
                "remediation": (s.get("remediation") or "")[:500],
            }
            for s in audit_data.get("scenarios", [])
        ],
    }

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.put(url, json=doc, headers=headers)
            if resp.status_code < 300:
                return resp.json()
            return None
    except Exception:
        return None


async def ensure_elastic_index() -> bool:
    """Create the agent-auditor-audits index with mappings if it doesn't exist."""
    endpoint, api_key = _elastic_config()
    if not endpoint:
        return False

    index_name = "agent-auditor-audits"
    url = f"{endpoint}/{index_name}"

    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"ApiKey {api_key}"

    mappings = {
        "mappings": {
            "properties": {
                "audit_id": {"type": "keyword"},
                "agent_name": {"type": "keyword"},
                "overall_score": {"type": "float"},
                "vulnerabilities_found": {"type": "integer"},
                "scenarios_run": {"type": "integer"},
                "category_scores": {"type": "object", "enabled": False},
                "critical_findings": {"type": "text"},
                "started_at": {"type": "date"},
                "completed_at": {"type": "date"},
            }
        }
    }

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            # check if exists first
            head = await client.head(url, headers=headers)
            if head.status_code == 200:
                return True
            resp = await client.put(url, json=mappings, headers=headers)
            return resp.status_code < 300
    except Exception:
        return False
