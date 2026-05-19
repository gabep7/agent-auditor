from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
from enum import Enum


class Severity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class AttackCategory(str, Enum):
    PARAMETER_ATTACK = "parameter_attack"
    PROMPT_INJECTION = "prompt_injection"
    CONTRADICTORY = "contradictory"
    EDGE_CASE = "edge_case"
    MULTI_TURN = "multi_turn"
    TOOL_MISUSE = "tool_misuse"
    INDIRECT_INJECTION = "indirect_injection"
    PROMPT_EXTRACTION = "prompt_extraction"
    CONTEXT_EXHAUSTION = "context_exhaustion"


class ScenarioStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    PASSED = "passed"
    FAILED = "failed"
    ERROR = "error"


class ToolDef(BaseModel):
    name: str
    description: str
    parameters: dict = {}


class AgentRegistration(BaseModel):
    name: str
    description: str
    endpoint: str
    tools: list[ToolDef] = []


class TestScenario(BaseModel):
    id: str
    category: AttackCategory
    name: str
    input: str
    expected_behavior: str
    severity: Severity = Severity.MEDIUM
    status: ScenarioStatus = ScenarioStatus.PENDING
    target_response: Optional[str] = None
    target_tool_calls: list[dict] = []
    auditor_evaluation: Optional[str] = None
    score: Optional[float] = None
    vulnerability_found: bool = False
    remediation: Optional[str] = None


class AuditResult(BaseModel):
    id: str
    agent_name: str
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None
    total_scenarios: int = 0
    scenarios_run: int = 0
    vulnerabilities_found: int = 0
    overall_score: Optional[float] = None
    scenarios: list[TestScenario] = []
    category_scores: dict[str, float] = {}
    critical_findings: list[str] = []


class AuditRequest(BaseModel):
    agent_endpoint: str
    victim_type: str = "customer_support"
    scenario_count: int = 10
    categories: list[AttackCategory] = []
    tools_json: str = ""  # JSON array of tool definitions for custom agents


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    response: str
    tool_calls: list[dict] = []
