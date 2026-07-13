import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout, Typography, Spin, Card, Tag, Collapse, Button, Space, Divider, Alert } from 'antd'
import { ArrowLeftOutlined, WarningOutlined, SafetyOutlined } from '@ant-design/icons'
import { getTask } from '../services/api'

const { Header, Content } = Layout
const { Title, Text, Paragraph } = Typography

export default function ReviewPage() {
  const { taskId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [task, setTask] = useState(null)
  const [results, setResults] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    getTask(taskId).then(data => {
      setTask(data.task)
      setResults(data.results || [])
    }).catch(err => setError(err.message))
    .finally(() => setLoading(false))
  }, [taskId])

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#0d1117' }}>
      <Spin size="large" />
    </div>
  )

  if (error) return (
    <div style={{ padding: 48, textAlign: 'center', background: '#0d1117', minHeight: '100vh' }}>
      <Text type="danger">{error}</Text>
      <br /><br />
      <Button onClick={() => navigate('/')}>返回首页</Button>
    </div>
  )

  const highItems = results.filter(r => r.risk_level === 'high')
  const mediumItems = results.filter(r => r.risk_level === 'medium')
  const summary = task?.risk_summary ? JSON.parse(task.risk_summary) : { high: 0, medium: 0 }

  const riskLevelTag = (level) => {
    const colors = { high: { color: 'red', label: '🔴 高' }, medium: { color: 'orange', label: '🟠 中' }, low: { color: 'default', label: '🟢 低' } }
    const c = colors[level] || colors.low
    return <Tag color={c.color}>{c.label}</Tag>
  }

  const confidenceTag = (score) => {
    if (score >= 0.85) return <Tag color="green">🟢 高 ({score.toFixed(2)})</Tag>
    if (score >= 0.65) return <Tag color="blue">🟡 中 ({score.toFixed(2)})</Tag>
    if (score >= 0.40) return <Tag color="orange">🟠 低 ({score.toFixed(2)})</Tag>
    return <Tag color="red">🔴 极低 ({score.toFixed(2)})</Tag>
  }

  const renderClauseItem = (item) => (
    <Card
      key={item.id || item.clause_name}
      style={{ background: item.risk_level === 'high' ? '#1c1517' : '#161b22', border: `1px solid ${item.risk_level === 'high' ? '#3d1f1f' : '#30363d'}`, borderRadius: 8, marginBottom: 12 }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size={8}>
        <Space>
          {riskLevelTag(item.risk_level)}
          <Text strong style={{ color: '#c9d1d9', fontSize: 15 }}>{item.clause_name}</Text>
        </Space>

        {item.position && (
          <div>
            <Text style={{ color: '#8b949e', fontSize: 12 }}>原文位置：</Text>
            <Text code style={{ color: '#8b949e', fontSize: 12, background: '#0d1117', border: '1px solid #21262d' }}>{item.position}</Text>
          </div>
        )}

        {item.original_text && (
          <div style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: 6, padding: '8px 12px' }}>
            <Text style={{ color: '#8b949e', fontSize: 12, fontStyle: 'italic' }}>📋 原文：</Text>
            <Paragraph style={{ color: '#c9d1d9', fontSize: 13, margin: '4px 0 0 0' }}>{item.original_text}</Paragraph>
          </div>
        )}

        {item.law_article && (
          <div>
            <Text style={{ color: '#8b949e', fontSize: 12 }}>📖 法条：</Text>
            <Text style={{ color: '#58a6ff', fontSize: 12 }}>{item.law_article}</Text>
            {item.law_text && <Paragraph style={{ color: '#8b949e', fontSize: 12, margin: '4px 0 0 0' }}>{item.law_text}</Paragraph>}
          </div>
        )}

        {item.rule_id && (
          <Text style={{ color: '#8b949e', fontSize: 12 }}>
            🔍 规则：{item.rule_id} {item.rule_content ? `— ${item.rule_content}` : ''}
          </Text>
        )}

        {item.suggestion && (
          <div style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: 6, padding: '8px 12px' }}>
            <Text style={{ color: '#3fb950', fontSize: 12 }}>💡 建议：</Text>
            <Paragraph style={{ color: '#c9d1d9', fontSize: 13, margin: '4px 0 0 0' }}>{item.suggestion}</Paragraph>
          </div>
        )}

        {confidenceTag(item.confidence)}
      </Space>
    </Card>
  )

  return (
    <Layout style={{ minHeight: '100vh', background: '#0d1117' }}>
      <Header style={{ background: '#161b22', borderBottom: '1px solid #30363d', display: 'flex', alignItems: 'center', padding: '0 24px' }}>
        <Button type="text" icon={<ArrowLeftOutlined />} style={{ color: '#8b949e' }} onClick={() => navigate('/history')} />
        <Title level={4} style={{ color: '#fff', margin: '0 0 0 12px' }}>审查报告</Title>
      </Header>

      <Content style={{ padding: '24px', maxWidth: 800, margin: '0 auto', width: '100%' }}>
        {/* Summary */}
        <Card style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, marginBottom: 24 }}>
          <Space direction="vertical" style={{ width: '100%' }} size={4}>
            <Title level={5} style={{ color: '#c9d1d9', margin: 0 }}>合同审查报告</Title>
            <Text style={{ color: '#8b949e' }}>
              {task?.file_name} · {task?.contract_type_cn || task?.contract_type}
            </Text>
            <Divider style={{ borderColor: '#21262d', margin: '12px 0' }} />
            <Space size={16}>
              <Tag color="red">🔴 高风险 {summary.high} 项</Tag>
              <Tag color="orange">🟠 中风险 {summary.medium} 项</Tag>
              <Text style={{ color: '#8b949e', fontSize: 13 }}>创建于 {task?.created_at}</Text>
            </Space>
          </Space>
        </Card>

        {/* High Risk */}
        {highItems.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <Title level={5} style={{ color: '#f85149', marginBottom: 12 }}>🔴 高风险 {highItems.length} 项</Title>
            {highItems.map(renderClauseItem)}
          </div>
        )}

        {/* Medium Risk */}
        {mediumItems.length > 0 && (
          <div>
            <Title level={5} style={{ color: '#d29922', marginBottom: 12 }}>🟠 中风险 {mediumItems.length} 项</Title>
            {mediumItems.map(renderClauseItem)}
          </div>
        )}

        {/* No results */}
        {highItems.length === 0 && mediumItems.length === 0 && (
          <Alert
            message="未发现中高风险项"
            description="审查未发现需要关注的中高风险条款。低风险项已自动折叠。"
            type="success"
            showIcon
          />
        )}

        {/* Audit info */}
        {task && (
          <Card size="small" style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: 6, marginTop: 32 }}>
            <Space>
              <SafetyOutlined style={{ color: '#8b949e' }} />
              <Text style={{ color: '#484f58', fontSize: 11 }}>
                审计追踪已记录 · AES-256加密 · 保留90天
              </Text>
            </Space>
          </Card>
        )}

        {/* Disclaimer */}
        <div style={{ textAlign: 'center', marginTop: 24, padding: '0 24px' }}>
          <Divider style={{ borderColor: '#21262d' }} />
          <Text type="secondary" style={{ fontSize: 11, color: '#484f58' }}>
            ⚠️ AI辅助生成，不构成正式法律意见。最终法律判断以执业律师签字意见为准。
          </Text>
        </div>
      </Content>
    </Layout>
  )
}
