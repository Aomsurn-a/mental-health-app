import React, { useContext, useEffect, useState } from 'react';
import { Card, Row, Col, Typography, Tag, Button, List, Empty, Spin, Alert, Space, Statistic } from 'antd';
import {
  CalendarOutlined, TeamOutlined, FileTextOutlined, ClockCircleOutlined,
  RightOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { appointmentService } from '../services/appointmentService';
import type { Appointment } from '../services/appointmentService';
import { patientService } from '../services/patientService';
import type { Patient } from '../services/patientService';
import { reportService } from '../services/reportService';
import type { MyPsychologistReport } from '../services/reportService';
import { scheduleService } from '../services/scheduleService';
import type { WeekDetail } from '../services/scheduleService';

const { Title, Text } = Typography;

const appointmentStatusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'รอยืนยัน', color: 'gold' },
  approved: { label: 'ยืนยันแล้ว', color: 'blue' },
  rejected: { label: 'ปฏิเสธ', color: 'red' },
  cancelled: { label: 'ยกเลิก', color: 'default' },
  completed: { label: 'เสร็จสิ้น', color: 'green' },
};

const penaltyLabel: Record<string, string> = {
  warning_1: 'ตักเตือนครั้งที่ 1',
  warning_2: 'ตักเตือนครั้งที่ 2',
  suspend_7: 'ระงับการใช้งาน 7 วัน',
  suspend_30: 'ระงับการใช้งาน 30 วัน',
  permanent_ban: 'แบนถาวร',
};

const PsyDashboard: React.FC = () => {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [reports, setReports] = useState<MyPsychologistReport[]>([]);
  const [thisWeek, setThisWeek] = useState<WeekDetail | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [apptData, patientData, reportData, weeks] = await Promise.all([
          appointmentService.getPsychologistAppointments(),
          patientService.getMyPatients(),
          reportService.getMyReports(),
          scheduleService.getWeeks(),
        ]);
        setAppointments(apptData);
        setPatients(patientData);
        setReports(reportData);

        const today = dayjs();
        const currentWeek = weeks.find(w =>
          !today.isBefore(dayjs(w.week_start), 'day') && !today.isAfter(dayjs(w.week_end), 'day')
        );
        if (currentWeek) {
          const detail = await scheduleService.getWeekDetail(currentWeek.id);
          setThisWeek(detail);
        }
      } catch {
        console.error('โหลดข้อมูลแดชบอร์ดไม่สำเร็จ');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const handleAcknowledge = async (id: number) => {
    try {
      await reportService.acknowledgeReport(id);
      setReports(prev => prev.map(r => (r.id === id ? { ...r, acknowledged_at: dayjs().toISOString() } : r)));
    } catch {
      // ปิดไม่สำเร็จ ไม่ต้องรบกวนผู้ใช้ — แจ้งเตือนจะกลับมาแสดงใหม่ตอนโหลดหน้าครั้งถัดไป
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  const today = dayjs().format('YYYY-MM-DD');

  const pendingAppts = appointments.filter(a => a.status === 'pending');
  const todayAppts = appointments
    .filter(a => a.status === 'approved' && dayjs(a.appointment_date).format('YYYY-MM-DD') === today)
    .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
  const upcomingAppts = appointments
    .filter(a => ['pending', 'approved'].includes(a.status) && !dayjs(a.appointment_date).isBefore(dayjs(), 'day'))
    .sort((a, b) => dayjs(a.appointment_date).diff(dayjs(b.appointment_date)) || a.appointment_time.localeCompare(b.appointment_time))
    .slice(0, 5);

  const unreadReports = reports.filter(r => !r.acknowledged_at);
  const todaySlots = thisWeek?.schedules
    .filter(s => dayjs(s.work_date).format('YYYY-MM-DD') === today)
    .sort((a, b) => a.start_time.localeCompare(b.start_time)) || [];

  const recentPatients = [...patients]
    .sort((a, b) => dayjs(b.last_appointment || 0).valueOf() - dayjs(a.last_appointment || 0).valueOf())
    .slice(0, 5);

  return (
    <div>
      {unreadReports.length > 0 && (
        <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }}>
          {unreadReports.map(r => (
            <Alert
              key={r.id}
              type={r.penalty_type === 'warning_1' || r.penalty_type === 'warning_2' ? 'warning' : 'error'}
              showIcon
              closable
              onClose={() => handleAcknowledge(r.id)}
              message={`คุณได้รับรายงาน ครั้งที่ ${r.report_count} เนื่องจาก ${r.summary} บทลงโทษ: ${penaltyLabel[r.penalty_type || ''] || '-'}`}
            />
          ))}
        </Space>
      )}

      <Title level={2} style={{ marginBottom: 4 }}>
        สวัสดี, {auth?.user?.first_name || auth?.user?.username} 👋
      </Title>
      <Text type="secondary">วันนี้ {dayjs().format('DD/MM/YYYY')}</Text>

      <Row gutter={[16, 16]} style={{ marginTop: 24, marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable onClick={() => navigate('/psy-appointment')}>
            <Statistic
              title="รอการอนุมัติ"
              value={pendingAppts.length}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: pendingAppts.length ? '#faad14' : '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable onClick={() => navigate('/psy-appointment')}>
            <Statistic
              title="นัดหมายวันนี้"
              value={todayAppts.length}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable onClick={() => navigate('/patients')}>
            <Statistic
              title="ผู้ป่วยในความดูแล"
              value={patients.length}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable onClick={() => navigate('/report')}>
            <Statistic
              title="รายงานที่ได้รับ"
              value={reports.length}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: reports.length ? '#ff4d4f' : '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card
            title="นัดหมายที่จะถึง"
            extra={
              <Button type="link" onClick={() => navigate('/psy-appointment')}>
                จัดการนัดหมาย <RightOutlined />
              </Button>
            }
            style={{ marginBottom: 16 }}
          >
            {upcomingAppts.length === 0 ? (
              <Empty description="ไม่มีนัดหมายที่จะถึง" />
            ) : (
              <List
                itemLayout="horizontal"
                dataSource={upcomingAppts}
                renderItem={item => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<TeamOutlined style={{ fontSize: 20, color: '#722ed1' }} />}
                      title={`${item.first_name} ${item.last_name}`}
                      description={
                        `${dayjs(item.appointment_date).format('DD/MM/YYYY')} ${item.appointment_time?.slice(0, 5)} น.` +
                        (item.location ? ` · ${item.location}` : '')
                      }
                    />
                    <Tag color={appointmentStatusConfig[item.status]?.color}>
                      {appointmentStatusConfig[item.status]?.label || item.status}
                    </Tag>
                  </List.Item>
                )}
              />
            )}
          </Card>

          <Card
            title="ตารางงานวันนี้"
            extra={
              <Button type="link" onClick={() => navigate('/psy-schedule')}>
                จัดการตารางงาน <RightOutlined />
              </Button>
            }
          >
            {todaySlots.length === 0 ? (
              <Empty description="วันนี้ไม่มีตารางงาน" />
            ) : (
              <List
                dataSource={todaySlots}
                renderItem={s => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<ClockCircleOutlined style={{ fontSize: 18, color: '#1677ff' }} />}
                      title={`${s.start_time.slice(0, 5)} - ${s.end_time.slice(0, 5)} น.`}
                      description={`รับได้สูงสุด ${s.max_patients_per_slot} คน/ชม.`}
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card
            title="ผู้ป่วยล่าสุด"
            extra={
              <Button type="link" onClick={() => navigate('/patients')}>
                ดูทั้งหมด <RightOutlined />
              </Button>
            }
          >
            {recentPatients.length === 0 ? (
              <Empty description="ยังไม่มีผู้ป่วยในความดูแล" />
            ) : (
              <List
                itemLayout="horizontal"
                dataSource={recentPatients}
                renderItem={p => (
                  <List.Item>
                    <List.Item.Meta
                      title={`${p.first_name} ${p.last_name}`}
                      description={
                        `นัดหมายทั้งหมด ${p.total_appointments} ครั้ง · ล่าสุด ` +
                        (p.last_appointment ? dayjs(p.last_appointment).format('DD/MM/YYYY') : '-')
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default PsyDashboard;
