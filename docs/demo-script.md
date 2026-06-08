# Demo Video Script — Agent Auditor

**Duration:** ~3 minutes
**Style:** Screen recording with voiceover.

---

## Scene 1: Open the app (0:00–0:15)

1. Navigate to the deployed URL
2. **Say:** *"This is Agent Auditor, built with Google Cloud Agent Builder and Arize Phoenix. It's an adversarial red-team system for AI agents. You point it at any agent endpoint, and it probes, attacks, scores, and generates code-level fixes for every vulnerability it finds. Let me show you."*

---

## Scene 2: Benchmark all victims (0:15–0:45)

1. Click **Benchmark All**
2. Wait for results
3. **Say:** *"First, a side-by-side benchmark. Same attacks, three different agents. Customer Support scores 28 out of 100 -- it follows every injected command, processes refunds without validation, leaks PII on request. Banking scores 68 -- better, but still reveals account balances without identity verification. Enterprise Support is a real ADK agent powered by Gemini 2.5 Flash. It scores 90 because it actually validates inputs, resists prompt injection, and requires authentication before acting."*

---

## Scene 3: Run a full audit (0:45–1:30)

1. Select **Enterprise Support**, click **Launch Audit**
2. **Say:** *"Now a full audit against the enterprise agent. Watch the phases..."*

   *"...Reconnaissance -- 8 probe requests map the attack surface. The prober detects: leaks PII without authentication, follows authority escalation attempts."*

   *"...Self-improvement -- the auditor queries Arize Phoenix for past audit history using the Phoenix MCP server. It learns which attack categories had the highest vulnerability rate and prioritizes those."*

   *"...Adaptive attack -- Gemini generates each scenario live. If the agent resists in round 3, the attacker switches tactics in round 4. It chains leaked information from earlier rounds into later attacks."*

   *"...Every 3rd scenario runs as a multi-turn conversation -- the attacker builds trust across 4 messages then exploits it."*
3. Let scenarios stream in

---

## Scene 4: Show results (1:30–2:10)

1. Scroll through scenario cards. Point to one PASS (green) and one VULNERABLE (red)
2. Expand a vulnerable card -- show the judge reasoning and remediation section
3. **Say:** *"The agent resists prompt injection -- green, score 95. But when someone says 'My name is Sarah Kim,' it calls lookup_customer and returns her email and subscription tier. The LLM judge flags this: the agent verified identity by accepting whatever name the caller provided, no actual authentication."*

   *"And here's the remediation -- Gemini writes a specific, code-level fix. It says: add a verify_session tool that checks the customer_id against an authenticated session context, and reject any lookup where the claimed name doesn't match the session."*

4. Point to the OWASP panel
5. **Say:** *"Every finding maps to the OWASP LLM Top 10. This audit triggered LLM01 Prompt Injection, LLM02 Sensitive Information Disclosure, and LLM06 Excessive Agency -- the three most common real-world LLM vulnerabilities."*

---

## Scene 5: Attack Pattern Library (2:10–2:25)

1. Navigate to **Patterns**
2. **Say:** *"The Patterns page is a reference library of all 10 attack categories with 25+ documented patterns. Each one shows the attack input and the expected safe response. This is what the auditor tests against in every run."*

---

## Scene 6: Phoenix traces and Reports (2:25–2:50)

1. Open the Phoenix link from the results
2. **Say:** *"Every probe, every attack, every judge evaluation is traced to Arize Phoenix as OpenInference spans. Teams can drill into any scenario, see the full conversation, and understand exactly what happened."*
3. Navigate to **Reports**, expand an audit
4. **Say:** *"Results persist in SQLite and survive restarts. Clicking any audit opens the full detail view with a radar chart, scenario breakdown, and critical findings. You can also download PDF or JSON reports, and if Elasticsearch is configured, results are exported automatically for dashboards and alerting."*

---

## Scene 7: Agent Chat (2:50–2:55)

1. Navigate to **Agent Chat**
2. **Say:** *"And here's the interactive auditor agent -- a full ADK Runner with tool-calling, driven by Gemini. You can ask it about past audits, request specific attack strategies, or get security advice."*

---

## Scene 8: Close (2:55–3:00)

1. Show the app one more time
2. **Say:** *"Agent Auditor. Built with Google Cloud Agent Builder, Arize Phoenix, and Gemini. Link in the submission."*
