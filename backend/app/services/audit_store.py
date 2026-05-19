"""Persistent audit storage using SQLite.

Replaces the in-memory dicts (_audits, _registered_agents) so audit history
survives restarts and the Reports page shows real data even without Phoenix.

Uses Python's built-in sqlite3 module — zero new dependencies.
"""

from __future__ import annotations

import json
import sqlite3
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from app.models.schemas import (
    AuditResult,
    TestScenario,
    AttackCategory,
    Severity,
    ScenarioStatus,
)

_DB_PATH = Path(__file__).resolve().parent.parent / "data" / "audits.db"
_local = threading.local()


def _get_conn() -> sqlite3.Connection:
    """Get a thread-local connection to the SQLite database."""
    if not hasattr(_local, "conn") or _local.conn is None:
        _DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(str(_DB_PATH))
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        _local.conn = conn
    return _local.conn


def init_db():
    """Create tables if they don't exist. Safe to call on every startup."""
    conn = _get_conn()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS agents (
            name TEXT PRIMARY KEY,
            description TEXT NOT NULL DEFAULT '',
            endpoint TEXT NOT NULL DEFAULT '',
            tools_json TEXT NOT NULL DEFAULT '[]',
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS audits (
            id TEXT PRIMARY KEY,
            agent_name TEXT NOT NULL,
            victim_type TEXT NOT NULL DEFAULT '',
            started_at TEXT NOT NULL,
            completed_at TEXT,
            total_scenarios INTEGER NOT NULL DEFAULT 0,
            scenarios_run INTEGER NOT NULL DEFAULT 0,
            vulnerabilities_found INTEGER NOT NULL DEFAULT 0,
            overall_score REAL,
            category_scores_json TEXT NOT NULL DEFAULT '{}',
            critical_findings_json TEXT NOT NULL DEFAULT '[]'
        );

        CREATE TABLE IF NOT EXISTS scenarios (
            id TEXT PRIMARY KEY,
            audit_id TEXT NOT NULL,
            category TEXT NOT NULL,
            name TEXT NOT NULL,
            input TEXT NOT NULL DEFAULT '',
            expected_behavior TEXT NOT NULL DEFAULT '',
            severity TEXT NOT NULL DEFAULT 'medium',
            status TEXT NOT NULL DEFAULT 'pending',
            target_response TEXT,
            target_tool_calls_json TEXT NOT NULL DEFAULT '[]',
            auditor_evaluation TEXT,
            score REAL,
            vulnerability_found INTEGER NOT NULL DEFAULT 0,
            turn_index INTEGER NOT NULL DEFAULT 0,
            session_id TEXT,
            FOREIGN KEY (audit_id) REFERENCES audits(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_scenarios_audit
            ON scenarios(audit_id);
        CREATE INDEX IF NOT EXISTS idx_scenarios_session
            ON scenarios(session_id);
    """)
    conn.commit()


# ── Agent registration ──────────────────────────────────────────────────


def save_agent(name: str, description: str, endpoint: str, tools: list[dict]):
    conn = _get_conn()
    conn.execute(
        "INSERT OR REPLACE INTO agents (name, description, endpoint, tools_json) VALUES (?, ?, ?, ?)",
        (name, description, endpoint, json.dumps(tools)),
    )
    conn.commit()


def get_agent(name: str) -> Optional[dict]:
    conn = _get_conn()
    row = conn.execute("SELECT * FROM agents WHERE name = ?", (name,)).fetchone()
    if row is None:
        return None
    return dict(row)


def list_agents() -> list[dict]:
    conn = _get_conn()
    return [dict(r) for r in conn.execute("SELECT * FROM agents ORDER BY created_at DESC").fetchall()]


# ── Audit CRUD ──────────────────────────────────────────────────────────


def save_audit(audit: AuditResult) -> AuditResult:
    conn = _get_conn()
    conn.execute(
        """INSERT OR REPLACE INTO audits
           (id, agent_name, victim_type, started_at, completed_at,
            total_scenarios, scenarios_run, vulnerabilities_found,
            overall_score, category_scores_json, critical_findings_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            audit.id,
            audit.agent_name,
            getattr(audit, "victim_type", ""),
            audit.started_at.isoformat() if audit.started_at else datetime.now(timezone.utc).isoformat(),
            audit.completed_at.isoformat() if audit.completed_at else None,
            audit.total_scenarios,
            audit.scenarios_run,
            audit.vulnerabilities_found,
            audit.overall_score,
            json.dumps(audit.category_scores),
            json.dumps(audit.critical_findings),
        ),
    )
    # Save scenarios
    conn.execute("DELETE FROM scenarios WHERE audit_id = ?", (audit.id,))
    for i, s in enumerate(audit.scenarios):
        conn.execute(
            """INSERT INTO scenarios
               (id, audit_id, category, name, input, expected_behavior,
                severity, status, target_response, target_tool_calls_json,
                auditor_evaluation, score, vulnerability_found, turn_index, session_id)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                s.id,
                audit.id,
                s.category.value,
                s.name,
                s.input or "",
                s.expected_behavior or "",
                s.severity.value,
                s.status.value,
                s.target_response,
                json.dumps(s.target_tool_calls),
                s.auditor_evaluation,
                s.score,
                1 if s.vulnerability_found else 0,
                getattr(s, "turn_index", 0),
                getattr(s, "session_id", None),
            ),
        )
    conn.commit()
    return audit


def get_audit(audit_id: str) -> Optional[AuditResult]:
    conn = _get_conn()
    row = conn.execute("SELECT * FROM audits WHERE id = ?", (audit_id,)).fetchone()
    if row is None:
        return None
    return _row_to_audit(row, conn)


def list_audits(limit: int = 50) -> list[dict]:
    conn = _get_conn()
    rows = conn.execute(
        "SELECT * FROM audits ORDER BY started_at DESC LIMIT ?", (limit,)
    ).fetchall()
    result = []
    for r in rows:
        result.append({
            "id": r["id"],
            "agent": r["agent_name"],
            "score": r["overall_score"],
            "vulnerabilities": r["vulnerabilities_found"],
            "scenarios_run": r["scenarios_run"],
            "completed": r["completed_at"],
        })
    return result


def delete_audit(audit_id: str):
    conn = _get_conn()
    conn.execute("DELETE FROM scenarios WHERE audit_id = ?", (audit_id,))
    conn.execute("DELETE FROM audits WHERE id = ?", (audit_id,))
    conn.commit()


def _row_to_audit(row: sqlite3.Row, conn: sqlite3.Connection) -> AuditResult:
    scenario_rows = conn.execute(
        "SELECT * FROM scenarios WHERE audit_id = ? ORDER BY turn_index, rowid",
        (row["id"],),
    ).fetchall()

    scenarios = []
    for sr in scenario_rows:
        scenarios.append(TestScenario(
            id=sr["id"],
            category=AttackCategory(sr["category"]),
            name=sr["name"],
            input=sr["input"],
            expected_behavior=sr["expected_behavior"],
            severity=Severity(sr["severity"]),
            status=ScenarioStatus(sr["status"]),
            target_response=sr["target_response"],
            target_tool_calls=json.loads(sr["target_tool_calls_json"] or "[]"),
            auditor_evaluation=sr["auditor_evaluation"],
            score=sr["score"],
            vulnerability_found=bool(sr["vulnerability_found"]),
        ))

    completed = None
    if row["completed_at"]:
        try:
            completed = datetime.fromisoformat(row["completed_at"])
        except ValueError:
            pass

    return AuditResult(
        id=row["id"],
        agent_name=row["agent_name"],
        started_at=datetime.fromisoformat(row["started_at"]) if row["started_at"] else datetime.now(timezone.utc),
        completed_at=completed,
        total_scenarios=row["total_scenarios"],
        scenarios_run=row["scenarios_run"],
        vulnerabilities_found=row["vulnerabilities_found"],
        overall_score=row["overall_score"],
        scenarios=scenarios,
        category_scores=json.loads(row["category_scores_json"] or "{}"),
        critical_findings=json.loads(row["critical_findings_json"] or "[]"),
    )
