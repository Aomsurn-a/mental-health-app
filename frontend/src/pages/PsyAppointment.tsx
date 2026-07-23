import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Button, Modal, Form, Input, Select, Typography, Row, Col, message } from 'antd';
import dayjs from 'dayjs';
import { appointmentService } from '../services/appointmentService';
import { patientService } from '../services/patientService';
import type { Appointment } from '../services/appointmentService';
import { scheduleService } from '../services/scheduleService';
import type { AvailableSlot } from '../services/scheduleService';

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
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [nextApptModalOpen, setNextApptModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [existingRecord, setExistingRecord] = useState<any>(null);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [statusForm] = Form.useForm();
  const [recordForm] = Form.useForm();
  const [nextApptForm] = Form.useForm();

  const fetchAvailableSlots = async (psyId: number) => {
    setSlotsLoading(true);
    setAvailableSlots([]);
    nextApptForm.setFieldValue('slot_id', undefined);
    try {
      const slots = await scheduleService.getAvailableSlots(psyId);
      setAvailableSlots(slots);
    } catch {
      message.error('โหลดช่วงเวลาว่างไม่สำเร็จ');
    } finally {
      setSlotsLoading(false);
    }
  };

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

  // เปิด Modal บันทึกการรักษา + โหลดข้อมูลที่บันทึกไว้แล้ว
  const handleOpenRecordModal = async (record: any) => {
    setSelectedAppt(record);
    recordForm.resetFields();
    setExistingRecord(null);
    setRecordModalOpen(true);

    try {
      const data = await patientService.getRecordByAppointment(record.id);
      if (data) {
        setExistingRecord(data);
        recordForm.setFieldsValue({
          symptoms: data.symptoms,
          symptom_cause: data.symptom_cause,
          treatment: data.treatment,
          treatment_result: data.treatment_result,
        });
      }
    } catch {
      console.error('โหลดบันทึกไม่สำเร็จ');
    }
  };

  // บันทึกการรักษา
  const handleSaveRecord = async (values: any) => {
    if (!selectedAppt) return;
    setLoading(true);
    try {
      await patientService.addRecord({
        patient_id: (selectedAppt as any).user_id,
        appointment_id: selectedAppt.id,
        symptoms: values.symptoms,
        symptom_cause: values.symptom_cause,
        treatment: values.treatment,
        treatment_result: values.treatment_result,
      });
      message.success(existingRecord ? 'อัพเดทบันทึกสำเร็จ' : 'บันทึกการรักษาสำเร็จ');
      setRecordModalOpen(false);
      fetchAppointments();
    } catch {
      message.error('บันทึกไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  // อัพเดทสถานะ
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
      setStatusModalOpen(false);
      fetchAppointments();
    } catch {
      message.error('อัพเดทสถานะไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  // นัดครั้งถัดไป — ต้องเลือกจากช่วงเวลาว่างในตารางงานเท่านั้น
  const handleNextAppointment = async (values: any) => {
    if (!selectedAppt) return;
    const slot = availableSlots.find(s => s.id === values.slot_id);
    if (!slot || slot.remaining <= 0) {
      message.error('กรุณาเลือกวันเวลาที่ว่าง');
      return;
    }
    setLoading(true);
    try {
      await appointmentService.createAppointmentByPsy({
        user_id: (selectedAppt as any).user_id,
        psychologist_id: (selectedAppt as any).psychologist_id,
        appointment_date: slot.work_date,
        appointment_time: slot.start_time,
        location: values.location,
        note: values.note,
      });
      message.success('นัดหมายครั้งถัดไปสำเร็จ');
      setNextApptModalOpen(false);
      nextApptForm.resetFields();
      setAvailableSlots([]);
      fetchAppointments();

      // ถ้ายังไม่ได้บันทึกการรักษา ให้กลับมาหน้าบันทึก
      if (!existingRecord) {
        setRecordModalOpen(true);
      }
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'นัดหมายไม่สำเร็จ');
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
      render: (loc: string) => loc || '-',
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
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(record.status === 'pending' || record.status === 'approved') && (
            <Button type="primary" size="small" onClick={() => {
              setSelectedAppt(record);
              statusForm.resetFields();
              setStatusModalOpen(true);
            }}>
              อัพเดทสถานะ
            </Button>
          )}
          {record.status === 'completed' && (
            <Button size="small" onClick={() => handleOpenRecordModal(record)}>
              บันทึกการรักษา
            </Button>
          )}
        </div>
      ),
    },
  ];

  const pendingAppts = appointments.filter(a => a.status === 'pending');
  const otherAppts = appointments.filter(a => a.status !== 'pending');

  return (
    <div>
      <Title level={2}>จัดการนัดหมาย</Title>

      <Card
        title={
          <Row justify="space-between">
            <Col>รอการอนุมัติ</Col>
            <Col><Tag color="orange">{pendingAppts.length} รายการ</Tag></Col>
          </Row>
        }
        style={{ marginBottom: 24 }}
      >
        <Table dataSource={pendingAppts} columns={columns} rowKey="id"
          locale={{ emptyText: 'ไม่มีรายการรออนุมัติ' }} />
      </Card>

      <Card title="ประวัติการนัดหมายทั้งหมด">
        <Table dataSource={otherAppts} columns={columns} rowKey="id"
          locale={{ emptyText: 'ไม่มีประวัติการนัดหมาย' }} />
      </Card>

      {/* Modal อัพเดทสถานะ */}
      <Modal
        title="อัพเดทสถานะนัดหมาย"
        open={statusModalOpen}
        onCancel={() => setStatusModalOpen(false)}
        onOk={() => statusForm.submit()}
        okText="บันทึก"
        cancelText="ยกเลิก"
        confirmLoading={loading}
      >
        <Form form={statusForm} layout="vertical" onFinish={handleUpdateStatus}>
          <Form.Item name="status" label="สถานะใหม่"
            rules={[{ required: true, message: 'กรุณาเลือกสถานะ' }]}>
            <select style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d9d9d9' }}>
              <option value="">เลือกสถานะ</option>
              <option value="approved">อนุมัติ</option>
              <option value="rejected">ปฏิเสธ</option>
              <option value="completed">เสร็จสิ้น</option>
            </select>
          </Form.Item>
          <Form.Item name="status_note" label="หมายเหตุ">
            <TextArea rows={3} placeholder="เหตุผลหรือหมายเหตุเพิ่มเติม..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal บันทึกการรักษา */}
      <Modal
        title={`บันทึกการรักษา — ${selectedAppt?.first_name} ${selectedAppt?.last_name}`}
        open={recordModalOpen}
        onCancel={() => setRecordModalOpen(false)}
        footer={null}
        width={650}
      >
        {existingRecord && (
          <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6, padding: 12, marginBottom: 16 }}>
            <Text type="success">✅ มีบันทึกการรักษาครั้งนี้แล้ว (สามารถแก้ไขได้)</Text>
          </div>
        )}

        <Form form={recordForm} layout="vertical" onFinish={handleSaveRecord}>
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

          <Row gutter={8} justify="end">
            <Col>
              <Button onClick={() => {
                setRecordModalOpen(false);
                setNextApptModalOpen(true);
                const psyId = (selectedAppt as any)?.psychologist_id;
                if (psyId) fetchAvailableSlots(psyId);
              }}>
                + นัดครั้งถัดไป
              </Button>
            </Col>
            <Col>
              <Button type="primary" onClick={() => recordForm.submit()} loading={loading}>
                {existingRecord ? 'อัพเดทบันทึก' : 'บันทึกการรักษา'}
              </Button>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Modal นัดครั้งถัดไป */}
      <Modal
        title="นัดหมายครั้งถัดไป"
        open={nextApptModalOpen}
        onCancel={() => {
          setNextApptModalOpen(false);
          setAvailableSlots([]);
          if (!existingRecord) setRecordModalOpen(true);
        }}
        onOk={() => nextApptForm.submit()}
        okText="นัดหมาย"
        cancelText="ยกเลิก"
        confirmLoading={loading}
      >
        <Form form={nextApptForm} layout="vertical" onFinish={handleNextAppointment}>
          <Form.Item name="slot_id" label="วันเวลาที่ว่างตามตารางงาน"
            rules={[{ required: true, message: 'กรุณาเลือกวันเวลาที่ว่าง' }]}>
            <Select
              placeholder="เลือกวันเวลาที่ว่าง"
              loading={slotsLoading}
              notFoundContent={slotsLoading ? 'กำลังโหลด...' : 'ไม่มีช่วงเวลาว่างตามตารางงาน'}
            >
              {availableSlots.map(s => (
                <Select.Option key={s.id} value={s.id}>
                  {dayjs(s.work_date).format('DD/MM/YYYY')} {s.start_time.slice(0, 5)}-{s.end_time.slice(0, 5)} น. (เหลือ {s.remaining} ที่)
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="location" label="สถานที่">
            <Input placeholder="สถานที่นัดหมาย" />
          </Form.Item>
          <Form.Item name="note" label="หมายเหตุ">
            <TextArea rows={2} placeholder="หมายเหตุเพิ่มเติม..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PsyAppointment;