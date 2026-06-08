"""Tests for OWASP LLM Top 10 mapping."""

import pytest
from datetime import datetime, timezone

from app.models.schemas import (
    AuditResult,
    TestScenario,
    AttackCategory,
    Severity,
    ScenarioStatus,
)
from app.services.owasp_mapping import map_findings_to_owasp, OWASP_LLM_MAP, _CATEGORY_TO_OWASP


def test_owasp_map_has_entries():
    """Should have OWASP classes defined."""
    assert len(OWASP_LLM_MAP) >= 5
    assert "LLM01" in OWASP_LLM_MAP
    assert "LLM06" in OWASP_LLM_MAP


def test_all_attack_categories_mapped():
    """Every attack category should map to at least one OWASP class."""
    for cat in AttackCategory:
        assert cat.value in _CATEGORY_TO_OWASP, f"Missing OWASP mapping for {cat.value}"
        assert len(_CATEGORY_TO_OWASP[cat.value]) >= 1


def test_data_exfiltration_maps_to_LLM02():
    assert "LLM02" in _CATEGORY_TO_OWASP[AttackCategory.DATA_EXFILTRATION.value]
    assert "LLM06" in _CATEGORY_TO_OWASP[AttackCategory.DATA_EXFILTRATION.value]


def _make_result_with_vulns(vulns):
    scenarios = []
    for i, (cat, is_vuln) in enumerate(vulns):
        scenarios.append(TestScenario(
            id=f"s-{i}",
            category=cat,
            name=f"test {cat.value}",
            input="test",
            expected_behavior="test",
            severity=Severity.HIGH,
            status=ScenarioStatus.FAILED if is_vuln else ScenarioStatus.PASSED,
            target_response="test",
            target_tool_calls=[],
            vulnerability_found=is_vuln,
            score=20 if is_vuln else 90,
        ))
    return AuditResult(
        id="owasp-test",
        agent_name="test",
        started_at=datetime.now(timezone.utc),
        scenarios=scenarios,
    )


def test_map_prompt_injection_findings():
    result = _make_result_with_vulns([
        (AttackCategory.PROMPT_INJECTION, True),
        (AttackCategory.PROMPT_INJECTION, True),
        (AttackCategory.EDGE_CASE, False),
    ])
    owasp = map_findings_to_owasp(result)
    assert owasp["audit_id"] == "owasp-test"
    assert owasp["total_mapped_vulnerabilities"] == 2
    # LLM01 should have 2 hits
    l01 = [c for c in owasp["owasp_classes"] if c["id"] == "LLM01"]
    assert len(l01) == 1
    assert l01[0]["vulnerability_count"] == 2


def test_map_no_vulnerabilities():
    result = _make_result_with_vulns([
        (AttackCategory.PROMPT_INJECTION, False),
        (AttackCategory.EDGE_CASE, False),
    ])
    owasp = map_findings_to_owasp(result)
    assert owasp["total_mapped_vulnerabilities"] == 0
    assert owasp["classes_affected"] == 0
    assert owasp["owasp_classes"] == []


def test_map_multiple_owasp_classes():
    """A single vulnerability category can map to multiple OWASP classes."""
    result = _make_result_with_vulns([
        (AttackCategory.DATA_EXFILTRATION, True),
    ])
    owasp = map_findings_to_owasp(result)
    class_ids = {c["id"] for c in owasp["owasp_classes"]}
    assert "LLM02" in class_ids
    assert "LLM06" in class_ids


def test_map_sorted_by_count():
    result = _make_result_with_vulns([
        (AttackCategory.PROMPT_INJECTION, True),
        (AttackCategory.PROMPT_INJECTION, True),
        (AttackCategory.PROMPT_INJECTION, True),
        (AttackCategory.PROMPT_EXTRACTION, True),
    ])
    owasp = map_findings_to_owasp(result)
    counts = [c["vulnerability_count"] for c in owasp["owasp_classes"]]
    assert counts == sorted(counts, reverse=True)
