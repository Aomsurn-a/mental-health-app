import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Typography, Modal, Descriptions } from 'antd';
import dayjs from 'dayjs';
import { assessmentService } from '../services/assessmentService';
import type { MyResult } from '../services/assessmentService';

const { Title, Text } = Typography;

const riskConfig: Record<string, { color: string; text: string }> = {
  low:      { color: 'green',   text: 'ปกติ' },
  medium:   { color: 'orange',  text: 'ปานกลาง' },
  high:     { color: 'red',     text: 'สูง' },
  critical: { color: '#cf1322', text: 'รุนแรง' },
};

const AssessmentHistory: React.FC = () => {
  const [results, setResults] = useState<MyResult[]>([]);
  const [selected, setSelected] = useState<MyResult | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      try {
        const data = await assessmentService.getMyResults();
        setResults(data);
      } catch {
        console.error('โหลดข้อมูลไม่สำเร็จ');
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, []);

  const columns = [
    {
      title: 'แบบประเมิน',
      dataIndex: 'set_name',
    },
    {
      title: 'คะแนน',
      dataIndex: 'score',
      render: (score: number) => <Text strong>{score}</Text>,
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
      title: 'วันที่ประเมิน',
      dataIndex: 'taken_at',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'ดูรายละเอียด',
      render: (_: any, record: MyResult) => (
        <a onClick={() => { setSelected(record); setModalOpen(true); }}>
          ดูรายละเอียด
        </a>
      ),
    },
  ];

  return (
    <div>
      <Title level={2}>ประวัติผลการประเมิน</Title>

      <Card>
        <Table
          dataSource={results}
          columns={columns}
          rowKey="id"
          loading={loading}
          locale={{ emptyText: 'ยังไม่มีประวัติการประเมิน' }}
        />
      </Card>

      <Modal
        title={`รายละเอียดผลการประเมิน — ${selected?.set_name}`}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={500}
      >
        {selected && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="แบบประเมิน">
              {selected.set_name}
            </Descriptions.Item>
            <Descriptions.Item label="คะแนนรวม">
              <Text strong>{selected.score}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="ระดับความเสี่ยง">
              <Tag color={riskConfig[selected.risk_level]?.color}>
                {riskConfig[selected.risk_level]?.text}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="คำแนะนำ">
              {selected.recommendation}
            </Descriptions.Item>
            <Descriptions.Item label="วันที่ประเมิน">
              {dayjs(selected.taken_at).format('DD/MM/YYYY HH:mm')}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default AssessmentHistory;