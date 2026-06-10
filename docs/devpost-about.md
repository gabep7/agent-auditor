## What inspired this

In May 2026, [CryptoSlate reported](https://cryptoslate.com/how-one-trader-exploited-grok-and-morse-code-to-trick-ai-agent-into-sending-billions-of-crypto-tokens-from-a-verified-wallet/) that someone posted Morse code on X, Grok decoded it into a plain-English command tagging `@bankrbot`, and Bankrbot treated that output as an executable instruction to send 3 billion DRB tokens to an unauthorized wallet. No private keys were compromised. The failure was in the handoff: one agent decoded, another agent executed, and nobody validated the authorization path between them.

That incident made agent security concrete for me. Prompt injection is usually discussed as a model-behavior problem: jailbreaks, data leaks, or off-topic responses. But when an agent has tool access, wallet permissions, or API keys, the blast radius changes. A customer-service agent that sends a bad email is a review problem. A trading agent that signs a transaction is an asset-control problem.

I built Agent Auditor because most teams deploying AI agents have no structured way to test for these failure modes before going live.

## What it does

Agent Auditor is a red-team testing platform for AI agents. You point it at an agent endpoint and it:

1. Probes the agent's attack surface with exploratory requests
2. Generates adaptive adversarial scenarios using Gemini, including prompt injection, tool misuse, parameter manipulation, multi-turn confusion, and data exfiltration
3. Runs each scenario, including multi-turn conversations that exploit context trust
4. Scores every response with an LLM judge calibrated against OWASP LLM Top 10 (2025) categories
5. Generates remediation suggestions for each finding
6. Traces everything to Arize Phoenix for observability
7. Exports evidence-backed PDF and JSON reports

The core insight is that testing an agent requires an agent. Static prompts and one-shot jailbreaks miss the interesting failures: the ones that happen across multiple turns, through tool calls, or through indirect injection from external data. Agent Auditor uses Gemini to reason about what to try next based on what the target agent exposed so far.

## How I built it

**Agent runtime:** The auditor is built with Google ADK, the SDK behind Agent Builder, using Gemini 2.5 Flash. It uses `FunctionTool` calls for probing, scenario generation, attack execution, and judging.

**Phoenix MCP integration:** The auditor loads `@arizeai/phoenix-mcp` as an MCPToolset. This lets it query past audit traces directly, rank attack categories by historical vulnerability rate, and bias the next scenario generation accordingly. The feedback loop is: audit, trace, learn, adapt.

**LLM-as-judge:** Each scenario response is scored by Gemini with calibrated anchors mapped to OWASP categories. Results are written to OpenInference spans so you can inspect the judge's reasoning in Phoenix.

**Built-in victims:** Four target options ship with the platform. Two are keyword-based demo victims, one is a real ADK enterprise support agent with `FunctionTool` calls and a deliberate OWASP LLM05:2025 Excessive Agency flaw, and one is a custom URL option for testing your own agent.

**Frontend:** The frontend is built with React 19, Vite, and Tailwind CSS 4. It includes live audit streaming over SSE, persisted reports, radar charts, findings, and export links.

**Deployment:** The app is deployed on Google Cloud Run with Docker. Audit results persist in SQLite, with optional Elasticsearch export for dashboards.

## What I learned

The biggest lesson was that testing an agent is fundamentally different from testing a traditional application. You cannot just send a request and check the response. You need to reason about what the agent revealed, craft follow-up attacks that exploit that information, and evaluate whether the failure is a security issue or just a quality issue. That requires memory, planning, and judgment, which is why the auditor itself is built as an agent.

The Phoenix MCP integration turned out to be the most interesting part architecturally. Having the auditor query its own past traces to improve future attacks creates a feedback loop that static test suites cannot replicate. It also means the tool can get better the more it is used.

OWASP's LLM Top 10 (2025) was useful as a classification framework, but insufficient on its own. Categories like Excessive Agency describe the symptom, not always the root cause. Useful remediation needs to be specific to the agent implementation: which tool has too much permission, which input is unsanitized, which confirmation step is missing, or which output should never have become executable.

## Challenges

**Scenario quality.** Generating adversarial scenarios that are realistic and diverse is hard. Gemini is strong at this, but the prompt engineering to avoid repetitive attacks took significant iteration. The adaptive loop, which uses Phoenix history to inform future scenarios, helped a lot.

**Multi-turn conversations.** Most prompt injection demos are single-shot. Real agents hold conversations across multiple turns, and trust can build over time. The auditor needed to maintain conversation state and test for that kind of trust escalation, which added complexity to both attack execution and judge evaluation.

**Judging calibration.** Telling an LLM judge to "score this 1-10" is not useful without calibration. I had to build a rubric with concrete anchors: what a 3 looks like versus a 7, what evidence is required to flag a finding, and how to distinguish a security issue from a UX issue. The OWASP mapping helped structure this.

**Deployment.** Getting the full stack running on Cloud Run took more work than expected: ADK agents, Phoenix tracing, MCP tools, FastAPI, React, and SSE streaming all had to work together in one deployed environment.

## Arize track alignment

| Criterion | How Agent Auditor addresses it |
|---|---|
| Agent Builder | Auditor agent built with Google ADK using Runner, InMemorySessionService, and FunctionTool calls |
| Tracing | `phoenix.otel.register(auto_instrument=True)` instruments the ADK runtime with OpenInference spans |
| Phoenix MCP | `@arizeai/phoenix-mcp` loaded as MCPToolset for access to projects, spans, datasets, and annotations |
| Self-improvement | `adapt_scenarios_from_history` queries Phoenix for past traces, ranks categories by vulnerability rate, and biases the next audit |
| LLM-as-judge | Gemini 2.5 Flash scores each scenario with calibrated anchors, and results are written to OTel spans |
| Real agent testing | Enterprise victim is a real ADK agent with FunctionTool calls, not a keyword stub |
| Multi-turn | Auditor supports multi-turn conversations and context-trust escalation tests |
| Remediation | Every vulnerability gets a Gemini-generated remediation suggestion |
| OWASP mapping | Findings are mapped to OWASP LLM Top 10 (2025) categories |
| Persistence | SQLite stores audit history with report views and score trends |
