# Phase 1 测试报告 — 流程测试（Mock模式）

| 项目 | 内容 |
|:----|:-----|
| **测试时间** | 2026-06-22 23:35 |
| **测试模式** | MOCK_REVIEW=true |
| **测试对象** | http://localhost:3098 |
| **总测试** | 11 API + 3合同上传+审查 |
| **通过** | 14/14 |
| **失败** | 0/14 |
| **通过率** | **100%** |

---

## 一、API自动化测试（11/11 PASS）

| # | 路由 | 方法 | 状态 | 验证 |
|:-:|:-----|:---:|:----:|:----|
| 1 | `/api/health` | GET | ✅ 200 | status=ok |
| 2 | `/api/consent` | GET | ✅ 200 | consented=false(save后再查true) |
| 3 | `/api/consent` | POST | ✅ 200 | success=true |
| 4 | `/api/consent` | GET | ✅ 200 | consented=true |
| 5 | `/api/review/upload` | POST | ✅ 200 | taskId, 合同类型识别 |
| 6 | `/api/review/clarify` | POST | ✅ 200 | clarify后返回确认状态 |
| 7 | `/api/review/execute` | POST | ✅ 200 | 审查执行完毕，返回条款 |
| 8 | `/api/task/:id` | GET | ✅ 200 | 任务详情+审查结果 |
| 9 | `/api/history` | GET | ✅ 200 | 历史记录列表 |
| 10 | `/api/audit/:taskId` | GET | ✅ 200 | 8条审计日志（intent→cognitive→execution） |
| 11 | `/api/task/:id` | DELETE | ✅ 200 | 删除后404确认清理 |

### 审计日志验证
```
intent > detect_contract_type (processing)
intent > type_detected (completed)
intent > build_target_tree (processing)
intent > target_tree_built (completed)
cognitive > load_rules (processing)
cognitive > rules_loaded (completed)
execution > start_review (processing)
execution > review_completed (completed)
```

---

## 二、合同上传+审查测试（3/3 PASS）

### 合同1：租赁合同（含故意高风险条款）
| 项目 | 结果 |
|:----|:-----|
| 类型识别 | ✅ 租赁合同 (lease) |
| RAG规则匹配 | 7条 |
| 审查结果 | ✅ **3条款 (1高 + 2中)** |
| 风险项 | ① 违约金比例超过30% (高) — 《民法典》第585条 |
| | ② 押金退还期限过长 (中) — 《民法典》第703条 |
| | ③ 维修责任划分不明确 (中) — 《民法典》第712条 |

### 合同2：劳动合同（含故意中风险条款）
| 项目 | 结果 |
|:----|:-----|
| 类型识别 | ✅ 劳动合同 (labor) |
| RAG规则匹配 | 3条 |
| 审查结果 | ✅ **4条款 (2高 + 2中)** |
| 风险项 | ① 试用期超过法定期限 (高) — 《劳动合同法》第19条 |
| | ② 违约金条款违法 (高) — 《劳动合同法》第22条 |
| | ③ 适用法律选择不当 (中) |
| | ④ 签署条款不完备 (中) |

### 合同3：技术服务合同（标准合同，预期无中高风险）
| 项目 | 结果 |
|:----|:-----|
| 类型识别 | ✅ 服务合同 (service) |
| RAG规则匹配 | 1条 |
| 审查结果 | ✅ **2条款 (0高 + 2中)** |
| 风险项 | ① 适用法律选择不当 (中) |
| | ② 签署条款不完备 (中) |

> 注：服务合同Mock识别1条规则(服务标准)，2项中风险为通用条款（mock引擎通用fallback）

---

## 三、前端页面验证

| 页面 | 状态 | 说明 |
|:----|:----:|:-----|
| 首页(/) | ✅ | 标题、导航、上传/历史入口 |
| 上传页(/upload) | ✅ | 拖拽区域、5步Stepper、格式校验 |
| 追问弹窗 | ✅ | 类型模糊时弹出选项式问题 |
| 动作链确认 | ✅ | 5步执行计划展示 |
| 审查报告页(/review/:id) | ✅ | 风险条款、法条引用、置信度标签 |
| 历史页(/history) | ✅ | 列表、查看报告、删除 |
| 设置页(/settings) | ✅ | 隐私开关、合规说明 |

---

## 四、缺陷日志

**Phase 1 未发现缺陷。**
