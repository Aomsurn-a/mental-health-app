import React, { useEffect, useState } from 'react';
import { Card, Button, Form, Select, DatePicker, TimePicker, Input, Typography, Table, Tag, Modal, Row, Col, message } from 'antd';
import { CalendarOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { appointmentService } from '../services/appointmentService';
import type { Psychologist, Appointment } from '../services/appointmentService';
import { useSearchParams } from 'react-router-dom';

const { Title, Text } = Typography;
const { TextArea } = Input;

const statusConfig: Record<string, { color: string; text: string }> = {
  pending: { color: 'orange', text: 'รอการอนุมัติ' },
  approved: { color: 'green', text: 'อนุมัติแล้ว' },
  rejected: { color: 'red', text: 'ปฏิเสธ' },
  cancelled: { color: 'gray', text: 'ยกเลิกแล้ว' },
  completed: { color: 'blue', text: 'เสร็จสิ้น' },
};

const AppointmentPage: React.FC = () => {
  const [psychologists, setPsychologists] = useState<Psychologist[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const fetchData = async () => {
    try {
      const [psyData, apptData] = await Promise.all([
        appointmentService.getPsychologists(),
        appointmentService.getMyAppointments(),
      ]);
      setPsychologists(psyData);
      setAppointments(apptData);
    } catch {
      message.error('โหลดข้อมูลไม่สำเร็จ');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      await appointmentService.createAppointment({
        psychologist_id: values.psychologist_id,
        appointment_date: values.appointment_date.format('YYYY-MM-DD'),
        appointment_time: values.appointment_time.format('HH:mm:ss'),
        location: values.location,
        note: values.note,
      });
      message.success('ส่งคำขอนัดหมายสำเร็จ!');
      setModalOpen(false);
      form.resetFields();
      fetchData();
    } catch {
      message.error('ส่งคำขอไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: number) => {
    try {
      await appointmentService.cancelAppointment(id);
      message.success('ยกเลิกนัดหมายสำเร็จ');
      fetchData();
    } catch {
      message.error('ยกเลิกไม่สำเร็จ');
    }
  };

  const [searchParams] = useSearchParams();

  useEffect(() => {
    const psyId = searchParams.get('psy_id');
    if (psyId) {
      // เปิด Modal และเลือก psychologist อัตโนมัติ
      setModalOpen(true);
      form.setFieldValue('psychologist_id', Number(psyId));
    }
  }, [searchParams]);

  const columns = [
    {
      title: 'นักจิตวิทยา',
      render: (_: any, record: Appointment) => (
        <div>
          <Text strong>นพ./พญ. {record.first_name} {record.last_name}</Text>
          <br />
          <Text type="secondary">{record.specialty}</Text>
        </div>
      ),
    },
    {
      title: 'วันที่นัด',
      render: (_: any, record: Appointment) => (
        <div>
          <Text>{dayjs(record.appointment_date).format('DD/MM/YYYY')}</Text>
          <br />
          <Text type="secondary">{record.appointment_time.slice(0, 5)} น.</Text>
        </div>
      ),
    },
    {
      title: 'สถานที่',
      dataIndex: 'location',
    },
    {
      title: 'สถานะ',
      render: (_: any, record: Appointment) => {
        const config = statusConfig[record.status];
        return (
          <div>
            <Tag color={config.color}>{config.text}</Tag>
            {record.status_note && (
              <div><Text type="secondary" style={{ fontSize: 12 }}>{record.status_note}</Text></div>
            )}
          </div>
        );
      },
    },
    {
      title: 'จัดการ',
      render: (_: any, record: Appointment) => (
        record.status === 'pending' ? (
          <Button danger size="small" onClick={() => handleCancel(record.id)}>
            ยกเลิก
          </Button>
        ) : null
      ),
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col><Title level={2}>การนัดหมาย</Title></Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            ส่งคำขอนัดหมาย
          </Button>
        </Col>
      </Row>

      {/* รายการนัดหมาย */}
      <Card title="รายการนัดหมายของฉัน">
        <Table
          dataSource={appointments}
          columns={columns}
          rowKey="id"
          locale={{ emptyText: 'ยังไม่มีการนัดหมาย' }}
        />
      </Card>

      {/* Modal ส่งคำขอ */}
      <Modal
        title="ส่งคำขอนัดหมาย"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        okText="ส่งคำขอ"
        cancelText="ยกเลิก"
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="psychologist_id" label="เลือกนักจิตวิทยา"
            rules={[{ required: true, message: 'กรุณาเลือกนักจิตวิทยา' }]}>
            <Select placeholder="เลือกนักจิตวิทยา">
              {psychologists.map(p => (
                <Select.Option key={p.id} value={p.id}>
                  {p.first_name} {p.last_name} — {p.specialty}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="appointment_date" label="วันที่นัด"
            rules={[{ required: true, message: 'กรุณาเลือกวันที่' }]}>
            <DatePicker
              style={{ width: '100%' }}
              disabledDate={date => date.isBefore(dayjs())}
              format="DD/MM/YYYY"
            />
          </Form.Item>

          <Form.Item name="appointment_time" label="เวลานัด"
            rules={[{ required: true, message: 'กรุณาเลือกเวลา' }]}>
            <TimePicker
              style={{ width: '100%' }}
              format="HH:mm"
              minuteStep={30}
            />
          </Form.Item>

          <Form.Item name="location" label="สถานที่">
            <Input placeholder="ระบุสถานที่นัดหมาย" />
          </Form.Item>

          <Form.Item name="note" label="หมายเหตุ">
            <TextArea rows={3} placeholder="เรื่องที่ต้องการปรึกษา..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AppointmentPage;