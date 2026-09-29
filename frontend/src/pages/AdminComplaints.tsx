import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Button, Modal, Form, Input, Select, Typography, message } from 'antd';
import dayjs from 'dayjs';
import { adminService } from '../services/adminService';

const { Title, Text } = Typography;
const { TextArea } = Input;

const typeConfig: Record<string, string> = {
  change_psychologist:  'ขอเปลี่ยนนักจิตวิทยา',
  report_system:        'รายงานปัญหาระบบ',
  report_psychologist:  'ร้องเรียนนักจิตวิทยา',
  other:                'อื่นๆ',
};

const statusConfig: Record<string, { color: string; text: string }> = {
  pending:     { color: 'orange', text: 'รอดำเนินการ' },
  in_progress: { color: 'blue',   text: 'กำลังดำเนินการ' },
  resolved:    { color: 'green',  text: 'แก้ไขแล้ว' },
  rejected:    { color: 'red',    text: 'ปฏิเสธ' },
};

const AdminComplaints: React.FC = () => {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [form] = Form.useForm();

  const fetchComplaints = async () => {
    setListLoading(true);
    try {
      const data = await adminService.getAllComplaints();
      setComplaints(data);
    } catch {
      message.error('โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const handleUpdateStatus = async (values: any) => {
    if (!selectedComplaint) return;
    setLoading(true);
    try {
      await adminService.updateComplaintStatus(
        selectedComplaint.id, values.status, values.resolved_note
      );
      message.success('อัพเดทสถานะสำเร็จ');
      setModalOpen(false);
      fetchComplaints();
    } catch {
      message.error('อัพเดทไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'ผู้ส่งคำร้อง',
      render: (_: any, record: any) => (
        <div>
          <Text strong>{record.first_name} {record.last_name}</Text>
          <br />
          <Text type="secondary">{record.email}</Text>
        </div>
      ),
    },
    {
      title: 'ประเภท',
      dataIndex: 'type',
      render: (type: string) => typeConfig[type] || type,
    },
    {
      title: 'รายละเอียด',
      dataIndex: 'detail',
      render: (detail: string) => (
        <Text style={{ maxWidth: 200, display: 'block' }} ellipsis={{ tooltip: detail }}>
          {detail}
        </Text>
      ),
    },
    {
      title: 'สถานะ',
      dataIndex: 'status',
      render: (status: string) => {
        const config = statusConfig[status];
        return <Tag color={config?.color}>{config?.text}</Tag>;
      },
    },
    {
      title: 'วันที่ส่ง',
      dataIndex: 'created_at',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'จัดการ',
      render: (_: any, record: any) => (
        <Button size="small" type="primary" onClick={() => {
          setSelectedComplaint(record);
          form.setFieldsValue({ status: record.status, resolved_note: record.resolved_note });
          setModalOpen(true);
        }}>
          อัพเดทสถานะ
        </Button>
      ),
    },
  ];

  return (
    <div className="admin-page">
      <Title level={2}>จัดการคำร้อง</Title>
      <Card>
        <Table loading={listLoading} className="admin-table" tableLayout="fixed" scroll={{ x: 1000 }} dataSource={complaints} columns={columns} rowKey="id"
          locale={{ emptyText: 'ไม่มีคำร้อง' }} />
      </Card>

      <Modal className="admin-dialog"
        title={`อัพเดทสถานะคำร้อง`}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText="บันทึก" cancelText="ยกเลิก"
        confirmLoading={loading}
      >
        {selectedComplaint && (
          <div className="admin-complaint-detail">
            <Text strong>ประเภท: </Text>
            <Text>{typeConfig[selectedComplaint.type]}</Text>
            <br />
            <Text strong>รายละเอียด: </Text>
            <Text>{selectedComplaint.detail}</Text>
          </div>
        )}
        <Form form={form} layout="vertical" onFinish={handleUpdateStatus}>
          <Form.Item name="status" label="สถานะ" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="pending">รอดำเนินการ</Select.Option>
              <Select.Option value="in_progress">กำลังดำเนินการ</Select.Option>
              <Select.Option value="resolved">แก้ไขแล้ว</Select.Option>
              <Select.Option value="rejected">ปฏิเสธ</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="resolved_note" label="หมายเหตุ">
            <TextArea rows={3} placeholder="รายละเอียดการดำเนินการ..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminComplaints;
