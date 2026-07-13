/**
 * Layer 3 + 4: Execution Engine + Slow Think Engine
 * 决策层 - 假设生成 → 证据搜集 → 推理评估 → 反思校验
 */
const OpenAI = require('openai');
const mockReview = require('./mock-review');

const MOCK_MODE = process.env.MOCK_REVIEW === 'true';

const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'
});

const MODEL = 'deepseek-chat';
const TIMEOUT_MS = 120000;

// Main review function: single-call with all context
async function reviewContract(contractText, contractType, targets, ragRules) {
  const startTime = Date.now();
  
  if (MOCK_MODE) {
    console.log('[mock-review] Using local mock for review');
    const mock = mockReview.generateMockReview(contractText, 'review.txt');
    return { clauses: mock.clauses, summary: mock.summary };
  }

  // Step 1: Generate assumptions
  const hypothesis = await generateHypothesis(contractText, contractType, targets, ragRules);
  if (Date.now() - startTime > TIMEOUT_MS) return handleTimeout(hypothesis, 'generateHypothesis');
  
  // Step 2: Evidence collection
  const evidence = await collectEvidence(contractText, hypothesis, ragRules);
  if (Date.now() - startTime > TIMEOUT_MS) return handleTimeout({ hypothesis, evidence, reasoning: hypothesis }, 'collectEvidence');
  
  // Step 3: Reasoning & assessment
  const reasoning = await assessRisks(contractText, hypothesis, evidence, ragRules, targets);
  if (Date.now() - startTime > TIMEOUT_MS) return handleTimeout({ hypothesis, evidence, reasoning }, 'assessRisks');
  
  // Step 4: Reflection & calibration
  const final = await reflectAndCalibrate(contractText, reasoning, contractType);
  
  return final;
}

async function generateHypothesis(text, contractType, targets, ragRules) {
  const relevantRules = ragRules?.slice(0, 8).map(r => `【${r.level}】${r.name}：${r.description}`).join('\n') || '';
  const targetStr = targets?.slice(0, 4).map(t => `- ${t.name}（${t.priority}）：${t.description}`).join('\n') || '';

  const prompt = `审查以下${contractType}合同，列出最可能的5个风险点。

合同文本：
${text.slice(0, 5000)}

${targetStr ? `审查维度：\n${targetStr}` : ''}
${relevantRules ? `相关规则：\n${relevantRules}` : ''}

输出JSON：
{"risks":[{"id":"risk_1","name":"风险名称","reason":"为什么认为这是一个风险","expectedSeverity":"high/medium/low","relevantRules":["规则ID列表"]}]}`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: '你是合同审查专家。根据合同内容和规则库生成风险假设。输出JSON。' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 2000,
      temperature: 0.4
    });
    const content = response.choices[0]?.message?.content || '{}';
    return JSON.parse(content).risks || [];
  } catch (e) {
    console.error('Hypothesis error:', e.message);
    return [];
  }
}

async function collectEvidence(text, hypotheses, ragRules) {
  if (!hypotheses || hypotheses.length === 0) return [];

  const prompt = `根据合同文本和规则库，为以下每条风险假设收集证据（找到原文对应段落）和规则/法条依据。

合同文本：
${text.slice(0, 6000)}

风险假设：
${JSON.stringify(hypotheses, null, 2)}

${ragRules ? `规则库：${JSON.stringify(ragRules.map(r => ({ id: r.id, name: r.name, level: r.level, desc: r.description, article: r.lawArticle })).slice(0, 10))}` : ''}

为每条风险输出证据链：
{"evidenceList":[{"riskId":"risk_1","originalText":"合同原文段落","matchedRule":{"id":"rule_id","name":"规则名"},"lawArticles":["法条引用"],"weight":0.0-1.0}]}`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: '你是合同审查专家的证据收集模块。为风险假设寻找原作证据和法条依据。输出JSON。' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 3000,
      temperature: 0.3
    });
    const content = response.choices[0]?.message?.content || '{}';
    return JSON.parse(content).evidenceList || [];
  } catch (e) {
    console.error('Evidence collection error:', e.message);
    return [];
  }
}

async function assessRisks(text, hypotheses, evidence, ragRules, targets) {
  if (!hypotheses || hypotheses.length === 0) return [];

  const prompt = `综合评估以下合同的风险项。输出仅包含中高风险（排除低风险）。

合同文本摘要：
${text.slice(0, 3000)}

风险假设及证据：
${JSON.stringify({ hypotheses, evidence }, null, 2)}

${ragRules ? `规则库参考：${JSON.stringify(ragRules.map(r => ({ name: r.name, level: r.level, article: r.lawArticle, suggestion: r.suggestion })).slice(0, 10))}` : ''}

${targets ? `审查目标：${JSON.stringify(targets)}` : ''}

输出每条风险的完整评估：
{
  "clauses": [{
    "clause_name":"风险项名称",
    "risk_level":"high/medium",
    "risk_score":0.0-10.0,
    "original_text":"原文段落",
    "law_article":"法条引用",
    "law_text":"法条原文",
    "rule_id":"匹配规则ID",
    "rule_content":"规则内容",
    "suggestion":"修改建议",
    "confidence":0.0-1.0,
    "position":"第X条/第X段"
  }]
}
仅输出中高风险。不超过8项。`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: '你是合同审查评估专家。综合所有信息输出最终审查结果，仅中高风险项。输出JSON。' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 4000,
      temperature: 0.2
    });
    const content = response.choices[0]?.message?.content || '{}';
    return JSON.parse(content).clauses || [];
  } catch (e) {
    console.error('Assessment error:', e.message);
    return [];
  }
}

async function reflectAndCalibrate(text, clauses, contractType) {
  if (!clauses || clauses.length === 0) return { clauses: [], summary: '未发现风险项' };

  const prompt = `反思校验以下合同审查结果。请检查：
1. 是否有遗漏的中高风险项？
2. 是否有误报（不应列为中高风险的项）？
3. 置信度评估是否合理？
4. 生成总体审查摘要。

合同类型：${contractType}
评估结果：${JSON.stringify(clauses, null, 2)}

输出校验结果：
{
  "clauses": [...],
  "summary":"审查总结（200字以内）",
  "dropped":[{"name":"已移除项","reason":"移除原因"}],
  "added":[{"name":"新增项","reason":"补充原因"}]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: '你作为审查质量检查员，反思校验审查结果的质量和完备性。输出JSON。' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 3000,
      temperature: 0.3
    });
    const content = response.choices[0]?.message?.content || '{}';
    return JSON.parse(content);
  } catch (e) {
    console.error('Reflection error:', e.message);
    return { clauses, summary: '审查完成（未完成反思校验）' };
  }
}

function handleTimeout(partialResult, stage) {
  console.warn(`SlowThink timeout at stage: ${stage}`);
  return {
    clauses: [],
    summary: `审查在${stage}阶段超时（超过${TIMEOUT_MS/1000}秒），结果可能不完整`,
    partialResult
  };
}

module.exports = { reviewContract, generateHypothesis, collectEvidence, assessRisks, reflectAndCalibrate };
