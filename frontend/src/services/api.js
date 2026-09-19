// ASTRA Frontend Backend API Client

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000/api';
const WS_BASE = import.meta.env.VITE_WS_BASE || 'ws://127.0.0.1:8000/ws/telemetry';

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
