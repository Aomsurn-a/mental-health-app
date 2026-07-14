import React, { useEffect, useState } from 'react';
import { Card, Button, Radio, Typography, Steps, Result, Tag, Spin, Row, Col } from 'antd';
import { assessmentService } from '../services/assessmentService';
import type { AssessmentSet, AssessmentSetDetail, AssessmentResult } from '../services/assessmentService';

const { Title, Text, Paragraph } = Typography;

// สีตาม risk level
const riskConfig = {
  low: { color: 'green', text: 'ปกติ / ต่ำ' },
  medium: { color: 'orange', text: 'ปานกลาง' },
  high: { color: 'red', text: 'สูง' },
  critical: { color: '#cf1322', text: 'รุนแรง / ต้องการความช่วยเหลือด่วน' },
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
    return (
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
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
      </div>
    );
  }

  return null;
};

export default Assessment;