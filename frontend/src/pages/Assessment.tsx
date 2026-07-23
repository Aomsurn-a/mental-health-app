import React, { useEffect, useState } from 'react';
import { Card, Button, Radio, Typography, Steps, Result, Tag, Spin, Row, Col, Alert, Avatar, Empty } from 'antd';
import { UserOutlined, CalendarOutlined, MessageOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { assessmentService } from '../services/assessmentService';
import type { AssessmentSet, AssessmentSetDetail, AssessmentResult } from '../services/assessmentService';
import { appointmentService } from '../services/appointmentService';
import type { Psychologist } from '../services/appointmentService';

const { Title, Text, Paragraph } = Typography;

// สีตาม risk level
const riskConfig = {
  low: { color: 'green', text: 'ปกติ / ต่ำ' },
  medium: { color: 'orange', text: 'ปานกลาง' },
  high: { color: 'red', text: 'สูง' },
  critical: { color: '#cf1322', text: 'รุนแรง / ต้องการความช่วยเหลือด่วน' },
};

// การแนะนำนักจิตวิทยาตามระดับความเสี่ยง
const recommendationConfig: Record<string, { title: string; message: string; alertType: 'success' | 'warning' | 'error'; count: number } | null> = {
  low: null,
  medium: {
    title: 'แนะนำให้ปรึกษานักจิตวิทยา',
    message: 'ผลประเมินอยู่ในระดับปานกลาง แนะนำให้ลองปรึกษานักจิตวิทยาเพื่อดูแลสุขภาพจิตของคุณ',
    alertType: 'warning',
    count: 3,
  },
  high: {
    title: 'แนะนำให้พบนักจิตวิทยาโดยเร็ว',
    message: 'ผลประเมินอยู่ในระดับสูง แนะนำให้พบนักจิตวิทยาโดยเร็วที่สุด',
    alertType: 'error',
    count: 3,
  },
  critical: {
    title: 'แนะนำให้พบผู้เชี่ยวชาญทันที',
    message: 'ผลประเมินอยู่ในระดับรุนแรง แนะนำให้พบแพทย์หรือนักจิตวิทยาทันที หากเป็นเหตุฉุกเฉินโปรดติดต่อสายด่วนสุขภาพจิต 1323',
    alertType: 'error',
    count: 3,
  },
};

type PageState = 'list' | 'doing' | 'result';

const Assessment: React.FC = () => {
  const [pageState, setPageState] = useState<PageState>('list');
  const [sets, setSets] = useState<AssessmentSet[]>([]);
  const [currentSet, setCurrentSet] = useState<AssessmentSetDetail | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [recommended, setRecommended] = useState<Psychologist[]>([]);
  const [recLoading, setRecLoading] = useState(false);
  const navigate = useNavigate();

  // โหลดรายการชุดประเมิน
  useEffect(() => {
    const fetchSets = async () => {
      setLoading(true);
      try {
        const data = await assessmentService.getSets();
        setSets(data);
      } catch {
        console.error('โหลดข้อมูลไม่สำเร็จ');
      } finally {
        setLoading(false);
      }
    };
    fetchSets();
  }, []);

  // เริ่มทำแบบประเมิน
  const handleStart = async (setId: number) => {
    setLoading(true);
    try {
      const data = await assessmentService.getSetById(setId);
      setCurrentSet(data);
      setCurrentQuestion(0);
      setAnswers({});
      setPageState('doing');
    } catch {
      console.error('โหลดคำถามไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  // เลือกคำตอบ
  const handleAnswer = (questionId: number, value: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  // ส่งคำตอบ
  const handleSubmit = async () => {
    if (!currentSet) return;
    setLoading(true);
    try {
      const data = await assessmentService.submit(currentSet.id, answers);
      setResult(data);
      setPageState('result');
    } catch {
      console.error('ส่งคำตอบไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  // โหลดรายชื่อนักจิตวิทยาที่แนะนำ ตามระดับความเสี่ยง
  useEffect(() => {
    if (pageState !== 'result' || !result || result.risk_level === 'low') {
      setRecommended([]);
      return;
    }
    const rec = recommendationConfig[result.risk_level];
    if (!rec) return;

    const fetchRecommended = async () => {
      setRecLoading(true);
      try {
        const data = await appointmentService.getPsychologists();
        setRecommended(data.slice(0, rec.count));
      } catch {
        console.error('โหลดรายชื่อนักจิตวิทยาไม่สำเร็จ');
      } finally {
        setRecLoading(false);
      }
    };
    fetchRecommended();
  }, [pageState, result]);

  // กลับไปหน้าหลัก
  const handleReset = () => {
    setPageState('list');
    setCurrentSet(null);
    setAnswers({});
    setResult(null);
    setCurrentQuestion(0);
  };

  // หน้ารายการชุดประเมิน
  if (pageState === 'list') {
    return (
      <div>
        <Title level={2}>แบบประเมินสุขภาพจิต</Title>
        <Paragraph type="secondary">เลือกแบบประเมินที่ต้องการด้านล่าง</Paragraph>
        {loading ? <Spin /> : (
          <Row gutter={[16, 16]}>
            {sets.map(set => (
              <Col xs={24} sm={12} lg={8} key={set.id}>
                <Card
                  title={set.name}
                  hoverable
                  actions={[
                    <Button type="primary" onClick={() => handleStart(set.id)}>
                      เริ่มประเมิน
                    </Button>
                  ]}
                >
                  <Text type="secondary">{set.description}</Text>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </div>
    );
  }

  // หน้าทำแบบประเมิน
  if (pageState === 'doing' && currentSet) {
    const question = currentSet.questions[currentQuestion];
    const totalQuestions = currentSet.questions.length;
    const isAnswered = answers[question.id] !== undefined;
    const isLast = currentQuestion === totalQuestions - 1;
    const allAnswered = currentSet.questions.every(q => answers[q.id] !== undefined);

    return (
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <Title level={3}>{currentSet.name}</Title>

        <Steps
          current={currentQuestion}
          items={currentSet.questions.map((_, i) => ({
            title: `ข้อ ${i + 1}`,
            status: answers[currentSet.questions[i].id] !== undefined ? 'finish' : i === currentQuestion ? 'process' : 'wait'
          }))}
          style={{ marginBottom: 32 }}
          size="small"
        />

        <Card>
          <Title level={4}>
            ข้อ {currentQuestion + 1}/{totalQuestions}: {question.question}
          </Title>

          <Radio.Group
            onChange={e => handleAnswer(question.id, e.target.value)}
            value={answers[question.id]}
            style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}
          >
            {question.answer_options.map(option => (
              <Radio key={option.value} value={option.value}>
                {option.label}
              </Radio>
            ))}
          </Radio.Group>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
            <Button
              onClick={() => setCurrentQuestion(prev => prev - 1)}
              disabled={currentQuestion === 0}
            >
              ย้อนกลับ
            </Button>

            {!isLast ? (
              <Button
                type="primary"
                onClick={() => setCurrentQuestion(prev => prev + 1)}
                disabled={!isAnswered}
              >
                ถัดไป
              </Button>
            ) : (
              <Button
                type="primary"
                onClick={handleSubmit}
                disabled={!allAnswered}
                loading={loading}
              >
                ส่งคำตอบ
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  // หน้าแสดงผล
  if (pageState === 'result' && result) {
    const config = riskConfig[result.risk_level];
    const rec = recommendationConfig[result.risk_level];

    return (
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <Result
          status={result.risk_level === 'low' ? 'success' : result.risk_level === 'medium' ? 'warning' : 'error'}
          title={
            <div>
              <div>คะแนนรวม: {result.score} คะแนน</div>
              <Tag color={config.color} style={{ marginTop: 8, fontSize: 16, padding: '4px 12px' }}>
                ระดับความเสี่ยง: {config.text}
              </Tag>
            </div>
          }
          subTitle={
            <Paragraph style={{ marginTop: 16, fontSize: 16 }}>
              {result.recommendation}
            </Paragraph>
          }
          extra={[
            <Button type="primary" key="again" onClick={() => handleStart(result.set_id)}>
              ทำใหม่อีกครั้ง
            </Button>,
            <Button key="back" onClick={handleReset}>
              กลับหน้าหลัก
            </Button>
          ]}
        />

        {/* ระดับปกติ - ไม่จำเป็นต้องพบนักจิต */}
        {result.risk_level === 'low' && (
          <Card style={{ marginTop: 8 }}>
            <Text>
              ผลประเมินของคุณอยู่ในเกณฑ์ปกติ ดูแลสุขภาพจิตของตัวเองต่อไปนะครับ ไม่จำเป็นต้องพบนักจิตวิทยาในขณะนี้ 😊
            </Text>
          </Card>
        )}

        {/* ระดับ medium / high / critical - แนะนำนักจิตวิทยา */}
        {rec && (
          <Card title={rec.title} style={{ marginTop: 8 }}>
            <Alert
              type={rec.alertType}
              showIcon
              message={rec.message}
              style={{ marginBottom: 16 }}
            />

            {recLoading ? (
              <Spin />
            ) : recommended.length === 0 ? (
              <Empty description="ไม่พบนักจิตวิทยาที่แนะนำ" />
            ) : (
              <Row gutter={[16, 16]}>
                {recommended.map(psy => (
                  <Col xs={24} sm={12} key={psy.id}>
                    <Card size="small">
                      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <Avatar size={40} icon={<UserOutlined />} style={{ background: '#1677ff', flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <Text strong>{psy.first_name} {psy.last_name}</Text>
                          <br />
                          <Tag color="blue" style={{ marginTop: 4 }}>{psy.specialty || 'ไม่ระบุความเชี่ยวชาญ'}</Tag>
                          <div>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {psy.hospital_name || 'ไม่ระบุโรงพยาบาล/คลินิก'}
                            </Text>
                          </div>
                          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                            <Button
                              size="small"
                              type="primary"
                              icon={<CalendarOutlined />}
                              onClick={() => navigate(`/appointment?psy_id=${psy.id}`)}
                            >
                              นัดหมาย
                            </Button>
                            <Button
                              size="small"
                              icon={<MessageOutlined />}
                              onClick={() => navigate(`/chat?partner_id=${psy.id}`)}
                            >
                              แชท
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
          </Card>
        )}
      </div>
    );
  }

  return null;
};

export default Assessment;