import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout, Typography, Upload, Button, Steps, Card, Space, Modal, Radio, Alert, Spin, message } from 'antd'
import { InboxOutlined, ArrowLeftOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { uploadFile, clarifyType, executeReview } from '../services/api'

const { Header, Content } = Layout
const { Title, Text, Paragraph } = Typography
const { Dragger } = Upload

export default function UploadPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState('upload') // upload | clarify | confirm | reviewing | done
  const [file, setFile] = useState(null)
  const [taskId, setTaskId] = useState(null)
  const [contractInfo, setContractInfo] = useState(null)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [actionChain, setActionChain] = useState([])
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleUpload = async (uploadedFile) => {
    setError('')
    setLoading(true)
    setFile(uploadedFile)
    try {
      const data = await uploadFile(uploadedFile)
      setTaskId(data.taskId)
      
      if (data.status === 'needs_clarification') {
        setQuestions(data.questions || [])
        setStep('clarify')
      } else if (data.status === 'needs_confirmation') {
        setContractInfo({ type: data.contractType, typeCn: data.contractTypeCn, rulesCount: data.rulesCount, targets: data.targets })
        setActionChain(data.actionChain || [])
        setStep('confirm')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleClarify = async () => {
    setLoading(true)
    try {
      const data = await clarifyType(taskId, answers)
      setContractInfo({ type: data.contractType, typeCn: data.contractTypeCn, rulesCount: data.rulesCount, targets: data.targets })
      setActionChain(data.actionChain || [])
      setStep('confirm')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleExecute = async (modifiedChain) => {
    setLoading(true)
    setStep('reviewing')
    try {
      const data = await executeReview(taskId, modifiedChain || actionChain)
      setResult(data)
      setStep('done')
      message.success('审查完成')
    } catch (err) {
      setError(err.message)
      setStep('confirm')
    } finally {
      setLoading(false)
    }
  }

  const renderHeader = () => (
    <Header style={{ background: '#161b22', borderBottom: '1px solid #30363d', display: 'flex', alignItems: 'center', padding: '0 24px' }}>
      <Button type="text" icon={<ArrowLeftOutlined />} style={{ color: '#8b949e' }} onClick={() => navigate('/')} />
      <Title level={4} style={{ color: '#fff', margin: '0 0 0 12px' }}>合同审查</Title>
    </Header>
  )

  const renderUpload = () => (
    <div style={{ padding: '24px 0' }}>
      <Dragger
        accept=".pdf,.docx,.txt"
        multiple={false}
        showUploadList={false}
        beforeUpload={(f) => { handleUpload(f); return false }}
        style={{ background: '#161b22', border: '2px dashed #30363d', borderRadius: 12, padding: 40 }}
      >
        <p className="ant-upload-drag-icon"><InboxOutlined style={{ color: '#58a6ff', fontSize: 48 }} /></p>
        <p className="ant-upload-text" style={{ color: '#c9d1d9' }}>点击或拖拽文件到此区域上传</p>
        <p className="ant-upload-hint" style={{ color: '#8b949e' }}>支持 PDF / DOCX / TXT 格式，单文件不超过30MB</p>
      </Dragger>
    </div>
  )

  const renderClarify = () => (
    <div>
      <Alert message="合同类型无法确定，请回答以下问题" type="info" showIcon style={{ marginBottom: 16 }} />
      {questions.map((q, i) => (
        <Card key={q.id} style={{ background: '#161b22', border: '1px solid #30363d', marginBottom: 16, borderRadius: 8 }}>
          <Paragraph style={{ color: '#c9d1d9', fontWeight: 600, marginBottom: 12 }}>{q.question}</Paragraph>
          <Radio.Group
            onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
            value={answers[q.id]}
          >
            <Space direction="vertical">
              {q.options.map(opt => (
                <Radio key={opt.value} value={opt.value} style={{ color: '#8b949e' }}>
                  {opt.label} {opt.desc ? <Text type="secondary" style={{ fontSize: 12 }}>— {opt.desc}</Text> : null}
                </Radio>
              ))}
            </Space>
          </Radio.Group>
        </Card>
      ))}
      <Space>
        <Button onClick={() => setStep('upload')}>返回</Button>
        <Button type="primary" onClick={handleClarify} loading={loading}>确认</Button>
      </Space>
    </div>
  )

  const renderConfirm = () => (
    <div>
      <Card style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, marginBottom: 16 }}>
        <Title level={5} style={{ color: '#c9d1d9', marginBottom: 8 }}>识别结果</Title>
        <Space direction="vertical" size={4}>
          {contractInfo && <>
            <Text style={{ color: '#8b949e' }}>合同类型：<Text style={{ color: '#58a6ff' }}>{contractInfo.typeCn}</Text></Text>
            <Text style={{ color: '#8b949e' }}>匹配规则：<Text style={{ color: '#3fb950' }}>{contractInfo.rulesCount} 条</Text></Text>
            {contractInfo.targets?.length > 0 && <>
              <Text style={{ color: '#8b949e', marginTop: 8 }}>审查维度：</Text>
              {contractInfo.targets.map((t, i) => (
                <Text key={i} style={{ color: '#8b949e', paddingLeft: 16, fontSize: 13 }}>
                  {t.priority === 'high' ? '🔴' : '🟠'} {t.name}
                </Text>
              ))}
            </>}
          </>}
        </Space>
      </Card>

      <Title level={5} style={{ color: '#c9d1d9', marginBottom: 12 }}>执行计划</Title>
      {actionChain.map((a, i) => (
        <Card key={i} size="small" style={{ background: '#0d1117', border: '1px solid #21262d', marginBottom: 8, borderRadius: 6 }}>
          <Space>
            <Text style={{ color: '#30363d' }}>#{a.step}</Text>
            <Text style={{ color: '#c9d1d9' }}>{a.action}</Text>
            {a.detail && <Text type="secondary" style={{ fontSize: 12 }}>{a.detail}</Text>}
          </Space>
        </Card>
      ))}

      <Space style={{ marginTop: 16 }}>
        <Button onClick={() => setStep('upload')}>取消</Button>
        <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => handleExecute()} loading={loading}>
          确认执行审查
        </Button>
      </Space>
    </div>
  )

  const renderReviewing = () => (
    <div style={{ textAlign: 'center', padding: '60px 0' }}>
      <Spin size="large" />
      <Paragraph style={{ color: '#8b949e', marginTop: 24, fontSize: 16 }}>
        AI 正在审查合同...
      </Paragraph>
      <Text type="secondary">慢思考引擎进行多步推理，通常需要30-120秒</Text>
    </div>
  )

  const renderDone = () => {
    if (!result) return null
    return (
      <div>
        <Alert
          message="审查完成"
          description={`发现 ${result.highCount} 项高风险，${result.mediumCount} 项中风险`}
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Space>
          <Button type="primary" onClick={() => navigate(`/review/${taskId}`)}>
            查看完整报告
          </Button>
          <Button onClick={() => { setStep('upload'); setFile(null); setResult(null) }}>
            审查另一份合同
          </Button>
        </Space>
      </div>
    )
  }

  return (
    <Layout style={{ minHeight: '100vh', background: '#0d1117' }}>
      {renderHeader()}
      <Content style={{ padding: '24px', maxWidth: 700, margin: '0 auto', width: '100%' }}>
        <Steps
          current={{ upload: 0, clarify: 1, confirm: 2, reviewing: 3, done: 4 }[step] || 0}
          items={[
            { title: '上传文件' },
            { title: '类型确认' },
            { title: '执行计划' },
            { title: '审查中' },
            { title: '完成' }
          ]}
          style={{ marginBottom: 32 }}
        />
        {error && <Alert message={error} type="error" showIcon closable onClose={() => setError('')} style={{ marginBottom: 16 }} />}
        {step === 'upload' && renderUpload()}
        {step === 'clarify' && renderClarify()}
        {step === 'confirm' && renderConfirm()}
        {step === 'reviewing' && renderReviewing()}
        {step === 'done' && renderDone()}
      </Content>
    </Layout>
  )
}
