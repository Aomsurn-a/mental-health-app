import React, { useContext, useEffect, useState } from 'react';
import { Card, Row, Col, Typography, Tag, Button, List, Empty, Spin } from 'antd';
import {
  SmileOutlined, FormOutlined, CalendarOutlined, MessageOutlined,
  TeamOutlined, RightOutlined, FireOutlined,
} from '@ant-design/icons';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { moodService } from '../services/moodService';
import type { MoodEntry } from '../services/moodService';
import { assessmentService } from '../services/assessmentService';
import type { MyResult } from '../services/assessmentService';
import { appointmentService } from '../services/appointmentService';
import type { Appointment } from '../services/appointmentService';

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
  { key: '/mood', label: 'บันทึก Mood', icon: <SmileOutlined />, color: '#36cfc9' },
  { key: '/assessment', label: 'ทำแบบประเมิน', icon: <FormOutlined />, color: '#1677ff' },
  { key: '/appointment', label: 'นัดหมายนักจิตวิทยา', icon: <CalendarOutlined />, color: '#722ed1' },
  { key: '/chat', label: 'พูดคุยกับผู้เชี่ยวชาญ', icon: <MessageOutlined />, color: '#eb2f96' },
];

const UserDashboard: React.FC = () => {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [moods, setMoods] = useState<MoodEntry[]>([]);
  const [latestResult, setLatestResult] = useState<MyResult | null>(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      const now = dayjs();
      const prevMonth = now.subtract(1, 'month');

      try {
        const [thisMonthMoods, prevMonthMoods, results, appointments] = await Promise.all([
          moodService.getMyMoods(now.year(), now.month() + 1),
          moodService.getMyMoods(prevMonth.year(), prevMonth.month() + 1),
          assessmentService.getMyResults(),
          appointmentService.getMyAppointments(),
        ]);

        setMoods([...thisMonthMoods, ...prevMonthMoods]);

        const sortedResults = [...results].sort(
          (a, b) => dayjs(b.taken_at).valueOf() - dayjs(a.taken_at).valueOf()
        );
        setLatestResult(sortedResults[0] || null);

        const today = dayjs().startOf('day');
        const upcoming = appointments
          .filter(
            a =>
              ['pending', 'approved'].includes(a.status) &&
              dayjs(a.appointment_date).isAfter(today.subtract(1, 'day'))
          )
          .sort((a, b) => dayjs(a.appointment_date).diff(dayjs(b.appointment_date)))
          .slice(0, 3);
        setUpcomingAppointments(upcoming);
      } catch {
        console.error('โหลดข้อมูลแดชบอร์ดไม่สำเร็จ');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const todayStr = dayjs().format('YYYY-MM-DD');
  const todayMood = moods.find(m => dayjs(m.mood_date).format('YYYY-MM-DD') === todayStr);

  // เรียงข้อมูล mood จากเก่าไปใหม่ ใช้สำหรับกราฟและคำนวณ streak
  const sortedMoods = [...moods].sort((a, b) => dayjs(a.mood_date).diff(dayjs(b.mood_date)));
  const last14Days = sortedMoods.slice(-14).map(m => ({
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

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <Title level={2} style={{ marginBottom: 4 }}>
        สวัสดี, {auth?.user?.first_name || auth?.user?.username} 👋
      </Title>
      <Text type="secondary">วันนี้ {dayjs().format('DD/MM/YYYY')}</Text>

      {/* การ์ดเช็คอิน mood วันนี้ */}
      <Card style={{ marginTop: 24, marginBottom: 24 }}>
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
      </Card>

      {/* สถิติสรุป */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Text type="secondary">Mood เฉลี่ย 30 วัน</Text>
            <br />
            <Text strong style={{ fontSize: 26 }}>
              {avgMood30 ? `${moodConfig[Math.round(Number(avgMood30))]?.icon} ${avgMood30}` : '-'}
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Text type="secondary">
              <FireOutlined style={{ color: '#fa8c16' }} /> บันทึกต่อเนื่อง
            </Text>
            <br />
            <Text strong style={{ fontSize: 26 }}>{streak} วัน</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Text type="secondary">ผลประเมินล่าสุด</Text>
            <br />
            {latestResult ? (
              <Tag color={riskConfig[latestResult.risk_level]?.color} style={{ fontSize: 14, marginTop: 4 }}>
                {riskConfig[latestResult.risk_level]?.label || latestResult.risk_level}
              </Tag>
            ) : (
              <Text type="secondary">ยังไม่เคยทำแบบประเมิน</Text>
            )}
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Text type="secondary">นัดหมายที่จะถึง</Text>
            <br />
            <Text strong style={{ fontSize: 26 }}>{upcomingAppointments.length} รายการ</Text>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* กราฟแนวโน้ม mood */}
        <Col xs={24} lg={14}>
          <Card title="แนวโน้ม Mood ช่วง 14 วันล่าสุด" extra={
            <Button type="link" onClick={() => navigate('/mood-stats')}>
              ดูสถิติทั้งหมด <RightOutlined />
            </Button>
          }>
            {last14Days.length === 0 ? (
              <Empty description="ยังไม่มีข้อมูล Mood" />
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
                  <Line type="monotone" dataKey="score" stroke="#1677ff" strokeWidth={2}
                    dot={{ fill: '#1677ff', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
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

        <Col xs={24} lg={10}>
          {/* นัดหมายที่จะถึง */}
          <Card title="นัดหมายที่จะถึง" extra={
            <Button type="link" onClick={() => navigate('/appointment')}>
              จัดการนัดหมาย <RightOutlined />
            </Button>
          } style={{ marginBottom: 16 }}>
            {upcomingAppointments.length === 0 ? (
              <Empty description="ไม่มีนัดหมายที่จะถึง" />
            ) : (
              <List
                itemLayout="horizontal"
                dataSource={upcomingAppointments}
                renderItem={item => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<TeamOutlined style={{ fontSize: 20, color: '#722ed1' }} />}
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
          </Card>

          {/* ทางลัด */}
          <Card title="ทางลัด">
            <Row gutter={[12, 12]}>
              {quickActions.map(action => (
                <Col span={12} key={action.key}>
                  <Button
                    block
                    style={{ height: 72, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                    onClick={() => navigate(action.key)}
                  >
                    <span style={{ fontSize: 20, color: action.color }}>{action.icon}</span>
                    <span style={{ fontSize: 12 }}>{action.label}</span>
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
