const express = require('express');
const router = express.Router();
const complaintController = require('../controllers/complaintController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

router.post('/', authMiddleware, roleMiddleware('user', 'psychologist'), complaintController.createComplaint);
router.get('/my-complaints', authMiddleware, complaintController.getMyComplaints);
router.get('/all', authMiddleware, roleMiddleware('admin'), complaintController.getAllComplaints);
router.get('/ai-alerts', authMiddleware, roleMiddleware('psychologist'), complaintController.getMyAiAlerts);
router.patch('/ai-alerts/:id/acknowledge', authMiddleware, roleMiddleware('psychologist'), complaintController.acknowledgeAiAlert);
router.patch('/:id/status', authMiddleware, roleMiddleware('admin'), complaintController.updateComplaintStatus);

module.exports = router;