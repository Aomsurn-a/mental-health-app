import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Alert, Button, Empty, Form, InputNumber, Popconfirm, Select, Spin, Table, TimePicker, Typography } from 'antd';
import { CalendarOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Link, Navigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { AuthContext } from '../../context/AuthContext';
import { scheduleTemplateService } from '../../services/scheduleTemplateService';
import type { ScheduleTemplate as Template } from '../../services/scheduleTemplateService';
import type { TwoWeekGenerationResult } from '../../services/scheduleTemplateService';
import './schedule-template.css';

const DAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
interface FormValues { day: number; start: Dayjs; end: Dayjs; capacity: number }
const errorMessage = (error: unknown) => isAxiosError(error) && typeof error.response?.data?.message === 'string'
  ? error.response.data.message : 'เชื่อมต่อไม่สำเร็จ กรุณาลองอีกครั้ง';
function currentWeekStart() {
  const today = dayjs(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()));
  return today.subtract((today.day() + 6) % 7, 'day');
}

function generationNotice(result: TwoWeekGenerationResult): { type: 'success' | 'info'; text: string } {
  const existing = result.results.filter(week => week.reason === 'week_exists').length;
  if (result.created) return { type: 'success', text: `สร้างตารางแล้ว ${result.created} สัปดาห์${existing ? ` · อีก ${existing} สัปดาห์มีตารางอยู่แล้วจึงไม่สร้างทับ` : ''} เปิดดูและแก้ไขได้ที่หน้าตารางงาน` };
  if (existing === 2) return { type: 'info', text: 'ทั้ง 2 สัปดาห์มีตารางอยู่แล้ว ระบบไม่สร้างซ้ำและไม่แก้ข้อมูลเดิม' };
  return { type: 'info', text: 'ยังไม่มีตารางงานประจำ จึงไม่สร้างตารางใหม่ และคงตารางที่มีอยู่ไว้ตามเดิม' };
}

// หน้าเจ้าของตารางเท่านั้น ใช้ themePsychologist จาก ConfigProvider เดิม
export default function ScheduleTemplatePage() {
  const auth = useContext(AuthContext);
  if (auth?.user?.role !== 'psychologist') return <Navigate to="/dashboard" replace />;
  return <TemplateEditor />;
}

function TemplateEditor() {
  const [items, setItems] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<{ type: 'success' | 'info'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [form] = Form.useForm<FormValues>();
  const formRef = useRef<HTMLDivElement>(null);
  const busy = saving || generating || deleting !== null;
  const week = currentWeekStart();
  const load = useCallback(async () => {
    setLoading(true); setLoadError('');
    try { setItems(await scheduleTemplateService.list()); }
    catch (e) { setLoadError(errorMessage(e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  function reset() { setEditing(null); form.resetFields(); setError(''); }
  function edit(item: Template) {
    setEditing(item.id); setError(''); setNotice(null);
    form.setFieldsValue({ day: item.day_of_week, start: dayjs(`2000-01-01T${item.start_time}`), end: dayjs(`2000-01-01T${item.end_time}`), capacity: item.max_patients_per_slot });
    formRef.current?.scrollIntoView({ block: 'nearest' });
    form.getFieldInstance('day')?.focus();
  }
  // หลังบันทึก เติมสองสัปดาห์ที่ยังไม่มี แยกข้อผิดพลาดการสร้างจากการบันทึกที่สำเร็จแล้ว
  async function save(values: FormValues) {
    setSaving(true); setError(''); setNotice(null);
    const value = { day_of_week: values.day, start_time: values.start.format('HH:mm:ss'), end_time: values.end.format('HH:mm:ss'), max_patients_per_slot: values.capacity };
    try {
      if (editing === null) await scheduleTemplateService.create(value);
      else await scheduleTemplateService.update(editing, value);
      reset();
      setNotice({ type: 'success', text: 'บันทึกตารางงานประจำแล้ว กำลังตรวจตาราง 2 สัปดาห์' });
      try {
        const result = await scheduleTemplateService.generate(week.format('YYYY-MM-DD'));
        const outcome = generationNotice(result);
        setNotice({ ...outcome, text: `บันทึกตารางงานประจำแล้ว · ${outcome.text}` });
      } catch (e) {
        setNotice({ type: 'success', text: 'บันทึกตารางงานประจำแล้ว' });
        setError(`แต่สร้างตาราง 2 สัปดาห์ไม่ครบ: ${errorMessage(e)} กดปุ่มแก้ไขตาราง 2 สัปดาห์ด้านล่างเพื่อลองอีกครั้งได้ โดยไม่ต้องบันทึกซ้ำ`);
      }
      await load();
    } catch (e) { setError(errorMessage(e)); }
    finally { setSaving(false); }
  }
  async function remove(id: number) {
    setDeleting(id); setError(''); setNotice(null);
    try {
      await scheduleTemplateService.remove(id); if (editing === id) reset();
      setNotice({ type: 'success', text: 'ลบตารางงานประจำแล้ว ไม่กระทบตารางที่สร้างไว้' }); await load();
    } catch (e) { setError(errorMessage(e)); }
    finally { setDeleting(null); }
  }
  async function generate() {
    setGenerating(true); setError(''); setNotice(null);
    try {
      const result = await scheduleTemplateService.generate(week.format('YYYY-MM-DD'));
      setNotice(generationNotice(result));
    } catch (e) { setError(errorMessage(e)); }
    finally { setGenerating(false); }
  }
  const actions = (item: Template) => <div className="schedule-template-actions">
    <Button icon={<EditOutlined aria-hidden="true" />} disabled={busy} aria-label={`แก้ไขวัน${DAYS[item.day_of_week]} ${item.start_time.slice(0, 5)}`} onClick={() => edit(item)}>แก้ไข</Button>
    <Popconfirm title="ลบช่วงเวลาประจำนี้?" description="ตารางสัปดาห์ที่สร้างไว้จะไม่ถูกลบ" okText="ลบตารางงานประจำ" cancelText="ยกเลิก" onConfirm={() => remove(item.id)}>
      <Button danger icon={<DeleteOutlined aria-hidden="true" />} loading={deleting === item.id} disabled={busy} aria-label={`ลบวัน${DAYS[item.day_of_week]} ${item.start_time.slice(0, 5)}`}>ลบ</Button>
    </Popconfirm>
  </div>;
  return <div className="psy-page schedule-template-page">
    <header className="psy-page-header">
      <Typography.Title level={2}>ตารางงานประจำ</Typography.Title>
      <Link to="/psy-schedule">ดูตารางรายสัปดาห์</Link>
    </header>
    <Typography.Paragraph type="secondary">หลังบันทึก ระบบจะเติมตารางสัปดาห์นี้และสัปดาห์ถัดไปให้อัตโนมัติ และสร้างล่วงหน้า 2 สัปดาห์ทุกวันอาทิตย์ เวลา 00:00 น. ตามเวลาประเทศไทย</Typography.Paragraph>
    <Alert showIcon type="warning" title="ตารางงานประจำใช้สร้างเฉพาะสัปดาห์ที่ยังไม่มีตารางหรือถูกลบแล้ว ไม่เขียนทับสัปดาห์ที่ยังมีตารางอยู่ หากไม่มีตารางงานประจำ ระบบจะไม่สร้างตาราง" />
    <div className="schedule-template-feedback" aria-live="polite">
      {notice && <Alert showIcon type={notice.type} title={notice.text} />}
      {error && <Alert showIcon type="error" title={error} />}
    </div>
    <section aria-labelledby="template-list-title" className="schedule-template-section">
      <Typography.Title level={3} id="template-list-title">ช่วงเวลาประจำ</Typography.Title>
      {loading ? <div className="psy-loading" role="status"><Spin /><span>กำลังโหลดตารางงานประจำ</span></div>
        : loadError ? <Alert type="error" showIcon title={loadError} action={<Button onClick={load}>ลองอีกครั้ง</Button>} />
        : !items.length ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="ยังไม่มีช่วงเวลาประจำ เริ่มเพิ่มวันและเวลาด้านล่าง" />
        : <>
          <Table<Template> className="psy-table schedule-template-table" rowKey="id" dataSource={items} pagination={false} columns={[
            { title: 'วัน', dataIndex: 'day_of_week', render: (day: number) => `วัน${DAYS[day]}` },
            { title: 'เวลา', render: (_, item) => `${item.start_time.slice(0, 5)}–${item.end_time.slice(0, 5)} น.` },
            { title: 'จำนวนรับ / ชั่วโมง', dataIndex: 'max_patients_per_slot' },
            { title: 'จัดการ', render: (_, item) => actions(item) },
          ]} />
          <ul className="schedule-template-mobile">{items.map(item => <li key={item.id}>
            <strong>วัน{DAYS[item.day_of_week]}</strong>
            <span>{item.start_time.slice(0, 5)}–{item.end_time.slice(0, 5)} น. · รับ {item.max_patients_per_slot} คน / ชั่วโมง</span>
            {actions(item)}
          </li>)}</ul>
        </>}
    </section>
    <section className="schedule-template-section" aria-labelledby="template-form-title" ref={formRef}>
      <Typography.Title level={3} id="template-form-title">{editing === null ? 'เพิ่มช่วงเวลา' : 'แก้ไขช่วงเวลา'}</Typography.Title>
      <Form form={form} layout="vertical" initialValues={{ day: 1, capacity: 1 }} onFinish={save} disabled={busy || loading || !!loadError}>
        <div className="schedule-template-fields">
          <Form.Item name="day" label="วันทำงาน" rules={[{ required: true, message: 'กรุณาเลือกวัน' }]}><Select options={[1, 2, 3, 4, 5, 6, 0].map(day => ({ value: day, label: `วัน${DAYS[day]}` }))} /></Form.Item>
          <Form.Item name="start" label="เวลาเริ่ม" rules={[{ required: true, message: 'กรุณาระบุเวลาเริ่ม' }]}><TimePicker format="HH:mm" placeholder="เช่น 09:00" needConfirm={false} /></Form.Item>
          <Form.Item name="end" label="เวลาสิ้นสุด" dependencies={['start']} rules={[{ required: true, message: 'กรุณาระบุเวลาสิ้นสุด' }, ({ getFieldValue }) => ({ validator(_, value: Dayjs | undefined) {
            const start = getFieldValue('start') as Dayjs | undefined;
            return !start || !value || value.format('HH:mm:ss') > start.format('HH:mm:ss') ? Promise.resolve() : Promise.reject(new Error('เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม'));
          } })]}><TimePicker format="HH:mm" placeholder="เช่น 12:00" needConfirm={false} /></Form.Item>
          <Form.Item name="capacity" label="จำนวนรับ / ชั่วโมง" rules={[{ required: true, message: 'กรุณาระบุจำนวนรับ' }, { type: 'integer', min: 1, max: 2147483647, message: 'กรุณาระบุจำนวนเต็มบวก' }]}><InputNumber min={1} max={2147483647} precision={0} /></Form.Item>
        </div>
        <div className="schedule-template-actions">
          <Button type="primary" htmlType="submit" loading={saving} icon={editing === null ? <PlusOutlined aria-hidden="true" /> : <EditOutlined aria-hidden="true" />}>{editing === null ? 'เพิ่มตารางงานประจำ' : 'บันทึกการแก้ไข'}</Button>
          {editing !== null && <Button onClick={reset}>ยกเลิกการแก้ไข</Button>}
        </div>
      </Form>
    </section>
    <section className="schedule-template-section" aria-labelledby="template-generate-title">
      <Typography.Title level={3} id="template-generate-title">ตารางงาน 2 สัปดาห์นี้</Typography.Title>
      <Typography.Paragraph type="secondary">{week.format('DD/MM/YYYY')}–{week.add(13, 'day').format('DD/MM/YYYY')} · สัปดาห์นี้และสัปดาห์ถัดไป สร้างเฉพาะสัปดาห์ที่ยังไม่มีตารางหรือถูกลบแล้ว ไม่เขียนทับตารางเดิม</Typography.Paragraph>
      <Button icon={<CalendarOutlined aria-hidden="true" />} loading={generating} disabled={busy || loading || !!loadError || !items.length} onClick={generate}>แก้ไขตาราง 2 สัปดาห์นี้จากตารางงานประจำ</Button>
    </section>
  </div>;
}
