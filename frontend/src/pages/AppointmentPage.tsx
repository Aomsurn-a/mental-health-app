import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Card, Button, Form, Select, Input, Typography, Table, Tag, Modal, message, Alert } from 'antd';
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
  const [assignmentError, setAssignmentError] = useState('');
  const [form] = Form.useForm();
  const handledPsyId = useRef('');

  const fetchData = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchAvailableSlots = useCallback(async (psyId: number) => {
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
  }, [form]);

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
        hospital_id: values.hospital_id,
        gender: values.gender,
        appointment_date: slot.work_date,
        appointment_time: slot.start_time,
        consultation_topic: values.consultation_topic,
        patient_note: values.patient_note,
      });
      message.success('ส่งคำขอนัดหมายสำเร็จ!');
      setModalOpen(false);
      form.resetFields();
      fetchData();
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'ส่งคำขอไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  const randomizePsychologist = useCallback(async (hospitalId: number, gender: 'male' | 'female') => {
    setAssignmentError('');
    setSelectedPsyId(undefined);
    setAvailableSlots([]);
    form.setFieldsValue({ psychologist_id: undefined, slot_id: undefined });
    try {
      const candidate = await appointmentService.getRandomPsychologist(hospitalId, gender);
      setSelectedPsyId(candidate.id);
      form.setFieldValue('psychologist_id', candidate.id);
      await fetchAvailableSlots(candidate.id);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'ไม่พบเวลาว่างของนักจิตเพศที่เลือก';
      setAssignmentError(errorMessage);
      message.warning(errorMessage);
    }
  }, [fetchAvailableSlots, form]);

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
    if (psyId && psyId !== handledPsyId.current && psychologists.length > 0) {
      handledPsyId.current = psyId;
      // ใช้คลินิกและเพศของคำแนะนำเพื่อสุ่มนักจิตตามขั้นตอนใหม่
      const psy = psychologists.find(p => p.id === Number(psyId));
      if (psy?.hospital_id && psy.gender) {
        setModalOpen(true);
        setSelectedHospitalId(psy.hospital_id);
        form.setFieldsValue({ hospital_id: psy.hospital_id, gender: psy.gender });
        randomizePsychologist(psy.hospital_id, psy.gender);
      } else if (psy) {
        message.warning('โปรดเลือกคลินิกและเพศนักจิตเพื่อสุ่มผู้ให้บริการ');
      }
    }
  }, [searchParams, psychologists, form, randomizePsychologist]);

  const columns = [
    {
      title: 'นักจิตวิทยา',
      render: (_: any, record: Appointment) => (
        <div>
        <Text strong>{record.first_name} {record.last_name}</Text>
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
    { title: 'เรื่องที่ปรึกษา', dataIndex: 'consultation_topic', render: (topic: string) => topic || '-' },
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
          <Button className="appointment-action" danger size="small" onClick={() => handleCancel(record.id)}>
            ยกเลิก
          </Button>
        ) : null
      ),
    },
  ];

  return (
    <div className="appointment-page">
      <Title level={2} className="app-page-title">การนัดหมาย</Title>

      {/* รายการนัดหมาย */}
      <Card
        title="รายการนัดหมายของฉัน"
        extra={(
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            ส่งคำขอนัดหมาย
          </Button>
        )}
      >
        <Text type="secondary" className="appointment-scroll-hint">เลื่อนตารางซ้าย–ขวาเพื่อดูรายละเอียดและจัดการนัดหมาย</Text>
        <Table
          dataSource={appointments}
          columns={columns}
          rowKey="id"
          scroll={{ x: 720 }}
          locale={{ emptyText: 'ยังไม่มีการนัดหมาย' }}
        />
      </Card>

      {/* Modal ส่งคำขอ */}
      <Modal
        className="appointment-dialog"
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
                setAssignmentError('');
                form.setFieldValue('gender', undefined);
                setAvailableSlots([]);
                form.setFieldValue('psychologist_id', undefined);
                form.setFieldValue('slot_id', undefined);
              }}
            />
          </Form.Item>

          <Form.Item name="gender" label="ขั้นตอนที่ 2: เลือกเพศนักจิตวิทยา"
            rules={[{ required: true, message: 'กรุณาเลือกเพศนักจิตวิทยา' }]}>
            <Select
              placeholder={selectedHospitalId ? 'เลือกชายหรือหญิง' : 'กรุณาเลือกโรงพยาบาลก่อน'}
              disabled={!selectedHospitalId}
              onChange={value => selectedHospitalId && randomizePsychologist(selectedHospitalId, value)}
              options={[{ value: 'male', label: 'ชาย' }, { value: 'female', label: 'หญิง' }]}
            />
          </Form.Item>

          <Form.Item name="psychologist_id" hidden rules={[{ required: true, message: 'กำลังสุ่มนักจิตวิทยา' }]}><Input /></Form.Item>
          {assignmentError && <Alert type="warning" showIcon message={assignmentError} style={{ marginBottom: 16 }} />}

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

          <Form.Item name="consultation_topic" label="ขั้นตอนที่ 4: เรื่องที่ต้องการปรึกษา"
            rules={[{ required: true, whitespace: true, message: 'กรุณาระบุเรื่องที่ต้องการปรึกษา' }]}>
            <TextArea rows={3} maxLength={1000} showCount placeholder="ระบุเรื่องหรือประเด็นที่ต้องการพูดคุยกับนักจิตวิทยา" />
          </Form.Item>

          <Form.Item name="patient_note" label="ขั้นตอนที่ 5: หมายเหตุ">
            <TextArea rows={2} maxLength={1000} showCount placeholder="ข้อมูลเพิ่มเติมสำหรับนักจิตวิทยา (ไม่บังคับ)" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AppointmentPage;
