import React, { useEffect, useMemo, useState } from 'react';
import {
  Card, Typography, Button, Modal, DatePicker, TimePicker, InputNumber,
  Checkbox, message, Popconfirm, Space, Row, Col, Empty, Tag, Divider, Alert, Spin,
} from 'antd';
import { PlusOutlined, DeleteOutlined, ArrowLeftOutlined, EditOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import thLocaleData from 'dayjs/locale/th';
import weekPickerLocale from 'antd/es/date-picker/locale/th_TH';
import { scheduleService } from '../services/scheduleService';
import type { ScheduleWeek, ScheduleSlot, DayInput } from '../services/scheduleService';

dayjs.extend(isoWeek);
// dayjs.locale(name, obj) แทนที่ locale เดิมทั้งก้อนด้วย obj (ไม่ใช่ merge) — ถ้าส่งแค่ { weekStart: 1 }
// จะทำให้ weekdaysMin/months ฯลฯ ของ locale 'th' หายไปหมดจนพังตอน DatePicker เรียกใช้
// ต้อง spread ค่า locale เดิมออกมาก่อนแล้วค่อย override เฉพาะ weekStart ให้ตรงกับ isoWeek (จันทร์)
dayjs.locale('th', { ...thLocaleData, weekStart: 1 });

const { Title, Text } = Typography;

const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const THAI_DAY_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
const THAI_DAY_FULL = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

const buddhistYear = (d: Dayjs) => d.year() + 543;
const thaiDateShort = (d: Dayjs) => `${THAI_DAY_SHORT[d.day()]} ${d.date()}`;
const thaiDateFull = (d: Dayjs) => `${THAI_DAY_FULL[d.day()]}ที่ ${d.date()} ${THAI_MONTHS[d.month()]}`;

const weekTitle = (start: string, end: string) => {
  const s = dayjs(start);
  const e = dayjs(end);
  if (s.month() === e.month()) {
    return `${s.date()}-${e.date()} ${THAI_MONTHS[s.month()]} ${buddhistYear(s)}`;
  }
  return `${s.date()} ${THAI_MONTHS[s.month()]} - ${e.date()} ${THAI_MONTHS[e.month()]} ${buddhistYear(e)}`;
};

interface SlotForm {
  start: Dayjs | null;
  end: Dayjs | null;
  max: number;
}

interface DayForm {
  date: string; // YYYY-MM-DD
  day_of_week: number;
  checked: boolean;
  slots: SlotForm[];
}

const buildWeekDays = (weekStart: Dayjs): DayForm[] => {
  const days: DayForm[] = [];
  for (let i = 0; i < 7; i++) {
    const d = weekStart.add(i, 'day');
    days.push({ date: d.format('YYYY-MM-DD'), day_of_week: d.day(), checked: false, slots: [] });
  }
  return days;
};

interface RowCell {
  colspan: number;
  type: 'work' | 'break' | 'empty';
  label: string;
}

const buildDetailRows = (schedules: ScheduleSlot[]) => {
  if (schedules.length === 0) return { bands: [] as { start: string; end: string }[], rows: [] as { date: string; cells: RowCell[] }[] };

  const timeSet = new Set<string>();
  schedules.forEach(s => { timeSet.add(s.start_time); timeSet.add(s.end_time); });
  const sortedTimes = Array.from(timeSet).sort();
  const bands = sortedTimes.slice(0, -1).map((t, i) => ({ start: t, end: sortedTimes[i + 1] }));

  const dates = Array.from(new Set(schedules.map(s => s.work_date))).sort();

  const rows = dates.map(date => {
    const daySchedules = schedules.filter(s => s.work_date === date);
    const rowMin = daySchedules.reduce((m, s) => (s.start_time < m ? s.start_time : m), daySchedules[0].start_time);
    const rowMax = daySchedules.reduce((m, s) => (s.end_time > m ? s.end_time : m), daySchedules[0].end_time);

    const rawCells = bands.map(band => {
      const match = daySchedules.find(s => s.start_time <= band.start && s.end_time >= band.end);
      if (match) return { type: 'work' as const, label: `${match.max_patients_per_slot} คน/ชม.` };
      if (band.start >= rowMin && band.end <= rowMax) return { type: 'break' as const, label: 'พัก' };
      return { type: 'empty' as const, label: '' };
    });

    // รวมช่องที่ติดกันและมีค่าเดียวกันเป็น colspan
    const cells: RowCell[] = [];
    rawCells.forEach(c => {
      const last = cells[cells.length - 1];
      if (last && last.type === c.type && last.label === c.label) {
        last.colspan += 1;
      } else {
        cells.push({ ...c, colspan: 1 });
      }
    });

    return { date, cells };
  });

  return { bands, rows };
};

const PsySchedule: React.FC = () => {
  const [weeks, setWeeks] = useState<ScheduleWeek[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  const [viewingWeekId, setViewingWeekId] = useState<number | null>(null);
  const [viewingSchedules, setViewingSchedules] = useState<ScheduleSlot[]>([]);
  const [viewingWeek, setViewingWeek] = useState<ScheduleWeek | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingWeekId, setEditingWeekId] = useState<number | null>(null);
  const [selectedWeekStart, setSelectedWeekStart] = useState<Dayjs | null>(null);
  const [dayForms, setDayForms] = useState<DayForm[]>([]);

  const fetchWeeks = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await scheduleService.getWeeks();
      setWeeks(data);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeeks();
  }, []);

  const openDetail = async (weekId: number) => {
    setDetailLoading(true);
    setViewingWeekId(weekId);
    try {
      const detail = await scheduleService.getWeekDetail(weekId);
      setViewingWeek({ id: detail.id, week_start: detail.week_start, week_end: detail.week_end, work_dates: [] });
      setViewingSchedules(detail.schedules);
    } catch {
      message.error('โหลดรายละเอียดไม่สำเร็จ');
      setViewingWeekId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const backToList = () => {
    setViewingWeekId(null);
    setViewingWeek(null);
    setViewingSchedules([]);
  };

  const handleDeleteWeek = async (weekId: number) => {
    try {
      await scheduleService.deleteWeek(weekId);
      message.success('ลบตารางสัปดาห์สำเร็จ');
      if (viewingWeekId === weekId) backToList();
      fetchWeeks();
    } catch {
      message.error('ลบไม่สำเร็จ');
    }
  };

  const resetModal = () => {
    setEditingWeekId(null);
    setSelectedWeekStart(null);
    setDayForms([]);
  };

  const handleAddWeekClick = () => {
    resetModal();
    setModalOpen(true);
  };

  const handleEditWeekClick = async (weekId: number) => {
    resetModal();
    setEditLoading(true);
    setModalOpen(true);
    setEditingWeekId(weekId);
    try {
      const detail = await scheduleService.getWeekDetail(weekId);
      const start = dayjs(detail.week_start);
      setSelectedWeekStart(start);
      const days = buildWeekDays(start);
      detail.schedules.forEach(s => {
        const day = days.find(d => d.date === s.work_date);
        if (day) {
          day.checked = true;
          day.slots.push({
            start: dayjs(`${s.work_date}T${s.start_time}`),
            end: dayjs(`${s.work_date}T${s.end_time}`),
            max: s.max_patients_per_slot,
          });
        }
      });
      setDayForms(days);
    } catch {
      message.error('โหลดข้อมูลไม่สำเร็จ');
      setModalOpen(false);
    } finally {
      setEditLoading(false);
    }
  };

  const existingWeekStarts = useMemo(
    () => new Set(weeks.map(w => dayjs(w.week_start).format('YYYY-MM-DD'))),
    [weeks]
  );

  const isDateDisabled = (date: Dayjs) => {
    const weekStartStr = date.startOf('isoWeek').format('YYYY-MM-DD');
    return existingWeekStarts.has(weekStartStr);
  };

  const handleWeekPick = (value: Dayjs | null) => {
    if (!value) {
      setSelectedWeekStart(null);
      setDayForms([]);
      return;
    }
    const start = value.startOf('isoWeek');
    setSelectedWeekStart(start);
    setDayForms(buildWeekDays(start));
  };

  const toggleDayChecked = (date: string) => {
    setDayForms(prev => prev.map(d => {
      if (d.date !== date) return d;
      if (!d.checked) {
        return { ...d, checked: true, slots: d.slots.length ? d.slots : [{ start: dayjs(`${d.date}T08:00:00`), end: dayjs(`${d.date}T12:00:00`), max: 1 }] };
      }
      return { ...d, checked: false };
    }));
  };

  const addSlot = (date: string) => {
    setDayForms(prev => prev.map(d => d.date === date
      ? { ...d, slots: [...d.slots, { start: null, end: null, max: 1 }] }
      : d));
  };

  const removeSlot = (date: string, index: number) => {
    setDayForms(prev => prev.map(d => d.date === date
      ? { ...d, slots: d.slots.filter((_, i) => i !== index) }
      : d));
  };

  const updateSlot = (date: string, index: number, patch: Partial<SlotForm>) => {
    setDayForms(prev => prev.map(d => d.date === date
      ? { ...d, slots: d.slots.map((s, i) => i === index ? { ...s, ...patch } : s) }
      : d));
  };

  const handleSubmit = async () => {
    if (!selectedWeekStart) {
      message.error('กรุณาเลือกสัปดาห์');
      return;
    }
    const checkedDays = dayForms.filter(d => d.checked);
    if (checkedDays.length === 0) {
      message.error('กรุณาเลือกวันทำงานอย่างน้อย 1 วัน');
      return;
    }
    for (const d of checkedDays) {
      if (d.slots.length === 0) {
        message.error(`กรุณาเพิ่มช่วงเวลาสำหรับวัน${THAI_DAY_FULL[d.day_of_week]}`);
        return;
      }
      for (const s of d.slots) {
        if (!s.start || !s.end) {
          message.error(`กรุณาระบุเวลาให้ครบสำหรับวัน${THAI_DAY_FULL[d.day_of_week]}`);
          return;
        }
        if (!s.end.isAfter(s.start)) {
          message.error(`เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มสำหรับวัน${THAI_DAY_FULL[d.day_of_week]}`);
          return;
        }
      }
    }

    const days: DayInput[] = checkedDays.map(d => ({
      day_of_week: d.day_of_week,
      work_date: d.date,
      slots: d.slots.map(s => ({
        start_time: s.start!.format('HH:mm:ss'),
        end_time: s.end!.format('HH:mm:ss'),
        max_patients_per_slot: s.max,
      })),
    }));

    const payload = {
      week_start: selectedWeekStart.format('YYYY-MM-DD'),
      week_end: selectedWeekStart.add(6, 'day').format('YYYY-MM-DD'),
      days,
    };

    setSaving(true);
    try {
      if (editingWeekId) {
        await scheduleService.updateWeek(editingWeekId, payload);
        message.success('แก้ไขตารางสัปดาห์สำเร็จ');
        if (viewingWeekId === editingWeekId) openDetail(editingWeekId);
      } else {
        await scheduleService.createWeek(payload);
        message.success('สร้างตารางสัปดาห์สำเร็จ');
      }
      setModalOpen(false);
      resetModal();
      fetchWeeks();
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const detail = useMemo(() => buildDetailRows(viewingSchedules), [viewingSchedules]);

  if (viewingWeekId) {
    return (
      <div className="psy-page">
        <Row className="psy-page-header" justify="space-between" align="middle">
          <Col>
            <Space align="center">
              <Button icon={<ArrowLeftOutlined />} onClick={backToList}>กลับ</Button>
              <Title level={3} style={{ margin: 0 }}>
                {viewingWeek ? weekTitle(viewingWeek.week_start, viewingWeek.week_end) : ''}
              </Title>
            </Space>
          </Col>
          <Col>
            <Button type="primary" disabled={detailLoading} icon={<EditOutlined />} onClick={() => handleEditWeekClick(viewingWeekId)}>
              แก้ไขตาราง
            </Button>
          </Col>
        </Row>

        <Card loading={detailLoading}>
          {detail.rows.length === 0 ? (
            <Empty description="ยังไม่มีตารางงานในสัปดาห์นี้" />
          ) : (
            <div className="psy-schedule-scroll" role="region" aria-label="ตารางงานรายสัปดาห์ เลื่อนแนวนอนเพื่อดูทุกช่วงเวลา" tabIndex={0}>
              <table className="psy-schedule-table" aria-label="วันและช่วงเวลารับผู้ป่วย">
                <thead>
                  <tr>
                    <th scope="col">วันที่</th>
                    {detail.bands.map((b, i) => (
                      <th scope="col" key={i}>
                        {b.start.slice(0, 5)}-{b.end.slice(0, 5)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {detail.rows.map(row => (
                    <tr key={row.date}>
                      <th scope="row">
                        {thaiDateShort(dayjs(row.date))}
                      </th>
                      {row.cells.map((cell, i) => (
                        <td
                          key={i}
                          colSpan={cell.colspan}
                          className={`is-${cell.type}`}
                        >
                          {cell.type === 'work' && cell.label}
                          {cell.type === 'break' && <Text type="secondary">{cell.label}</Text>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {renderModal()}
      </div>
    );
  }

  function renderModal() {
    return (
      <Modal
        className="psy-dialog"
        title={editingWeekId ? 'แก้ไขตารางสัปดาห์' : 'เพิ่มตารางสัปดาห์'}
        open={modalOpen}
        onCancel={() => { if (!editLoading) { setModalOpen(false); resetModal(); } }}
        onOk={handleSubmit}
        okText="บันทึก"
        cancelText="ยกเลิก"
        confirmLoading={saving}
        okButtonProps={{ disabled: editLoading }}
        width={700}
      >
        {editLoading ? <div className="psy-loading" role="status"><Spin size="small" />กำลังโหลดตารางงาน…</div> : <>
        <label htmlFor="psy-week"><Text strong>ขั้นตอนที่ 1: เลือกสัปดาห์</Text></label>
        <div style={{ marginTop: 8, marginBottom: 16 }}>
          <DatePicker
            id="psy-week"
            picker="week"
            showWeek={false}
            locale={weekPickerLocale}
            style={{ width: '100%' }}
            value={selectedWeekStart}
            onChange={handleWeekPick}
            disabled={!!editingWeekId}
            disabledDate={isDateDisabled}
          />
          {selectedWeekStart && (
            <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
              สัปดาห์: {weekTitle(selectedWeekStart.format('YYYY-MM-DD'), selectedWeekStart.add(6, 'day').format('YYYY-MM-DD'))}
            </Text>
          )}
          <Text type="secondary" style={{ display: 'block', marginTop: 4, fontSize: 13 }}>
            เลือกสัปดาห์ใดก็ได้ ยกเว้นสัปดาห์ที่มีตารางงานอยู่แล้ว
          </Text>
        </div>

        {selectedWeekStart && (
          <>
            <Text strong>ขั้นตอนที่ 2: เลือกวันทำงาน</Text>
            <div style={{ marginTop: 8, marginBottom: 16 }}>
              <Space className="psy-work-days" wrap>
                {dayForms.map(d => (
                  <Checkbox key={d.date} checked={d.checked} onChange={() => toggleDayChecked(d.date)}>
                    {thaiDateFull(dayjs(d.date))}
                  </Checkbox>
                ))}
              </Space>
            </div>

            <Text strong>ขั้นตอนที่ 3: กำหนดช่วงเวลา</Text>
            <div style={{ marginTop: 8 }}>
              {dayForms.filter(d => d.checked).length === 0 && (
                <Text type="secondary">ยังไม่ได้เลือกวันทำงาน</Text>
              )}
              {dayForms.filter(d => d.checked).map(d => (
                <div key={d.date} className="psy-schedule-day">
                  <Text strong>{thaiDateFull(dayjs(d.date))}</Text>
                  <div style={{ marginTop: 8 }}>
                    {d.slots.map((s, i) => (
                      <div key={i} className="psy-slot-row">
                        <Text className="psy-slot-label">ช่วงที่ {i + 1}</Text>
                        <div className="psy-slot-field">
                        <label htmlFor={`start-${d.date}-${i}`}>เวลาเริ่ม</label>
                        <TimePicker
                          id={`start-${d.date}-${i}`}
                          format="HH:mm"
                          minuteStep={5}
                          value={s.start}
                          onChange={val => updateSlot(d.date, i, { start: val })}
                          placeholder="เวลาเริ่ม"
                        />
                        </div>
                        <div className="psy-slot-field">
                        <label htmlFor={`end-${d.date}-${i}`}>เวลาสิ้นสุด</label>
                        <TimePicker
                          id={`end-${d.date}-${i}`}
                          format="HH:mm"
                          minuteStep={5}
                          value={s.end}
                          onChange={val => updateSlot(d.date, i, { end: val })}
                          placeholder="เวลาสิ้นสุด"
                        />
                        </div>
                        <div className="psy-slot-field">
                          <label htmlFor={`capacity-${d.date}-${i}`}>รับ (คน/ชม.)</label>
                          <InputNumber id={`capacity-${d.date}-${i}`} min={1} value={s.max} onChange={val => updateSlot(d.date, i, { max: val || 1 })} />
                        </div>
                        <Button danger type="text" aria-label={`ลบช่วงที่ ${i + 1} วัน${THAI_DAY_FULL[d.day_of_week]}`} icon={<DeleteOutlined />} onClick={() => removeSlot(d.date, i)} />
                      </div>
                    ))}
                    <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => addSlot(d.date)}>
                      เพิ่มช่วงเวลา
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        </>}
      </Modal>
    );
  }

  return (
    <div className="psy-page">
      <Row className="psy-page-header" justify="space-between" align="middle">
        <Col><Title level={2} style={{ margin: 0 }}>ตารางงาน</Title></Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddWeekClick}>
            เพิ่มตารางสัปดาห์
          </Button>
        </Col>
      </Row>

      {loading ? (
        <Card loading />
      ) : loadError ? (
        <Alert type="error" showIcon title="โหลดตารางงานไม่สำเร็จ" action={<Button onClick={fetchWeeks}>ลองอีกครั้ง</Button>} />
      ) : weeks.length === 0 ? (
        <Card>
          <Empty description="ยังไม่มีตารางงาน" />
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {weeks.map(w => (
            <Col xs={24} sm={12} md={8} key={w.id}>
              <Card
                className="psy-week-card"
                title={weekTitle(w.week_start, w.week_end)}
                actions={[
                  <Button type="link" key="view" onClick={() => openDetail(w.id)}>ดูรายละเอียด</Button>,
                  <Popconfirm key="delete" title="ยืนยันการลบตารางสัปดาห์นี้?" okText="ลบ" cancelText="ยกเลิก" onConfirm={() => handleDeleteWeek(w.id)}>
                    <Button type="text" danger aria-label={`ลบตารางสัปดาห์ ${weekTitle(w.week_start, w.week_end)}`}>ลบ</Button>
                  </Popconfirm>,
                ]}
              >
                <Text type="secondary">วันที่ทำงาน</Text>
                <Divider style={{ margin: '8px 0' }} />
                {w.work_dates.length === 0 ? (
                  <Text type="secondary">ยังไม่มีข้อมูล</Text>
                ) : (
                  <Space wrap>
                    {w.work_dates.map(date => (
                      <Tag key={date} color="blue">{THAI_DAY_SHORT[dayjs(date).day()]}</Tag>
                    ))}
                  </Space>
                )}
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {renderModal()}
    </div>
  );
};

export default PsySchedule;
