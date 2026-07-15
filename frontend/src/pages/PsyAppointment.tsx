import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Button, Modal, Form, Input, Select, Typography, Row, Col, message } from 'antd';
import dayjs from 'dayjs';
import { appointmentService } from '../services/appointmentService';
import type { Appointment } from '../services/appointmentService';
import { DatePicker } from 'antd';
import { patientService } from '../services/patientService';

const { Title, Text } = Typography;
const { TextArea } = Input;

const statusConfig: Record<string, { color: string; text: string }> = {
  pending:   { color: 'orange', text: 'รอการอนุมัติ' },
  approved:  { color: 'green',  text: 'อนุมัติแล้ว' },
  rejected:  { color: 'red',    text: 'ปฏิเสธ' },
  cancelled: { color: 'gray',   text: 'ยกเลิกแล้ว' },
  completed: { color: 'blue',   text: 'เสร็จสิ้น' },
};

const PsyAppointment: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [recordForm] = Form.useForm();

  const fetchAppointments = async () => {
    try {
      const data = await appointmentService.getPsychologistAppointments();
      setAppointments(data);
    } catch {
      message.error('โหลดข้อมูลไม่สำเร็จ');
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleOpenModal = (record: Appointment) => {
    setSelectedAppt(record);
    form.resetFields();
    setModalOpen(true);
  };

  const handleUpdateStatus = async (values: any) => {
    if (!selectedAppt) return;
    setLoading(true);
    try {
      await appointmentService.updateAppointmentStatus(
        selectedAppt.id,
        values.status,
        values.status_note
      );
      message.success('อัพเดทสถานะสำเร็จ');
      setModalOpen(false);
      fetchAppointments();
    } catch {
      message.error('อัพเดทสถานะไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRecord = async (values: any) => {
  if (!selectedPatientId) return;
  setLoading(true);
  try {
    await patientService.addRecord({
      patient_id: selectedPatientId,
      symptoms: values.symptoms,
      symptom_cause: values.symptom_cause,
      treatment: values.treatment,
      treatment_result: values.treatment_result,
      treatment_date: values.treatment_date.format('YYYY-MM-DD'),
    });
    message.success('บันทึกการรักษาสำเร็จ');
    setRecordModalOpen(false);
    recordForm.resetFields();
  } catch {
    message.error('บันทึกไม่สำเร็จ');
  } finally {
    setLoading(false);
  }
};

  

  const columns = [
    {
      title: 'ผู้ป่วย',
      render: (_: any, record: any) => (
        <div>
          <Text strong>{record.first_name} {record.last_name}</Text>
          <br />
          <Text type="secondary">{record.email}</Text>
          <br />
          <Text type="secondary">{record.phone}</Text>
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
      title: 'หมายเหตุ',
      dataIndex: 'status_note',
      render: (note: string) => note ? <Text type="secondary">{note}</Text> : '-',
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
      title: 'จัดการ',
      render: (_: any, record: any) => (
        <div style={{ display: 'flex', gap: 8 }}>
          {(record.status === 'pending' || record.status === 'approved') && (
            <Button type="primary" size="small" onClick={() => handleOpenModal(record)}>
            อัพเดทสถานะ
            </Button>
          )}
          {record.status === 'completed' && (
            <Button size="small" onClick={() => {
              setSelectedPatientId(record.user_id);
              setRecordModalOpen(true);
            }}>
              บันทึกการรักษา
            </Button>
          )}
        </div>
      ),
    },
  ];

  // แยกตามสถานะ
  const pendingAppts = appointments.filter(a => a.status === 'pending');
  const otherAppts = appointments.filter(a => a.status !== 'pending');

  return (
    <div>
      <Title level={2}>จัดการนัดหมาย</Title>

      {/* รอการอนุมัติ */}
      <Card
        title={
          <Row justify="space-between">
            <Col>รอการอนุมัติ</Col>
            <Col><Tag color="orange">{pendingAppts.length} รายการ</Tag></Col>
          </Row>
        }
        style={{ marginBottom: 24 }}
      >
        <Table
          dataSource={pendingAppts}
          columns={columns}
          rowKey="id"
          locale={{ emptyText: 'ไม่มีรายการรออนุมัติ' }}
        />
      </Card>

      {/* ประวัติทั้งหมด */}
      <Card title="ประวัติการนัดหมายทั้งหมด">
        <Table
          dataSource={otherAppts}
          columns={columns}
          rowKey="id"
          locale={{ emptyText: 'ไม่มีประวัติการนัดหมาย' }}
        />
      </Card>

      {/* Modal อัพเดทสถานะ */}
      <Modal
        title={`อัพเดทสถานะนัดหมาย — ${selectedAppt?.first_name} ${selectedAppt?.last_name}`}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText="บันทึก"
        cancelText="ยกเลิก"
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical" onFinish={handleUpdateStatus}>
          <Form.Item name="status" label="สถานะใหม่"
            rules={[{ required: true, message: 'กรุณาเลือกสถานะ' }]}>
            <Select placeholder="เลือกสถานะ">
              <Select.Option value="approved">อนุมัติ</Select.Option>
              <Select.Option value="rejected">ปฏิเสธ</Select.Option>
              <Select.Option value="completed">เสร็จสิ้น</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="status_note" label="หมายเหตุ">
            <TextArea rows={3} placeholder="เหตุผลหรือหมายเหตุเพิ่มเติม..." />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="บันทึกการรักษา"
        open={recordModalOpen}
        onCancel={() => { setRecordModalOpen(false); recordForm.resetFields(); }}
        onOk={() => recordForm.submit()}
        okText="บันทึก"
        cancelText="ยกเลิก"
        confirmLoading={loading}
        width={600}
      >
        <Form form={recordForm} layout="vertical" onFinish={handleAddRecord}>
          <Form.Item name="treatment_date" label="วันที่รักษา"
            rules={[{ required: true, message: 'กรุณาเลือกวันที่' }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="symptoms" label="อาการ">
            <TextArea rows={2} placeholder="อาการของผู้ป่วย..." />
          </Form.Item>
          <Form.Item name="symptom_cause" label="สาเหตุของอาการ">
            <TextArea rows={2} placeholder="สาเหตุที่ทำให้เกิดอาการ..." />
          </Form.Item>
          <Form.Item name="treatment" label="รายละเอียดการรักษา">
            <TextArea rows={3} placeholder="วิธีการรักษาและคำแนะนำ..." />
          </Form.Item>
          <Form.Item name="treatment_result" label="ผลการรักษา">
            <TextArea rows={2} placeholder="ผลลัพธ์หลังการรักษา..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PsyAppointment;