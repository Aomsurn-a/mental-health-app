import React, { useEffect, useState } from 'react';
import { Card, Button, Form, Select, Input, Typography, Table, Tag, Modal, Row, Col, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { complaintService } from '../services/complaintService';
import type { Complaint } from '../services/complaintService';

const { Title, Text } = Typography;
const { TextArea } = Input;

const typeConfig: Record<string, string> = {
  change_psychologist: 'ขอเปลี่ยนนักจิตวิทยา',
  report_system: 'รายงานปัญหาระบบ',
  report_psychologist: 'ร้องเรียนนักจิตวิทยา',
  other: 'อื่นๆ',
};

const statusConfig: Record<string, { color: string; text: string }> = {
  pending:     { color: 'orange', text: 'รอดำเนินการ' },
  in_progress: { color: 'blue',   text: 'กำลังดำเนินการ' },
  resolved:    { color: 'green',  text: 'แก้ไขแล้ว' },
  rejected:    { color: 'red',    text: 'ปฏิเสธ' },
};

const ComplaintPage: React.FC = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const fetchComplaints = async () => {
    try {
      const data = await complaintService.getMyComplaints();
      setComplaints(data);
    } catch {
      message.error('โหลดข้อมูลไม่สำเร็จ');
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      await complaintService.createComplaint({
        type: values.type,
        detail: values.detail,
      });
      message.success('ส่งคำร้องสำเร็จ!');
      setModalOpen(false);
      form.resetFields();
      fetchComplaints();
    } catch {
      message.error('ส่งคำร้องไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'ประเภทคำร้อง',
      dataIndex: 'type',
      render: (type: string) => <Text>{typeConfig[type] || type}</Text>,
    },
    {
      title: 'รายละเอียด',
      dataIndex: 'detail',
      render: (detail: string) => (
        <Text style={{ maxWidth: 300, display: 'block' }} ellipsis={{ tooltip: detail }}>
          {detail}
        </Text>
      ),
    },
    {
      title: 'สถานะ',
      dataIndex: 'status',
      render: (status: string) => {
        const config = statusConfig[status];
        return (
          <Tag color={config?.color}>{config?.text}</Tag>
        );
      },
    },
    {
      title: 'หมายเหตุจาก Admin',
      dataIndex: 'resolved_note',
      render: (note: string) => note ? <Text type="secondary">{note}</Text> : '-',
    },
    {
      title: 'วันที่ส่ง',
      dataIndex: 'created_at',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm'),
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col><Title level={2}>คำร้อง</Title></Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            ส่งคำร้องใหม่
          </Button>
        </Col>
      </Row>

      <Card title="รายการคำร้องของฉัน">
        <Table
          dataSource={complaints}
          columns={columns}
          rowKey="id"
          locale={{ emptyText: 'ยังไม่มีคำร้อง' }}
        />
      </Card>

      <Modal
        title="ส่งคำร้องใหม่"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        okText="ส่งคำร้อง"
        cancelText="ยกเลิก"
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="type" label="ประเภทคำร้อง"
            rules={[{ required: true, message: 'กรุณาเลือกประเภทคำร้อง' }]}>
            <Select placeholder="เลือกประเภทคำร้อง">
              <Select.Option value="change_psychologist">ขอเปลี่ยนนักจิตวิทยา</Select.Option>
              <Select.Option value="report_system">รายงานปัญหาระบบ</Select.Option>
              <Select.Option value="report_psychologist">ร้องเรียนนักจิตวิทยา</Select.Option>
              <Select.Option value="other">อื่นๆ</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="detail" label="รายละเอียด"
            rules={[{ required: true, message: 'กรุณากรอกรายละเอียด' }]}>
            <TextArea rows={4} placeholder="อธิบายรายละเอียดคำร้องของคุณ..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ComplaintPage;