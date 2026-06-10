# Demo Video Script v2 - Agent Auditor

**Target length:** 2:30-2:45
**Format:** Screen recording with voiceover
**Use:** The deployed app, not localhost

Live URL: https://agent-auditor-btmt64se2a-uc.a.run.app

## What's on screen vs what to say

### 1. Opening -- app loads (0:00-0:20)

**On screen:** Main audit page with target selector and Launch Audit button.

**Say:**

> This is Agent Auditor. It's a red-team testing tool for AI agents. You give it an agent to test, and it probes for unsafe behavior, scores what happened, and turns the results into a report with traces.

---

### 2. Target selector (0:20-0:40)

**On screen:** Dropdown showing Customer Support, Banking, Enterprise Support, Custom URL.

**Say:**

> There are a few built-in targets: a customer support agent, a banking assistant, a more realistic enterprise support agent, and a custom URL option if you want to test your own. For the demo I'm going to use Customer Support because it shows the full loop quickly.

---

### 3. Run the audit (0:40-1:15)

**On screen:** Click Launch Audit. Stream shows phases: probe, scenario generation, attack, judge.

**Say:**

> When I launch an audit, the backend first probes the agent to see what it exposes. Then it runs an attack scenario generated with Gemini, sends that to the target, and uses an LLM judge to score the response. The goal is not just pass or fail. It captures what was tested, what the agent did, why it was risky, and what to fix.

**If still running:**

> While it runs, the stream shows each phase as it completes. The same pipeline can benchmark multiple agents and compare where each one fails.

---

### 4. Show the result (1:15-1:50)

**On screen:** Completed audit with score, finding details, evidence, remediation, OWASP mapping.

**Say:**

> Here it found unsafe behavior. The score gives a quick summary, but the useful part is the evidence: what the test asked, how the agent replied, why the judge flagged it, and what kind of issue it maps to. Instead of just a chat transcript, you get an actual audit finding.

**Point to remediation / mapping / trace metadata:**

> Each finding includes guidance on how to fix it. The run is traced through Phoenix too, so you can inspect the underlying spans and see exactly where the agent failed.

---

### 5. Reports page (1:50-2:10)

**On screen:** Reports page with completed audits list. Open one to show score, findings, export links.

**Say:**

> Completed audits are saved on the Reports page, so you can come back after the run and review them. Score, findings, evidence, and export links in one place. You can download as PDF or JSON, which is useful for handing off or including in a security review.

---

### 6. Patterns page (2:10-2:25)

**On screen:** Patterns page showing attack categories.

**Say:**

> The Patterns page shows the attack types the auditor uses: prompt injection, tool misuse, data leaks, parameter manipulation, and multi-turn confusion. It's the test library behind the audit, plus a reference for what safer behavior looks like.

---

### 7. Agent Chat (2:25-2:40) -- **MISSING from current video**

**On screen:** Agent Chat page with interactive chat interface.

**Say:**

> There's also an interactive auditor agent. You can ask about audit strategy, past findings, or how to investigate a target. Under the hood it uses Gemini, Google ADK, Cloud Run, Phoenix tracing, and OpenInference observability.

---

### 8. Close (2:40-2:45)

**On screen:** Back to main audit page or result.

**Say:**

> That's Agent Auditor: test the agent, judge the behavior, trace what happened, turn it into a report.
