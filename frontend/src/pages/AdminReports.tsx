import React, { useEffect, useState } from 'react';
import {
  Tabs, Card, Button, Table, Tag, Modal, Form, Select, Input, Typography,
  Popconfirm, message, Space,
} from 'antd';
import { PlusOutlined, DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { reportService } from '../services/reportService';
import type { PsychologistReport, HospitalReport } from '../services/reportService';
import { complaintService } from '../services/complaintService';
import type { Complaint } from '../services/complaintService';

const { Title, Text } = Typography;
const { TextArea } = Input;

const penaltyConfig: Record<string, { color: string; text: string }> = {
  warning_1: { color: 'gold', text: 'ตักเตือนครั้งที่ 1' },
  warning_2: { color: 'orange', text: 'ตักเตือนครั้งที่ 2' },
  suspend_7: { color: 'volcano', text: 'ระงับ 7 วัน' },
  suspend_30: { color: 'red', text: 'ระงับ 30 วัน' },
  permanent_ban: { color: 'black', text: 'แบนถาวร' },
};

const reportStatusConfig: Record<string, { color: string; text: string }> = {
  pending: { color: 'orange', text: 'รอดำเนินการ' },
  confirmed: { color: 'green', text: 'ยืนยันแล้ว' },
  rejected: { color: 'red', text: 'ปฏิเสธ' },
};

const AdminReports: React.FC = () => {
  const [psyReports, setPsyReports] = useState<PsychologistReport[]>([]);
  const [hospitalReports, setHospitalReports] = useState<HospitalReport[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(false);

  const [psyModalOpen, setPsyModalOpen] = useState(false);
  const [psySaving, setPsySaving] = useState(false);
  const [psyForm] = Form.useForm();

  const [hospModalOpen, setHospModalOpen] = useState(false);
  const [hospSaving, setHospSaving] = useState(false);
  const [hospForm] = Form.useForm();

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [psyReportData, hospitalReportData, complaintData] = await Promise.all([
        reportService.getPsychologistReports(),
        reportService.getHospitalReports(),
        complaintService.getAllComplaints(),
      ]);
      setPsyReports(psyReportData);
      setHospitalReports(hospitalReportData);
      setComplaints(complaintData);
    } catch {
      message.error('โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // คำร้องที่ยังไม่เคยสร้าง psychologist_report มาก่อน (สร้างแล้วคำร้องจะถูกปิดเป็น resolved ทันที
  // แต่กันเผื่อกรณี resolved ด้วยทางอื่นด้วยการเช็คซ้ำกับ psyReports ที่โหลดมาแล้ว)
  const reportComplaintCandidates = complaints.filter(c =>
    c.type === 'report_psychologist' &&
    c.status !== 'resolved' &&
    !psyReports.some(r => r.complaint_id === c.id)
  );
  const changeComplaintCandidates = complaints.filter(c => c.type === 'change_psychologist' && c.status !== 'resolved');

  // --- Tab 1: รายงานนักจิตวิทยา ---

  const [pickedReportComplaint, setPickedReportComplaint] = useState<Complaint | null>(null);

  const handlePickReportComplaint = (complaintId: number) => {
    const complaint = complaints.find(c => c.id === complaintId) || null;
    setPickedReportComplaint(complaint);
    psyForm.setFieldsValue({ summary: complaint?.detail || '' });
  };

  const handleCreatePsyReport = async (values: any) => {
    setPsySaving(true);
    try {
      await reportService.createPsychologistReport({
        complaint_id: values.complaint_id,
        summary: values.summary,
      });
      message.success('สร้างรายงานสำเร็จ');
      setPsyModalOpen(false);
      setPickedReportComplaint(null);
      psyForm.resetFields();
      fetchAll();
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'สร้างรายงานไม่สำเร็จ');
    } finally {
      setPsySaving(false);
    }
  };

  const handleConfirmReport = async (id: number) => {
    try {
      await reportService.confirmPsychologistReport(id);
      message.success('ยืนยันรายงานสำเร็จ');
      fetchAll();
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'ยืนยันไม่สำเร็จ');
    }
  };

  const handleRejectReport = async (id: number) => {
    try {
      await reportService.rejectPsychologistReport(id);
      message.success('ปฏิเสธรายงานสำเร็จ');
      fetchAll();
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'ปฏิเสธไม่สำเร็จ');
    }
  };

  const psyColumns = [
    {
      title: 'วันที่',
      dataIndex: 'created_at',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'นักจิต',
      render: (_: any, r: PsychologistReport) => `${r.first_name} ${r.last_name}`,
    },
    {
      title: 'สรุปปัญหา',
      dataIndex: 'summary',
      render: (summary: string) => (
        <Text style={{ maxWidth: 260, display: 'block' }} ellipsis={{ tooltip: summary }}>{summary}</Text>
      ),
    },
    { title: 'ครั้งที่', dataIndex: 'report_count', align: 'center' as const },
    {
      title: 'บทลงโทษ',
      dataIndex: 'penalty_type',
      render: (p: string | null) => p ? <Tag color={penaltyConfig[p]?.color}>{penaltyConfig[p]?.text}</Tag> : '-',
    },
    {
      title: 'สถานะ',
      dataIndex: 'status',
      render: (s: string) => <Tag color={reportStatusConfig[s]?.color}>{reportStatusConfig[s]?.text}</Tag>,
    },
    {
      title: 'จัดการ',
      render: (_: any, r: PsychologistReport) => (
        r.status === 'pending' ? (
          <Space>
            <Popconfirm title="ยืนยันว่ารายงานนี้เป็นจริง?" okText="ยืนยัน" cancelText="ยกเลิก" onConfirm={() => handleConfirmReport(r.id)}>
              <Button size="small" type="primary">ยืนยัน</Button>
            </Popconfirm>
            <Popconfirm title="ปฏิเสธรายงานนี้ (ถือเป็นการกลั่นแกล้ง)?" okText="ปฏิเสธ" cancelText="ยกเลิก" onConfirm={() => handleRejectReport(r.id)}>
              <Button size="small" danger>ปฏิเสธ</Button>
            </Popconfirm>
          </Space>
        ) : null
      ),
    },
  ];

  // --- Tab 2: รายงานส่งโรงพยาบาล ---

  const handleCreateHospitalReport = async (values: any) => {
    setHospSaving(true);
    try {
      const result = await reportService.createHospitalReport({
        complaint_id: values.complaint_id,
      });
      message.success('สร้างรายงานและ PDF สำเร็จ');
      setHospModalOpen(false);
      hospForm.resetFields();
      await fetchAll();
      if (result?.report_id) {
        reportService.downloadReport(result.report_id).catch(() => {});
      }
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'สร้างรายงานไม่สำเร็จ');
    } finally {
      setHospSaving(false);
    }
  };

  const handleDownload = async (id: number) => {
    try {
      await reportService.downloadReport(id);
    } catch {
      message.error('ดาวน์โหลดไม่สำเร็จ');
    }
  };

  const hospitalColumns = [
    {
      title: 'วันที่',
      dataIndex: 'created_at',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm'),
    },
    { title: 'โรงพยาบาล', dataIndex: 'hospital_name' },
    {
      title: 'ผู้ร้องขอ',
      render: (_: any, r: HospitalReport) => `${r.first_name} ${r.last_name}`,
    },
    {
      title: 'เหตุผล',
      dataIndex: 'reason',
      render: (reason: string) => (
        <Text style={{ maxWidth: 260, display: 'block' }} ellipsis={{ tooltip: reason }}>{reason}</Text>
      ),
    },
    {
      title: 'PDF',
      render: (_: any, r: HospitalReport) => (
        <Button size="small" icon={<DownloadOutlined />} onClick={() => handleDownload(r.id)} disabled={!r.pdf_path}>
          ดาวน์โหลด
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>รายงาน</Title>

      <Tabs
        items={[
          {
            key: 'psychologist',
            label: 'รายงานนักจิตวิทยา',
            children: (
              <Card
                title="รายงานนักจิตวิทยา"
                extra={
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => setPsyModalOpen(true)}>
                    สร้างรายงานใหม่
                  </Button>
                }
              >
                <Table
                  dataSource={psyReports}
                  columns={psyColumns}
                  rowKey="id"
                  loading={loading}
                  locale={{ emptyText: 'ยังไม่มีรายงาน' }}
                />
              </Card>
            ),
          },
          {
            key: 'hospital',
            label: 'รายงานส่งโรงพยาบาล',
            children: (
              <Card
                title="รายงานส่งโรงพยาบาล"
                extra={
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => setHospModalOpen(true)}>
                    สร้างรายงานใหม่
                  </Button>
                }
              >
                <Table
                  dataSource={hospitalReports}
                  columns={hospitalColumns}
                  rowKey="id"
                  loading={loading}
                  locale={{ emptyText: 'ยังไม่มีรายงาน' }}
                />
              </Card>
            ),
          },
        ]}
      />

      {/* Modal: สร้างรายงานนักจิตวิทยา */}
      <Modal
        title="สร้างรายงานนักจิตวิทยา"
        open={psyModalOpen}
        onCancel={() => { setPsyModalOpen(false); setPickedReportComplaint(null); psyForm.resetFields(); }}
        onOk={() => psyForm.submit()}
        okText="สร้างรายงาน"
        cancelText="ยกเลิก"
        confirmLoading={psySaving}
      >
        <Form form={psyForm} layout="vertical" onFinish={handleCreatePsyReport}>
          <Form.Item name="complaint_id" label="คำร้องที่เกี่ยวข้อง"
            rules={[{ required: true, message: 'กรุณาเลือกคำร้อง' }]}>
            <Select
              placeholder="เลือกคำร้องประเภทร้องเรียนนักจิตวิทยา"
              notFoundContent="ไม่มีคำร้องที่รอดำเนินการ"
              onChange={handlePickReportComplaint}
              options={reportComplaintCandidates.map(c => ({
                value: c.id,
                label: `#${c.id} — ${c.first_name} ${c.last_name}: ${c.detail?.slice(0, 40)}`,
              }))}
            />
          </Form.Item>
          {pickedReportComplaint && (
            <Form.Item label="นักจิตที่ถูกรายงาน">
              <Input
                disabled
                value={
                  pickedReportComplaint.target_first_name
                    ? `${pickedReportComplaint.target_first_name} ${pickedReportComplaint.target_last_name}`
                    : 'ไม่พบข้อมูลนักจิตวิทยาที่ถูกร้องเรียน'
                }
              />
            </Form.Item>
          )}
          <Form.Item name="summary" label="สรุปปัญหา"
            rules={[{ required: true, message: 'กรุณาสรุปปัญหา' }]}>
            <TextArea rows={4} placeholder="สรุปปัญหาที่พบจากการร้องเรียน..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal: สร้างรายงานส่งโรงพยาบาล */}
      <Modal
        title="สร้างรายงานส่งโรงพยาบาล"
        open={hospModalOpen}
        onCancel={() => { setHospModalOpen(false); hospForm.resetFields(); }}
        onOk={() => hospForm.submit()}
        okText="สร้าง PDF"
        cancelText="ยกเลิก"
        confirmLoading={hospSaving}
      >
        <Form form={hospForm} layout="vertical" onFinish={handleCreateHospitalReport}>
          <Form.Item name="complaint_id" label="คำร้องที่เกี่ยวข้อง"
            rules={[{ required: true, message: 'กรุณาเลือกคำร้อง' }]}>
            <Select
              placeholder="เลือกคำร้องประเภทขอเปลี่ยนนักจิตวิทยา"
              notFoundContent="ไม่มีคำร้องที่รอดำเนินการ"
              options={changeComplaintCandidates.map(c => ({
                value: c.id,
                label: `#${c.id} — ${c.first_name} ${c.last_name}: ${c.detail?.slice(0, 40)}`,
              }))}
            />
          </Form.Item>
          <Text type="secondary">
            ระบบจะดึงชื่อ-นามสกุลจริง นักจิตวิทยาเดิม นักจิตวิทยาที่ขอเปลี่ยนไปหา และเหตุผลจากคำร้องที่เลือกไว้อัตโนมัติ
          </Text>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminReports;
