import React, { useEffect, useState } from 'react';
import { Card, Table, Typography, Tag, Modal, Tabs, Row, Col, Input, Form, Button, message, Empty } from 'antd';
import { UserOutlined, SearchOutlined } from '@ant-design/icons';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts';
import dayjs from 'dayjs';
import { patientService } from '../services/patientService';
import type { Patient, PatientDetail } from '../services/patientService';

const { Title, Text } = Typography;
const { Search } = Input;

const riskConfig: Record<string, { color: string; text: string }> = {
  low:      { color: 'green',   text: 'ปกติ' },
  medium:   { color: 'orange',  text: 'ปานกลาง' },
  high:     { color: 'red',     text: 'สูง' },
  critical: { color: '#cf1322', text: 'รุนแรง' },
};

const moodConfig: Record<number, { icon: string; label: string; color: string }> = {
  1: { icon: '😢', label: 'แย่มาก', color: '#ff4d4f' },
  2: { icon: '😞', label: 'แย่', color: '#ff7a45' },
  3: { icon: '😐', label: 'ปานกลาง', color: '#ffc53d' },
  4: { icon: '🙂', label: 'ดี', color: '#73d13d' },
  5: { icon: '😄', label: 'ดีมาก', color: '#36cfc9' },
};

const statusConfig: Record<string, { color: string; text: string }> = {
  pending:   { color: 'orange', text: 'รอการอนุมัติ' },
  approved:  { color: 'green',  text: 'อนุมัติแล้ว' },
  rejected:  { color: 'red',    text: 'ปฏิเสธ' },
  cancelled: { color: 'gray',   text: 'ยกเลิกแล้ว' },
  completed: { color: 'blue',   text: 'เสร็จสิ้น' },
};

const PsyPatients: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientDetail, setPatientDetail] = useState<PatientDetail | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [recordDetailOpen, setRecordDetailOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [selectedApptId, setSelectedApptId] = useState<number | null>(null);
  const [recordForm] = Form.useForm();
  const [recordLoading, setRecordLoading] = useState(false);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const data = await patientService.getMyPatients();
        setPatients(data);
        setFilteredPatients(data);
      } catch {
        message.error('โหลดข้อมูลไม่สำเร็จ');
      }
    };
    fetchPatients();
  }, []);

  const handleSearch = (value: string) => {
    setSearchText(value);
    if (!value) {
      setFilteredPatients(patients);
      return;
    }
    const filtered = patients.filter(p =>
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(value.toLowerCase()) ||
      p.email?.toLowerCase().includes(value.toLowerCase()) ||
      p.phone?.includes(value)
    );
    setFilteredPatients(filtered);
  };

  const handleViewDetail = async (patient: Patient) => {
    setSelectedPatient(patient);
    setModalOpen(true);
    setDetailLoading(true);
    try {
      const data = await patientService.getPatientDetail(patient.id);
      setPatientDetail(data);
    } catch {
      message.error('โหลดข้อมูลผู้ป่วยไม่สำเร็จ');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleViewRecord = async (appt: any) => {
    setSelectedApptId(appt.id);
    setRecordDetailOpen(true);
    recordForm.resetFields();
    setSelectedRecord(null);
    try {
      const data = await patientService.getRecordByAppointment(appt.id);
      if (data) {
        setSelectedRecord(data);
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

  const handleSaveRecord = async (values: any) => {
    if (!selectedApptId || !selectedPatient) return;
    setRecordLoading(true);
    try {
      await patientService.addRecord({
        patient_id: selectedPatient.id,
        appointment_id: selectedApptId,
        symptoms: values.symptoms,
        symptom_cause: values.symptom_cause,
        treatment: values.treatment,
        treatment_result: values.treatment_result,
      });
      message.success(selectedRecord ? 'อัพเดทบันทึกสำเร็จ' : 'บันทึกสำเร็จ');
      setRecordDetailOpen(false);
      const data = await patientService.getPatientDetail(selectedPatient.id);
      setPatientDetail(data);
    } catch {
      message.error('บันทึกไม่สำเร็จ');
    } finally {
      setRecordLoading(false);
    }
  };

  const columns = [
    {
      title: 'ผู้ป่วย',
      render: (_: any, record: Patient) => (
        <div>
          <Text strong>{record.first_name} {record.last_name}</Text>
          <br />
          <Text type="secondary">{record.email}</Text>
        </div>
      ),
    },
    { title: 'เบอร์โทร', dataIndex: 'phone', render: (phone: string) => phone || '-' },
    {
      title: 'จำนวนนัด',
      dataIndex: 'total_appointments',
      render: (total: number) => <Tag color="blue">{total} ครั้ง</Tag>,
    },
    {
      title: 'นัดล่าสุด',
      dataIndex: 'last_appointment',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'ดูประวัติ',
      render: (_: any, record: Patient) => (
        <a onClick={() => handleViewDetail(record)}>ดูประวัติ</a>
      ),
    },
  ];

  const assessmentColumns = [
    { title: 'แบบประเมิน', dataIndex: 'set_name' },
    { title: 'คะแนน', dataIndex: 'score' },
    {
      title: 'ระดับความเสี่ยง',
      dataIndex: 'risk_level',
      render: (level: string) => {
        const config = riskConfig[level];
        return <Tag color={config?.color}>{config?.text}</Tag>;
      },
    },
    {
      title: 'คำแนะนำ',
      dataIndex: 'recommendation',
      render: (rec: string) => (
        <Text style={{ maxWidth: 200, display: 'block' }} ellipsis={{ tooltip: rec }}>{rec}</Text>
      ),
    },
    {
      title: 'วันที่ประเมิน',
      dataIndex: 'taken_at',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
  ];

  const moodColumns = [
    {
      title: 'วันที่',
      dataIndex: 'mood_date',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'ความรู้สึก',
      dataIndex: 'mood_score',
      render: (score: number) => {
        const config = moodConfig[score];
        return <Text>{config?.icon} {config?.label}</Text>;
      },
    },
    { title: 'บันทึก', dataIndex: 'note', render: (note: string) => note || '-' },
  ];

  const apptColumns = [
    {
      title: 'วันที่นัด',
      render: (_: any, record: any) => (
        <Text>{dayjs(record.appointment_date).format('DD/MM/YYYY')} {record.appointment_time.slice(0, 5)} น.</Text>
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
    { title: 'หมายเหตุ', dataIndex: 'status_note', render: (note: string) => note || '-' },
    {
      title: 'บันทึกการรักษา',
      render: (_: any, record: any) => (
        record.status === 'completed' ? (
          <Button size="small" onClick={() => handleViewRecord(record)}>ดูบันทึก</Button>
        ) : '-'
      ),
    },
  ];

  return (
    <div>
      <Title level={2}>รายชื่อผู้ป่วย</Title>

      <Card>
        <Search
          placeholder="ค้นหาชื่อ, อีเมล หรือเบอร์โทร..."
          allowClear
          enterButton={<SearchOutlined />}
          style={{ maxWidth: 400, marginBottom: 16 }}
          onSearch={handleSearch}
          onChange={e => handleSearch(e.target.value)}
        />
        <Table
          dataSource={filteredPatients}
          columns={columns}
          rowKey="id"
          locale={{ emptyText: searchText ? 'ไม่พบผู้ป่วยที่ค้นหา' : 'ยังไม่มีผู้ป่วย' }}
        />
      </Card>

      {/* Modal ประวัติผู้ป่วย */}
      <Modal
        title={
          <Row align="middle" gutter={8}>
            <Col><UserOutlined /></Col>
            <Col>ประวัติผู้ป่วย: {selectedPatient?.first_name} {selectedPatient?.last_name}</Col>
          </Row>
        }
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setPatientDetail(null); }}
        footer={null}
        width={900}
      >
        {detailLoading ? (
          <div style={{ textAlign: 'center', padding: 24 }}>กำลังโหลด...</div>
        ) : patientDetail && (
          <Tabs items={[
            {
              key: 'assessment',
              label: `ผลประเมิน (${patientDetail.assessments.length})`,
              children: (
                <Table dataSource={patientDetail.assessments} columns={assessmentColumns}
                  rowKey="id" size="small" locale={{ emptyText: 'ไม่มีผลประเมิน' }} />
              ),
            },
            {
              key: 'mood',
              label: `Mood Tracking (${patientDetail.moods.length})`,
              children: (
                <Table dataSource={patientDetail.moods} columns={moodColumns}
                  rowKey="mood_date" size="small" locale={{ emptyText: 'ไม่มีข้อมูล Mood' }} />
              ),
            },
            {
              key: 'mood-chart',
              label: 'กราฟ Mood',
              children: (() => {
                const sortedMoods = [...patientDetail.moods].sort(
                  (a, b) => dayjs(a.mood_date).diff(dayjs(b.mood_date))
                );
                const lineData = sortedMoods.map(m => ({
                  date: dayjs(m.mood_date).format('DD/MM'),
                  score: m.mood_score,
                }));
                const barData = Object.entries(moodConfig).map(([score, config]) => ({
                  name: `${config.icon} ${config.label}`,
                  จำนวน: patientDetail.moods.filter(m => m.mood_score === Number(score)).length,
                  fill: config.color,
                }));

                return sortedMoods.length === 0 ? (
                  <Empty description="ไม่มีข้อมูล Mood" />
                ) : (
                  <>
                    <Card title="แนวโน้มความรู้สึกรายวัน" size="small" style={{ marginBottom: 16 }}>
                      <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={lineData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]}
                            tickFormatter={val => moodConfig[val]?.icon || val} />
                          <Tooltip
                            formatter={(value: any) => [
                              `${moodConfig[value]?.icon} ${moodConfig[value]?.label}`,
                              'ความรู้สึก',
                            ]}
                          />
                          <Line
                            type="monotone"
                            dataKey="score"
                            stroke="#1677ff"
                            strokeWidth={2}
                            dot={{ fill: '#1677ff', r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </Card>
                    <Card title="สรุปจำนวนวันตามระดับความรู้สึก" size="small">
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={barData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Bar dataKey="จำนวน" radius={[4, 4, 0, 0]}>
                            {barData.map((entry, index) => (
                              <rect key={index} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </Card>
                  </>
                );
              })(),
            },
            {
              key: 'appointment',
              label: `ประวัตินัดหมาย (${patientDetail.appointments.length})`,
              children: (
                <Table dataSource={patientDetail.appointments} columns={apptColumns}
                  rowKey="id" size="small" locale={{ emptyText: 'ไม่มีประวัติการนัดหมาย' }} />
              ),
            },
          ]} />
        )}
      </Modal>

      {/* Modal บันทึกการรักษา */}
      <Modal
        title={selectedRecord
          ? `แก้ไขบันทึกการรักษา (ครั้งที่ ${selectedRecord.session_number})`
          : 'บันทึกการรักษา'}
        open={recordDetailOpen}
        onCancel={() => setRecordDetailOpen(false)}
        onOk={() => recordForm.submit()}
        okText={selectedRecord ? 'อัพเดท' : 'บันทึก'}
        cancelText="ปิด"
        confirmLoading={recordLoading}
        width={600}
      >
        {selectedRecord ? (
          <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6, padding: 12, marginBottom: 16 }}>
            <Text type="success">✅ มีบันทึกอยู่แล้ว — สามารถแก้ไขได้</Text>
          </div>
        ) : (
          <div style={{ background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 6, padding: 12, marginBottom: 16 }}>
            <Text type="warning">⚠️ ยังไม่มีบันทึกการรักษาสำหรับการนัดหมายครั้งนี้</Text>
          </div>
        )}
        <Form form={recordForm} layout="vertical" onFinish={handleSaveRecord}>
          <Form.Item name="symptoms" label="อาการ">
            <Input.TextArea rows={2} placeholder="อาการของผู้ป่วย..." />
          </Form.Item>
          <Form.Item name="symptom_cause" label="สาเหตุของอาการ">
            <Input.TextArea rows={2} placeholder="สาเหตุที่ทำให้เกิดอาการ..." />
          </Form.Item>
          <Form.Item name="treatment" label="รายละเอียดการรักษา">
            <Input.TextArea rows={3} placeholder="วิธีการรักษาและคำแนะนำ..." />
          </Form.Item>
          <Form.Item name="treatment_result" label="ผลการรักษา">
            <Input.TextArea rows={2} placeholder="ผลลัพธ์หลังการรักษา..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PsyPatients;