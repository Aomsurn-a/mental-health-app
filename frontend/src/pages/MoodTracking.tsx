import React, { useState, useEffect } from 'react';
import { Card, Button, Radio, Input, Typography, Calendar, Modal, Row, Col, message } from 'antd';
import { SmileOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { moodService } from '../services/moodService';
import type { MoodEntry } from '../services/moodService';

const { Title, Text } = Typography;
const { TextArea } = Input;

const dailyQuestions = [
  { id: 'q1', question: 'วันนี้คุณนอนหลับได้ดีไหม?' },
  { id: 'q2', question: 'วันนี้คุณรับประทานอาหารครบมื้อไหม?' },
  { id: 'q3', question: 'วันนี้คุณได้ออกกำลังกายหรือขยับร่างกายไหม?' },
  { id: 'q4', question: 'วันนี้คุณได้พูดคุยกับคนที่รักไหม?' },
  { id: 'q5', question: 'วันนี้คุณรู้สึกมีความหวังในชีวิตไหม?' },
];

const moodConfig = [
  { score: 1, label: 'แย่มาก', icon: '😢', color: '#ff4d4f' },
  { score: 2, label: 'แย่', icon: '😞', color: '#ff7a45' },
  { score: 3, label: 'ปานกลาง', icon: '😐', color: '#ffc53d' },
  { score: 4, label: 'ดี', icon: '🙂', color: '#73d13d' },
  { score: 5, label: 'ดีมาก', icon: '😄', color: '#36cfc9' },
];

const MoodTracking: React.FC = () => {
  const today = dayjs().format('YYYY-MM-DD');

  // ---- State ทั้งหมด ----
  const [todayEntry, setTodayEntry] = useState<MoodEntry | null>(null);
  const [selectedDate, setSelectedDate] = useState(today);
  const [moodScore, setMoodScore] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState('');
  const [monthlyMoods, setMonthlyMoods] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentYear, setCurrentYear] = useState(dayjs().year());
  const [currentMonth, setCurrentMonth] = useState(dayjs().month() + 1);

  // โหลดข้อมูลวันนี้ (แยกออกมาต่างหาก ไม่เปลี่ยนตามเดือน)
  useEffect(() => {
    const fetchToday = async () => {
      try {
        const data = await moodService.getMoodByDate(today);
        setTodayEntry(data);
      } catch {
        console.error('โหลดข้อมูลวันนี้ไม่สำเร็จ');
      }
    };
    fetchToday();
  }, [loading]);

  // โหลดข้อมูลของวันที่เลือก (สำหรับ Modal)
  useEffect(() => {
    const fetchMood = async () => {
      try {
        const data = await moodService.getMoodByDate(selectedDate);
        if (data) {
          setMoodScore(data.mood_score);
          setAnswers(data.answers || {});
          setNote(data.note || '');
        } else {
          setMoodScore(null);
          setAnswers({});
          setNote('');
        }
      } catch {
        console.error('โหลดข้อมูลไม่สำเร็จ');
      }
    };
    fetchMood();
  }, [selectedDate]);

  // โหลดข้อมูลทั้งเดือนสำหรับปฏิทิน
  useEffect(() => {
    const fetchMonthlyMoods = async () => {
      try {
        const data = await moodService.getMyMoods(currentYear, currentMonth);
        setMonthlyMoods(data);
      } catch {
        console.error('โหลดข้อมูลรายเดือนไม่สำเร็จ');
      }
    };
    fetchMonthlyMoods();
  }, [currentYear, currentMonth]);

  // บันทึก mood
  const handleSave = async () => {
    if (!moodScore) {
      message.warning('กรุณาเลือกระดับความรู้สึกก่อน');
      return;
    }
    setLoading(true);
    try {
      await moodService.saveMood({
        mood_date: selectedDate,
        mood_score: moodScore,
        answers,
        note,
      });
      message.success('บันทึกสำเร็จ!');
      setModalOpen(false);
      const data = await moodService.getMyMoods(currentYear, currentMonth);
      setMonthlyMoods(data);
    } catch {
      message.error('บันทึกไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  // แสดง emoji ในปฏิทิน
  const dateCellRender = (value: Dayjs) => {
    const dateStr = value.format('YYYY-MM-DD');
    const mood = monthlyMoods.find(m => dayjs(m.mood_date).format('YYYY-MM-DD') === dateStr);
    if (!mood) return null;
    const config = moodConfig.find(m => m.score === mood.mood_score);
    return <div style={{ textAlign: 'center', fontSize: 18 }}>{config?.icon}</div>;
  };

  const handlePanelChange = (value: Dayjs) => {
    setCurrentYear(value.year());
    setCurrentMonth(value.month() + 1);
  };

  const handleSelectDate = (value: Dayjs, info: { source: string }) => {
    if (info.source !== 'date') return;
    const dateStr = value.format('YYYY-MM-DD');
    setSelectedDate(dateStr);
    setModalOpen(true);
  };

  // ---- ตัวแปรสำหรับแสดงผลวันนี้ ----
  const todayConfig = moodConfig.find(m => m.score === todayEntry?.mood_score);

  return (
    <div>
      <Title level={2}>Mood Tracking</Title>

      {/* สรุปวันนี้ */}
      <Card style={{ marginBottom: 24 }}>
        <Row align="middle" justify="space-between">
          <Col>
            <Text strong>วันนี้ ({dayjs().format('DD/MM/YYYY')})</Text>
            <br />
            {todayEntry ? (
              <Text>ความรู้สึก: {todayConfig?.icon} {todayConfig?.label}</Text>
            ) : (
              <Text type="secondary">ยังไม่ได้บันทึกวันนี้</Text>
            )}
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<SmileOutlined />}
              onClick={() => {
                setSelectedDate(today);
                setModalOpen(true);
              }}
            >
              {todayEntry ? 'แก้ไขวันนี้' : 'บันทึกวันนี้'}
            </Button>
          </Col>
        </Row>
      </Card>

      {/* ปฏิทิน */}
      <Card title="ประวัติความรู้สึก">
        <Calendar
          cellRender={dateCellRender}
          onSelect={(value, info) => handleSelectDate(value, info)}
          onPanelChange={handlePanelChange}
          disabledDate={date => date.isAfter(dayjs())}
        />
      </Card>

      {/* Modal กรอก mood */}
      <Modal
        title={`บันทึกความรู้สึก ${dayjs(selectedDate).format('DD/MM/YYYY')}`}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        okText="บันทึก"
        cancelText="ยกเลิก"
        confirmLoading={loading}
        width={600}
      >
        <Title level={5}>วันนี้คุณรู้สึกเป็นยังไงบ้าง?</Title>
        <Row gutter={8} style={{ marginBottom: 24 }}>
          {moodConfig.map(m => (
            <Col key={m.score}>
              <Button
                style={{
                  borderColor: moodScore === m.score ? m.color : undefined,
                  background: moodScore === m.score ? m.color + '20' : undefined,
                  height: 'auto',
                  padding: '8px 12px',
                }}
                onClick={() => setMoodScore(m.score)}
              >
                <div style={{ fontSize: 24 }}>{m.icon}</div>
                <div style={{ fontSize: 12 }}>{m.label}</div>
              </Button>
            </Col>
          ))}
        </Row>

        <Title level={5}>คำถามประจำวัน</Title>
        {dailyQuestions.map(q => (
          <Card key={q.id} size="small" style={{ marginBottom: 8 }}>
            <Row justify="space-between" align="middle">
              <Col flex={1}><Text>{q.question}</Text></Col>
              <Col>
                <Radio.Group
                  value={answers[q.id]}
                  onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                >
                  <Radio value={true}>ใช่</Radio>
                  <Radio value={false}>ไม่ใช่</Radio>
                </Radio.Group>
              </Col>
            </Row>
          </Card>
        ))}

        <Title level={5} style={{ marginTop: 16 }}>บันทึกเพิ่มเติม (ถ้ามี)</Title>
        <TextArea
          rows={3}
          placeholder="เขียนสิ่งที่อยากระบาย หรือเหตุการณ์สำคัญของวันนี้..."
          value={note}
          onChange={e => setNote(e.target.value)}
        />
      </Modal>
    </div>
  );
};

export default MoodTracking;