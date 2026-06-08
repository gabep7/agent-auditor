"""Tests for report generation and scoring logic."""

import pytest
from datetime import datetime, timezone
from unittest.mock import patch

from app.models.schemas import (
    AuditResult,
    TestScenario,
    AttackCategory,
    Severity,
    ScenarioStatus,
)
from app.services.report_generator import generate_report, _fallback_remediation


def _make_scenario(name="test", category=AttackCategory.PROMPT_INJECTION,
                   vuln=False, score=80.0, severity=Severity.MEDIUM):
    return TestScenario(
        id=f"s-{name}",
        category=category,
        name=name,
        input="test input",
        expected_behavior="should refuse",
        severity=severity,
        status=ScenarioStatus.FAILED if vuln else ScenarioStatus.PASSED,
        target_response="test response",
        target_tool_calls=[],
        auditor_evaluation="test eval",
        score=score,
        vulnerability_found=vuln,
    )


def _make_result(scenarios):
    return AuditResult(
        id="test-report",
        agent_name="test_agent",
        started_at=datetime.now(timezone.utc),
        total_scenarios=len(scenarios),
        scenarios=scenarios,
    )


@patch("app.services.report_generator.apply_eval_to_scenario", side_effect=lambda s: s)
@patch("app.services.report_generator.generate_remediation", return_value=None)
def test_report_all_pass(mock_rem, mock_eval):
    """All passing scenarios should yield a high score."""
    scenarios = [
        _make_scenario(f"s{i}", score=95, vuln=False) for i in range(5)
    ]
    result = generate_report(_make_result(scenarios))
    assert result.overall_score >= 85
    assert result.vulnerabilities_found == 0
    assert result.critical_findings == []


@patch("app.services.report_generator.apply_eval_to_scenario", side_effect=lambda s: s)
@patch("app.services.report_generator.generate_remediation", return_value=None)
def test_report_all_fail(mock_rem, mock_eval):
    """All failing critical scenarios should yield a low score."""
    scenarios = [
        _make_scenario(f"s{i}", score=10, vuln=True, severity=Severity.CRITICAL)
        for i in range(5)
    ]
    result = generate_report(_make_result(scenarios))
    assert result.overall_score < 30
    assert result.vulnerabilities_found == 5
    assert len(result.critical_findings) == 5


@patch("app.services.report_generator.apply_eval_to_scenario", side_effect=lambda s: s)
@patch("app.services.report_generator.generate_remediation", return_value=None)
def test_report_mixed(mock_rem, mock_eval):
    """Mix of passing and failing should produce a moderate score."""
    scenarios = [
        _make_scenario("safe1", score=95, vuln=False),
        _make_scenario("safe2", score=90, vuln=False),
        _make_scenario("vuln1", score=20, vuln=True, severity=Severity.HIGH),
    ]
    result = generate_report(_make_result(scenarios))
    assert 30 < result.overall_score < 80
    assert result.vulnerabilities_found == 1


@patch("app.services.report_generator.apply_eval_to_scenario", side_effect=lambda s: s)
@patch("app.services.report_generator.generate_remediation", return_value=None)
def test_report_category_scores(mock_rem, mock_eval):
    """Category scores should be computed per category."""
    scenarios = [
        _make_scenario("pi", category=AttackCategory.PROMPT_INJECTION, score=30, vuln=True, severity=Severity.HIGH),
        _make_scenario("ee", category=AttackCategory.EDGE_CASE, score=95, vuln=False),
    ]
    result = generate_report(_make_result(scenarios))
    assert "prompt_injection" in result.category_scores
    assert "edge_case" in result.category_scores
    assert result.category_scores["edge_case"] > result.category_scores["prompt_injection"]


@patch("app.services.report_generator.apply_eval_to_scenario", side_effect=lambda s: s)
@patch("app.services.report_generator.generate_remediation", return_value=None)
def test_report_completed_at_set(mock_rem, mock_eval):
    result = generate_report(_make_result([
        _make_scenario("s1", score=80, vuln=False),
    ]))
    assert result.completed_at is not None


def test_fallback_remediation():
    s = _make_scenario(vuln=True)
    s.target_tool_calls = [{"name": "delete_account"}]
    rem = _fallback_remediation(s)
    assert "delete_account" in rem
    assert "authorization" in rem.lower() or "validate" in rem.lower()
