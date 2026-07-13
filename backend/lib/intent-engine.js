/**
 * Layer 1: Intent Engine
 * 目标层 - 识别合同类型 → 追问(≤3问) → 目标树
 */
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'
});

const MODEL = 'deepseek-chat';

const CONTRACT_TYPES = [
  { id: 'lease', name: '租赁合同', description: '房屋/设备/车辆等租赁相关合同' },
  { id: 'labor', name: '劳动合同', description: '劳动合同/劳务合同/雇佣协议' },
  { id: 'sale', name: '买卖合同', description: '货物/设备/商品买卖相关合同' },
  { id: 'service', name: '服务合同', description: '技术开发/咨询/服务外包等' },
  { id: 'loan', name: '借款合同', description: '借款/担保/抵押相关合同' },
  { id: 'construction', name: '建设工程合同', description: '工程总包/分包/设计/监理合同' },
  { id: 'entrust', name: '委托合同', description: '委托代理/行纪/居间合同' },
  { id: 'guarantee', name: '担保合同', description: '保证/抵押/质押合同' },
  { id: 'insurance', name: '保险合同', description: '财产/人寿/责任保险合同' },
  { id: 'transport', name: '运输合同', description: '货运/客运/多式联运合同' },
  { id: 'storage', name: '仓储合同', description: '仓储/保管合同' },
  { id: 'property', name: '物业合同', description: '物业服务/管理合同' },
  { id: 'unknown', name: '其他/混合合同', description: '无法明确归类的合同' }
];

// Quick keyword-based detection for speed
function detectContractType(text) {
  const checks = [
    { id: 'lease', keywords: [/租(赁|房|用|金)/, /出租/, /承租/, /房东/, /房客/, /押金/] },
    { id: 'labor', keywords: [/劳动(合同|者|关系)/, /雇佣/, /聘用/, /劳务(合同|派遣)/, /工资/, /社保/, /五险一金/] },
    { id: 'sale', keywords: [/买卖/, /购销/, /采购(合同)?/, /销售(合同)?/, /供应/, /货(物|款)/, /商品/] },
    { id: 'service', keywords: [/服务(合同)?/, /技术(开发|服务|咨询|转让)/, /外包/, /SLA/] },
    { id: 'loan', keywords: [/借(款|贷)/, /贷(款|方|款)/, /担保/, /抵押/, /利息/] },
    { id: 'construction', keywords: [/建设(工程)?/, /工程(施工|总包|分包)/, /建筑/, /承包/, /竣工/] },
    { id: 'entrust', keywords: [/委托/, /代理/, /行纪/, /居间/] },
    { id: 'guarantee', keywords: [/保证(合同)?/, /抵押(合同)?/, /质押(合同)?/, /担保(人|方|合同)/] },
    { id: 'insurance', keywords: [/保险/, /保险人/, /被保险人/, /保单/, /保费/] },
    { id: 'transport', keywords: [/运输(合同)?/, /货运/, /承运/, /托运/, /联运/] },
    { id: 'storage', keywords: [/仓储/, /保管/, /存储/, /存货/] },
    { id: 'property', keywords: [/物业(服务|管理)?/, /业委会/, /业主/] }
  ];

  const matches = [];
  for (const check of checks) {
    let score = 0;
    for (const re of check.keywords) {
      if (re.test(text)) score += 1;
    }
    if (score > 0) matches.push({ id: check.id, score });
  }

  if (matches.length === 0) return null;
  matches.sort((a, b) => b.score - a.score);
  
  // Clear winner: highest score is at least 2x second highest
  if (matches.length === 1 || matches[0].score >= matches[1].score * 2) {
    return CONTRACT_TYPES.find(t => t.id === matches[0].id);
  }
  // Ambiguous: return top 2 candidates
  return { ambiguous: true, candidates: matches.slice(0, 2).map(m => CONTRACT_TYPES.find(t => t.id === m.id)) };
}

// Generate questions for ambiguous type
function generateQuestions(candidates, text) {
  if (!candidates || candidates.length < 2) return [];
  
  const questions = [{
    id: 'contract_type',
    question: '请确认合同类型',
    options: candidates.map(c => ({ value: c.id, label: c.name, desc: c.description })),
    allowSkip: true
  }];

  // Add follow-up questions based on text analysis
  const followUps = [];
  if (!text.includes('金额') && !text.includes('价款')) {
    followUps.push({
      id: 'contract_amount',
      question: '合同是否有明确的金额/价款？',
      options: [{ value: 'yes', label: '是' }, { value: 'no', label: '否' }],
      allowSkip: true
    });
  }
  if (!text.includes('期限') && !text.includes('日期')) {
    followUps.push({
      id: 'contract_term',
      question: '合同是否约定了履行期限？',
      options: [{ value: 'yes', label: '是' }, { value: 'no', label: '否' }],
      allowSkip: true
    });
  }

  return [...questions, ...followUps.slice(0, 2)];
}

// Build target tree from contract type and text
async function buildTargetTree(contractType, text) {
  const typeConfig = CONTRACT_TYPES.find(t => t.id === contractType) || CONTRACT_TYPES.find(t => t.id === 'unknown');

  const prompt = `针对一份${typeConfig.name}，生成审查目标树。目标是列出需要审查的维度。

合同摘要：
${text.slice(0, 1000)}

以JSON格式返回审查维度列表：
{"targets":[{"id":"dim_1","name":"维度名称","description":"审查说明","priority":"high/medium/low","subTargets":[]}]}

限制3-6个主维度，每个维度0-3个子维度。仅返回JSON。`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: '你是合同审查专家，负责拆解审查目标树。输出JSON格式。' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 2000,
      temperature: 0.3
    });

    const content = response.choices[0]?.message?.content || '{}';
    const tree = JSON.parse(content);
    return tree.targets || [];
  } catch (e) {
    console.error('Target tree generation error:', e.message);
    return getDefaultTargets(typeConfig.name);
  }
}

function getDefaultTargets(typeName) {
  return [
    { id: 'dim_1', name: '合同主体', description: '审查合同双方的资质、名称、地址等主体信息', priority: 'high', subTargets: [
      { id: 'dim_1_1', name: '主体适格性', description: '确认签约方具有相应的民事行为能力和资质' }
    ]},
    { id: 'dim_2', name: '核心条款', description: '审查合同的核心权利义务条款', priority: 'high', subTargets: [
      { id: 'dim_2_1', name: '标的条款', description: '审查标的物/服务的描述是否清晰' },
      { id: 'dim_2_2', name: '价格条款', description: '审查价格、付款方式、发票等' }
    ]},
    { id: 'dim_3', name: '风险条款', description: '审查违约责任、管辖、解除等风险条款', priority: 'high', subTargets: [
      { id: 'dim_3_1', name: '违约责任', description: '审查违约金、赔偿范围等' },
      { id: 'dim_3_2', name: '争议解决', description: '审查管辖法院/仲裁条款' }
    ]}
  ];
}

module.exports = { detectContractType, generateQuestions, buildTargetTree, CONTRACT_TYPES };
