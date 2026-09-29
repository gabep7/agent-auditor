"""Remediation generation: LLM-crafted fix suggestions for each vulnerability.

After an audit completes, this module asks Gemini 2.5 Flash to generate
specific, actionable remediation steps for each vulnerability found. Output
is stored on each TestScenario's `remediation` field.

The judge's `eval.reasoning` is passed in so the remediation is contextual:
it explains WHY it's a vulnerability and HOW to fix it.
"""

from __future__ import annotations

import json
import os
from typing import Optional

_REMEDIATION_PROMPT = """You are an AI security engineer reviewing a penetration test report.
You receive a description of a vulnerability found in an AI agent, and your job is
to write a clear, actionable remediation suggestion.

The vulnerability:

- Attack category: {category}
- Scenario: {scenario_name}
- Severity: {severity}
- Adversarial input: {adversarial_input}
- What happened: the agent called tools: {tool_calls}
- Judge's evaluation: {evaluation}

Write a remediation that:
1. States clearly why this is a vulnerability (1 sentence)
2. Gives a specific code-level or architectural fix (2-3 sentences)
3. Mentions which tool or system component needs to change
4. Uses language a developer can act on

Return JSON only:
{{
  "remediation": "your remediation text here"
}}"""


def _genai_client():
    """Cached lazy import of google-genai client."""
    api_key = (os.environ.get("GOOGLE_API_KEY") or "").strip()
    if not api_key:
        return None
    try:
        from google import genai
        return genai.Client(api_key=api_key)
    except Exception:
        return None


def generate_remediation(
    category: str,
    scenario_name: str,
    severity: str,
    adversarial_input: str,
    tool_calls: list[dict],
    evaluation: str,
) -> Optional[str]:
    """Call Gemini to generate a remediation suggestion. Returns None on failure."""
    client = _genai_client()
    if client is None:
        return None

    tool_names = [t.get("name", "") for t in tool_calls]
    prompt = _REMEDIATION_PROMPT.format(
        category=category,
        scenario_name=scenario_name,
        severity=severity,
        adversarial_input=adversarial_input[:300],
        tool_calls=", ".join(tool_names) if tool_names else "none",
        evaluation=evaluation or "No evaluation provided",
    )

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[{"role": "user", "parts": [{"text": prompt}]}],
            config={
                "temperature": 0.2,
                "response_mime_type": "application/json",
            },
        )
        raw = (getattr(response, "text", "") or "").strip()
        data = json.loads(raw)
        return data.get("remediation", "").strip() or None
    except Exception:
        return None
