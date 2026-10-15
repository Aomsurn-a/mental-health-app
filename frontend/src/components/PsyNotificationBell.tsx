import React, { useCallback, useEffect, useState } from 'react';
import { Badge, Button, List, Modal, Popover, Tag, Typography } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { appointmentService } from '../services/appointmentService';
import { reportService } from '../services/reportService';
import { complaintService } from '../services/complaintService';

const { Text, Paragraph } = Typography;

type NotificationKind = 'appointment_request' | 'appointment_soon' | 'reported' | 'ai_alert';

interface NotificationItem {
  key: string;
  kind: NotificationKind;
  title: string;
  time: string;
  lines: string[];
  link: string;
  linkLabel: string;
}

const kindConfig: Record<NotificationKind, { color: string; label: string }> = {
  appointment_request: { color: 'orange', label: 'ผู้ป่วยขอนัด' },
  appointment_soon: { color: 'blue', label: 'ใกล้ถึงเวลานัด' },
  reported: { color: 'red', label: 'ถูกรายงาน' },
  ai_alert: { color: 'magenta', label: 'AI แจ้งเตือน' },
};

const penaltyLabel: Record<string, string> = {
  warning_1: 'ตักเตือนครั้งที่ 1',
  warning_2: 'ตักเตือนครั้งที่ 2',
  suspend_7: 'ระงับการใช้งาน 7 วัน',
  suspend_30: 'ระงับการใช้งาน 30 วัน',
  permanent_ban: 'แบนถาวร',
};

const POLL_MS = 30000;
const SOON_HOURS = 24;

const PsyNotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<NotificationItem | null>(null);

  const load = useCallback(async () => {
    const [appts, reports, alerts] = await Promise.allSettled([
      appointmentService.getPsychologistAppointments(),
      reportService.getMyReports(),
      complaintService.getMyAiAlerts(),
    ]);
    const next: NotificationItem[] = [];
    const now = dayjs();

    if (appts.status === 'fulfilled') {
      appts.value.forEach((a: any) => {
        const when = dayjs(`${dayjs(a.appointment_date).format('YYYY-MM-DD')} ${a.appointment_time}`);
        const whenText = `${when.format('DD/MM/YYYY HH:mm')} น.`;
        const name = `${a.first_name} ${a.last_name}`;
        if (a.status === 'pending') {
          next.push({
            key: `req-${a.id}`, kind: 'appointment_request',
            title: `${name} ขอนัดหมาย`, time: a.created_at,
            lines: [`ผู้ป่วย: ${name}`, `วันเวลาที่ขอ: ${whenText}`, `เรื่องที่ปรึกษา: ${a.consultation_topic || '-'}`, `หมายเหตุผู้ป่วย: ${a.patient_note || '-'}`],
            link: '/appointment', linkLabel: 'ไปหน้าจัดการนัดหมาย',
          });
        } else if (a.status === 'approved' && when.isAfter(now) && when.diff(now, 'hour', true) <= SOON_HOURS) {
          next.push({
            key: `soon-${a.id}`, kind: 'appointment_soon',
            title: `ใกล้ถึงเวลานัด ${name} (${when.format('DD/MM HH:mm')} น.)`, time: when.toISOString(),
            lines: [`ผู้ป่วย: ${name}`, `วันเวลานัด: ${whenText}`, `เรื่องที่ปรึกษา: ${a.consultation_topic || '-'}`],
            link: '/appointment', linkLabel: 'ไปหน้าจัดการนัดหมาย',
          });
        }
      });
    }

    if (reports.status === 'fulfilled') {
      reports.value.filter(r => !r.acknowledged_at).forEach(r => {
        next.push({
          key: `report-${r.id}`, kind: 'reported',
          title: `คุณถูกรายงาน${r.penalty_type ? ` — ${penaltyLabel[r.penalty_type] || r.penalty_type}` : ''}`,
          time: r.created_at,
          lines: [`สรุป: ${r.summary || '-'}`, `บทลงโทษ: ${r.penalty_type ? penaltyLabel[r.penalty_type] || r.penalty_type : '-'}`, `จำนวนครั้งที่ถูกรายงาน: ${r.report_count}`],
          link: '/dashboard', linkLabel: 'ไปหน้าหลักเพื่อรับทราบ',
        });
      });
    }

    if (alerts.status === 'fulfilled') {
      alerts.value.forEach(a => {
        next.push({
          key: `ai-${a.id}`, kind: 'ai_alert',
          title: `AI พบความเสี่ยงจากแชทของ ${a.first_name} ${a.last_name}`, time: a.created_at,
          lines: [`ผู้ป่วย: ${a.first_name} ${a.last_name}`, `ข้อความที่ตรวจพบ: ${a.detail || '-'}`],
          link: '/dashboard', linkLabel: 'ไปหน้าหลักเพื่อรับทราบ',
        });
      });
    }

    next.sort((x, y) => dayjs(y.time).valueOf() - dayjs(x.time).valueOf());
    setItems(next);
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const list = (
    <List
      style={{ width: 340, maxHeight: 420, overflowY: 'auto' }}
      size="small"
      dataSource={items}
      locale={{ emptyText: 'ไม่มีการแจ้งเตือน' }}
      renderItem={item => (
        <List.Item
          style={{ cursor: 'pointer' }}
          onClick={() => { setSelected(item); setOpen(false); }}
        >
          <div style={{ width: '100%' }}>
            <Tag color={kindConfig[item.kind].color}>{kindConfig[item.kind].label}</Tag>
            <div><Text>{item.title}</Text></div>
            <Text type="secondary" style={{ fontSize: 12 }}>{dayjs(item.time).format('DD/MM/YYYY HH:mm')}</Text>
          </div>
        </List.Item>
      )}
    />
  );

  return (
    <>
      <Popover content={list} title="การแจ้งเตือน" trigger="click" placement="bottomRight" open={open} onOpenChange={setOpen}>
        <Badge count={items.length} size="small" overflowCount={99}>
          <Button type="text" aria-label={`การแจ้งเตือน ${items.length} รายการ`} icon={<BellOutlined style={{ fontSize: 18 }} />} />
        </Badge>
      </Popover>

      <Modal
        title={selected ? kindConfig[selected.kind].label : ''}
        open={!!selected}
        onCancel={() => setSelected(null)}
        footer={[
          <Button key="close" onClick={() => setSelected(null)}>ปิด</Button>,
          <Button key="go" type="primary" onClick={() => { if (selected) navigate(selected.link); setSelected(null); }}>
            {selected?.linkLabel}
          </Button>,
        ]}
      >
        {selected && (
          <>
            <Paragraph strong>{selected.title}</Paragraph>
            {selected.lines.map((line, i) => <Paragraph key={i} style={{ marginBottom: 4 }}>{line}</Paragraph>)}
          </>
        )}
      </Modal>
    </>
  );
};

export default PsyNotificationBell;
