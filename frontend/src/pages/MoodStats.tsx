import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Typography, Select, Empty } from 'antd';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts';
import dayjs from 'dayjs';
import { moodService } from '../services/moodService';
import type { MoodEntry } from '../services/moodService';

const { Title, Text } = Typography;

const moodConfig: Record<number, { label: string; color: string; icon: string }> = {
  1: { label: 'แย่มาก', color: '#ff4d4f', icon: '😢' },
  2: { label: 'แย่',    color: '#ff7a45', icon: '😞' },
  3: { label: 'ปานกลาง', color: '#ffc53d', icon: '😐' },
  4: { label: 'ดี',     color: '#73d13d', icon: '🙂' },
  5: { label: 'ดีมาก',  color: '#36cfc9', icon: '😄' },
};

const MoodStats: React.FC = () => {
  const [moods, setMoods] = useState<MoodEntry[]>([]);
  const [selectedYear, setSelectedYear] = useState(dayjs().year());
  const [selectedMonth, setSelectedMonth] = useState(dayjs().month() + 1);

  useEffect(() => {
    const fetchMoods = async () => {
      try {
        const data = await moodService.getMyMoods(selectedYear, selectedMonth);
        setMoods(data);
      } catch {
        console.error('โหลดข้อมูลไม่สำเร็จ');
      }
    };
    fetchMoods();
  }, [selectedYear, selectedMonth]);

  // แปลงข้อมูลสำหรับกราฟเส้น
  const lineData = moods.map(m => ({
    date: dayjs(m.mood_date).format('DD/MM'),
    score: m.mood_score,
    label: moodConfig[m.mood_score]?.label,
    icon: moodConfig[m.mood_score]?.icon,
  })).reverse();

  // แปลงข้อมูลสำหรับกราฟแท่ง (นับจำนวนแต่ละระดับ)
  const barData = Object.entries(moodConfig).map(([score, config]) => ({
    name: `${config.icon} ${config.label}`,
    จำนวน: moods.filter(m => m.mood_score === Number(score)).length,
    fill: config.color,
  }));

  // คำนวณสถิติ
  const avgScore = moods.length > 0
    ? (moods.reduce((sum, m) => sum + m.mood_score, 0) / moods.length).toFixed(1)
    : 0;
  const bestDay = moods.reduce((best, m) => m.mood_score > (best?.mood_score || 0) ? m : best, moods[0]);

  const years = Array.from({ length: 3 }, (_, i) => dayjs().year() - i);
  const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `เดือน ${i + 1}` }));

  return (
    <div>
      <Title level={2}>สถิติ Mood Tracking</Title>

      {/* ตัวกรอง */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col>
          <Select
            value={selectedYear}
            onChange={setSelectedYear}
            style={{ width: 100 }}
            options={years.map(y => ({ value: y, label: y }))}
          />
        </Col>
        <Col>
          <Select
            value={selectedMonth}
            onChange={setSelectedMonth}
            style={{ width: 120 }}
            options={months}
          />
        </Col>
      </Row>

      {moods.length === 0 ? (
        <Empty description="ไม่มีข้อมูลในช่วงเวลานี้" />
      ) : (
        <>
          {/* สรุปสถิติ */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={8}>
              <Card>
                <Text type="secondary">จำนวนวันที่บันทึก</Text>
                <br />
                <Text strong style={{ fontSize: 28 }}>{moods.length} วัน</Text>
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card>
                <Text type="secondary">คะแนนเฉลี่ย</Text>
                <br />
                <Text strong style={{ fontSize: 28 }}>
                  {moodConfig[Math.round(Number(avgScore))]?.icon} {avgScore}
                </Text>
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card>
                <Text type="secondary">วันที่รู้สึกดีที่สุด</Text>
                <br />
                <Text strong style={{ fontSize: 20 }}>
                  {bestDay ? `${moodConfig[bestDay.mood_score]?.icon} ${dayjs(bestDay.mood_date).format('DD/MM')}` : '-'}
                </Text>
              </Card>
            </Col>
          </Row>

          {/* กราฟเส้น */}
          <Card title="แนวโน้มความรู้สึกรายวัน" style={{ marginBottom: 24 }}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]}
                  tickFormatter={val => moodConfig[val]?.icon || val} />
                <Tooltip
                  formatter={(value: any) => [
                    `${moodConfig[value]?.icon} ${moodConfig[value]?.label}`,
                    'ความรู้สึก'
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

          {/* กราฟแท่ง */}
          <Card title="สรุปจำนวนวันตามระดับความรู้สึก">
            <ResponsiveContainer width="100%" height={250}>
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
      )}
    </div>
  );
};

export default MoodStats;