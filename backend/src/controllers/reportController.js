const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const db = require('../config/db');

const REPORTS_DIR = path.join(__dirname, '..', '..', 'uploads', 'reports');
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

// ฟอนต์ Helvetica (default ของ pdfkit) ไม่มี glyph ภาษาไทย ต้องหาฟอนต์ที่รองรับมาลงทะเบียนเอง
// ลำดับที่ 1 คือฟอนต์ที่ bundle มากับโปรเจกต์เอง (พกพาได้ ใช้ได้ทั้งบน Docker/Linux)
// ถ้าไม่มีค่อย fallback ไปใช้ฟอนต์ไทยที่มากับ Windows (ใช้ได้เฉพาะตอน dev บนเครื่อง Windows)
const THAI_FONT_CANDIDATES = [
  path.join(__dirname, '..', '..', 'assets', 'fonts', 'thai.ttf'),
  'C:\\Windows\\Fonts\\LEELAWAD.TTF',
  'C:\\Windows\\Fonts\\tahoma.ttf',
];
const THAI_FONT_PATH = THAI_FONT_CANDIDATES.find(p => fs.existsSync(p)) || null;
if (!THAI_FONT_PATH) {
  console.warn('[reportController] ไม่พบฟอนต์ไทยสำหรับ PDF — ข้อความภาษาไทยใน PDF อาจแสดงไม่ถูกต้อง');
}

// คำนวณบทลงโทษจากจำนวนครั้งสะสม (นับเฉพาะรายงานที่ admin ยืนยันแล้ว)
const computePenalty = (count) => {
  if (count <= 1) return 'warning_1';
  if (count === 2) return 'warning_2';
  if (count === 3) return 'suspend_7';
  if (count === 4) return 'suspend_30';
  return 'permanent_ban';
};

// ใช้บทลงโทษกับบัญชีนักจิตวิทยา (ผ่าน users.status)
const applyPenalty = async (conn, psychologist_id, penalty_type, admin_id) => {
  const [psy] = await conn.query('SELECT user_id FROM psychologists WHERE id = ?', [psychologist_id]);
  if (psy.length === 0) return;
  const user_id = psy[0].user_id;

  if (penalty_type === 'warning_1' || penalty_type === 'warning_2') {
    return; // แค่ตักเตือน ไม่แตะสถานะบัญชี
  }
  if (penalty_type === 'suspend_7' || penalty_type === 'suspend_30') {
    const days = penalty_type === 'suspend_7' ? 7 : 30;
    await conn.query(
      `UPDATE users SET status = 'suspended', suspended_until = DATE_ADD(CURDATE(), INTERVAL ? DAY), updated_by = ? WHERE id = ?`,
      [days, admin_id, user_id]
    );
    return;
  }
  if (penalty_type === 'permanent_ban') {
    await conn.query(
      `UPDATE users SET status = 'suspended', suspended_until = NULL, updated_by = ? WHERE id = ?`,
      [admin_id, user_id]
    );
  }
};

const reportController = {

  // ดึงรายการรายงานนักจิตวิทยาทั้งหมด
  getPsychologistReports: async (req, res) => {
    try {
      const [rows] = await db.query(
        `SELECT r.id, r.psychologist_id, r.complaint_id, r.summary, r.penalty_type,
                r.report_count, r.status, r.created_at,
                u.first_name, u.last_name
         FROM psychologist_reports r
         JOIN psychologists p ON r.psychologist_id = p.id
         JOIN users u ON p.user_id = u.id
         ORDER BY r.created_at DESC`
      );
      res.json(rows);
    } catch (error) {
      console.error('GetPsychologistReports error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },

  // สร้างรายงานนักจิตวิทยาจาก complaint (นักจิตวิทยาถูกดึงจาก complaint.target_id โดยอัตโนมัติ)
  createPsychologistReport: async (req, res) => {
    const conn = await db.getConnection();
    try {
      const { complaint_id, summary } = req.body;
      const admin_id = req.user.id;

      if (!complaint_id) {
        conn.release();
        return res.status(400).json({ message: 'กรุณาระบุคำร้อง' });
      }

      const [complaints] = await conn.query(
        'SELECT id, target_id FROM complaints WHERE id = ?',
        [complaint_id]
      );
      if (complaints.length === 0 || !complaints[0].target_id) {
        conn.release();
        return res.status(400).json({ message: 'คำร้องนี้ไม่ได้ระบุนักจิตวิทยาที่ถูกร้องเรียน' });
      }

      const [psyRows] = await conn.query(
        'SELECT id FROM psychologists WHERE user_id = ?',
        [complaints[0].target_id]
      );
      if (psyRows.length === 0) {
        conn.release();
        return res.status(404).json({ message: 'ไม่พบข้อมูลนักจิตวิทยาที่ถูกร้องเรียน' });
      }
      const psychologist_id = psyRows[0].id;

      const [confirmedRows] = await db.query(
        `SELECT COUNT(*) as cnt FROM psychologist_reports WHERE psychologist_id = ? AND status = 'confirmed'`,
        [psychologist_id]
      );
      const report_count = confirmedRows[0].cnt + 1;
      const penalty_type = computePenalty(report_count);

      await conn.beginTransaction();

      const [result] = await conn.query(
        `INSERT INTO psychologist_reports
         (psychologist_id, complaint_id, summary, penalty_type, report_count, status, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
        [psychologist_id, complaint_id, summary, penalty_type, report_count, admin_id, admin_id]
      );

      await conn.query(
        `UPDATE complaints SET status = 'resolved', updated_by = ? WHERE id = ?`,
        [admin_id, complaint_id]
      );

      await conn.commit();
      res.status(201).json({ message: 'สร้างรายงานสำเร็จ', report_id: result.insertId, penalty_type, report_count });
    } catch (error) {
      await conn.rollback();
      console.error('CreatePsychologistReport error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    } finally {
      conn.release();
    }
  },

  // admin ยืนยันว่ารายงานเป็นจริง -> คำนวณบทลงโทษจริงและใช้บทลงโทษ
  confirmPsychologistReport: async (req, res) => {
    const conn = await db.getConnection();
    try {
      const { id } = req.params;
      const admin_id = req.user.id;

      const [reports] = await conn.query(
        `SELECT id, psychologist_id, status FROM psychologist_reports WHERE id = ?`,
        [id]
      );
      if (reports.length === 0) {
        conn.release();
        return res.status(404).json({ message: 'ไม่พบรายงานนี้' });
      }
      if (reports[0].status !== 'pending') {
        conn.release();
        return res.status(400).json({ message: 'รายงานนี้ถูกดำเนินการไปแล้ว' });
      }
      const psychologist_id = reports[0].psychologist_id;

      await conn.beginTransaction();

      const [confirmedRows] = await conn.query(
        `SELECT COUNT(*) as cnt FROM psychologist_reports WHERE psychologist_id = ? AND status = 'confirmed'`,
        [psychologist_id]
      );
      const report_count = confirmedRows[0].cnt + 1;
      const penalty_type = computePenalty(report_count);

      await conn.query(
        `UPDATE psychologist_reports SET status = 'confirmed', report_count = ?, penalty_type = ?, updated_by = ? WHERE id = ?`,
        [report_count, penalty_type, admin_id, id]
      );

      await applyPenalty(conn, psychologist_id, penalty_type, admin_id);

      await conn.commit();
      res.json({ message: 'ยืนยันรายงานสำเร็จ', penalty_type, report_count });
    } catch (error) {
      await conn.rollback();
      console.error('ConfirmPsychologistReport error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    } finally {
      conn.release();
    }
  },

  // admin ปฏิเสธรายงาน (ถือเป็นการกลั่นแกล้ง ไม่นับสะสม)
  rejectPsychologistReport: async (req, res) => {
    try {
      const { id } = req.params;
      const admin_id = req.user.id;

      const [reports] = await db.query('SELECT status FROM psychologist_reports WHERE id = ?', [id]);
      if (reports.length === 0) {
        return res.status(404).json({ message: 'ไม่พบรายงานนี้' });
      }
      if (reports[0].status !== 'pending') {
        return res.status(400).json({ message: 'รายงานนี้ถูกดำเนินการไปแล้ว' });
      }

      await db.query(
        `UPDATE psychologist_reports SET status = 'rejected', updated_by = ? WHERE id = ?`,
        [admin_id, id]
      );
      res.json({ message: 'ปฏิเสธรายงานสำเร็จ' });
    } catch (error) {
      console.error('RejectPsychologistReport error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },

  // ดึงรายการรายงานที่ส่งโรงพยาบาลทั้งหมด
  getHospitalReports: async (req, res) => {
    try {
      const [rows] = await db.query(
        `SELECT hr.id, hr.complaint_id, hr.hospital_id, hr.user_id, hr.reason, hr.pdf_path, hr.created_at,
                h.name as hospital_name,
                u.first_name, u.last_name
         FROM hospital_reports hr
         JOIN hospitals h ON hr.hospital_id = h.id
         JOIN users u ON hr.user_id = u.id
         ORDER BY hr.created_at DESC`
      );
      res.json(rows);
    } catch (error) {
      console.error('GetHospitalReports error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },

  // แนะนำโรงพยาบาลปัจจุบันของ user จากนักจิตที่นัดหมายล่าสุด (ใช้ prefill ในฟอร์ม)
  suggestHospitalForUser: async (req, res) => {
    try {
      const { user_id } = req.params;
      const [rows] = await db.query(
        `SELECT p.hospital_id, h.name as hospital_name
         FROM appointments a
         JOIN psychologists p ON a.psychologist_id = p.id
         LEFT JOIN hospitals h ON p.hospital_id = h.id
         WHERE a.user_id = ? AND a.active_flag = 1
         ORDER BY a.created_at DESC
         LIMIT 1`,
        [user_id]
      );
      if (rows.length === 0 || !rows[0].hospital_id) {
        return res.json({ hospital_id: null, hospital_name: null });
      }
      res.json(rows[0]);
    } catch (error) {
      console.error('SuggestHospitalForUser error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },

  // สร้างรายงานส่งโรงพยาบาล + generate PDF
  // ข้อมูลทั้งหมดถูกดึงจาก complaint (target_id = นักจิตใหม่, ผู้ร้องขอ, นักจิตเดิมจาก appointment ล่าสุด)
  createHospitalReport: async (req, res) => {
    const conn = await db.getConnection();
    try {
      const { complaint_id } = req.body;
      const admin_id = req.user.id;

      if (!complaint_id) {
        conn.release();
        return res.status(400).json({ message: 'กรุณาระบุคำร้อง' });
      }

      const [complaints] = await conn.query(
        `SELECT c.id, c.sender_id, c.target_id, c.detail, c.full_legal_name
         FROM complaints c WHERE c.id = ?`,
        [complaint_id]
      );
      if (complaints.length === 0) {
        conn.release();
        return res.status(404).json({ message: 'ไม่พบคำร้องนี้' });
      }
      const complaint = complaints[0];
      if (!complaint.target_id) {
        conn.release();
        return res.status(400).json({ message: 'คำร้องนี้ไม่ได้ระบุนักจิตวิทยาที่ต้องการเปลี่ยนไปหา' });
      }

      // นักจิตวิทยาเดิม จาก appointment ล่าสุดที่ approved/completed ของผู้ร้องขอ
      const [currentRows] = await conn.query(
        `SELECT p.hospital_id, u.first_name, u.last_name
         FROM appointments a
         JOIN psychologists p ON a.psychologist_id = p.id
         JOIN users u ON p.user_id = u.id
         WHERE a.user_id = ? AND a.active_flag = 1 AND a.status IN ('approved', 'completed')
         ORDER BY a.appointment_date DESC, a.appointment_time DESC
         LIMIT 1`,
        [complaint.sender_id]
      );
      if (currentRows.length === 0 || !currentRows[0].hospital_id) {
        conn.release();
        return res.status(400).json({ message: 'ไม่พบนักจิตวิทยาปัจจุบัน หรือนักจิตวิทยาปัจจุบันไม่มีโรงพยาบาลระบุไว้' });
      }
      const currentPsy = currentRows[0];

      // นักจิตวิทยาใหม่ที่ขอเปลี่ยนไปหา (complaint.target_id คือ user_id)
      const [newPsyRows] = await conn.query(
        `SELECT u.first_name, u.last_name
         FROM psychologists p JOIN users u ON p.user_id = u.id
         WHERE u.id = ?`,
        [complaint.target_id]
      );
      if (newPsyRows.length === 0) {
        conn.release();
        return res.status(404).json({ message: 'ไม่พบนักจิตวิทยาที่ขอเปลี่ยนไปหา' });
      }
      const newPsy = newPsyRows[0];

      const [senderRows] = await conn.query('SELECT first_name, last_name FROM users WHERE id = ?', [complaint.sender_id]);
      const requesterName = complaint.full_legal_name
        || (senderRows.length > 0 ? `${senderRows[0].first_name || ''} ${senderRows[0].last_name || ''}`.trim() : '-');

      const [adminRows] = await conn.query('SELECT first_name, last_name FROM users WHERE id = ?', [admin_id]);
      const adminName = adminRows.length > 0
        ? `${adminRows[0].first_name || ''} ${adminRows[0].last_name || ''}`.trim()
        : '-';

      await conn.beginTransaction();

      const [result] = await conn.query(
        `INSERT INTO hospital_reports (complaint_id, hospital_id, user_id, reason, created_by)
         VALUES (?, ?, ?, ?, ?)`,
        [complaint_id, currentPsy.hospital_id, complaint.sender_id, complaint.detail, admin_id]
      );
      const reportId = result.insertId;

      const fileName = `hospital_report_${reportId}.pdf`;
      const filePath = path.join(REPORTS_DIR, fileName);
      const relativePath = `uploads/reports/${fileName}`;

      await generateHospitalReportPdf(filePath, {
        requesterName,
        oldPsyName: `${currentPsy.first_name} ${currentPsy.last_name}`,
        newPsyName: `${newPsy.first_name} ${newPsy.last_name}`,
        reason: complaint.detail,
        date: new Date(),
        adminName,
      });

      await conn.query('UPDATE hospital_reports SET pdf_path = ? WHERE id = ?', [relativePath, reportId]);
      await conn.query(
        `UPDATE complaints SET status = 'resolved', updated_by = ? WHERE id = ?`,
        [admin_id, complaint_id]
      );

      await conn.commit();
      res.status(201).json({ message: 'สร้างรายงานสำเร็จ', report_id: reportId });
    } catch (error) {
      await conn.rollback();
      console.error('CreateHospitalReport error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    } finally {
      conn.release();
    }
  },

  // ดึงรายงานที่เกี่ยวกับตัวเอง (สำหรับนักจิตวิทยา login แล้วดูใน Dashboard)
  getMyReports: async (req, res) => {
    try {
      const user_id = req.user.id;
      const [psy] = await db.query('SELECT id FROM psychologists WHERE user_id = ?', [user_id]);
      if (psy.length === 0) {
        return res.json([]);
      }
      const [rows] = await db.query(
        `SELECT id, complaint_id, summary, penalty_type, report_count, status, acknowledged_at, created_at
         FROM psychologist_reports
         WHERE psychologist_id = ? AND status = 'confirmed'
         ORDER BY created_at DESC`,
        [psy[0].id]
      );
      res.json(rows);
    } catch (error) {
      console.error('GetMyReports error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },

  // นักจิตวิทยากดรับทราบรายงาน (ปิดแจ้งเตือนใน Dashboard)
  acknowledgeReport: async (req, res) => {
    try {
      const { id } = req.params;
      const user_id = req.user.id;
      const [psy] = await db.query('SELECT id FROM psychologists WHERE user_id = ?', [user_id]);
      if (psy.length === 0) {
        return res.status(404).json({ message: 'ไม่พบข้อมูลนักจิตวิทยา' });
      }
      await db.query(
        `UPDATE psychologist_reports SET acknowledged_at = NOW() WHERE id = ? AND psychologist_id = ?`,
        [id, psy[0].id]
      );
      res.json({ message: 'รับทราบแล้ว' });
    } catch (error) {
      console.error('AcknowledgeReport error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },

  // ดาวน์โหลด PDF — เจ้าของคำร้องหรือ admin เท่านั้น
  downloadHospitalReport: async (req, res) => {
    try {
      const { id } = req.params;
      const [rows] = await db.query('SELECT pdf_path, user_id FROM hospital_reports WHERE id = ?', [id]);
      if (rows.length === 0 || !rows[0].pdf_path) {
        return res.status(404).json({ message: 'ไม่พบไฟล์รายงาน' });
      }
      if (req.user.role !== 'admin' && req.user.id !== rows[0].user_id) {
        return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึงไฟล์นี้' });
      }
      const filePath = path.join(__dirname, '..', '..', rows[0].pdf_path);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'ไม่พบไฟล์รายงาน' });
      }
      res.download(filePath);
    } catch (error) {
      console.error('DownloadHospitalReport error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },
};

function generateHospitalReportPdf(filePath, { requesterName, oldPsyName, newPsyName, reason, date, adminName }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const useThaiFont = () => { if (THAI_FONT_PATH) doc.font('Thai'); };
    if (THAI_FONT_PATH) {
      doc.registerFont('Thai', THAI_FONT_PATH);
      useThaiFont();
    }

    doc.fontSize(18).text('ใบขอเปลี่ยนนักจิตวิทยา', { align: 'center' });
    doc.moveDown(2);

    doc.fontSize(12);
    doc.text(`ชื่อ-นามสกุล: ${requesterName}`);
    doc.moveDown(0.5);
    doc.text(`นักจิตวิทยาเดิม: ${oldPsyName}`);
    doc.moveDown(0.5);
    doc.text(`นักจิตวิทยาที่ขอเปลี่ยนไปหา: ${newPsyName}`);
    doc.moveDown(0.5);
    doc.text('เหตุผล:');
    doc.moveDown(0.2);
    doc.text(`     ${reason || '-'}`);
    doc.moveDown(1.5);
    doc.text('หมายเหตุ: กรุณานำเอกสารนี้พร้อมบัตรประชาชนและบัตรนัดเดิม ติดต่อโรงพยาบาลด้วยตนเอง');
    doc.moveDown(1);
    doc.text(`วันที่ออกเอกสาร: ${date.toLocaleDateString('en-GB')}`);
    doc.moveDown(0.5);
    doc.text(`ผู้ออกเอกสาร: ${adminName}`);

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

module.exports = reportController;
