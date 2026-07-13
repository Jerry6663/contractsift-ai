// 部署时通过 VITE_API_BASE_URL 环境变量指向后端地址
// 本地开发时为空，使用 Vite proxy 转发
const BASE = import.meta.env.VITE_API_BASE_URL || '/api';

// localtunnel bypass header (harmless when not using localtunnel)
const TUNNEL_HEADERS = { 'Bypass-Tunnel-Reminder': 'true' };

function apiFetch(url, options = {}) {
  const headers = { ...TUNNEL_HEADERS, ...(options.headers || {}) };
  return fetch(url, { ...options, headers });
}

export async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('fileName', file.name);
  const res = await apiFetch(`${BASE}/review/upload`, { method: 'POST', body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || '上传失败');
  }
  return res.json();
}

export async function clarifyType(taskId, answers) {
  const res = await apiFetch(`${BASE}/review/clarify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskId, answers })
  });
  if (!res.ok) throw new Error('追问提交失败');
  return res.json();
}

export async function executeReview(taskId, actionChain) {
  const res = await apiFetch(`${BASE}/review/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskId, actionChain })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || '审查执行失败');
  }
  return res.json();
}

export async function getTask(taskId) {
  const res = await apiFetch(`${BASE}/task/${taskId}`);
  if (!res.ok) throw new Error('获取任务失败');
  return res.json();
}

export async function getHistory() {
  const res = await apiFetch(`${BASE}/history`);
  if (!res.ok) throw new Error('获取历史失败');
  return res.json();
}

export async function deleteTask(taskId) {
  const res = await apiFetch(`${BASE}/task/${taskId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('删除失败');
  return res.json();
}

export async function getConsent() {
  const res = await apiFetch(`${BASE}/consent`);
  return res.json();
}

export async function setConsent(consented) {
  const res = await apiFetch(`${BASE}/consent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ consented })
  });
  return res.json();
}
