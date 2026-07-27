const express = require('express');
const router = express.Router();
const aiChatController = require('../controllers/aiChatController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

router.post('/send', authMiddleware, aiChatController.sendMessage);
router.get('/history', authMiddleware, aiChatController.getHistory);
router.get('/risk-alerts', authMiddleware, roleMiddleware('psychologist'), aiChatController.getRiskAlerts);
router.post('/risk-alerts/:id/acknowledge', authMiddleware, roleMiddleware('psychologist'), aiChatController.acknowledgeRiskAlert);

module.exports = router;
