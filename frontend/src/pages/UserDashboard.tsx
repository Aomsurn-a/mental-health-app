import React, { useContext } from 'react';
import { Card, Row, Col, Typography, Tag, Button, List, Empty } from 'antd';
import {
  SmileOutlined, FormOutlined, CalendarOutlined, MessageOutlined,
  TeamOutlined, RightOutlined, FireOutlined,
} from '@ant-design/icons';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { moodService } from '../services/moodService';
import { assessmentService } from '../services/assessmentService';
import { appointmentService } from '../services/appointmentService';

import { useDashboardResource } from '../hooks/useDashboardResource';
import { DashboardSection } from '../components/DashboardSection';
async function loadMoods() {
  const now = dayjs();
  const previous = now.subtract(1, 'month');
  return (await Promise.all([moodService.getMyMoods(now.year(), now.month() + 1), moodService.getMyMoods(previous.year(), previous.month() + 1)])).flat();
}

const { Title, Text } = Typography;

const moodConfig: Record<number, { label: string; color: string; icon: string }> = {
  1: { label: 'แย่มาก', color: '#ff4d4f', icon: '😢' },
  2: { label: 'แย่', color: '#ff7a45', icon: '😞' },
  3: { label: 'ปานกลาง', color: '#ffc53d', icon: '😐' },
  4: { label: 'ดี', color: '#73d13d', icon: '🙂' },
  5: { label: 'ดีมาก', color: '#36cfc9', icon: '😄' },
};

const riskConfig: Record<string, { label: string; color: string }> = {
  low: { label: 'ความเสี่ยงต่ำ', color: 'green' },
  medium: { label: 'ความเสี่ยงปานกลาง', color: 'gold' },
  high: { label: 'ความเสี่ยงสูง', color: 'volcano' },
  critical: { label: 'ความเสี่ยงวิกฤต', color: 'red' },
};

const appointmentStatusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'รอยืนยัน', color: 'gold' },
  approved: { label: 'ยืนยันแล้ว', color: 'blue' },
  rejected: { label: 'ปฏิเสธ', color: 'red' },
  cancelled: { label: 'ยกเลิก', color: 'default' },
  completed: { label: 'เสร็จสิ้น', color: 'green' },
};

const quickActions = [
  { key: '/mood', label: 'บันทึก Mood', icon: <SmileOutlined /> },
  { key: '/assessment', label: 'ทำแบบประเมิน', icon: <FormOutlined /> },
  { key: '/appointment', label: 'นัดหมายนักจิตวิทยา', icon: <CalendarOutlined /> },
  { key: '/chat', label: 'พูดคุยกับผู้เชี่ยวชาญ', icon: <MessageOutlined /> },
];

const UserDashboard: React.FC = () => {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();

  const moodResource = useDashboardResource(loadMoods);
  const assessmentResource = useDashboardResource(assessmentService.getMyResults);
  const appointmentResource = useDashboardResource(appointmentService.getMyAppointments);
  const moods = moodResource.data ?? [];
  const latestResult = [...(assessmentResource.data ?? [])].sort((a, b) => dayjs(b.taken_at).valueOf() - dayjs(a.taken_at).valueOf())[0] ?? null;
  const allUpcoming = (appointmentResource.data ?? []).filter(a => ['pending', 'approved'].includes(a.status) && !dayjs(a.appointment_date).isBefore(dayjs(), 'day'))
    .sort((a, b) => dayjs(a.appointment_date).diff(dayjs(b.appointment_date)) || (a.appointment_time ?? '').localeCompare(b.appointment_time ?? ''));
  const upcomingAppointments = allUpcoming.slice(0, 3);

  const todayStr = dayjs().format('YYYY-MM-DD');
  const todayMood = moods.find(m => dayjs(m.mood_date).format('YYYY-MM-DD') === todayStr);

  // เรียงข้อมูล mood จากเก่าไปใหม่ ใช้สำหรับกราฟและคำนวณ streak
  const sortedMoods = [...moods].sort((a, b) => dayjs(a.mood_date).diff(dayjs(b.mood_date)));
  const last14Days = sortedMoods.filter(m => !dayjs(m.mood_date).isBefore(dayjs().subtract(13, 'day'), 'day') && !dayjs(m.mood_date).isAfter(dayjs(), 'day')).map(m => ({
    date: dayjs(m.mood_date).format('DD/MM'),
    score: m.mood_score,
  }));

  const last30Days = sortedMoods.filter(m => dayjs(m.mood_date).isAfter(dayjs().subtract(30, 'day')));
  const avgMood30 = last30Days.length
    ? (last30Days.reduce((sum, m) => sum + m.mood_score, 0) / last30Days.length).toFixed(1)
    : null;

  // นับ streak วันติดต่อกันที่บันทึก mood (นับถอยหลังจากวันนี้)
  const moodDates = new Set(moods.map(m => dayjs(m.mood_date).format('YYYY-MM-DD')));
  let streak = 0;
  let cursor = dayjs();
  if (!moodDates.has(cursor.format('YYYY-MM-DD'))) cursor = cursor.subtract(1, 'day');
  while (moodDates.has(cursor.format('YYYY-MM-DD'))) {
    streak += 1;
    cursor = cursor.subtract(1, 'day');
  }

  return (
    <div className="dashboard-content user-dashboard-page">
      <Title level={2} className="app-page-title" style={{ marginBottom: 4 }}>
        สวัสดี, {auth?.user?.first_name || auth?.user?.username} 👋
      </Title>
      <Text type="secondary">วันนี้ {dayjs().format('DD/MM/YYYY')}</Text>

      {/* การ์ดเช็คอิน mood วันนี้ */}
      <Card style={{ marginTop: 24, marginBottom: 24 }}>
        <DashboardSection label="บันทึกอารมณ์" resource={moodResource}>
{todayMood ? (
          <Row align="middle" justify="space-between">
            <Col>
              <Text type="secondary">Mood วันนี้ของคุณ</Text>
              <br />
              <Text strong style={{ fontSize: 24 }}>
                {moodConfig[todayMood.mood_score]?.icon} {moodConfig[todayMood.mood_score]?.label}
              </Text>
            </Col>
            <Col>
              <Button icon={<SmileOutlined />} onClick={() => navigate('/mood')}>
                แก้ไขบันทึก
              </Button>
            </Col>
          </Row>
        ) : (
          <Row align="middle" justify="space-between">
            <Col>
              <Text strong style={{ fontSize: 16 }}>วันนี้คุณยังไม่ได้บันทึก Mood</Text>
              <br />
              <Text type="secondary">บันทึกความรู้สึกทุกวันเพื่อติดตามสุขภาพใจของคุณ</Text>
            </Col>
            <Col>
              <Button type="primary" icon={<SmileOutlined />} onClick={() => navigate('/mood')}>
                บันทึกตอนนี้
              </Button>
            </Col>
          </Row>
        )}
</DashboardSection>
      </Card>

      {/* สถิติสรุป */}
      <Row className="dashboard-stat-grid" gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={12} lg={6}>
          <Card><DashboardSection label="ข้อมูลสรุป" resource={moodResource}>
            <Text type="secondary">Mood เฉลี่ย 30 วัน</Text>
            <br />
            <Text strong style={{ fontSize: 26 }}>
              {avgMood30 ? `${moodConfig[Math.round(Number(avgMood30))]?.icon} ${avgMood30}` : '-'}
            </Text>
          </DashboardSection></Card>
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <Card><DashboardSection label="ข้อมูลสรุป" resource={moodResource}>
            <Text type="secondary">
              <FireOutlined style={{ color: 'var(--role-secondary)' }} /> บันทึกต่อเนื่อง
            </Text>
            <br />
            <Text strong style={{ fontSize: 26 }}>{streak} วัน</Text>
          </DashboardSection></Card>
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <Card><DashboardSection label="ข้อมูลสรุป" resource={assessmentResource}>
            <Text type="secondary">ผลประเมินล่าสุด</Text>
            <br />
            {latestResult ? (
              <Tag color={riskConfig[latestResult.risk_level]?.color} style={{ fontSize: 14, marginTop: 4 }}>
                {riskConfig[latestResult.risk_level]?.label || latestResult.risk_level}
              </Tag>
            ) : (
              <Text type="secondary">ยังไม่เคยทำแบบประเมิน</Text>
            )}
          </DashboardSection></Card>
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <Card><DashboardSection label="ข้อมูลสรุป" resource={appointmentResource}>
            <Text type="secondary">นัดหมายที่จะถึง</Text>
            <br />
            <Text strong style={{ fontSize: 26 }}>{allUpcoming.length} รายการ</Text>
          </DashboardSection></Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* กราฟแนวโน้ม mood */}
        <Col xs={24} lg={16}>
          <Card title="แนวโน้ม Mood ช่วง 14 วันล่าสุด" extra={
            <Button type="link" onClick={() => navigate('/mood-stats')}>
              ดูสถิติทั้งหมด <RightOutlined />
            </Button>
          }>
            <DashboardSection label="แนวโน้มอารมณ์" resource={moodResource}>
{last14Days.length === 0 ? (
              <Empty description="ยังไม่มีข้อมูลอารมณ์ในช่วงนี้"><Button onClick={() => navigate('/mood')}>บันทึกอารมณ์</Button></Empty>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={last14Days}>
                  <XAxis dataKey="date" />
                  <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]}
                    tickFormatter={val => moodConfig[val]?.icon || val} />
                  <Tooltip
                    formatter={(value: any) => [
                      `${moodConfig[value]?.icon} ${moodConfig[value]?.label}`,
                      'ความรู้สึก',
                    ]}
                  />
                  <Line type="monotone" dataKey="score" stroke="var(--role-primary)" strokeWidth={2}
                    dot={{ fill: 'var(--role-primary)', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
</DashboardSection>
          </Card>

          {/* ผลประเมินล่าสุดแบบละเอียด */}
          {latestResult && (
            <Card title="ผลการประเมินล่าสุด" style={{ marginTop: 16 }} extra={
              <Button type="link" onClick={() => navigate('/assessment-history')}>
                ดูประวัติ <RightOutlined />
              </Button>
            }>
              <Row align="middle" justify="space-between">
                <Col>
                  <Text strong>{latestResult.set_name}</Text>
                  <br />
                  <Text type="secondary">{dayjs(latestResult.taken_at).format('DD/MM/YYYY')}</Text>
                </Col>
                <Col>
                  <Tag color={riskConfig[latestResult.risk_level]?.color} style={{ fontSize: 14 }}>
                    {riskConfig[latestResult.risk_level]?.label || latestResult.risk_level}
                  </Tag>
                </Col>
              </Row>
              {latestResult.recommendation && (
                <Text type="secondary" style={{ display: 'block', marginTop: 12 }}>
                  {latestResult.recommendation}
                </Text>
              )}
            </Card>
          )}
        </Col>

        <Col xs={24} lg={8}>
          {/* นัดหมายที่จะถึง */}
          <Card title="นัดหมายที่จะถึง" extra={
            <Button type="link" onClick={() => navigate('/appointment')}>
              จัดการนัดหมาย <RightOutlined />
            </Button>
          } style={{ marginBottom: 16 }}>
            <DashboardSection label="นัดหมาย" resource={appointmentResource}>
{upcomingAppointments.length === 0 ? (
              <Empty description="ไม่มีนัดหมายที่จะถึง"><Button onClick={() => navigate('/appointment')}>นัดหมายนักจิตวิทยา</Button></Empty>
            ) : (
              <List
                itemLayout="horizontal"
                dataSource={upcomingAppointments}
                renderItem={item => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<TeamOutlined style={{ fontSize: 20, color: 'var(--role-primary)' }} />}
                      title={`${item.first_name} ${item.last_name}`}
                      description={
                        <>
                          {item.specialty} · {dayjs(item.appointment_date).format('DD/MM/YYYY')} {item.appointment_time?.slice(0, 5)} น.
                        </>
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

          {/* ทางลัด */}
          <Card title="ทางลัด">
            <Row gutter={[12, 12]}>
              {quickActions.map(action => (
                <Col span={12} key={action.key}>
                  <Button
                    className="user-quick-action"
                    block
                    style={{ minHeight: 72, height: 'auto', whiteSpace: 'normal', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                    onClick={() => navigate(action.key)}
                  >
                    <span className="user-quick-action-icon">{action.icon}</span>
                    <span className="user-quick-action-label">{action.label}</span>
                  </Button>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default UserDashboard;
