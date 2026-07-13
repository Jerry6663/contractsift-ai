import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout, Typography, Card, Button, Switch, Space, Divider, message } from 'antd'
import { ArrowLeftOutlined, SafetyOutlined, InfoCircleOutlined, DeleteOutlined } from '@ant-design/icons'
import { getConsent, setConsent } from '../services/api'

const { Header, Content } = Layout
const { Title, Text, Paragraph } = Typography

export default function SettingsPage() {
  const navigate = useNavigate()
  const [consented, setConsented] = useState(false)

  useEffect(() => {
    getConsent().then(data => setConsented(data.consented)).catch(() => {})
  }, [])

  const toggleConsent = async (checked) => {
    await setConsent(checked)
    setConsented(checked)
    message.success(checked ? '已同意数据收集' : '已拒绝数据收集')
  }

  return (
    <Layout style={{ minHeight: '100vh', background: '#0d1117' }}>
      <Header style={{ background: '#161b22', borderBottom: '1px solid #30363d', display: 'flex', alignItems: 'center', padding: '0 24px' }}>
        <Button type="text" icon={<ArrowLeftOutlined />} style={{ color: '#8b949e' }} onClick={() => navigate('/')} />
        <Title level={4} style={{ color: '#fff', margin: '0 0 0 12px' }}>设置</Title>
      </Header>

      <Content style={{ padding: '24px', maxWidth: 600, margin: '0 auto', width: '100%' }}>
        <Card style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, marginBottom: 16 }}>
          <Space direction="vertical" style={{ width: '100%' }} size={8}>
            <Space>
              <SafetyOutlined style={{ color: '#58a6ff', fontSize: 18 }} />
              <Title level={5} style={{ color: '#c9d1d9', margin: 0 }}>数据收集同意</Title>
            </Space>
            <Paragraph style={{ color: '#8b949e', fontSize: 13, margin: 0 }}>
              同意收集上传的合同文件、审查结果和使用行为数据以优化服务质量。数据30天后自动删除。
            </Paragraph>
            <Space>
              <Text style={{ color: '#8b949e' }}>当前状态：</Text>
              <Text style={{ color: consented ? '#3fb950' : '#f85149' }}>{consented ? '已同意' : '已拒绝'}</Text>
              <Switch checked={consented} onChange={toggleConsent} />
            </Space>
          </Space>
        </Card>

        <Card style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, marginBottom: 16 }}>
          <Space direction="vertical" style={{ width: '100%' }} size={8}>
            <Space>
              <InfoCircleOutlined style={{ color: '#58a6ff', fontSize: 18 }} />
              <Title level={5} style={{ color: '#c9d1d9', margin: 0 }}>数据管理</Title>
            </Space>
            <Paragraph style={{ color: '#8b949e', fontSize: 13, margin: 0 }}>
              您可以查看、导出或删除个人数据。删除后30天内彻底覆写清除，完成后发送通知确认。
            </Paragraph>
            <Space>
              <Button disabled>查阅数据</Button>
              <Button disabled>导出数据</Button>
              <Button danger disabled>删除所有数据</Button>
            </Space>
            <Text type="secondary" style={{ fontSize: 11 }}>功能将在Phase 2开放</Text>
          </Space>
        </Card>

        <Card style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8 }}>
          <Space direction="vertical" style={{ width: '100%' }} size={8}>
            <Space>
              <SafetyOutlined style={{ color: '#d29922', fontSize: 18 }} />
              <Title level={5} style={{ color: '#c9d1d9', margin: 0 }}>安全与合规</Title>
            </Space>
            <Space direction="vertical" size={4}>
              <Text style={{ color: '#8b949e', fontSize: 13 }}>✔ 审计日志：AES-256加密，保留≥90天</Text>
              <Text style={{ color: '#8b949e', fontSize: 13 }}>✔ 文件保留：30天后自动清理</Text>
              <Text style={{ color: '#8b949e', fontSize: 13 }}>✔ 规则来源：OPC整理 · 法条来源国家法律法规数据库</Text>
              <Text style={{ color: '#8b949e', fontSize: 13 }}>✔ 风险标注：均注明「AI辅助判定」</Text>
            </Space>
          </Space>
        </Card>
      </Content>
    </Layout>
  )
}
