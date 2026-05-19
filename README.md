# Agent Auditor

**Google Cloud Rapid Agent Hackathon Submission, Arize Track**

An AI agent that audits other AI agents. It probes the target's attack surface,
runs adaptive adversarial scenarios (including multi-turn conversations),
judges each response with Gemini-as-judge, generates code-level remediation
suggestions, and persists every result to a local database so security trends
are visible over time.

🌐 **Live demo:** _coming soon (Cloud Run URL)_
🎬 **Demo video:** _coming soon (YouTube link)_
📊 **Phoenix project:** `agent-auditor` on
[app.phoenix.arize.com/s/healthd](https://app.phoenix.arize.com/s/healthd)

## What It Does

Agent Auditor is an adversarial red-team system for AI agents with a complete
security-testing pipeline:

- **8 probe requests** before the audit begins, discovers the target's
  strengths and weaknesses by sending exploratory messages and analysing
  responses (PII leakage, injection resistance, auth checks, etc.)
- **Adaptive live attack loop**, Gemini generates each attack round informed
  by the full history of previous rounds. If a tool call succeeded in round 3,
  the attacker pushes harder; if refused, it switches tactics.
- **Multi-turn conversation attacks**, for the enterprise ADK victim, the
  attacker maintains a persistent session across 3+ follow-up turns, building
  context and exploiting trust across the conversation.
- **6 attack categories**: parameter attacks, prompt injection, contradictory
  instructions, edge cases, multi-turn confusion, tool misuse
- **LLM-as-judge evaluation**: every scenario is scored by Gemini 2.5 Flash,
  not by brittle keyword matching
- **Self-improving**: before each new audit the Auditor queries Phoenix for
  past traces and biases scenario generation toward categories with the
  highest historical vulnerability rate
- **Remediation generation**: for every vulnerability found, Gemini writes a
  specific, actionable fix suggestion targeting the tool or component that
  needs to change
- **Full Phoenix tracing**: every audit, scenario, probe, and judge call
  appears in Phoenix Cloud as an OpenInference span
- **Persistent audit history**: all results are stored in SQLite, audits
  survive server restarts and a trend chart shows score evolution over time

## How It Works

```text
╭──────────────╮    ╭─────────────╮   ╭──────────────────╮
│ Auditor (ADK)│───▶│ Phoenix MCP │──▶│ Phoenix Cloud    │
│ Gemini 2.5   │    │ (introspect)│   │ (traces+evals)   │
╰──────┬───────╯    ╰─────────────╯   ╰──────────────────╯
       │                                        ▲
       ▼                                        │
╭───────────────────╮  ╭──────────────────╮     │
│ 1. Reconnaissance │  │                  │     │
│ → 8 probe requests│  │  2. Attack loop  │─────╯
│ → Behaviour map   │  │  (N rounds)      │ OpenInference spans
╰────────┬──────────╯  │  ┌─────────────┐ │
         │             │  │ Single-turn  │ │
         ▼             │  │ scenarios   │ │
╭───────────────────╮  │  ├─────────────┤ │
│ Probe intelligence│  │  │ Multi-turn   │ │
│ fed into attacker │  │  │ conversations│ │
│ prompt            │  │  │ (3 followups)│ │
╰───────────────────╯  │  └─────────────┘ │
                       ╰────────┬─────────╯
                                │
                                ▼
                      ╭───────────────────╮
                      │ 3. LLM-as-judge   │
                      │ + Remediation gen │
                      ╰────────┬──────────╯
                               │
                               ▼
                      ╭───────────────────╮
                      │ 4. SQLite persist  │
                      │ + Trend dashboard  │
                      ╰───────────────────╯
```

1. **Reconnaissance**, 8 probe requests map the target's behaviour (strengths,
   weaknesses, tool triggers)
2. **Attack loop**, Gemini generates each round adaptively. Some scenarios
   span 3-4 follow-up turns if the victim supports conversation state
3. **Judge + remediate**, Gemini scores each response and generates fix
   suggestions for every vulnerability found
4. **Persist + trend**, results stored in SQLite. The Reports page shows a
   trend chart as more audits accumulate

### Adaptive Live Attack

The attacker loop feeds the **full history of previous rounds** into Gemini
before generating each new attack. If the victim called a dangerous tool in
round 3, the attacker pushes harder in that direction. If the victim refused,
the attacker switches tactics. Each audit becomes harder for the target as it
progresses, exactly how a real adversary behaves.

### Multi-Turn Conversation Attacks

For the enterprise ADK victim, every 3rd scenario runs as a multi-turn
conversation. The attacker sends an initial message, the victim responds, and
Gemini generates up to 3 follow-up messages based on the full conversation
context. This tests context poisoning, trust exploitation, and gradual
escalation, attacks that single-shot testing misses.

### Surface Probing

Before any scenario runs, the auditor sends 8 probe requests covering baseline
behaviour, refund triggers, prompt injection resistance, identity bypass,
destructive actions, data access, authority escalation, and parameter edge
cases. The results are analysed to produce a **behaviour map** with explicit
strengths and weaknesses that the attacker prompt weaponizes.

### Remediation Generation

For every vulnerability found, Gemini writes a specific, actionable remediation
suggestion. The prompt receives the attack category, adversarial input, what
tools the victim called, and the judge's evaluation. The output names the tool
or component that needs to change and describes the fix in code-level language.

## Why this wins the Arize track

The Arize judges' published criteria are: *"meaningful use of tracing and MCP,
quality of the agent's self-improvement loop, and overall impact"*.
Here is exactly how this submission maps to each:

| Judges' criterion | How we deliver it |
|---|---|
| **Meaningful tracing** | `phoenix.otel.register(auto_instrument=True)` instruments the entire ADK runtime. Every audit, probe, scenario, multi-turn, and LLM-as-judge call generates OpenInference spans with domain attributes (severity, tool_calls, eval_score, vulnerability_found). |
| **Phoenix MCP** | The auditor agent loads the official `@arizeai/phoenix-mcp` server as an `MCPToolset`, giving Gemini direct access to `list-projects`, `get-spans`, `list-datasets` and `add-annotation` so it can ground its reasoning in real observability data. |
| **Self-improvement loop** | A dedicated `adapt_scenarios_from_history` tool queries Phoenix's HTTP API, ranks attack categories by historical vulnerability rate, and feeds that ordering into the scenario generator on every new run. The UI surfaces "X patterns learned from Y past audits" so the loop is visible to the judges. |
| **LLM-as-judge evals** | `app/observability/evals.py` calls Gemini 2.5 Flash per scenario and writes `eval.score`, `eval.severity`, `eval.vulnerability_found`, `eval.reasoning` back onto the active span, replacing the original keyword heuristic. |
| **Real agent vs agent** | Unlike most red-team demos that test against keyword stubs, our `enterprise_support` victim is a **real ADK agent** (Gemini 2.5 Flash with FunctionTool calls). The auditor finds a genuine architectural vulnerability, the tools accept any caller-supplied name as identity, that an LLM security guardrail alone cannot fix. |
| **Multi-turn exploitation** | The auditor holds real conversations with the victim across 3+ turns, exploiting context trust. The LLM-as-judge evaluates the *entire conversation* rather than individual messages. |
| **Attack surface reconnaissance** | Before any scenario runs, 8 probe requests map the target's defence posture. Weaknesses are explicitly surfaced in the UI and injected into the attacker prompt as "reconnaissance intelligence." |
| **Remediation generation** | Every vulnerability comes with a code-level fix suggestion generated by Gemini. The tool is not just diagnostic, it tells developers *how to fix* each issue. |
| **Persistent history + trends** | SQLite storage means audit data survives restarts. The Reports page shows a line chart of security score over time, proving the system actually learns. |
| **Overall impact** | Adversarial red-teaming is the use case Arize's customers are asking for. Anyone can point this at a Cloud Run agent and get a Phoenix-backed reliability report with fix suggestions in under a minute. |

## Tech Stack

| Layer | Technology |
|---|---|
| Agent runtime | Google ADK (Runner + FunctionTool) + Gemini 2.5 Flash |
| Observability | Arize Phoenix Cloud + OpenInference + Phoenix MCP |
| Evaluation | LLM-as-judge (Gemini 2.5 Flash) with OpenTelemetry span annotations |
| Backend | FastAPI + Python 3.11+ |
| Storage | SQLite (zero-dependency persistence) |
| Frontend | React 19 + Tailwind CSS 4 |
| Interactive | ADK Runner chat endpoint for conversational agent interaction |

## Quick Start

```bash
# Backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # add GOOGLE_API_KEY, PHOENIX_API_KEY, PHOENIX_COLLECTOR_ENDPOINT
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

Then open <http://localhost:5173>. Hit **Run Audit** against the bundled
`customer_support` victim and watch traces appear in your Phoenix project.

### Required env vars

```
GOOGLE_API_KEY=...                    # Gemini access (judge + auditor agent)
PHOENIX_COLLECTOR_ENDPOINT=https://app.phoenix.arize.com/s/<your-tenant>
PHOENIX_API_KEY=...
PHOENIX_PROJECT_NAME=agent-auditor    # optional
```

`npx` must be on PATH for the Phoenix MCP toolset; if it isn't, the auditor
falls back gracefully without MCP (other features keep working).

## Auditor Agent Tools

| Tool | Description |
|---|---|
| `register_agent_tool` | Register a target agent for testing |
| `discover_agent_tools_tool` | Map the target's attack surface |
| `adapt_scenarios_from_history` | **Self-improvement**, read Phoenix history, rank attack categories |
| `start_audit_tool` | Generate adversarial scenarios |
| `execute_next_scenario_tool` | Run a scenario against the target |
| `finalize_audit_tool` | Generate vulnerability report |
| Phoenix MCP toolset | `list-projects`, `get-spans`, `list-datasets`, `add-annotation`, … |
| **Interactive chat** | `/api/agent/chat`, full ADK Runner loop for conversational auditing |

## Built-in victims

| Victim | Type | Behaviour |
|---|---|---|
| `customer_support` | Keyword matcher | No validation, follows any command, fails almost everything |
| `banking` | Keyword matcher | Sends money, leaks PII, used to test PII attacks |
| `enterprise_support` | **Real ADK agent** | LLM-powered enterprise assistant. Resists prompt injection and obvious attacks, but has a deliberate architectural flaw: its tools accept any caller-supplied name as proof of identity (OWASP LLM05:2025, Excessive Agency). Supports multi-turn conversation, the auditor can build trust then exploit it across 3+ follow-up turns. |
| `custom` | External HTTP | Bring your own endpoint (must accept `POST /chat {message}`) |

## Full Audit Flow

1. **Register the target**, provide name, description, endpoint, and tool definitions
2. **Probe the target**, 8 exploratory requests analyse the target's security posture: PII leakage, injection resistance, auth verification, cross-customer access, parameter validation
3. **Introspect Phoenix**, query past audit traces to bias scenario generation toward high-vulnerability categories
4. **Attack phase**, N rounds of adaptive adversarial attacks. The attacker:
   - Receives probe intelligence ("target has these weaknesses...")
   - Receives previous round history ("in round 3, the victim called refund_order")
   - Generates each attack tailored to the accumulating intelligence
   - Runs multi-turn conversations for enterprise victims (3 follow-up turns)
5. **Judge each round**, Gemini 2.5 Flash scores each scenario immediately. Results stream to the UI in real time
6. **Generate report**, aggregate scores, compute category breakdowns, generate remediation suggestions for every vulnerability
7. **Persist + render**, save to SQLite, update the trend chart on the Reports page

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/audit/start` | POST | Run a full audit (SSE stream) |
| `/api/audit/{id}` | GET | Get audit result |
| `/api/audits` | GET | List all audits |
| `/api/audits/trend` | GET | Audit score trend data |
| `/api/victims` | GET | List built-in victims |
| `/api/victim/{type}/chat` | POST | Chat with a built-in victim |
| `/api/agent/chat` | POST | Interactive auditor agent chat |
| `/api/agents` | GET | List registered target agents |
| `/health` | GET | Server health check |

## License

MIT
