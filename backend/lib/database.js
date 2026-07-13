const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Dynamic sql.js import (ESM module)
let db = null;

async function getDb() {
  if (!db) {
    const initSqlJs = require('sql.js');
    const SQL = await initSqlJs();
    const dbPath = path.join(__dirname, '..', 'data', 'review.db');
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
    
    if (fs.existsSync(dbPath)) {
      const buffer = fs.readFileSync(dbPath);
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
    }
    
    db.run('PRAGMA foreign_keys = ON');
    initTables(db);
  }
  return db;
}

function saveDb() {
  if (db) {
    const dbPath = path.join(__dirname, '..', 'data', 'review.db');
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

function initTables(db) {
  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      file_name TEXT NOT NULL,
      file_type TEXT,
      file_size INTEGER,
      status TEXT DEFAULT 'uploaded',
      contract_type TEXT,
      contract_type_cn TEXT,
      target_tree TEXT,
      action_chain TEXT,
      risk_summary TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      completed_at TEXT,
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      layer TEXT NOT NULL,
      action TEXT NOT NULL,
      input TEXT,
      output TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (task_id) REFERENCES tasks(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS review_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id TEXT NOT NULL,
      clause_name TEXT NOT NULL,
      risk_level TEXT NOT NULL,
      risk_score REAL NOT NULL,
      original_text TEXT,
      law_article TEXT,
      law_text TEXT,
      rule_id TEXT,
      rule_content TEXT,
      suggestion TEXT,
      confidence REAL DEFAULT 0,
      position TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (task_id) REFERENCES tasks(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS user_consent (
      id TEXT PRIMARY KEY,
      consented INTEGER DEFAULT 0,
      consented_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  saveDb();
}

async function createTask(taskData) {
  const db = await getDb();
  db.run('INSERT INTO tasks (id, file_name, file_type, file_size, contract_type, contract_type_cn) VALUES (?, ?, ?, ?, ?, ?)',
    [taskData.id, taskData.fileName, taskData.fileType, taskData.fileSize, taskData.contractType || null, taskData.contractTypeCn || null]);
  saveDb();
  return taskData.id;
}

async function getTask(id) {
  const db = await getDb();
  const stmt = db.prepare('SELECT * FROM tasks WHERE id = ?');
  stmt.bind([id]);
  if (stmt.step()) return stmt.getAsObject();
  stmt.free();
  return null;
}

async function getTasks() {
  const db = await getDb();
  const results = [];
  const stmt = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC');
  while (stmt.step()) results.push(stmt.getAsObject());
  stmt.free();
  return results;
}

async function updateTask(id, updates) {
  const db = await getDb();
  const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values = Object.values(updates);
  db.run(`UPDATE tasks SET ${fields}, updated_at = datetime('now','localtime') WHERE id = ?`, [...values, id]);
  saveDb();
}

async function deleteTask(id) {
  const db = await getDb();
  db.run('DELETE FROM review_results WHERE task_id = ?', [id]);
  db.run('DELETE FROM audit_logs WHERE task_id = ?', [id]);
  db.run('DELETE FROM tasks WHERE id = ?', [id]);
  saveDb();
}

async function addAuditLog(logData) {
  const db = await getDb();
  const encryptedInput = logData.input ? encryptField(logData.input) : null;
  const encryptedOutput = logData.output ? encryptField(logData.output) : null;
  db.run('INSERT INTO audit_logs (id, task_id, layer, action, input, output, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [logData.id, logData.taskId, logData.layer, logData.action, encryptedInput, encryptedOutput, logData.status || 'completed']);
  saveDb();
}

async function getAuditLogs(taskId) {
  const db = await getDb();
  const results = [];
  const stmt = db.prepare('SELECT * FROM audit_logs WHERE task_id = ? ORDER BY created_at ASC');
  stmt.bind([taskId]);
  while (stmt.step()) {
    const row = stmt.getAsObject();
    results.push({
      ...row,
      input: row.input ? decryptField(row.input) : row.input,
      output: row.output ? decryptField(row.output) : row.output
    });
  }
  stmt.free();
  return results;
}

async function addReviewResults(taskId, clauses) {
  const db = await getDb();
  for (const c of clauses) {
    db.run('INSERT INTO review_results (task_id, clause_name, risk_level, risk_score, original_text, law_article, law_text, rule_id, rule_content, suggestion, confidence, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [taskId, c.clause_name, c.risk_level, c.risk_score, c.original_text || null, c.law_article || null, c.law_text || null, c.rule_id || null, c.rule_content || null, c.suggestion || null, c.confidence || 0, c.position || null]);
  }
  saveDb();
}

async function getReviewResults(taskId) {
  const db = await getDb();
  const results = [];
  const stmt = db.prepare('SELECT * FROM review_results WHERE task_id = ? ORDER BY risk_score DESC');
  stmt.bind([taskId]);
  while (stmt.step()) results.push(stmt.getAsObject());
  stmt.free();
  return results;
}

function encryptField(text) {
  const key = Buffer.from(process.env.AUDIT_ENCRYPTION_KEY, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decryptField(encrypted) {
  if (!encrypted || !encrypted.includes(':')) return encrypted;
  const [ivHex, data] = encrypted.split(':');
  const key = Buffer.from(process.env.AUDIT_ENCRYPTION_KEY, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

async function getConsent() {
  const db = await getDb();
  const stmt = db.prepare('SELECT * FROM user_consent ORDER BY created_at DESC LIMIT 1');
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

async function setConsent(consented) {
  const db = await getDb();
  const id = require('uuid').v4();
  db.run("INSERT INTO user_consent (id, consented, consented_at) VALUES (?, ?, datetime('now','localtime'))", [id, consented ? 1 : 0]);
  saveDb();
  return id;
}

module.exports = { getDb, saveDb, createTask, getTask, getTasks, updateTask, deleteTask, addAuditLog, getAuditLogs, addReviewResults, getReviewResults, getConsent, setConsent };
