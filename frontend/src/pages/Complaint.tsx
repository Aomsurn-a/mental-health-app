import React, { useEffect, useState } from 'react';
import { Card, Button, Form, Select, Input, Typography, Table, Tag, Modal, Row, Col, message } from 'antd';
import { PlusOutlined, DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { complaintService } from '../services/complaintService';
import type { Complaint } from '../services/complaintService';
import { appointmentService } from '../services/appointmentService';
import type { MyPsychologist, CurrentPsychologist } from '../services/appointmentService';
import { hospitalService } from '../services/hospitalService';
import type { SameHospitalPsychologist } from '../services/hospitalService';
import { reportService } from '../services/reportService';

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
  const selectedType = Form.useWatch('type', form);

  const [myPsychologists, setMyPsychologists] = useState<MyPsychologist[]>([]);
  const [currentPsychologist, setCurrentPsychologist] = useState<CurrentPsychologist | null>(null);
  const [sameHospitalPsychologists, setSameHospitalPsychologists] = useState<SameHospitalPsychologist[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);

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

  const handleTypeChange = async (type: string) => {
    form.setFieldsValue({ target_id: undefined, full_legal_name: undefined });
    if (type === 'report_psychologist') {
      setOptionsLoading(true);
      try {
        const data = await appointmentService.getMyPsychologists();
        setMyPsychologists(data);
      } catch {
        message.error('โหลดรายชื่อนักจิตวิทยาไม่สำเร็จ');
      } finally {
        setOptionsLoading(false);
      }
    } else if (type === 'change_psychologist') {
      setOptionsLoading(true);
      try {
        const current = await appointmentService.getCurrentPsychologist();
        setCurrentPsychologist(current);
        if (current) {
          const others = await hospitalService.getPsychologistsSameHospital(current.psychologist_id);
          setSameHospitalPsychologists(others);
        } else {
          setSameHospitalPsychologists([]);
        }
      } catch {
        message.error('โหลดรายชื่อนักจิตวิทยาไม่สำเร็จ');
      } finally {
        setOptionsLoading(false);
      }
    }
  };

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      await complaintService.createComplaint({
        type: values.type,
        detail: values.detail,
        target_id: values.target_id,
        full_legal_name: values.type === 'change_psychologist' ? values.full_legal_name : undefined,
      });
      message.success('ส่งคำร้องสำเร็จ!');
      setModalOpen(false);
      form.resetFields();
      fetchComplaints();
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'ส่งคำร้องไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (id: number) => {
    try {
      await reportService.downloadReport(id);
    } catch {
      message.error('ดาวน์โหลดไม่สำเร็จ');
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
    {
      title: 'เอกสาร',
      render: (_: any, r: Complaint) => (
        r.type === 'change_psychologist' && r.hospital_report_id ? (
          <Button size="small" icon={<DownloadOutlined />} onClick={() => handleDownload(r.hospital_report_id!)}>
            ดาวน์โหลดเอกสาร
          </Button>
        ) : '-'
      ),
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
            <Select placeholder="เลือกประเภทคำร้อง" onChange={handleTypeChange}>
              <Select.Option value="change_psychologist">ขอเปลี่ยนนักจิตวิทยา</Select.Option>
              <Select.Option value="report_system">รายงานปัญหาระบบ</Select.Option>
              <Select.Option value="report_psychologist">ร้องเรียนนักจิตวิทยา</Select.Option>
              <Select.Option value="other">อื่นๆ</Select.Option>
            </Select>
          </Form.Item>

          {selectedType === 'report_psychologist' && (
            <Form.Item name="target_id" label="เลือกนักจิตที่ต้องการรายงาน"
              rules={[{ required: true, message: 'กรุณาเลือกนักจิตวิทยา' }]}>
              <Select
                placeholder="เลือกนักจิตวิทยา"
                loading={optionsLoading}
                notFoundContent="คุณยังไม่เคยนัดหมายกับนักจิตวิทยาท่านใด"
                options={myPsychologists.map(p => ({
                  value: p.user_id,
                  label: `${p.first_name} ${p.last_name}`,
                }))}
              />
            </Form.Item>
          )}

          {selectedType === 'change_psychologist' && (
            <>
              <Form.Item name="target_id" label="เลือกนักจิตคนใหม่ที่ต้องการเปลี่ยนไปหา"
                rules={[{ required: true, message: 'กรุณาเลือกนักจิตวิทยา' }]}>
                <Select
                  placeholder="เลือกนักจิตวิทยา"
                  loading={optionsLoading}
                  notFoundContent={
                    currentPsychologist
                      ? 'ไม่พบนักจิตวิทยาท่านอื่นในโรงพยาบาลเดียวกัน'
                      : 'ไม่พบนักจิตวิทยาปัจจุบันของคุณ (ต้องมีนัดหมายที่อนุมัติแล้วก่อน)'
                  }
                  options={sameHospitalPsychologists.map(p => ({
                    value: p.user_id,
                    label: `${p.first_name} ${p.last_name} — ${p.specialty}`,
                  }))}
                />
              </Form.Item>
              <Form.Item name="full_legal_name" label="ชื่อ-นามสกุลจริง (ตามบัตรประชาชน)"
                rules={[{ required: true, message: 'กรุณากรอกชื่อ-นามสกุลจริง' }]}>
                <Input placeholder="ชื่อ-นามสกุลตามบัตรประชาชน" />
              </Form.Item>
            </>
          )}

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
