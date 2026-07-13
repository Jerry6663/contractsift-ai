/**
 * Layer 2: Cognitive Layer — RAG Knowledge
 * 认知层 - 规则库317条/12类 + 法条检索
 */
const fs = require('fs');
const path = require('path');

let rulesCache = null;

// Load rules from JSON file
function loadRules() {
  if (rulesCache) return rulesCache;
  try {
    const rulesPath = path.join(__dirname, '..', 'data', 'rules.json');
    if (fs.existsSync(rulesPath)) {
      rulesCache = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
      return rulesCache;
    }
  } catch (e) {
    console.error('Rules load error:', e.message);
  }
  // Return built-in rules as fallback
  rulesCache = getBuiltinRules();
  return rulesCache;
}

function getBuiltinRules() {
  return {
    "lease": [
      { "id": "lease_001", "name": "租期超过20年", "level": "high", "dimension": "租赁期限", "description": "租赁合同最长期限为20年，超过20年部分无效（《民法典》第705条）", "suggestion": "缩短租赁期限至20年以内，或约定续租条款", "lawArticle": "《民法典》第705条" },
      { "id": "lease_002", "name": "违约金超过30%", "level": "high", "dimension": "违约责任", "description": "违约金不得超过实际损失的30%，超过部分法院可调减（《民法典》第585条）", "suggestion": "建议违约金设置为实际损失的30%以内", "lawArticle": "《民法典》第585条" },
      { "id": "lease_003", "name": "押金退还期限过长", "level": "medium", "dimension": "押金条款", "description": "租赁期满后押金退还期限超过30日不合理", "suggestion": "建议押金退还期限缩短至15个工作日内", "lawArticle": "《民法典》第703条" },
      { "id": "lease_004", "name": "单方面涨租条款", "level": "high", "dimension": "租金条款", "description": "未经双方协商单方面涨租条款可能显失公平", "suggestion": "建议约定租金调整机制（如每2年调整不超过10%）", "lawArticle": "《民法典》第496条" },
      { "id": "lease_005", "name": "维修责任不清", "level": "medium", "dimension": "维修义务", "description": "房屋维修责任划分不明确可能导致纠纷", "suggestion": "明确区分出租人和承租人的维修责任范围和费用承担", "lawArticle": "《民法典》第712条" },
      { "id": "lease_006", "name": "转租限制不当", "level": "medium", "dimension": "转租条款", "description": "无条件禁止转租或转租需出租人任意同意均不合理", "suggestion": "约定转租需出租人书面同意，且不得无理拒绝", "lawArticle": "《民法典》第716条" },
      { "id": "lease_007", "name": "优先购买权缺失", "level": "medium", "dimension": "承租人权利", "description": "出租人出售房屋时承租人享有优先购买权", "suggestion": "增加承租人在同等条件下的优先购买权条款", "lawArticle": "《民法典》第726条" }
    ],
    "labor": [
      { "id": "labor_001", "name": "试用期超过法定期限", "level": "high", "dimension": "试用期", "description": "试用期最长不得超过6个月，且不得延长", "suggestion": "将试用期调整至法定期限内", "lawArticle": "《劳动合同法》第19条" },
      { "id": "labor_002", "name": "违约金条款违法", "level": "high", "dimension": "违约金", "description": "除服务期和竞业限制外，用人单位不得约定由劳动者承担的违约金", "suggestion": "删除违法的违约金条款", "lawArticle": "《劳动合同法》第22条" },
      { "id": "labor_003", "name": "竞业限制补偿过低", "level": "medium", "dimension": "竞业限制", "description": "竞业限制补偿标准不低于劳动合同解除前12个月平均工资的30%", "suggestion": "提高竞业限制补偿至法定最低标准", "lawArticle": "《劳动合同法》第23条" }
    ],
    "sale": [
      { "id": "sale_001", "name": "质量标准约定不明", "level": "high", "dimension": "质量标准", "description": "合同未约定质量标准或约定不明确", "suggestion": "明确约定质量标准，包括国标、行标或双方确定的封样标准", "lawArticle": "《民法典》第615条" },
      { "id": "sale_002", "name": "验收期限过短", "level": "medium", "dimension": "验收条款", "description": "验收期限过短可能导致买方无法完成全面检验", "suggestion": "延长验收期限至合理期间", "lawArticle": "《民法典》第620条" }
    ],
    "service": [
      { "id": "service_001", "name": "服务标准不明确", "level": "high", "dimension": "服务标准", "description": "服务内容、标准、交付物未明确约定", "suggestion": "详细列明服务内容清单、交付标准和验收标准", "lawArticle": "《民法典》第470条" }
    ],
    "loan": [
      { "id": "loan_001", "name": "利率超过法定上限", "level": "high", "dimension": "利率条款", "description": "民间借贷利率不得超过合同成立时LPR的4倍", "suggestion": "将利率调整至法定上限范围内", "lawArticle": "《最高人民法院关于审理民间借贷案件适用法律若干问题的规定》第25条" }
    ],
    "construction": [
      { "id": "construction_001", "name": "违法转包/分包", "level": "high", "dimension": "分包条款", "description": "禁止违法转包，限制分包范围", "suggestion": "增加禁止违法转包条款，明确分包需经发包人同意", "lawArticle": "《建筑法》第28条" }
    ],
    "guarantee": [
      { "id": "guarantee_001", "name": "保证方式约定不明", "level": "high", "dimension": "保证方式", "description": "保证方式未约定或约定不明的按一般保证处理", "suggestion": "明确约定为连带责任保证或一般保证", "lawArticle": "《民法典》第686条" }
    ],
    "insurance": [
      { "id": "insurance_001", "name": "免责条款未提示说明", "level": "high", "dimension": "免责条款", "description": "免责条款未作提示说明的，该条款不产生效力", "suggestion": "对免责条款进行加粗、下划线等提示，并做明确说明", "lawArticle": "《保险法》第17条" }
    ],
    "entrust": [
      { "id": "entrust_001", "name": "转委托权限不明", "level": "medium", "dimension": "转委托", "description": "转委托需经委托人同意或追认", "suggestion": "明确转委托的条件和程序", "lawArticle": "《民法典》第923条" }
    ],
    "transport": [
      { "id": "transport_001", "name": "货物损毁责任不清", "level": "high", "dimension": "运输责任", "description": "货物在运输途中损毁的风险承担未明确", "suggestion": "约定货物风险转移时点和运输责任划分", "lawArticle": "《民法典》第832条" }
    ],
    "storage": [
      { "id": "storage_001", "name": "保管人赔偿责任不清", "level": "medium", "dimension": "保管责任", "description": "保管期间货物毁损灭失的赔偿责任未明确", "suggestion": "明确保管人的注意义务和赔偿责任标准", "lawArticle": "《民法典》第892条" }
    ],
    "property": [
      { "id": "property_001", "name": "物业费调整机制缺失", "level": "medium", "dimension": "物业费", "description": "物业费调整机制不透明，缺乏业主参与", "suggestion": "增加物业费调整的业主大会议决机制", "lawArticle": "《物业管理条例》第41条" }
    ]
  };
}

function searchRules(contractType, text = '') {
  const rules = loadRules();
  const typeRules = rules[contractType] || [];
  
  // Score each rule against the text
  return typeRules.map(rule => {
    let relevanceScore = 0;
    // Check if rule keywords appear in text
    const keywordChecks = [
      '违约', '押金', '租期', '租金', '试用期', '竞业', '利率',
      '质量标准', '验收', '转包', '分包', '保证', '免责', '物业'
    ];
    for (const kw of keywordChecks) {
      if (text.includes(kw) && (rule.name.includes(kw) || rule.dimension.includes(kw))) {
        relevanceScore += 1;
      }
    }
    return { ...rule, relevanceScore };
  }).filter(r => r.relevanceScore >= 0) // Return all rules with relevance score
   .sort((a, b) => b.level === 'high' ? 1 : -1);
}

// Law article lookup
const lawDB = {
  '《民法典》第585条': { text: '约定的违约金过分高于造成的损失的，人民法院或者仲裁机构可以根据当事人的请求予以适当减少。', source: '国家法律法规数据库', publishDate: '2020-05-28' },
  '《民法典》第705条': { text: '租赁期限不得超过二十年。超过二十年的，超过部分无效。租赁期限届满，当事人可以续订租赁合同；但是，约定的租赁期限自续订之日起不得超过二十年。', source: '国家法律法规数据库', publishDate: '2020-05-28' },
  '《民法典》第703条': { text: '租赁合同是出租人将租赁物交付承租人使用、收益，承租人支付租金的合同。', source: '国家法律法规数据库', publishDate: '2020-05-28' },
  '《民法典》第496条': { text: '采用格式条款订立合同的，提供格式条款的一方应当遵循公平原则确定当事人之间的权利和义务，并采取合理的方式提示对方注意免除或者减轻其责任等与对方有重大利害关系的条款。', source: '国家法律法规数据库', publishDate: '2020-05-28' },
  '《民法典》第712条': { text: '出租人应当履行租赁物的维修义务，但是当事人另有约定的除外。', source: '国家法律法规数据库', publishDate: '2020-05-28' },
  '《民法典》第716条': { text: '承租人经出租人同意，可以将租赁物转租给第三人。承租人转租的，承租人与出租人之间的租赁合同继续有效。', source: '国家法律法规数据库', publishDate: '2020-05-28' },
  '《民法典》第726条': { text: '出租人出卖租赁房屋的，应当在出卖之前的合理期限内通知承租人，承租人享有以同等条件优先购买的权利。', source: '国家法律法规数据库', publishDate: '2020-05-28' },
  '《民法典》第615条': { text: '出卖人应当按照约定的质量要求交付标的物。出卖人提供有关标的物质量说明的，交付的标的物应当符合该说明的质量要求。', source: '国家法律法规数据库', publishDate: '2020-05-28' },
  '《民法典》第620条': { text: '买受人收到标的物时应当在约定的检验期限内检验。没有约定检验期限的，应当及时检验。', source: '国家法律法规数据库', publishDate: '2020-05-28' },
  '《民法典》第470条': { text: '合同的内容由当事人约定，一般包括下列条款：当事人的姓名或者名称和住所；标的；数量；质量；价款或者报酬；履行期限、地点和方式；违约责任；解决争议的方法。', source: '国家法律法规数据库', publishDate: '2020-05-28' },
  '《民法典》第686条': { text: '保证的方式包括一般保证和连带责任保证。当事人在保证合同中对保证方式没有约定或者约定不明确的，按照一般保证承担保证责任。', source: '国家法律法规数据库', publishDate: '2020-05-28' },
  '《民法典》第923条': { text: '受托人应当亲自处理委托事务。经委托人同意，受托人可以转委托。', source: '国家法律法规数据库', publishDate: '2020-05-28' },
  '《民法典》第832条': { text: '承运人对运输过程中货物的毁损、灭失承担赔偿责任。但是，承运人证明货物的毁损、灭失是因不可抗力、货物本身的自然性质或者合理损耗以及托运人、收货人的过错造成的，不承担赔偿责任。', source: '国家法律法规数据库', publishDate: '2020-05-28' },
  '《民法典》第892条': { text: '保管人应当妥善保管保管物。当事人可以约定保管场所或者方法。除紧急情况或者为维护寄存人利益外，不得擅自改变保管场所或者方法。', source: '国家法律法规数据库', publishDate: '2020-05-28' },
  '《劳动合同法》第19条': { text: '劳动合同期限三个月以上不满一年的，试用期不得超过一个月；劳动合同期限一年以上不满三年的，试用期不得超过二个月；三年以上固定期限和无固定期限的劳动合同，试用期不得超过六个月。同一用人单位与同一劳动者只能约定一次试用期。', source: '国家法律法规数据库', publishDate: '2012-12-28' },
  '《劳动合同法》第22条': { text: '用人单位为劳动者提供专项培训费用，对其进行专业技术培训的，可以与该劳动者订立协议，约定服务期。劳动者违反服务期约定的，应当按照约定向用人单位支付违约金。违约金的数额不得超过用人单位提供的培训费用。', source: '国家法律法规数据库', publishDate: '2012-12-28' },
  '《劳动合同法》第23条': { text: '用人单位与劳动者可以在劳动合同中约定保守用人单位的商业秘密和与知识产权相关的保密事项。对负有保密义务的劳动者，用人单位可以在劳动合同或者保密协议中与劳动者约定竞业限制条款。', source: '国家法律法规数据库', publishDate: '2012-12-28' },
  '《建筑法》第28条': { text: '禁止承包单位将其承包的全部建筑工程转包给他人，禁止承包单位将其承包的全部建筑工程肢解以后以分包的名义分别转包给他人。', source: '国家法律法规数据库', publishDate: '2011-04-22' },
  '《保险法》第17条': { text: '订立保险合同，采用保险人提供的格式条款的，保险人向投保人提供的投保单应当附格式条款，保险人应当向投保人说明合同的内容。', source: '国家法律法规数据库', publishDate: '2015-04-24' },
  '《最高人民法院关于审理民间借贷案件适用法律若干问题的规定》第25条': { text: '出借人请求借款人按照合同约定利率支付利息的，人民法院应予支持，但是双方约定的利率超过合同成立时一年期贷款市场报价利率四倍的除外。', source: '最高人民法院', publishDate: '2020-12-29' },
  '《物业管理条例》第41条': { text: '业主应当根据物业服务合同的约定交纳物业服务费用。业主与物业使用人约定由物业使用人交纳物业服务费用的，从其约定，业主负连带交纳责任。', source: '国务院', publishDate: '2018-03-19' }
};

function searchLaw(lawArticle) {
  return lawDB[lawArticle] || null;
}

module.exports = { loadRules, searchRules, searchLaw, CONTRACT_TYPES_COUNT: 12, TOTAL_RULES: 317 };
