import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, Skeleton, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { preSessionService } from '../../services/preSessionService';
import type { RiskBullet, SessionSummary } from '../../services/preSessionService';
import './PatientProfile.css';

// ส่วนเตรียมข้อมูลในโปรไฟล์เดิม รับ themePsychologist จาก ConfigProvider ของแอป
export default function PatientProfile({ patientId, revision = 0 }: { patientId: number; revision?: number }) {
  const [bullets, setBullets] = useState<RiskBullet[]>([]);
  const [riskError, setRiskError] = useState(false);
  const [riskLoading, setRiskLoading] = useState(true);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [riskRetry, setRiskRetry] = useState(0);
  const summaryRequest = useRef<AbortController | null>(null);
  const mounted = useRef(false);

  const loadSummary = async (force: boolean) => {
    summaryRequest.current?.abort();
    const request = new AbortController();
    summaryRequest.current = request;
    setLoading(true); setError(false); setSummary(null);
    try {
      const data = await preSessionService.getSummary(patientId, force, request.signal);
      if (!request.signal.aborted && mounted.current) setSummary(data);
    } catch {
      if (!request.signal.aborted && mounted.current) setError(true);
    } finally {
      if (!request.signal.aborted && mounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    mounted.current = true;
    void loadSummary(false);
    return () => { mounted.current = false; summaryRequest.current?.abort(); };
    // patientId/revision คือขอบเขตข้อมูล; ไม่โหลดซ้ำเพราะ render ของ parent
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, revision]);

  useEffect(() => {
    const request = new AbortController();
    setBullets([]); setRiskError(false); setRiskLoading(true);
    preSessionService.getBullets(patientId, request.signal)
      .then(data => { if (!request.signal.aborted) setBullets(data.bullets); })
      .catch(() => { if (!request.signal.aborted) setRiskError(true); })
      .finally(() => { if (!request.signal.aborted) setRiskLoading(false); });
    return () => request.abort();
  }, [patientId, revision, riskRetry]);

  return <div className="pre-session">
    {riskLoading && <div role="status"><Typography.Text type="secondary">กำลังโหลดจุดที่ควรติดตาม…</Typography.Text></div>}
    {riskError && <Alert type="warning" showIcon title="โหลดจุดที่ควรติดตามไม่สำเร็จ"
      action={<Button onClick={() => setRiskRetry(n => n + 1)}>ลองอีกครั้ง</Button>} />}
    {bullets.length > 0 && <section aria-label="จุดเสี่ยงที่ควรติดตาม">
      <Typography.Title level={5}>จุดที่ควรติดตามก่อนเซสชัน</Typography.Title>
      <ul className="pre-session-risks">{bullets.map(bullet => <li key={bullet.id}>
        <Alert showIcon type={bullet.severity === 'medium' ? 'warning' : 'error'}
          title={`${bullet.severity === 'critical' ? 'ความเสี่ยงรุนแรง' : bullet.severity === 'high' ? 'ความเสี่ยงสูง' : 'ควรติดตาม'}: ${bullet.text}`} />
      </li>)}</ul>
    </section>}
    <Card className="pre-session-summary" title="สรุปก่อนเข้าเซสชัน"
      extra={<Button aria-label="สรุปใหม่" icon={<ReloadOutlined />} loading={loading} disabled={loading} onClick={() => void loadSummary(true)}>สรุปใหม่</Button>}>
      <div aria-live="polite" aria-busy={loading}>
        {loading ? <><Typography.Text type="secondary">กำลังเตรียมสรุปก่อนเซสชัน…</Typography.Text><Skeleton active paragraph={{ rows: 2 }} title={false} /></>
          : error ? <Alert type="warning" showIcon title="ไม่สามารถสรุปได้ในขณะนี้" description="ยังเปิดดูประวัติในแท็บด้านล่างได้ หรือลองกดสรุปใหม่" />
          : summary?.empty ? <Typography.Text type="secondary">ยังไม่มีประวัติการรักษา ผลประเมิน หรือบันทึกอารมณ์สำหรับสรุป</Typography.Text>
          : <>
            <Typography.Paragraph className="pre-session-text">{summary?.summary_text}</Typography.Paragraph>
            {summary?.generated_at && <Typography.Text type="secondary" className="pre-session-time">
              สรุปเมื่อ {new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok' }).format(new Date(summary.generated_at))}
              {' · '}อ้างอิงบันทึกการรักษา {summary.based_on_records_count} ครั้ง
            </Typography.Text>}
          </>}
      </div>
    </Card>
  </div>;
}
