"""Phoenix tracing setup for the Agent Auditor.

Mirrors the Arize/Google ADK reference pattern:
https://arize.com/docs/phoenix/integrations/python/google-adk/google-adk-tracing

`setup_tracing()` MUST be called before any `google.adk` import so that
OpenInference auto-instrumentation can attach to ADK at module import time.

Required env vars:
    PHOENIX_API_KEY
    PHOENIX_COLLECTOR_ENDPOINT
Optional:
    PHOENIX_PROJECT_NAME (defaults to "agent-auditor")
"""

from __future__ import annotations

import os
from typing import Any, Optional

_provider: Optional[Any] = None


def setup_tracing() -> Optional[Any]:
    """Initialise Phoenix tracing once. Returns the tracer provider or None."""
    global _provider
    if _provider is not None:
        return _provider

    api_key = (os.environ.get("PHOENIX_API_KEY") or "").strip()
    endpoint = (os.environ.get("PHOENIX_COLLECTOR_ENDPOINT") or "").strip()
    if not (api_key and endpoint):
        print(
            "Phoenix tracing skipped: set PHOENIX_API_KEY and "
            "PHOENIX_COLLECTOR_ENDPOINT in .env to enable"
        )
        return None

    try:
        from phoenix.otel import register
    except ImportError as e:
        print(f"Phoenix tracing skipped: arize-phoenix not installed: {e}")
        return None

    project_name = os.environ.get("PHOENIX_PROJECT_NAME", "agent-auditor")
    try:
        _provider = register(
            project_name=project_name,
            batch=False,
            auto_instrument=True,
            verbose=False,
        )
        print(f"Phoenix tracing enabled → project={project_name} endpoint={endpoint}")
    except Exception as e:
        print(f"Phoenix tracing setup failed: {e}")
        return None

    # Best-effort: instrument outbound HTTPX calls to victims so each scenario
    # request appears as a child span of the audit.scenario.* parent span.
    try:
        from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor

        HTTPXClientInstrumentor().instrument()
    except Exception:
        pass

    return _provider


def phoenix_project_url() -> str:
    """Build a UI URL pointing at the Phoenix project for a given audit."""
    endpoint = (os.environ.get("PHOENIX_COLLECTOR_ENDPOINT") or "").rstrip("/")
    project = os.environ.get("PHOENIX_PROJECT_NAME", "agent-auditor")
    if not endpoint:
        return ""
    return f"{endpoint}/projects?project={project}"
