import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Typography, Progress, List, Tag, Button, Empty, Spin, Alert } from 'antd';
import {
  UserOutlined, TeamOutlined, SafetyCertificateOutlined, MedicineBoxOutlined,
  CalendarOutlined, FileTextOutlined, RightOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../services/adminService';
import type { AdminStats } from '../services/adminService';

const { Title, Text } = Typography;

const complaintTypeLabel: Record<string, string> = {
  change_psychologist: 'ขอเปลี่ยนนักจิตวิทยา',
  report_system: 'รายงานปัญหาระบบ',
  report_psychologist: 'ร้องเรียนนักจิตวิทยา',
  other: 'อื่นๆ',
};

const complaintStatusConfig: Record<string, { color: string; text: string }> = {
  pending: { color: 'orange', text: 'รอดำเนินการ' },
  in_progress: { color: 'blue', text: 'กำลังดำเนินการ' },
  resolved: { color: 'green', text: 'แก้ไขแล้ว' },
  rejected: { color: 'red', text: 'ปฏิเสธ' },
};

const appointmentStatusLabel: Record<string, string> = {
  pending: 'รอการอนุมัติ',
  approved: 'อนุมัติแล้ว',
  completed: 'เสร็จสิ้น',
  rejected: 'ปฏิเสธ',
  cancelled: 'ยกเลิก',
};

const appointmentStatusColor: Record<string, string> = {
  pending: '#faad14',
  approved: '#1677ff',
  completed: '#52c41a',
  rejected: '#ff4d4f',
  cancelled: '#8c8c8c',
};

const penaltyConfig: Record<string, { color: string; text: string }> = {
  warning_1: { color: 'gold', text: 'ตักเตือนครั้งที่ 1' },
  warning_2: { color: 'orange', text: 'ตักเตือนครั้งที่ 2' },
  suspend_7: { color: 'volcano', text: 'ระงับ 7 วัน' },
  suspend_30: { color: 'red', text: 'ระงับ 30 วัน' },
  permanent_ban: { color: 'black', text: 'แบนถาวร' },
};

const reportStatusConfig: Record<string, { color: string; text: string }> = {
  pending: { color: 'orange', text: 'รอดำเนินการ' },
  confirmed: { color: 'green', text: 'ยืนยันแล้ว' },
  rejected: { color: 'red', text: 'ปฏิเสธ' },
};

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await adminService.getStats();
        setStats(data);
      } catch {
        console.error('โหลดข้อมูลไม่สำเร็จ');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!stats) {
    return <Empty description="โหลดข้อมูลแดชบอร์ดไม่สำเร็จ" />;
  }

  const pendingComplaintsTotal = stats.complaints.by_status.pending;
  const pendingComplaintTypes = Object.entries(stats.complaints.pending_by_type).filter(([, cnt]) => cnt > 0);
  const needsAttention = pendingComplaintsTotal > 0 || stats.reports.psychologist_pending > 0;

  return (
    <div>
      <Title level={2} style={{ marginBottom: 4 }}>ภาพรวมระบบ</Title>
      <Text type="secondary">วันนี้ {dayjs().format('DD/MM/YYYY')}</Text>

      {needsAttention && (
        <Alert
          style={{ marginTop: 16 }}
          type="warning"
          showIcon
          icon={<ExclamationCircleOutlined />}
          message={
            `มีรายการรอดำเนินการ: ` +
            [
              pendingComplaintsTotal > 0 ? `คำร้อง ${pendingComplaintsTotal} รายการ` : null,
              stats.reports.psychologist_pending > 0 ? `รายงานนักจิตวิทยา ${stats.reports.psychologist_pending} รายการ` : null,
            ].filter(Boolean).join(' · ')
          }
        />
      )}

      {/* สถิติผู้ใช้งาน + โรงพยาบาล */}
      <Row gutter={[16, 16]} style={{ marginTop: 16, marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable onClick={() => navigate('/users')}>
            <Statistic
              title="ผู้ใช้งานทั่วไป"
              value={stats.users.total_users}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable onClick={() => navigate('/users')}>
            <Statistic
              title="นักจิตวิทยา"
              value={stats.users.total_psychologists}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#52c41a' }}
              suffix={
                stats.users.suspended_psychologists > 0 ? (
                  <span style={{ fontSize: 13, color: '#ff4d4f' }}>
                    ({stats.users.suspended_psychologists} ถูกระงับ)
                  </span>
                ) : undefined
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable onClick={() => navigate('/users')}>
            <Statistic
              title="ผู้ดูแลระบบ"
              value={stats.users.total_admins}
              prefix={<SafetyCertificateOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable onClick={() => navigate('/hospitals')}>
            <Statistic
              title="โรงพยาบาล/คลินิก"
              value={stats.hospitals.total}
              prefix={<MedicineBoxOutlined />}
              valueStyle={{ color: '#13c2c2' }}
              suffix={<span style={{ fontSize: 13 }}>({stats.hospitals.active} เปิดใช้งาน)</span>}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* การนัดหมาย */}
        <Col xs={24} lg={12}>
          <Card
            title="การนัดหมาย"
            extra={<Text type="secondary">วันนี้ {stats.appointments.today} รายการ</Text>}
            style={{ marginBottom: 16 }}
          >
            <Statistic
              value={stats.appointments.total}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#1677ff', fontSize: 28 }}
              suffix={<span style={{ fontSize: 14 }}>ทั้งหมด</span>}
            />
            <div style={{ marginTop: 16 }}>
              {Object.entries(stats.appointments.by_status).map(([status, cnt]) => (
                <div key={status} style={{ marginBottom: 8 }}>
                  <Row justify="space-between">
                    <Col><Text type="secondary">{appointmentStatusLabel[status] || status}</Text></Col>
                    <Col><Text strong>{cnt}</Text></Col>
                  </Row>
                  <Progress
                    percent={stats.appointments.total ? Math.round((cnt / stats.appointments.total) * 100) : 0}
                    showInfo={false}
                    strokeColor={appointmentStatusColor[status] || '#8c8c8c'}
                    size="small"
                  />
                </div>
              ))}
            </div>
          </Card>

          {/* รายงาน */}
          <Card
            title="รายงานนักจิตวิทยา / โรงพยาบาล"
            extra={
              <Button type="link" onClick={() => navigate('/report')}>
                จัดการรายงาน <RightOutlined />
              </Button>
            }
          >
            <Row gutter={16}>
              <Col span={8}>
                <Statistic
                  title="รอดำเนินการ"
                  value={stats.reports.psychologist_pending}
                  valueStyle={{ color: stats.reports.psychologist_pending ? '#ff4d4f' : '#52c41a', fontSize: 22 }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="ยืนยันแล้ว"
                  value={stats.reports.psychologist_confirmed}
                  valueStyle={{ fontSize: 22 }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="ส่งโรงพยาบาล"
                  value={stats.reports.hospital_total}
                  valueStyle={{ fontSize: 22 }}
                />
              </Col>
            </Row>
          </Card>
        </Col>

        {/* คำร้อง */}
        <Col xs={24} lg={12}>
          <Card
            title="คำร้อง"
            extra={
              <Button type="link" onClick={() => navigate('/complaint-admin')}>
                จัดการคำร้อง <RightOutlined />
              </Button>
            }
            style={{ marginBottom: 16 }}
          >
            <Statistic
              value={pendingComplaintsTotal}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: pendingComplaintsTotal ? '#faad14' : '#52c41a', fontSize: 28 }}
              suffix={<span style={{ fontSize: 14 }}>รอดำเนินการ (จากทั้งหมด {stats.complaints.total})</span>}
            />
            {pendingComplaintTypes.length > 0 && (
              <div style={{ marginTop: 16 }}>
                {pendingComplaintTypes.map(([type, cnt]) => (
                  <Tag key={type} style={{ marginBottom: 8 }}>
                    {complaintTypeLabel[type] || type}: {cnt}
                  </Tag>
                ))}
              </div>
            )}
          </Card>

          {/* กิจกรรมล่าสุด */}
          <Card title="คำร้องล่าสุด">
            {stats.recent_complaints.length === 0 ? (
              <Empty description="ยังไม่มีคำร้อง" />
            ) : (
              <List
                dataSource={stats.recent_complaints}
                renderItem={c => (
                  <List.Item>
                    <List.Item.Meta
                      title={`${c.first_name} ${c.last_name} — ${complaintTypeLabel[c.type] || c.type}`}
                      description={dayjs(c.created_at).format('DD/MM/YYYY HH:mm')}
                    />
                    <Tag color={complaintStatusConfig[c.status]?.color}>
                      {complaintStatusConfig[c.status]?.text || c.status}
                    </Tag>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* รายงานนักจิตวิทยาล่าสุด */}
      <Card title="รายงานนักจิตวิทยาล่าสุด" style={{ marginTop: 16 }} extra={
        <Button type="link" onClick={() => navigate('/report')}>
          ดูทั้งหมด <RightOutlined />
        </Button>
      }>
        {stats.recent_reports.length === 0 ? (
          <Empty description="ยังไม่มีรายงาน" />
        ) : (
          <List
            dataSource={stats.recent_reports}
            renderItem={r => (
              <List.Item>
                <List.Item.Meta
                  title={`${r.first_name} ${r.last_name} — ครั้งที่ ${r.report_count}`}
                  description={dayjs(r.created_at).format('DD/MM/YYYY HH:mm')}
                />
                {r.penalty_type && (
                  <Tag color={penaltyConfig[r.penalty_type]?.color} style={{ marginRight: 8 }}>
                    {penaltyConfig[r.penalty_type]?.text || r.penalty_type}
                  </Tag>
                )}
                <Tag color={reportStatusConfig[r.status]?.color}>
                  {reportStatusConfig[r.status]?.text || r.status}
                </Tag>
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
};

export default AdminDashboard;
