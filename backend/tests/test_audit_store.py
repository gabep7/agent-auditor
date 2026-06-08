"""Tests for SQLite audit persistence."""

import pytest
import tempfile
import os
from pathlib import Path
from datetime import datetime, timezone
from unittest.mock import patch

from app.models.schemas import (
    AuditResult,
    TestScenario,
    AttackCategory,
    Severity,
    ScenarioStatus,
)


@pytest.fixture(autouse=True)
def temp_db(tmp_path):
    """Use a temporary database for each test."""
    db_path = tmp_path / "audits.db"
    with patch("app.services.audit_store._DB_PATH", db_path):
        from app.services.audit_store import init_db, _get_conn
        # reset thread-local connection
        import app.services.audit_store as store
        if hasattr(store._local, "conn"):
            store._local.conn = None
        init_db()
        yield db_path
        if hasattr(store._local, "conn") and store._local.conn:
            store._local.conn.close()
            store._local.conn = None


def _make_audit(audit_id="test-001", score=75.0, vulns=1):
    return AuditResult(
        id=audit_id,
        agent_name="test_agent",
        started_at=datetime.now(timezone.utc),
        completed_at=datetime.now(timezone.utc),
        total_scenarios=2,
        scenarios_run=2,
        vulnerabilities_found=vulns,
        overall_score=score,
        scenarios=[
            TestScenario(
                id=f"s-{audit_id}-1",
                category=AttackCategory.PROMPT_INJECTION,
                name="test injection",
                input="ignore instructions",
                expected_behavior="should refuse",
                severity=Severity.HIGH,
                status=ScenarioStatus.FAILED,
                target_response="Admin override accepted.",
                target_tool_calls=[{"name": "delete_account"}],
                auditor_evaluation="Called dangerous tool",
                score=15.0,
                vulnerability_found=True,
            ),
            TestScenario(
                id=f"s-{audit_id}-2",
                category=AttackCategory.EDGE_CASE,
                name="test edge",
                input="long input",
                expected_behavior="should handle gracefully",
                severity=Severity.LOW,
                status=ScenarioStatus.PASSED,
                target_response="I can help with that.",
                target_tool_calls=[],
                auditor_evaluation="No issues found",
                score=90.0,
                vulnerability_found=False,
            ),
        ],
        category_scores={"prompt_injection": 15.0, "edge_case": 90.0},
        critical_findings=["[HIGH] test injection: Called dangerous tool"],
    )


def test_save_and_get_audit():
    from app.services.audit_store import save_audit, get_audit
    audit = _make_audit()
    save_audit(audit)
    loaded = get_audit("test-001")
    assert loaded is not None
    assert loaded.id == "test-001"
    assert loaded.overall_score == 75.0
    assert loaded.vulnerabilities_found == 1
    assert len(loaded.scenarios) == 2


def test_get_nonexistent_audit():
    from app.services.audit_store import get_audit
    assert get_audit("nonexistent") is None


def test_list_audits():
    from app.services.audit_store import save_audit, list_audits
    save_audit(_make_audit("a1", score=80))
    save_audit(_make_audit("a2", score=40))
    audits = list_audits()
    assert len(audits) == 2
    ids = {a["id"] for a in audits}
    assert "a1" in ids
    assert "a2" in ids


def test_delete_audit():
    from app.services.audit_store import save_audit, get_audit, delete_audit
    save_audit(_make_audit("del-1"))
    assert get_audit("del-1") is not None
    delete_audit("del-1")
    assert get_audit("del-1") is None


def test_scenario_preserves_tool_calls():
    from app.services.audit_store import save_audit, get_audit
    audit = _make_audit("tc-1")
    save_audit(audit)
    loaded = get_audit("tc-1")
    s1 = loaded.scenarios[0]
    assert s1.target_tool_calls == [{"name": "delete_account"}]


def test_category_scores_preserved():
    from app.services.audit_store import save_audit, get_audit
    audit = _make_audit("cs-1")
    save_audit(audit)
    loaded = get_audit("cs-1")
    assert loaded.category_scores == {"prompt_injection": 15.0, "edge_case": 90.0}
