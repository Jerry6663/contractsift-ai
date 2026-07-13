// 部署时通过 VITE_API_BASE_URL 环境变量指向后端地址
// 本地开发时为空，使用 Vite proxy 转发
const BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('fileName', file.name); // send filename separately to work around multer encoding bug
  const res = await fetch(`${BASE}/review/upload`, { method: 'POST', body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || '上传失败');
  }
  return res.json();
}

export async function clarifyType(taskId, answers) {
  const res = await fetch(`${BASE}/review/clarify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskId, answers })
  });
  if (!res.ok) throw new Error('追问提交失败');
  return res.json();
}

export async function executeReview(taskId, actionChain) {
  const res = await fetch(`${BASE}/review/execute`, {
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
  const res = await fetch(`${BASE}/task/${taskId}`);
  if (!res.ok) throw new Error('获取任务失败');
  return res.json();
}

export async function getHistory() {
  const res = await fetch(`${BASE}/history`);
  if (!res.ok) throw new Error('获取历史失败');
  return res.json();
}

export async function deleteTask(taskId) {
  const res = await fetch(`${BASE}/task/${taskId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('删除失败');
  return res.json();
}

export async function getConsent() {
  const res = await fetch(`${BASE}/consent`);
  return res.json();
}

export async function setConsent(consented) {
  const res = await fetch(`${BASE}/consent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ consented })
  });
  return res.json();
}
