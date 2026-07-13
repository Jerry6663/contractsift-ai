import { Modal, Button, Typography } from 'antd'

const { Text, Paragraph } = Typography

export default function ConsentModal({ visible, onAccept, onDecline }) {
  return (
    <Modal
      title="👋 欢迎使用 AI 合同审查"
      open={visible}
      closable={false}
      maskClosable={false}
      footer={[
        <Button key="decline" danger onClick={onDecline}>拒绝</Button>,
        <Button key="accept" type="primary" onClick={onAccept}>同意并开始</Button>
      ]}
      width={520}
    >
      <div style={{ margin: '16px 0' }}>
        <Paragraph>
          <Text strong>数据收集范围：</Text>上传的合同文件、审查结果、使用行为数据
        </Paragraph>
        <Paragraph>
          <Text strong>用途：</Text>合同审查分析、服务质量优化
        </Paragraph>
        <Paragraph>
          <Text strong>保留期限：</Text>30天后自动删除
        </Paragraph>
        <Paragraph>
          <Text strong>数据安全：</Text>AES-256加密存储，全程审计追踪
        </Paragraph>
        <Paragraph type="secondary" style={{ fontSize: 12, marginTop: 16 }}>
          拒绝后仍可使用基本审查功能，但不会保存审查历史。
        </Paragraph>
      </div>
    </Modal>
  )
}
