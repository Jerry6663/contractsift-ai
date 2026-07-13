import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout, Typography, Table, Button, Tag, Empty, Space, Popconfirm, message } from 'antd'
import { ArrowLeftOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons'
import { getHistory, deleteTask } from '../services/api'

const { Header, Content } = Layout
const { Title, Text } = Typography

export default function HistoryPage() {
  const navigate = useNavigate()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  const loadHistory = () => {
    setLoading(true)
    getHistory().then(data => setTasks(data || [])).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { loadHistory() }, [])

  const handleDelete = async (id) => {
    await deleteTask(id)
    message.success('已删除，30天内彻底清除')
    loadHistory()
  }

  const columns = [
    {
      title: '文件名',
      dataIndex: 'fileName',
      key: 'fileName',
      render: (v, r) => <Text style={{ color: '#c9d1d9' }}>{v || '未知文件'}</Text>
    },
    {
      title: '合同类型',
      dataIndex: 'contractTypeCn',
      key: 'type',
      render: (v) => <Tag>{v || '未知'}</Tag>
    },
    {
      title: '风险摘要',
      key: 'risk',
      render: (_, r) => {
        if (!r.riskSummary) return <Text type="secondary">审查中</Text>
        return (
          <Space size={8}>
            {r.riskSummary.high > 0 && <Tag color="red">高 {r.riskSummary.high}</Tag>}
            {r.riskSummary.medium > 0 && <Tag color="orange">中 {r.riskSummary.medium}</Tag>}
          </Space>
        )
      }
    },
    {
      title: '日期',
      dataIndex: 'createdAt',
      key: 'date',
      render: (v) => <Text style={{ color: '#8b949e' }}>{v?.slice(0, 16) || ''}</Text>
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, r) => (
        <Space>
          <Button size="small" type="link" icon={<EyeOutlined />} onClick={() => navigate(`/review/${r.id}`)}>
            查看
          </Button>
          <Popconfirm title="确认删除？30天内彻底清除" onConfirm={() => handleDelete(r.id)}>
            <Button size="small" type="link" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <Layout style={{ minHeight: '100vh', background: '#0d1117' }}>
      <Header style={{ background: '#161b22', borderBottom: '1px solid #30363d', display: 'flex', alignItems: 'center', padding: '0 24px' }}>
        <Button type="text" icon={<ArrowLeftOutlined />} style={{ color: '#8b949e' }} onClick={() => navigate('/')} />
        <Title level={4} style={{ color: '#fff', margin: '0 0 0 12px' }}>审查历史</Title>
      </Header>

      <Content style={{ padding: '24px', maxWidth: 900, margin: '0 auto', width: '100%' }}>
        <Table
          dataSource={tasks}
          columns={columns}
          rowKey="id"
          loading={loading}
          locale={{ emptyText: <Empty description={<Text style={{ color: '#8b949e' }}>暂无审查记录</Text>} /> }}
          style={{ background: 'transparent' }}
          pagination={{ pageSize: 10, hideOnSinglePage: true }}
          rowStyle={{ background: '#0d1117' }}
        />
      </Content>
    </Layout>
  )
}
