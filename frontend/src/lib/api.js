const BASE = import.meta.env.VITE_API_URL
  || (window.location.port === '5173'
    ? `${window.location.protocol}//${window.location.hostname}:8000/api`
    : '/api');

export function streamAudit(agentEndpoint, victimType = 'customer_support', scenarioCount = 12, { onProgress, onScenario, onComplete, onError }) {
  const controller = new AbortController();

  fetch(`${BASE}/audit/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agent_endpoint: agentEndpoint, victim_type: victimType, scenario_count: scenarioCount }),
    signal: controller.signal,
  }).then(async response => {
    if (!response.ok) {
      onError(new Error(await response.text()));
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      let eventType = '';
      for (const line of lines) {
        if (line.startsWith('event: ')) {
          eventType = line.slice(7).trim();
        } else if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (eventType === 'progress') onProgress(data);
            else if (eventType === 'scenario_result') onScenario(data);
            else if (eventType === 'complete') onComplete(data);
            else if (eventType === 'error') onError(new Error(data.message));
          } catch {
            // skip malformed lines
          }
        }
      }
    }
  }).catch(err => {
    if (err.name !== 'AbortError') onError(err);
  });

  return controller;
}

export async function getAudit(auditId) {
  const res = await fetch(`${BASE}/audit/${auditId}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function listAudits() {
  const res = await fetch(`${BASE}/audits`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function runBenchmark({ victims = ['customer_support', 'banking', 'enterprise_support'], scenarioCount = 6, onProgress, onComplete, onError }) {
  const controller = new AbortController();

  fetch(`${BASE}/audit/benchmark`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ victims, scenario_count: scenarioCount }),
    signal: controller.signal,
  }).then(async response => {
    if (!response.ok) { onError(new Error(await response.text())); return; }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      let eventType = '';
      for (const line of lines) {
        if (line.startsWith('event: ')) eventType = line.slice(7).trim();
        else if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (eventType === 'progress') onProgress(data);
            else if (eventType === 'complete') onComplete(data);
            else if (eventType === 'error') onError(new Error(data.message));
          } catch {
            // Skip malformed SSE lines.
          }
        }
      }
    }
  }).catch(err => { if (err.name !== 'AbortError') onError(err); });

  return controller;
}

export async function auditTrend() {
  const res = await fetch(`${BASE}/audits/trend`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getAuditRules(auditId) {
  const res = await fetch(`${BASE}/audit/${auditId}/rules`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function listVictims() {
  const res = await fetch(`${BASE}/victims`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function victimChat(victimType, message) {
  const res = await fetch(`${BASE}/victim/${victimType}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function agentChat(message, sessionId = null) {
  const body = { message };
  const params = sessionId ? `?session_id=${sessionId}` : '';
  const res = await fetch(`${BASE}/agent/chat${params}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
