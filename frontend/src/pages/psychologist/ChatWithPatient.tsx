import { useEffect, useRef, useState } from 'react';
import { Alert, Button, DatePicker, Modal, Select, Spin, Typography } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import { isAxiosError } from 'axios';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { chatSummaryService } from '../../services/chatSummaryService';
import type { ChatSummaryResult, ChatSummarySelection } from '../../services/chatSummaryService';
import './ChatWithPatient.css';

// ส่วนควบคุมสรุปในหน้า Chat เดิม แยกตามผู้รับบริการเพื่อไม่แสดงผลของคนก่อน
export default function ChatWithPatient({ patientId }: { patientId: number }) {
  const [open, setOpen] = useState(false);
  const [option, setOption] = useState('20');
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ChatSummaryResult | null>(null);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), [patientId]);
  const clear = () => { setError(''); setResult(null); };
  const close = () => { request.current?.abort(); request.current = null; setOpen(false); setLoading(false); clear(); };

  // เรียกสรุปเมื่อกดยืนยันเท่านั้น ไม่ cache และยกเลิกการแสดงผลถ้าปิด modal
  const summarize = async () => {
    if (loading) return;
    let selection: ChatSummarySelection;
    if (option === 'custom') {
      if (!range?.[0] || !range[1]) { setError('กรุณาเลือกวันเริ่มต้นและวันสิ้นสุด'); return; }
      selection = { startDate: range[0].format('YYYY-MM-DD'), endDate: range[1].format('YYYY-MM-DD') };
    } else if (option === 'month') {
      const today = dayjs(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()));
      selection = { startDate: today.startOf('month').format('YYYY-MM-DD'), endDate: today.endOf('month').format('YYYY-MM-DD') };
    } else selection = { lastNMessages: Number(option) };
    const controller = new AbortController(); request.current = controller;
    clear(); setLoading(true);
    try {
      const data = await chatSummaryService.summarize(patientId, selection, controller.signal);
      if (!controller.signal.aborted) setResult(data);
    } catch (e) {
      if (!controller.signal.aborted) setError(isAxiosError(e) && typeof e.response?.data?.message === 'string'
        ? e.response.data.message : 'ไม่สามารถสรุปแชทได้ในขณะนี้ กรุณาลองอีกครั้ง');
    } finally { if (!controller.signal.aborted) setLoading(false); }
  };
  const formatTime = (value: string) => new Intl.DateTimeFormat('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  return <>
    <Button aria-label="สรุปแชทให้หน่อย" icon={<FileTextOutlined />} onClick={() => { clear(); setOpen(true); }}>สรุปแชทให้หน่อย</Button>
    <Modal className="psy-dialog chat-summary-dialog" title="สรุปประเด็นสำคัญจากแชท" open={open} onCancel={close} width={640}
      footer={<><Button onClick={close}>ปิด</Button><Button type="primary" onClick={() => void summarize()} disabled={loading} loading={loading} aria-label="สรุปข้อความ">สรุปข้อความ</Button></>}>
      <div className="chat-summary-form">
        <label htmlFor="chat-summary-selection">เลือกข้อความที่ต้องการสรุป</label>
        <Select id="chat-summary-selection" value={option} disabled={loading} onChange={value => { setOption(value); clear(); }}
          options={[{ value: '5', label: '5 ข้อความล่าสุด' }, { value: '20', label: '20 ข้อความล่าสุด' }, { value: 'month', label: 'ทั้งหมดในเดือนนี้' }, { value: 'custom', label: 'เลือกช่วงวันที่เอง' }]} />
        {option === 'custom' && <DatePicker.RangePicker value={range} disabled={loading} format="DD/MM/YYYY" placeholder={['วันเริ่มต้น', 'วันสิ้นสุด']}
          classNames={{ popup: { root: 'chat-summary-calendar' } }} onChange={value => { setRange(value); clear(); }} />}
        <Typography.Text type="secondary">สูงสุด 200 ข้อความ · ช่วงวันที่ตามเวลาไทย</Typography.Text>
        {loading && <div className="chat-summary-loading" role="status"><Spin size="small" />กำลังสรุปประเด็นสำคัญ…</div>}
        {error && <Alert type="error" showIcon title={error} role="alert" />}
        {result && <section aria-label="ผลสรุปแชท" aria-live="polite">
          <Typography.Title level={5}>ประเด็นสำคัญ</Typography.Title>
          <ul className="chat-summary-bullets">{result.summary.map((text, i) => <li key={i}>{text}</li>)}</ul>
          <Typography.Text type="secondary">จาก {result.messageCount} ข้อความ<br />{formatTime(result.dateRange.from)} – {formatTime(result.dateRange.to)}</Typography.Text>
        </section>}
      </div>
    </Modal>
  </>;
}
