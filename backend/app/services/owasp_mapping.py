"""OWASP LLM Top 10 (2025) mapping for audit findings.

Maps each attack category to the relevant OWASP LLM vulnerability class
so judges and reviewers can see how findings relate to industry standards.
"""

from __future__ import annotations

from app.models.schemas import AuditResult, AttackCategory

# OWASP LLM Top 10 (2025) mappings
OWASP_LLM_MAP: dict[str, dict] = {
    "LLM01": {
        "id": "LLM01",
        "name": "Prompt Injection",
        "desc": "Manipulating LLM via crafted inputs to execute unintended actions",
    },
    "LLM02": {
        "id": "LLM02",
        "name": "Sensitive Information Disclosure",
        "desc": "Unauthorized access to confidential data through LLM responses",
    },
    "LLM05": {
        "id": "LLM05",
        "name": "Improper Output Handling",
        "desc": "LLM output used downstream without validation, enabling injection",
    },
    "LLM06": {
        "id": "LLM06",
        "name": "Excessive Agency",
        "desc": "LLM granted excessive permissions, autonomy, or functionality",
    },
    "LLM07": {
        "id": "LLM07",
        "name": "System Prompt Leakage",
        "desc": "Exposure of system prompts revealing internal logic and controls",
    },
    "LLM08": {
        "id": "LLM08",
        "name": "Vector and Embedding Weaknesses",
        "desc": "Vulnerabilities in RAG retrieval pipelines",
    },
    "LLM09": {
        "id": "LLM09",
        "name": "Misinformation",
        "desc": "LLM producing inaccurate or misleading outputs",
    },
    "LLM10": {
        "id": "LLM10",
        "name": "Unbounded Consumption",
        "desc": "Excessive resource usage leading to denial of service or cost overruns",
    },
}

# Map attack categories to OWASP classes
_CATEGORY_TO_OWASP: dict[str, list[str]] = {
    AttackCategory.PROMPT_INJECTION.value: ["LLM01"],
    AttackCategory.INDIRECT_INJECTION.value: ["LLM01"],
    AttackCategory.PARAMETER_ATTACK.value: ["LLM05", "LLM06"],
    AttackCategory.TOOL_MISUSE.value: ["LLM06"],
    AttackCategory.DATA_EXFILTRATION.value: ["LLM02", "LLM06"],
    AttackCategory.PROMPT_EXTRACTION.value: ["LLM07"],
    AttackCategory.CONTEXT_EXHAUSTION.value: ["LLM10"],
    AttackCategory.CONTRADICTORY.value: ["LLM06"],
    AttackCategory.MULTI_TURN.value: ["LLM01", "LLM06"],
    AttackCategory.EDGE_CASE.value: ["LLM05"],
}


def map_findings_to_owasp(result: AuditResult) -> dict:
    """Map audit findings to OWASP LLM Top 10 categories."""
    owasp_hits: dict[str, dict] = {}

    for scenario in result.scenarios:
        if not scenario.vulnerability_found:
            continue
        cat = scenario.category.value
        owasp_ids = _CATEGORY_TO_OWASP.get(cat, [])
        for oid in owasp_ids:
            if oid not in owasp_hits:
                owasp_hits[oid] = {
                    **OWASP_LLM_MAP[oid],
                    "vulnerability_count": 0,
                    "scenarios": [],
                }
            owasp_hits[oid]["vulnerability_count"] += 1
            owasp_hits[oid]["scenarios"].append({
                "id": scenario.id,
                "name": scenario.name,
                "severity": scenario.severity.value,
                "score": scenario.score,
                "category": cat,
            })

    sorted_classes = sorted(owasp_hits.values(), key=lambda x: x["vulnerability_count"], reverse=True)

    return {
        "audit_id": result.id,
        "owasp_classes": sorted_classes,
        "total_mapped_vulnerabilities": sum(h["vulnerability_count"] for h in owasp_hits.values()),
        "classes_affected": len(owasp_hits),
    }
