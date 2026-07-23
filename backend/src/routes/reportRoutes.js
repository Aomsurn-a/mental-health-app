const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const adminOnly = [authMiddleware, roleMiddleware('admin')];

router.get('/psychologist-reports', ...adminOnly, reportController.getPsychologistReports);
router.post('/psychologist-reports', ...adminOnly, reportController.createPsychologistReport);
router.put('/psychologist-reports/:id/confirm', ...adminOnly, reportController.confirmPsychologistReport);
router.put('/psychologist-reports/:id/reject', ...adminOnly, reportController.rejectPsychologistReport);

// นักจิตวิทยาดูรายงานของตัวเอง
router.get('/my-reports', authMiddleware, roleMiddleware('psychologist'), reportController.getMyReports);
router.put('/my-reports/:id/acknowledge', authMiddleware, roleMiddleware('psychologist'), reportController.acknowledgeReport);

router.get('/hospital-reports', ...adminOnly, reportController.getHospitalReports);
router.post('/hospital-reports', ...adminOnly, reportController.createHospitalReport);
// เจ้าของคำร้อง (user) หรือ admin เท่านั้นที่ดาวน์โหลดได้ — สิทธิ์ตรวจสอบใน controller
router.get('/hospital-reports/:id/download', authMiddleware, reportController.downloadHospitalReport);
router.get('/hospital-reports/suggest-hospital/:user_id', ...adminOnly, reportController.suggestHospitalForUser);

module.exports = router;
