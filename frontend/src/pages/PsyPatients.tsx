import React, { useEffect, useState } from 'react';
import { Card, Table, Typography, Tag, Modal, Tabs, Row, Col, message } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { patientService } from '../services/patientService';
import type { Patient, PatientDetail } from '../services/patientService';

const { Title, Text } = Typography;

const riskConfig: Record<string, { color: string; text: string }> = {
  low:      { color: 'green',  text: 'ปกติ' },
  medium:   { color: 'orange', text: 'ปานกลาง' },
  high:     { color: 'red',    text: 'สูง' },
  critical: { color: '#cf1322', text: 'รุนแรง' },
};

const moodConfig: Record<number, { icon: string; label: string }> = {
  1: { icon: '😢', label: 'แย่มาก' },
  2: { icon: '😞', label: 'แย่' },
  3: { icon: '😐', label: 'ปานกลาง' },
  4: { icon: '🙂', label: 'ดี' },
  5: { icon: '😄', label: 'ดีมาก' },
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
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientDetail, setPatientDetail] = useState<PatientDetail | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const data = await patientService.getMyPatients();
        setPatients(data);
      } catch {
        message.error('โหลดข้อมูลไม่สำเร็จ');
      }
    };
    fetchPatients();
  }, []);

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
    {
      title: 'เบอร์โทร',
      dataIndex: 'phone',
      render: (phone: string) => phone || '-',
    },
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
    {
      title: 'แบบประเมิน',
      dataIndex: 'set_name',
    },
    {
      title: 'คะแนน',
      dataIndex: 'score',
    },
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
        <Text style={{ maxWidth: 200, display: 'block' }} ellipsis={{ tooltip: rec }}>
          {rec}
        </Text>
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
    {
      title: 'บันทึก',
      dataIndex: 'note',
      render: (note: string) => note || '-',
    },
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
    {
      title: 'หมายเหตุ',
      dataIndex: 'status_note',
      render: (note: string) => note || '-',
    },
  ];

  return (
    <div>
      <Title level={2}>รายชื่อผู้ป่วย</Title>

      <Card>
        <Table
          dataSource={patients}
          columns={columns}
          rowKey="id"
          locale={{ emptyText: 'ยังไม่มีผู้ป่วย' }}
        />
      </Card>

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
        width={800}
      >
        {detailLoading ? (
          <div style={{ textAlign: 'center', padding: 24 }}>กำลังโหลด...</div>
        ) : patientDetail && (
          <Tabs items={[
            {
              key: 'assessment',
              label: `ผลประเมิน (${patientDetail.assessments.length})`,
              children: (
                <Table
                  dataSource={patientDetail.assessments}
                  columns={assessmentColumns}
                  rowKey="id"
                  size="small"
                  locale={{ emptyText: 'ไม่มีผลประเมิน' }}
                />
              ),
            },
            {
              key: 'mood',
              label: `Mood Tracking (${patientDetail.moods.length})`,
              children: (
                <Table
                  dataSource={patientDetail.moods}
                  columns={moodColumns}
                  rowKey="mood_date"
                  size="small"
                  locale={{ emptyText: 'ไม่มีข้อมูล Mood' }}
                />
              ),
            },
            {
              key: 'appointment',
              label: `ประวัตินัดหมาย (${patientDetail.appointments.length})`,
              children: (
                <Table
                  dataSource={patientDetail.appointments}
                  columns={apptColumns}
                  rowKey="id"
                  size="small"
                  locale={{ emptyText: 'ไม่มีประวัติการนัดหมาย' }}
                />
              ),
            },
          ]} />
        )}
      </Modal>
    </div>
  );
};

export default PsyPatients;