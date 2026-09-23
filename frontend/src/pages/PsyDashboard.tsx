import React, { useContext, useEffect, useRef, useState } from 'react';
import { Card, Row, Col, Typography, Tag, Button, List, Empty, Alert, Space, Statistic } from 'antd';
import {
  CalendarOutlined, TeamOutlined, FileTextOutlined, ClockCircleOutlined,
  RightOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { appointmentService } from '../services/appointmentService';
import { patientService } from '../services/patientService';
import { reportService } from '../services/reportService';
import { scheduleService } from '../services/scheduleService';
import { complaintService } from '../services/complaintService';

import { useDashboardResource } from '../hooks/useDashboardResource';
import { DashboardSection } from '../components/DashboardSection';
import { dashboardError } from '../utils/dashboardError';
async function loadCurrentWeek() {
  const weeks = await scheduleService.getWeeks();
  const today = dayjs();
  const week = weeks.find(w => !today.isBefore(dayjs(w.week_start), 'day') && !today.isAfter(dayjs(w.week_end), 'day'));
  return week ? scheduleService.getWeekDetail(week.id) : null;
}

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

  const appointmentResource = useDashboardResource(appointmentService.getPsychologistAppointments);
  const patientResource = useDashboardResource(patientService.getMyPatients);
  const reportResource = useDashboardResource(reportService.getMyReports);
  const scheduleResource = useDashboardResource(loadCurrentWeek);
  const alertResource = useDashboardResource(complaintService.getMyAiAlerts);
  const appointments = appointmentResource.data ?? [];
  const patients = patientResource.data ?? [];
  const reports = reportResource.data ?? [];
  const thisWeek = scheduleResource.data;
  const aiAlerts = alertResource.data ?? [];
  const [showReports, setShowReports] = useState(false);
  const [pendingActions, setPendingActions] = useState<string[]>([]);
  const [actionError, setActionError] = useState<ReturnType<typeof dashboardError> | null>(null);
  const [actionNotice, setActionNotice] = useState('');
  const busyActions = useRef(new Set<string>());
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const acknowledge = async (kind: 'report' | 'ai', id: number) => {
    const key = kind + ':' + id;
    if (busyActions.current.has(key)) return;
    busyActions.current.add(key);
    setPendingActions([...busyActions.current]);
    setActionError(null); setActionNotice('');
    try {
      if (kind === 'report') await reportService.acknowledgeReport(id);
      else await complaintService.acknowledgeAiAlert(id);
      if (!mounted.current) return;
      if (kind === 'report') reportResource.updateData(items => items.map(r => r.id === id ? { ...r, acknowledged_at: dayjs().toISOString() } : r));
      else alertResource.updateData(items => items.filter(a => a.id !== id));
      setActionNotice('บันทึกการรับทราบแล้ว');
    } catch (error) {
      if (mounted.current) setActionError(dashboardError(error));
    } finally {
      busyActions.current.delete(key);
      if (mounted.current) setPendingActions([...busyActions.current]);
    }
  };

  const today = dayjs().format('YYYY-MM-DD');

  const pendingAppts = appointments.filter(a => a.status === 'pending');
  const todayAppts = appointments
    .filter(a => a.status === 'approved' && dayjs(a.appointment_date).format('YYYY-MM-DD') === today)
    .sort((a, b) => (a.appointment_time ?? '').localeCompare(b.appointment_time ?? ''));
  const upcomingAppts = appointments
    .filter(a => ['pending', 'approved'].includes(a.status) && !dayjs(a.appointment_date).isBefore(dayjs(), 'day'))
    .sort((a, b) => dayjs(a.appointment_date).diff(dayjs(b.appointment_date)) || (a.appointment_time ?? '').localeCompare(b.appointment_time ?? ''))
    .slice(0, 5);

  const unreadReports = reports.filter(r => !r.acknowledged_at);
  const todaySlots = thisWeek?.schedules
    .filter(s => dayjs(s.work_date).format('YYYY-MM-DD') === today)
    .sort((a, b) => a.start_time.localeCompare(b.start_time)) || [];

  const recentPatients = [...patients]
    .sort((a, b) => dayjs(b.last_appointment || 0).valueOf() - dayjs(a.last_appointment || 0).valueOf())
    .slice(0, 5);

  return (
    <div className="dashboard-content">
      {actionError && <Alert type="error" showIcon title="บันทึกการรับทราบไม่สำเร็จ"
        description={<>{actionError.message}{actionError.retryable && <div>หากยังไม่แน่ใจว่าบันทึกสำเร็จหรือไม่ ให้โหลดหน้าใหม่เพื่อตรวจสอบสถานะก่อนกดรับทราบอีกครั้ง</div>}</>} action={actionError.signIn
          ? <Button onClick={() => { auth?.logout(); navigate('/login'); }}>เข้าสู่ระบบอีกครั้ง</Button>
          : undefined} style={{ marginBottom: 16 }} />}
      <div role="status" aria-live="polite">{actionNotice}</div>
      <DashboardSection label="แจ้งเตือนผู้ป่วย" resource={alertResource}>
      {aiAlerts.length > 0 && (
        <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }}>
          {aiAlerts.map(a => (
            <Alert
              key={a.id}
              type="error"
              showIcon
              message={`⚠️ ผู้ป่วย ${a.first_name} ${a.last_name} มีความเสี่ยงจากการสนทนากับ AI เมื่อ ${dayjs(a.created_at).format('DD/MM/YYYY HH:mm')} กรุณาติดต่อด่วน`}
              description={a.detail}
              action={
                <Button size="small" danger className="dashboard-action" loading={pendingActions.includes('ai:' + a.id)} onClick={() => acknowledge('ai', a.id)}>
                  รับทราบ
                </Button>
              }
            />
          ))}
        </Space>
      )}

      </DashboardSection>
      <DashboardSection label="รายงานที่ได้รับ" resource={reportResource}>
      {unreadReports.length > 0 && (
        <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }}>
          {unreadReports.map(r => (
            <Alert
              key={r.id}
              type={r.penalty_type === 'warning_1' || r.penalty_type === 'warning_2' ? 'warning' : 'error'}
              showIcon
              action={<Button className="dashboard-action" loading={pendingActions.includes('report:' + r.id)} onClick={() => acknowledge('report', r.id)}>รับทราบ</Button>}
              message={`คุณได้รับรายงาน ครั้งที่ ${r.report_count} เนื่องจาก ${r.summary} บทลงโทษ: ${penaltyLabel[r.penalty_type || ''] || '-'}`}
            />
          ))}
        </Space>
      )}

      </DashboardSection>
      <Title level={2} className="app-page-title" style={{ marginBottom: 4 }}>
        สวัสดี, {auth?.user?.first_name || auth?.user?.username} 👋
      </Title>
      <Text type="secondary">วันนี้ {dayjs().format('DD/MM/YYYY')}</Text>

      <Row gutter={[16, 16]} style={{ marginTop: 24, marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
<Card>
            <DashboardSection label="ข้อมูลสรุป" resource={appointmentResource}><Link className="dashboard-card-link" to="/appointment"><Statistic
              title="รอการอนุมัติ"
              value={pendingAppts.length}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: pendingAppts.length ? '#faad14' : '#52c41a' }}
            /></Link></DashboardSection>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
<Card>
            <DashboardSection label="ข้อมูลสรุป" resource={appointmentResource}><Link className="dashboard-card-link" to="/appointment"><Statistic
              title="นัดหมายวันนี้"
              value={todayAppts.length}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#1677ff' }}
            /></Link></DashboardSection>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
<Card>
            <DashboardSection label="ข้อมูลสรุป" resource={patientResource}><Link className="dashboard-card-link" to="/patients"><Statistic
              title="ผู้ป่วยในความดูแล"
              value={patients.length}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#722ed1' }}
            /></Link></DashboardSection>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Button className="dashboard-action" onClick={() => setShowReports(!showReports)} aria-expanded={showReports} aria-controls="my-reports">ดูรายงานที่ได้รับ</Button>
            <DashboardSection label="ข้อมูลสรุป" resource={reportResource}><Statistic
              title="รายงานที่ได้รับ"
              value={reports.length}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: reports.length ? '#ff4d4f' : '#52c41a' }}
            /></DashboardSection>
          </Card>
        </Col>
      </Row>

      {showReports && <Card id="my-reports" title="รายงานที่ได้รับ" style={{ marginBottom: 24 }}>
        <DashboardSection label="รายงานที่ได้รับ" resource={reportResource}>
          <List dataSource={reports} pagination={{ pageSize: 5 }} locale={{ emptyText: "ยังไม่มีรายงานที่ได้รับ" }}
            renderItem={r => <List.Item>
              <List.Item.Meta title={"รายงานครั้งที่ " + r.report_count}
                description={<><div>{r.summary}</div><div>{dayjs(r.created_at).format("DD/MM/YYYY HH:mm")}</div>
                  <div>บทลงโทษ: {penaltyLabel[r.penalty_type || ""] || "ไม่มี"}</div></>} />
              {r.acknowledged_at ? <Text type="secondary">รับทราบแล้ว</Text>
                : <Button className="dashboard-action" loading={pendingActions.includes("report:" + r.id)}
                    onClick={() => acknowledge("report", r.id)}>รับทราบ</Button>}
            </List.Item>} />
        </DashboardSection>
      </Card>}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card
            title="นัดหมายที่จะถึง"
            extra={
              <Button type="link" onClick={() => navigate('/appointment')}>
                จัดการนัดหมาย <RightOutlined />
              </Button>
            }
            style={{ marginBottom: 16 }}
          >
            <DashboardSection label="นัดหมาย" resource={appointmentResource}>
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
</DashboardSection>
          </Card>

          <Card
            title="ตารางงานวันนี้"
            extra={
              <Button type="link" onClick={() => navigate('/psy-schedule')}>
                จัดการตารางงาน <RightOutlined />
              </Button>
            }
          >
            <DashboardSection label="ตารางงาน" resource={scheduleResource}>
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
</DashboardSection>
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
            <DashboardSection label="ผู้ป่วย" resource={patientResource}>
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
</DashboardSection>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default PsyDashboard;
