import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout, Typography, Button, Card, Row, Col, Space } from 'antd'
import { UploadOutlined, HistoryOutlined, SafetyOutlined, AuditOutlined } from '@ant-design/icons'
import ConsentModal from '../components/ConsentModal'
import { getConsent, setConsent } from '../services/api'

const { Header, Content } = Layout
const { Title, Text, Paragraph } = Typography

export default function HomePage() {
  const navigate = useNavigate()
  const [consentVisible, setConsentVisible] = useState(false)
  const [consented, setConsented] = useState(false)

  useEffect(() => {
    getConsent().then(data => {
      if (!data.consented) {
        setConsentVisible(true)
      } else {
        setConsented(true)
      }
    }).catch(() => setConsentVisible(true))
  }, [])

  const handleAccept = async () => {
    await setConsent(true)
    setConsented(true)
    setConsentVisible(false)
  }

  const handleDecline = async () => {
    await setConsent(false)
    setConsented(false)
    setConsentVisible(false)
  }

  return (
    <Layout style={{ minHeight: '100vh', background: '#0d1117' }}>
      <Header style={{ background: '#161b22', borderBottom: '1px solid #30363d', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
        <Title level={4} style={{ color: '#fff', margin: 0 }}>📄 ContractSift AI</Title>
        <Space>
          <Button type="text" style={{ color: '#8b949e' }} onClick={() => navigate('/history')}>历史记录</Button>
          <Button type="text" style={{ color: '#8b949e' }} onClick={() => navigate('/settings')}>设置</Button>
        </Space>
      </Header>

      <Content style={{ padding: '48px 24px', maxWidth: 900, margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <Title level={2} style={{ color: '#fff', marginBottom: 12 }}>AI 智能合同审查</Title>
          <Paragraph style={{ color: '#8b949e', fontSize: 16, maxWidth: 600, margin: '0 auto' }}>
            上传合同文件，AI 按五层架构完成审查：意图识别 → 规则匹配 → 慢思考推理 → 报告生成
          </Paragraph>
        </div>

        <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
          <Col span={12}>
            <Card
              hoverable
              style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 12, textAlign: 'center', padding: '24px 0', cursor: 'pointer' }}
              onClick={() => navigate('/upload')}
            >
              <UploadOutlined style={{ fontSize: 36, color: '#58a6ff', marginBottom: 12 }} />
              <Title level={4} style={{ color: '#c9d1d9' }}>开始审查</Title>
              <Text style={{ color: '#8b949e' }}>上传合同文件，启动AI审查流程</Text>
            </Card>
          </Col>
          <Col span={12}>
            <Card
              hoverable
              style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 12, textAlign: 'center', padding: '24px 0', cursor: 'pointer' }}
              onClick={() => navigate('/history')}
            >
              <HistoryOutlined style={{ fontSize: 36, color: '#3fb950', marginBottom: 12 }} />
              <Title level={4} style={{ color: '#c9d1d9' }}>审查历史</Title>
              <Text style={{ color: '#8b949e' }}>查看和管理过往审查记录</Text>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col span={8}>
            <Card size="small" style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: 8 }}>
              <Space>
                <SafetyOutlined style={{ color: '#3fb950' }} />
                <Text style={{ color: '#8b949e', fontSize: 13 }}>AES-256加密</Text>
              </Space>
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: 8 }}>
              <Space>
                <AuditOutlined style={{ color: '#58a6ff' }} />
                <Text style={{ color: '#8b949e', fontSize: 13 }}>全程审计追踪</Text>
              </Space>
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: 8 }}>
              <Space>
                <SafetyOutlined style={{ color: '#d29922' }} />
                <Text style={{ color: '#8b949e', fontSize: 13 }}>RAG规则库 · 317条</Text>
              </Space>
            </Card>
          </Col>
        </Row>

        <ConsentModal visible={consentVisible} onAccept={handleAccept} onDecline={handleDecline} />
      </Content>
    </Layout>
  )
}
