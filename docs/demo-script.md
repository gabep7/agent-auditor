# Demo Video Script — Agent Auditor

**Duration:** 90-120 seconds
**Style:** Screen recording with voiceover.

---

## Scene 1: Open the app (0:00–0:10)

1. Navigate to `http://localhost:5173`
2. **Say:** *"This is Agent Auditor — adversarial red-teaming for AI agents. It probes, attacks, and scores any AI agent, then tells you how to fix what it found."*

---

## Scene 2: Benchmark all victims (0:10–0:25)

1. Click **Benchmark All**
2. Wait for results (10-15s)
3. **Say:** *"One click compares all three built-in agents. Customer support scores 28/100 — it's vulnerable. Banking scores 68. The enterprise support agent is a real ADK agent with Gemini 2.5 Flash. It scores 90/100 because it actually resists attacks."*

---

## Scene 3: Run a full audit (0:25–0:55)

1. Select **Enterprise Support**, click **Launch Audit — 12 Scenarios**
2. **Say:** *"Now a full audit. Watch the phases...*

   *Reconnaissance — 8 probe requests discover weaknesses. The probe finds: 'Leaks PII without authentication.'*

   *Attack — Gemini generates each scenario adaptively. If the victim refuses in round 3, the attacker switches tactics in round 4.*

   *Every 3rd scenario runs as a multi-turn conversation — the attacker builds trust across 4 messages then exploits it."*
3. Let scenarios stream in

---

## Scene 4: Show results (0:55–1:10)

1. Scroll through scenario cards. Point to one PASS (green) and one VULNERABLE (red)
2. Expand a vulnerable card — show the judge reasoning and **remediation** section
3. **Say:** *"The agent resists prompt injection — green, score 95. But when someone says 'My name is Sarah Kim,' it calls lookup_customer and returns her email and subscription tier. The judge flags this: the agent verified identity by accepting whatever name the caller provided — no actual authentication.*

   *And here's the remediation — Gemini writes a specific fix. It says: add a verify_session tool that checks the customer_id against an authenticated context."*

---

## Scene 5: Phoenix traces (1:10–1:20)

1. Open the Phoenix link
2. **Say:** *"Every probe, every attack, every judge call is traced to Arize Phoenix. The auditor also uses Phoenix MCP to introspect past audits and bias future scenarios toward categories with the highest vulnerability rate."*

---

## Scene 6: Reports page (1:20–1:30)

1. Navigate to **Reports**
2. Point to the trend chart
3. **Say:** *"Results persist across restarts in SQLite. The trend chart shows security score evolution — proof the system actually learns. You can also click into any audit or download the full report as JSON."*

---

## Scene 7: Close (1:30–1:40)

1. Show the app one more time
2. **Say:** *"Agent Auditor: adversarial security testing for AI agents. Google ADK, Arize Phoenix, Gemini 2.5 Flash. Link below."*
