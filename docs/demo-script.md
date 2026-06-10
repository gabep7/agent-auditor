# Demo Video Script - Agent Auditor

**Target length:** 2:30-3:00  
**Format:** Screen recording with voiceover  
**Use:** The deployed app, not localhost

Live URL: https://agent-auditor-btmt64se2a-uc.a.run.app

## Recording checklist

- Close tabs or windows that could expose secrets.
- Use browser zoom around 90-100%.
- Start from a fresh app load.
- Run one live Customer Support audit before or during the recording so Reports has data.
- Show the result, report/export links, Patterns page, and Agent Chat page.
- Keep terminal windows, `.env`, Google Cloud console, and API key pages off screen.

## One-take flow

### 1. Open with the product (0:00-0:20)

**Action:** Open the deployed app.

**Say:**

> This is Agent Auditor. It is basically a red-team testing tool for AI agents. You give it an agent to test, and it tries to find unsafe behavior, score what happened, and turn the results into a report with traces.

### 2. Explain the target choices (0:20-0:40)

**Action:** Point at the target selector.

**Say:**

> So there are a few built-in targets here: a customer support agent, a banking assistant, a more realistic enterprise support agent, and then a custom URL option if you want to test your own agent. For the demo, I am going to use Customer Support because it shows the full loop pretty quickly.

### 3. Run the audit (0:40-1:20)

**Action:** Select **Customer Support** and click **Launch Audit**.

**Say:**

> So when I launch an audit, the backend first probes the agent to see what it exposes. Then it runs an attack scenario generated with Gemini, sends that to the target, and uses an LLM judge to score the response. The goal is not just to say pass or fail. It captures what was tested, what the agent did, why that was risky, and what to fix.

**If the audit is still running:**

> While it is running, the stream shows each phase as it completes. In a longer run, the same pipeline can benchmark multiple agents and compare where each one fails.

### 4. Show the result (1:20-1:55)

**Action:** Show the completed score and finding details.

**Say:**

> Here it found unsafe behavior. The score gives a quick summary, but the useful part is the evidence: what the test asked, how the agent replied, why the judge flagged it, and what kind of issue it maps to. So instead of just getting a chat transcript, you get something closer to an actual audit finding.

**Action:** Point to remediation / mapping / trace metadata if visible.

**Say:**

> Each finding also includes guidance on how to fix it. The run is traced through Phoenix as well, so you can inspect the underlying spans later and see exactly where the agent failed.

### 5. Show reports and exports (1:55-2:20)

**Action:** Open **Reports**, then open the completed audit if needed.

**Say:**

> The completed audits are saved on the Reports page, so you can come back after the run and review them. This keeps the score, findings, evidence, and export links in one place. You can also download the result as PDF or JSON, which is useful if you want to hand it off or include it in a security review.

### 6. Show the pattern library (2:20-2:40)

**Action:** Open **Patterns**.

**Say:**

> The Patterns page shows the kinds of attacks the auditor is built around: prompt injection, tool misuse, data leaks, bad parameters, and multi-turn confusion. It is basically the test library behind the audit, plus a reference for what safer behavior should look like.

### 7. Show the auditor agent (2:40-2:55)

**Action:** Open **Agent Chat**.

**Say:**

> There is also an interactive auditor agent. You can ask it about audit strategy, past findings, or how to investigate a target. Under the hood, this uses Gemini, Google ADK, Cloud Run, Phoenix tracing, and OpenInference-style observability.

### 8. Close (2:55-3:00)

**Action:** Return to the main audit page or report result.

**Say:**

> So that is Agent Auditor: test the agent, judge the behavior, trace what happened, and turn it into a report.

## Short fallback version

Use this if the recording needs to be closer to 90 seconds.

> Agent Auditor is a red-team testing tool for AI agents. You select a target agent, launch an audit, and the system probes the agent, generates a Gemini attack scenario, runs it against the target, and scores the response with an LLM judge.
>
> In this demo I am testing the Customer Support agent. The result shows the security score, the unsafe behavior, the judge's reasoning, and guidance on how to fix it. Instead of producing only a transcript, Agent Auditor turns the interaction into an evidence-backed security finding.
>
> The Reports page saves completed audits and provides PDF and JSON exports. The Patterns page shows the attack library behind the tests, including prompt injection, tool misuse, data leaks, and multi-turn confusion. The system is deployed on Cloud Run and uses Gemini, Google ADK, Phoenix tracing, and OpenInference-style observability.
>
> Agent Auditor helps teams test AI agents before they go live: test, judge, trace, and report.

## Devpost description

Agent Auditor is a red-team testing platform for AI agents. It probes target agents, generates Gemini attack scenarios, scores responses with an LLM judge, maps findings to security categories, and exports evidence-backed PDF/JSON reports with Phoenix traces for observability.

## Submission links

- Live demo: https://agent-auditor-btmt64se2a-uc.a.run.app
- Repository: https://github.com/gabep7/agent-auditor
- Track: Arize
