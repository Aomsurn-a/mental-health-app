import React, { useEffect, useState } from 'react';
import { Card, Button, Form, Select, Input, Typography, Table, Tag, Modal, Row, Col, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { appointmentService } from '../services/appointmentService';
import type { Psychologist, Appointment } from '../services/appointmentService';
import { hospitalService } from '../services/hospitalService';
import type { Hospital } from '../services/hospitalService';
import { scheduleService } from '../services/scheduleService';
import type { AvailableSlot } from '../services/scheduleService';
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
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedHospitalId, setSelectedHospitalId] = useState<number | undefined>(undefined);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedPsyId, setSelectedPsyId] = useState<number | undefined>(undefined);
  const [form] = Form.useForm();

  const fetchData = async () => {
    try {
      const [psyData, apptData, hospitalData] = await Promise.all([
        appointmentService.getPsychologists(),
        appointmentService.getMyAppointments(),
        hospitalService.getAllHospitals(),
      ]);
      setPsychologists(psyData);
      setAppointments(apptData);
      setHospitals(hospitalData);
    } catch {
      message.error('โหลดข้อมูลไม่สำเร็จ');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const psychologistsInHospital = selectedHospitalId
    ? psychologists.filter(p => p.hospital_id === selectedHospitalId)
    : psychologists;

  const fetchAvailableSlots = async (psyId: number) => {
    setSlotsLoading(true);
    setAvailableSlots([]);
    form.setFieldValue('slot_id', undefined);
    try {
      const slots = await scheduleService.getAvailableSlots(psyId);
      setAvailableSlots(slots);
    } catch {
      message.error('โหลดช่วงเวลาว่างไม่สำเร็จ');
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleSubmit = async (values: any) => {
    const slot = availableSlots.find(s => s.id === values.slot_id);
    if (!slot) {
      message.error('กรุณาเลือกวันเวลาที่ว่าง');
      return;
    }
    setLoading(true);
    try {
      await appointmentService.createAppointment({
        psychologist_id: values.psychologist_id,
        appointment_date: slot.work_date,
        appointment_time: slot.start_time,
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
    if (psyId && psychologists.length > 0) {
      // เปิด Modal และเลือกโรงพยาบาล + psychologist อัตโนมัติ
      const psy = psychologists.find(p => p.id === Number(psyId));
      setModalOpen(true);
      if (psy?.hospital_id) {
        setSelectedHospitalId(psy.hospital_id);
        form.setFieldValue('hospital_id', psy.hospital_id);
      }
      form.setFieldValue('psychologist_id', Number(psyId));
      setSelectedPsyId(Number(psyId));
      fetchAvailableSlots(Number(psyId));
    }
  }, [searchParams, psychologists]);

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
        onCancel={() => { setModalOpen(false); form.resetFields(); setSelectedHospitalId(undefined); setSelectedPsyId(undefined); setAvailableSlots([]); }}
        onOk={() => form.submit()}
        okText="ส่งคำขอ"
        cancelText="ยกเลิก"
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="hospital_id" label="ขั้นตอนที่ 1: เลือกโรงพยาบาล/คลินิก"
            rules={[{ required: true, message: 'กรุณาเลือกโรงพยาบาล/คลินิก' }]}>
            <Select
              placeholder="เลือกโรงพยาบาล/คลินิก"
              options={hospitals.map(h => ({ value: h.id, label: h.name }))}
              onChange={val => {
                setSelectedHospitalId(val);
                setSelectedPsyId(undefined);
                setAvailableSlots([]);
                form.setFieldValue('psychologist_id', undefined);
                form.setFieldValue('slot_id', undefined);
              }}
            />
          </Form.Item>

          <Form.Item name="psychologist_id" label="ขั้นตอนที่ 2: เลือกนักจิตวิทยา"
            rules={[{ required: true, message: 'กรุณาเลือกนักจิตวิทยา' }]}>
            <Select
              placeholder={selectedHospitalId ? 'เลือกนักจิตวิทยา' : 'กรุณาเลือกโรงพยาบาลก่อน'}
              disabled={!selectedHospitalId}
              notFoundContent="ไม่มีนักจิตวิทยาในโรงพยาบาลนี้"
              onChange={val => { setSelectedPsyId(val); fetchAvailableSlots(val); }}
            >
              {psychologistsInHospital.map(p => (
                <Select.Option key={p.id} value={p.id}>
                  {p.first_name} {p.last_name} — {p.specialty}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="slot_id" label="ขั้นตอนที่ 3: เลือกวันเวลาที่ว่าง"
            rules={[{ required: true, message: 'กรุณาเลือกวันเวลาที่ว่าง' }]}>
            <Select
              placeholder="เลือกวันเวลาที่ว่าง"
              loading={slotsLoading}
              disabled={!selectedPsyId}
              notFoundContent={slotsLoading ? 'กำลังโหลด...' : 'ไม่มีช่วงเวลาว่าง'}
            >
              {availableSlots.map(s => (
                <Select.Option key={s.id} value={s.id}>
                  {dayjs(s.work_date).format('DD/MM/YYYY')} {s.start_time.slice(0, 5)}-{s.end_time.slice(0, 5)} น. (เหลือ {s.remaining} ที่)
                </Select.Option>
              ))}
            </Select>
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