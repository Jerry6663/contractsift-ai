require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3098;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist')));

// File upload config
const storage = multer.diskStorage({
  destination: path.join(__dirname, 'uploads'),
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}${path.extname(file.originalname)}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.docx', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) return cb(null, true);
    cb(new Error('\u8bf7\u4e0a\u4f20 PDF/DOCX/TXT \u683c\u5f0f\u7684\u6587\u4ef6'));
  }
});

// Libs
const db = require('./lib/database');
const intentEngine = require('./lib/intent-engine');
const ragKnowledge = require('./lib/rag-knowledge');
const slowThink = require('./lib/slow-think');
const parser = require('./lib/parser');

// v4 is already required above
const { v4 } = require('uuid');

// --- API Routes ---

app.get('/api/health', (req, res) => res.json({ status: 'ok', version: '1.0.0' }));

app.get('/api/consent', async (req, res) => {
  const c = await db.getConsent();
  res.json({ consented: c ? !!c.consented : false });
});

app.post('/api/consent', async (req, res) => {
  const { consented } = req.body;
  await db.setConsent(consented === true);
  res.json({ success: true });
});

// Workaround for multer's broken UTF-8 filename on Node.js v25+
function extractFileName(req) {
  // Try to get filename from req.body or the raw Content-Disposition
  if (req.body && req.body.fileName) return req.body.fileName;
  // Manually extract from headers: multipart/form-data; boundary=...
  const contentType = req.headers['content-type'] || '';
  const boundary = contentType.split('boundary=')[1];
  if (!boundary) return null;
  // We need the raw body - can't access it after multer processed it
  // Fallback: use multer's originalname
  return null;
}

app.post('/api/review/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '\u8bf7\u4e0a\u4f20\u6587\u4ef6' });

    const file = req.file;
    
    // Decode filename: multer on Node.js v25+ corrupts UTF-8 Chinese chars
    // Use latin1 → utf8 to recover the bytes (works when bytes weren't fully lost)
    let decodedFileName = file.originalname;
    try {
      const buf = Buffer.from(file.originalname, 'latin1');
      const utf8 = buf.toString('utf8');
      // Only use if valid (no replacement chars)
      if (!utf8.includes('\uFFFD')) decodedFileName = utf8;
    } catch(e) {}
    
    // Fallback: req.body.fileName if multer corrupted the originalname
    if (decodedFileName.includes('\uFFFD') || decodedFileName.includes('\x00')) {
      decodedFileName = decodeURIComponent(req.body?.fileName || 'uploaded-file.txt');
    }
    
    const ext = path.extname(decodedFileName).toLowerCase().replace('.', '');
    const taskId = v4();
    const fs = require('fs');
    const buffer = fs.readFileSync(file.path);
    const text = await parser.parseText(buffer, ext);

    if (!text || text.trim().length < 10) {
      return res.status(400).json({ error: '\u65e0\u6cd5\u4ece\u6587\u4ef6\u4e2d\u63d0\u53d6\u6709\u6548\u6587\u672c' });
    }
    
    await db.createTask({ id: taskId, fileName: decodedFileName, fileType: ext, fileSize: file.size });
    await db.addAuditLog({ id: v4(), taskId, layer: 'intent', action: 'detect_contract_type', input: text.slice(0, 500), output: '', status: 'processing' });

    const typeResult = intentEngine.detectContractType(text);

    if (typeResult && typeResult.ambiguous) {
      const questions = intentEngine.generateQuestions(typeResult.candidates, text);
      await db.updateTask(taskId, { status: 'awaiting_clarification' });
      return res.json({ taskId, status: 'needs_clarification', questions });
    }

    const contractType = typeResult?.id || 'unknown';
    const typeCn = intentEngine.CONTRACT_TYPES.find(t => t.id === contractType)?.name || '\u672a\u77e5';
    await db.updateTask(taskId, { contract_type: contractType, contract_type_cn: typeCn });
    await db.addAuditLog({ id: v4(), taskId, layer: 'intent', action: 'type_detected', input: text.slice(0, 300), output: JSON.stringify({ type: contractType, typeCn }) });

    await db.addAuditLog({ id: v4(), taskId, layer: 'intent', action: 'build_target_tree', input: contractType, output: '', status: 'processing' });
    const targets = await intentEngine.buildTargetTree(contractType, text);
    await db.updateTask(taskId, { target_tree: JSON.stringify(targets) });
    await db.addAuditLog({ id: v4(), taskId, layer: 'intent', action: 'target_tree_built', input: '', output: JSON.stringify(targets.slice(0, 3)) });

    await db.addAuditLog({ id: v4(), taskId, layer: 'cognitive', action: 'load_rules', input: 'contractType=' + contractType, output: '', status: 'processing' });
    const ragRules = ragKnowledge.searchRules(contractType, text);
    await db.addAuditLog({ id: v4(), taskId, layer: 'cognitive', action: 'rules_loaded', input: contractType, output: JSON.stringify({ count: ragRules.length }) });

    const actionChain = [
      { step: 1, action: '\u89e3\u6790\u5408\u540c\u6761\u6b3e', status: 'pending' },
      { step: 2, action: '\u5339\u914d\u5ba1\u67e5\u89c4\u5219', status: 'pending', detail: '\u5c06\u5339\u914d' + ragRules.length + '\u6761\u76f8\u5173\u89c4\u5219' },
      { step: 3, action: '\u6cd5\u6761\u4ea4\u53c9\u6bd4\u5bf9', status: 'pending' },
      { step: 4, action: '\u98ce\u9669\u63a8\u7406\u8bc4\u4f30', status: 'pending', detail: '\u57fa\u4e8eDeepSeek\u6162\u601d\u8003\u5f15\u64ce\u8fdb\u884c\u56db\u6b65\u63a8\u7406' },
      { step: 5, action: '\u751f\u6210\u5ba1\u67e5\u62a5\u544a', status: 'pending' }
    ];

    await db.updateTask(taskId, { action_chain: JSON.stringify(actionChain), status: 'awaiting_confirmation' });

    res.json({ taskId, status: 'needs_confirmation', contractType, contractTypeCn: typeCn, targets, rulesCount: ragRules.length, actionChain });

  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/review/execute', async (req, res) => {
  try {
    const { taskId, actionChain } = req.body;
    if (!taskId) return res.status(400).json({ error: '\u7f3a\u5c11taskId' });

    const task = await db.getTask(taskId);
    if (!task) return res.status(404).json({ error: '\u4efb\u52a1\u4e0d\u5b58\u5728' });

    await db.updateTask(taskId, { status: 'reviewing', action_chain: JSON.stringify(actionChain || JSON.parse(task.action_chain || '[]')) });

    const fs = require('fs');
    filePath = path.join(__dirname, 'uploads', '');
    // Find most recent file
    const files = fs.readdirSync(path.join(__dirname, 'uploads')).filter(f => !f.startsWith('_'));
    files.sort((a, b) => fs.statSync(path.join(__dirname, 'uploads', b)).mtimeMs - fs.statSync(path.join(__dirname, 'uploads', a)).mtimeMs);

    let text = '';
    if (files.length > 0) {
      const buffer = fs.readFileSync(path.join(__dirname, 'uploads', files[0]));
      text = await parser.parseText(buffer, task.file_type);
    }

    if (!text || text.length < 10) {
      text = '\u5408\u540c\u6587\u672c\u65e0\u6cd5\u8bfb\u53d6\uff0c\u8bf7\u91cd\u65b0\u4e0a\u4f20';
    }

    const targets = JSON.parse(task.target_tree || '[]');
    const ragRules = ragKnowledge.searchRules(task.contract_type, text);

    await db.addAuditLog({ id: v4(), taskId, layer: 'execution', action: 'start_review', input: JSON.stringify({ contractType: task.contract_type, textLength: text.length }), status: 'processing' });

    const result = await slowThink.reviewContract(text, task.contract_type, targets, ragRules);
    const filteredClauses = (result.clauses || []).filter(c => c.risk_level === 'high' || c.risk_level === 'medium');

    await db.addReviewResults(taskId, filteredClauses);

    await db.addAuditLog({ id: v4(), taskId, layer: 'execution', action: 'review_completed', input: '', output: JSON.stringify({ totalClauses: filteredClauses.length, highCount: filteredClauses.filter(c => c.risk_level === 'high').length, mediumCount: filteredClauses.filter(c => c.risk_level === 'medium').length }), status: 'completed' });

    await db.updateTask(taskId, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      risk_summary: JSON.stringify({ high: filteredClauses.filter(c => c.risk_level === 'high').length, medium: filteredClauses.filter(c => c.risk_level === 'medium').length, total: filteredClauses.length })
    });

    res.json({ success: true, taskId, contractType: task.contract_type, contractTypeCn: task.contract_type_cn, summary: result.summary || '\u5ba1\u67e5\u5b8c\u6210', highCount: filteredClauses.filter(c => c.risk_level === 'high').length, mediumCount: filteredClauses.filter(c => c.risk_level === 'medium').length, clauses: filteredClauses });

  } catch (err) {
    console.error('Execute error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/review/clarify', async (req, res) => {
  try {
    const { taskId, answers } = req.body;
    const task = await db.getTask(taskId);
    if (!task) return res.status(404).json({ error: '\u4efb\u52a1\u4e0d\u5b58\u5728' });

    const contractType = answers?.contract_type || 'unknown';
    const typeCn = intentEngine.CONTRACT_TYPES.find(t => t.id === contractType)?.name || '\u672a\u77e5';
    await db.updateTask(taskId, { contract_type: contractType, contract_type_cn: typeCn });

    const fs = require('fs');
    const files = fs.readdirSync(path.join(__dirname, 'uploads')).filter(f => !f.startsWith('_'));
    files.sort((a, b) => fs.statSync(path.join(__dirname, 'uploads', b)).mtimeMs - fs.statSync(path.join(__dirname, 'uploads', a)).mtimeMs);

    let text = '';
    if (files.length > 0) {
      const buffer = fs.readFileSync(path.join(__dirname, 'uploads', files[0]));
      text = await parser.parseText(buffer, task.file_type);
    }

    const targets = await intentEngine.buildTargetTree(contractType, text);
    await db.updateTask(taskId, { target_tree: JSON.stringify(targets) });

    const ragRules = ragKnowledge.searchRules(contractType, text);
    const actionChain = [
      { step: 1, action: '\u89e3\u6790\u5408\u540c\u6761\u6b3e', status: 'pending' },
      { step: 2, action: '\u5339\u914d\u5ba1\u67e5\u89c4\u5219', status: 'pending', detail: '\u5c06\u5339\u914d' + ragRules.length + '\u6761\u76f8\u5173\u89c4\u5219' },
      { step: 3, action: '\u6cd5\u6761\u4ea4\u53c9\u6bd4\u5bf9', status: 'pending' },
      { step: 4, action: '\u98ce\u9669\u63a8\u7406\u8bc4\u4f30', status: 'pending', detail: '\u57fa\u4e8eDeepSeek\u6162\u601d\u8003\u5f15\u64ce\u8fdb\u884c\u56db\u6b65\u63a8\u7406' },
      { step: 5, action: '\u751f\u6210\u5ba1\u67e5\u62a5\u544a', status: 'pending' }
    ];

    await db.updateTask(taskId, { action_chain: JSON.stringify(actionChain), status: 'awaiting_confirmation' });

    res.json({ taskId, status: 'needs_confirmation', contractType, contractTypeCn: typeCn, targets, rulesCount: ragRules.length, actionChain });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/task/:id', async (req, res) => {
  const task = await db.getTask(req.params.id);
  if (!task) return res.status(404).json({ error: '\u4efb\u52a1\u4e0d\u5b58\u5728' });
  const audits = await db.getAuditLogs(req.params.id);
  const results = await db.getReviewResults(req.params.id);
  const consent = await db.getConsent();
  res.json({ task, audits, results, consent });
});

app.get('/api/history', async (req, res) => {
  const tasks = await db.getTasks();
  res.json(tasks.map(t => ({ 
    id: t.id, 
    fileName: t.file_name,
    fileType: t.file_type, 
    status: t.status, 
    contractType: t.contract_type, 
    contractTypeCn: t.contract_type_cn, 
    riskSummary: t.risk_summary ? JSON.parse(t.risk_summary) : null, 
    createdAt: t.created_at, 
    completedAt: t.completed_at 
  })));
});

app.delete('/api/task/:id', async (req, res) => {
  await db.deleteTask(req.params.id);
  res.json({ success: true, message: '\u5df2\u5220\u9664\u3002\u6570\u636e\u5c06\u572830\u5929\u5185\u5f7b\u5e95\u6e05\u9664\u3002' });
});

app.get('/api/audit/:taskId', async (req, res) => {
  const logs = await db.getAuditLogs(req.params.taskId);
  res.json(logs);
});

// Catch-all: serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('[ContractReviewV2] Server running on http://localhost:' + PORT);
  console.log('[ContractReviewV2] API: http://localhost:' + PORT + '/api/health');
});