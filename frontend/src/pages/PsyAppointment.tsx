import React, { useRef, useState } from 'react';
import { Card, Table, Tag, Button, Modal, Form, Input, Select, Typography, Row, Col, message, Alert, Spin, Checkbox } from 'antd';
import { useDashboardResource } from '../hooks/useDashboardResource';
import { DashboardSection } from '../components/DashboardSection';
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
  const appointmentResource = useDashboardResource(appointmentService.getPsychologistAppointments);
  const appointments = appointmentResource.data ?? [];
  const fetchAppointments = appointmentResource.reload;
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [nextApptModalOpen, setNextApptModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [existingRecord, setExistingRecord] = useState<any>(null);
  const [recordLoading, setRecordLoading] = useState(false);
  const [recordError, setRecordError] = useState(false);
  const recordRequest = useRef(0);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [statusForm] = Form.useForm();
  const watchedStatus = Form.useWatch('status', statusForm);
  const watchedReschedule = Form.useWatch('reschedule', statusForm);
  const [weekStart, setWeekStart] = useState(() => {
    const d = dayjs();
    return d.subtract((d.day() + 6) % 7, 'day').startOf('day');
  });
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

  // เปิด Modal บันทึกการรักษา + โหลดข้อมูลที่บันทึกไว้แล้ว
  const handleOpenRecordModal = async (record: any) => {
    const request = ++recordRequest.current;
    setSelectedAppt(record);
    recordForm.resetFields();
    setExistingRecord(null);
    setRecordLoading(true);
    setRecordError(false);
    setRecordModalOpen(true);

    try {
      const data = await patientService.getRecordByAppointment(record.id);
      if (request !== recordRequest.current) return;
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
      if (request === recordRequest.current) setRecordError(true);
    } finally {
      if (request === recordRequest.current) setRecordLoading(false);
    }
  };

  // บันทึกการรักษา
  const handleSaveRecord = async (values: any) => {
    if (!selectedAppt || recordLoading || recordError) return;
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
    let reschedule: { appointment_date: string; appointment_time: string } | undefined;
    if (values.status === 'rejected' && values.reschedule) {
      const slot = availableSlots.find(s => s.id === values.slot_id);
      if (!slot || slot.remaining <= 0) {
        message.error('กรุณาเลือกคิวใหม่ที่ว่าง');
        return;
      }
      reschedule = { appointment_date: dayjs(slot.work_date).format('YYYY-MM-DD'), appointment_time: slot.start_time };
    }
    setLoading(true);
    try {
      await appointmentService.updateAppointmentStatus(
        selectedAppt.id,
        values.status,
        values.status_note,
        reschedule
      );
      message.success(reschedule ? 'เลื่อนคิวสำเร็จ (รอการอนุมัติอีกครั้ง)' : 'อัพเดทสถานะสำเร็จ');
      setStatusModalOpen(false);
      setAvailableSlots([]);
      fetchAppointments();
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'อัพเดทสถานะไม่สำเร็จ');
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
    { title: 'เรื่องที่ปรึกษา', dataIndex: 'consultation_topic', render: (topic: string) => topic || '-' },
    { title: 'หมายเหตุผู้ป่วย', dataIndex: 'patient_note', render: (note: string) => note || '-' },
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

  // ปฏิทินรายสัปดาห์: แสดงเฉพาะนัดที่รอการอนุมัติและอนุมัติแล้ว
  const weekDays = Array.from({ length: 7 }, (_, i) => weekStart.add(i, 'day'));
  const calendarAppts = appointments.filter(a => {
    if (a.status !== 'pending' && a.status !== 'approved') return false;
    const d = dayjs(a.appointment_date);
    return !d.isBefore(weekStart, 'day') && !d.isAfter(weekStart.add(6, 'day'), 'day');
  });
  const apptHours = calendarAppts.map(a => parseInt(a.appointment_time.slice(0, 2), 10));
  const firstHour = Math.min(8, ...apptHours);
  const lastHour = Math.max(18, ...apptHours);
  const hourRows = Array.from({ length: lastHour - firstHour + 1 }, (_, i) => firstHour + i);
  const calendarStyles = {
    pending: { background: '#fff7e6', border: '1px dashed #fa8c16', color: '#ad4e00' },
    approved: { background: '#f6ffed', border: '1px solid #52c41a', color: '#237804' },
  } as const;

  return (
    <div className="psy-page">
      <header className="psy-page-header"><Title level={2}>จัดการนัดหมาย</Title></header>
      <DashboardSection label="นัดหมาย" resource={appointmentResource}>

      <Card
        title="ปฏิทินนัดหมายรายสัปดาห์"
        style={{ marginBottom: 24 }}
        extra={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button size="small" onClick={() => setWeekStart(w => w.subtract(7, 'day'))}>◀ สัปดาห์ก่อน</Button>
            <Text>{weekStart.format('DD/MM')} - {weekStart.add(6, 'day').format('DD/MM/YYYY')}</Text>
            <Button size="small" onClick={() => setWeekStart(w => w.add(7, 'day'))}>สัปดาห์ถัดไป ▶</Button>
          </div>
        }
      >
        <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
          <span><span style={{ display: 'inline-block', width: 14, height: 14, verticalAlign: 'middle', marginRight: 6, ...calendarStyles.pending }} />รอการอนุมัติ</span>
          <span><span style={{ display: 'inline-block', width: 14, height: 14, verticalAlign: 'middle', marginRight: 6, ...calendarStyles.approved }} />อนุมัติแล้ว</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th style={{ width: 64, border: '1px solid #f0f0f0', padding: 4 }}>เวลา</th>
                {weekDays.map(d => (
                  <th key={d.format('YYYY-MM-DD')} style={{ border: '1px solid #f0f0f0', padding: 4, background: d.isSame(dayjs(), 'day') ? '#e6f4ff' : undefined }}>
                    {['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'][(d.day() + 6) % 7]} {d.format('DD/MM')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hourRows.map(h => (
                <tr key={h}>
                  <td style={{ border: '1px solid #f0f0f0', padding: 4, textAlign: 'center', verticalAlign: 'top' }}>{String(h).padStart(2, '0')}:00</td>
                  {weekDays.map(d => {
                    const items = calendarAppts.filter(a =>
                      dayjs(a.appointment_date).isSame(d, 'day') && parseInt(a.appointment_time.slice(0, 2), 10) === h);
                    return (
                      <td key={d.format('YYYY-MM-DD')} style={{ border: '1px solid #f0f0f0', padding: 2, verticalAlign: 'top', height: 44 }}>
                        {items.map(a => (
                          <div key={a.id} style={{ ...calendarStyles[a.status as 'pending' | 'approved'], borderRadius: 4, padding: '2px 6px', fontSize: 12, marginBottom: 2 }}>
                            {a.appointment_time.slice(0, 5)} {a.first_name} {a.last_name}
                            <br />
                            <span>{a.status === 'pending' ? '(รอการอนุมัติ)' : '(อนุมัติแล้ว)'}</span>
                          </div>
                        ))}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {calendarAppts.length === 0 && <Text type="secondary">ไม่มีนัดหมายในสัปดาห์นี้</Text>}
      </Card>

      <Card
        title={
          <Row justify="space-between">
            <Col>รอการอนุมัติ</Col>
            <Col><Tag color="orange">{pendingAppts.length} รายการ</Tag></Col>
          </Row>
        }
        style={{ marginBottom: 24 }}
      >
        <Text className="psy-scroll-hint">เลื่อนตารางแนวนอนเพื่อดูรายละเอียดและปุ่มจัดการ</Text>
        <Table className="psy-table" scroll={{ x: 880 }} pagination={{ pageSize: 10, showSizeChanger: false }} dataSource={pendingAppts} columns={columns} rowKey="id"
          locale={{ emptyText: 'ไม่มีรายการรออนุมัติ' }} />
      </Card>

      <Card title="ประวัติการนัดหมายทั้งหมด">
        <Text className="psy-scroll-hint">เลื่อนตารางแนวนอนเพื่อดูรายละเอียดและปุ่มจัดการ</Text>
        <Table className="psy-table" scroll={{ x: 880 }} pagination={{ pageSize: 10, showSizeChanger: false }} dataSource={otherAppts} columns={columns} rowKey="id"
          locale={{ emptyText: 'ไม่มีประวัติการนัดหมาย' }} />
      </Card>
      </DashboardSection>

      {/* Modal อัพเดทสถานะ */}
      <Modal
        className="psy-dialog"
        title="อัพเดทสถานะนัดหมาย"
        open={statusModalOpen}
        onCancel={() => { setStatusModalOpen(false); setAvailableSlots([]); }}
        onOk={() => statusForm.submit()}
        okText="บันทึก"
        cancelText="ยกเลิก"
        confirmLoading={loading}
      >
        <Form form={statusForm} layout="vertical" onFinish={handleUpdateStatus} scrollToFirstError={{ focus: true }}>
          <Form.Item name="status" label="สถานะใหม่"
            rules={[{ required: true, message: 'กรุณาเลือกสถานะ' }]}>
            <select className="psy-native-select">
              <option value="">เลือกสถานะ</option>
              <option value="approved">อนุมัติ</option>
              <option value="rejected">ปฏิเสธ</option>
              <option value="completed">เสร็จสิ้น</option>
            </select>
          </Form.Item>
          {watchedStatus === 'rejected' && selectedAppt?.status === 'pending' && (
            <>
              <Form.Item name="reschedule" valuePropName="checked">
                <Checkbox onChange={e => {
                  statusForm.setFieldValue('slot_id', undefined);
                  if (e.target.checked) {
                    const psyId = (selectedAppt as any)?.psychologist_id;
                    if (psyId) fetchAvailableSlots(psyId);
                  } else {
                    setAvailableSlots([]);
                  }
                }}>เลื่อนไปคิวใหม่ (นัดจะกลับเป็น "รอการอนุมัติ")</Checkbox>
              </Form.Item>
              {watchedReschedule && (
                <Form.Item name="slot_id" label="เลือกคิวใหม่จากตารางงาน"
                  rules={[{ required: true, message: 'กรุณาเลือกคิวใหม่' }]}>
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
              )}
            </>
          )}
          <Form.Item name="status_note" label="หมายเหตุ">
            <TextArea rows={3} placeholder="เหตุผลหรือหมายเหตุเพิ่มเติม..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal บันทึกการรักษา */}
      <Modal
        className="psy-dialog"
        title={`บันทึกการรักษา — ${selectedAppt?.first_name} ${selectedAppt?.last_name}`}
        open={recordModalOpen}
        onCancel={() => { ++recordRequest.current; setRecordModalOpen(false); }}
        footer={null}
        width={650}
      >
        {recordLoading && <div className="psy-loading" role="status"><Spin size="small" />กำลังโหลดบันทึกการรักษา…</div>}
        {recordError && <Alert className="psy-notice" type="error" showIcon title="โหลดบันทึกการรักษาไม่สำเร็จ"
          action={<Button onClick={() => selectedAppt && handleOpenRecordModal(selectedAppt)}>ลองอีกครั้ง</Button>} />}
        {existingRecord && <Alert className="psy-notice" type="success" showIcon title="มีบันทึกการรักษาครั้งนี้แล้ว (สามารถแก้ไขได้)" />}

        <Form form={recordForm} layout="vertical" onFinish={handleSaveRecord} disabled={recordLoading || recordError || loading}>
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

          <Row className="psy-form-actions" gutter={8} justify="end">
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
        className="psy-dialog"
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
        okButtonProps={{ disabled: slotsLoading || availableSlots.length === 0 }}
      >
        <Form form={nextApptForm} layout="vertical" onFinish={handleNextAppointment} scrollToFirstError={{ focus: true }}>
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
          <Form.Item name="note" label="หมายเหตุ">
            <TextArea rows={2} placeholder="หมายเหตุเพิ่มเติม..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PsyAppointment;
