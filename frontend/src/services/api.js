// ASTRA Frontend Backend API Client

// Resolve API Base URL (supports VITE_API_BASE, VITE_API_URL, and handles missing /api suffix)
function resolveApiBase() {
  const envUrl = import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL;
  if (!envUrl) return 'http://127.0.0.1:8000/api';
  const trimmed = envUrl.replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

// Resolve WebSocket Base URL (supports VITE_WS_BASE, VITE_WS_URL, and handles missing /ws/telemetry path)
function resolveWsBase() {
  const envUrl = import.meta.env.VITE_WS_BASE || import.meta.env.VITE_WS_URL;
  if (!envUrl) return 'ws://127.0.0.1:8000/ws/telemetry';
  const trimmed = envUrl.replace(/\/+$/, '');
  let wsUrl = trimmed;
  if (wsUrl.startsWith('https://')) {
    wsUrl = 'wss://' + wsUrl.slice(8);
  } else if (wsUrl.startsWith('http://')) {
    wsUrl = 'ws://' + wsUrl.slice(7);
  }
  return wsUrl.includes('/ws') ? wsUrl : `${wsUrl}/ws/telemetry`;
}

const API_BASE = resolveApiBase();
const WS_BASE = resolveWsBase();

// Expose configuration globally for debugging and browser console verification
if (typeof window !== 'undefined') {
  window.ASTRA_CONFIG = {
    apiBase: API_BASE,
    wsBase: WS_BASE,
    version: '1.0.0',
    resolveApiBase,
    resolveWsBase,
  };
  console.info(`[ASTRA] Environment Config Loaded: API=${API_BASE} | WS=${WS_BASE}`);
}

export const getApiBase = () => API_BASE;
export const getWsBase = () => WS_BASE;

export async function fetchHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('API health check error:', err);
    return null;
  }
}

export async function fetchMetrics() {
  try {
    const res = await fetch(`${API_BASE}/metrics`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Failed to fetch benchmark metrics:', err);
    return null;
  }
}

export async function fetchEvents() {
  try {
    const res = await fetch(`${API_BASE}/events`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Failed to fetch events from backend:', err);
    return [];
  }
}

export async function fetchEvent(eventId) {
  const res = await fetch(`${API_BASE}/events/${eventId}`);
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return await res.json();
}

export async function analyzeEvent(eventId) {
  const res = await fetch(`${API_BASE}/events/${eventId}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return await res.json();
}

export async function approveEvent(eventId, approved = true, officer = 'Flight Director Gene Kranz', note = '') {
  const res = await fetch(`${API_BASE}/events/${eventId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approved, officer, note }),
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return await res.json();
}

export async function fetchP3SimulationData(start = 5200, count = 1800) {
  try {
    const res = await fetch(`${API_BASE}/simulation/p3/data?start=${start}&count=${count}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Failed to fetch NASA P-3 data:', err);
    return null;
  }
}

export async function setSimulationMode(mode, startIndex = 5200) {
  try {
    const res = await fetch(`${API_BASE}/simulation/mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, start_index: startIndex }),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Failed to set simulation mode:', err);
    return null;
  }
}

export async function fetchAuditLog(limit = 50) {
  try {
    const res = await fetch(`${API_BASE}/audit-log?limit=${limit}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Failed to fetch audit log:', err);
    return [];
  }
}

export async function ingestTelemetry(channel, value, timestamp) {
  const res = await fetch(`${API_BASE}/telemetry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel, value, timestamp }),
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return await res.json();
}

export async function fetchChannels() {
  try {
    const res = await fetch(`${API_BASE}/simulation/channels`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Failed to fetch available channels:', err);
    return { channels: ['P-3', 'A-1', 'D-1', 'E-1', 'T-1', 'S-1', 'M-1'], active_channel: 'P-3' };
  }
}

export async function switchChannel(channel) {
  const res = await fetch(`${API_BASE}/simulation/channel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel }),
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return await res.json();
}

export async function sendCopilotChat(query, history = []) {
  try {
    const res = await fetch(`${API_BASE}/copilot/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, history }),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Copilot chat error:', err);
    throw err;
  }
}

