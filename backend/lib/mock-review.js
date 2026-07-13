/**
 * Mock review engine for testing without DeepSeek API
 */
function generateMockReview(text, fileName) {
  const hash = simpleHash(text);
  const score = (hash % 55 + 15) / 10; // 1.5 - 6.5
  const highCount = (hash % 3) + 1;
  const mediumCount = (hash % 4) + 2;

  const clauses = [];

  // Check contract type from text
  const isLease = /租|赁|房东|房客|押金|租金/.test(text);
  const isLabor = /劳动|雇佣|聘用|工资/.test(text);
  const isSale = /买卖|购销|采购|商品/.test(text);

  if (isLease) {
    clauses.push({ clause_name: '违约金比例超过30%', risk_level: 'high', risk_score: 8.5, original_text: findClause(text, ['违约', '赔偿', '罚']), law_article: '《民法典》第585条', law_text: '约定的违约金过分高于造成的损失的，人民法院或者仲裁机构可以根据当事人的请求予以适当减少。', rule_id: 'lease_002', rule_content: '违约金不得超过实际损失的30%', suggestion: '建议将违约金调整为实际损失的30%以内', confidence: 0.91, position: '违约金条款' });
    clauses.push({ clause_name: '押金退还期限过长', risk_level: 'medium', risk_score: 5.5, original_text: findClause(text, ['押金', '退还', '退押']), law_article: '《民法典》第703条', law_text: '租赁合同是出租人将租赁物交付承租人使用、收益，承租人支付租金的合同。', rule_id: 'lease_003', rule_content: '租赁期满后押金退还期限超过30日不合理', suggestion: '建议押金退还期限缩短至15个工作日内', confidence: 0.85, position: '押金条款' });
    clauses.push({ clause_name: '维修责任划分不明确', risk_level: 'medium', risk_score: 4.5, original_text: findClause(text, ['维修', '修理', '维护']), law_article: '《民法典》第712条', law_text: '出租人应当履行租赁物的维修义务，但是当事人另有约定的除外。', rule_id: 'lease_005', rule_content: '房屋维修责任划分不明确可能导致纠纷', suggestion: '明确区分出租人和承租人的维修责任范围和费用承担', confidence: 0.78, position: '维修条款' });
  }

  if (isLabor) {
    clauses.push({ clause_name: '试用期超过法定期限', risk_level: 'high', risk_score: 9.0, original_text: findClause(text, ['试用', '试用期']), law_article: '《劳动合同法》第19条', law_text: '劳动合同期限三个月以上不满一年的，试用期不得超过一个月。', rule_id: 'labor_001', rule_content: '试用期最长不得超过6个月', suggestion: '将试用期调整至法定期限内', confidence: 0.93, position: '试用期条款' });
    clauses.push({ clause_name: '违约金条款违法', risk_level: 'high', risk_score: 8.0, original_text: findClause(text, ['违约金', '赔偿']), law_article: '《劳动合同法》第22条', law_text: '除服务期和竞业限制外，用人单位不得约定由劳动者承担的违约金。', rule_id: 'labor_002', rule_content: '不得约定由劳动者承担的违约金', suggestion: '删除违法的违约金条款', confidence: 0.90, position: '违约金条款' });
  }

  if (isSale) {
    clauses.push({ clause_name: '质量标准约定不明', risk_level: 'high', risk_score: 7.5, original_text: findClause(text, ['质量', '标准', '合格']), law_article: '《民法典》第615条', law_text: '出卖人应当按照约定的质量要求交付标的物。', rule_id: 'sale_001', rule_content: '未约定质量标准或约定不明确', suggestion: '明确约定质量标准，包括国标、行标或封样标准', confidence: 0.88, position: '质量标准条款' });
    clauses.push({ clause_name: '验收期限过短', risk_level: 'medium', risk_score: 5.0, original_text: findClause(text, ['验收', '检验', '收货']), law_article: '《民法典》第620条', law_text: '买受人收到标的物时应当在约定的检验期限内检验。', rule_id: 'sale_002', rule_content: '验收期限过短可能导致买方无法完成全面检验', suggestion: '延长验收期限至合理期间', confidence: 0.80, position: '验收条款' });
  }

  // Generic clauses for any contract type
  if (!isLease && !isLabor && !isSale || clauses.length < 3) {
    if (!clauses.find(c => c.rule_id === 'generic_law')) {
      clauses.push({ clause_name: '适用法律选择不当', risk_level: 'medium', risk_score: 4.0, original_text: findClause(text, ['法律', '管辖', '争议']), law_article: '《民法典》第470条', law_text: '合同的内容由当事人约定，一般包括违约责任、解决争议的方法等条款。', rule_id: 'generic_law', rule_content: '适用法律和管辖条款需明确约定', suggestion: '明确约定适用法律和争议解决方式', confidence: 0.70, position: '法律适用条款' });
    }
    if (!clauses.find(c => c.rule_id === 'generic_sign')) {
      clauses.push({ clause_name: '签署条款不完备', risk_level: 'medium', risk_score: 3.5, original_text: findClause(text, ['签署', '盖章', '签字']), rule_id: 'generic_sign', rule_content: '合同签署条款需明确签署主体和生效条件', suggestion: '增加签署主体、盖章要求和生效条件条款', confidence: 0.65, position: '签署条款' });
    }
  }

  // Filter to only high/medium
  const filtered = clauses.filter(c => c.risk_level === 'high' || c.risk_level === 'medium');
  const hCount = filtered.filter(c => c.risk_level === 'high').length;
  const mCount = filtered.filter(c => c.risk_level === 'medium').length;

  return {
    clauses: filtered,
    summary: `审查发现 ${hCount} 项高风险、${mCount} 项中风险，综合评分 ${score.toFixed(1)}/10`,
    type: isLease ? 'lease' : isLabor ? 'labor' : isSale ? 'sale' : 'unknown',
    type_cn: isLease ? '租赁合同' : isLabor ? '劳动合同' : isSale ? '买卖合同' : '未知'
  };
}

function simpleHash(text) {
  let hash = 0;
  for (let i = 0; i < Math.min(200, text.length); i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function findClause(text, keywords) {
  if (!text) return '';
  const lines = text.split('\n');
  for (const keyword of keywords) {
    for (const line of lines) {
      if (line.includes(keyword)) return line.trim().slice(0, 100);
    }
  }
  return '';
}

module.exports = { generateMockReview };
