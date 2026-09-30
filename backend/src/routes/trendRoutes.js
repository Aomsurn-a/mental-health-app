const router = require('express').Router();
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const controller = require('../controllers/trendAnalysisController');
router.use(authMiddleware, roleMiddleware('psychologist'));
router.get('/patients/:patientId/assessment-trend', controller.assessmentTrend);
router.get('/patients/:patientId/mood-trend', controller.moodTrend);
router.get('/alerts', controller.alerts);
router.put('/alerts/:id/acknowledge', controller.acknowledge);
module.exports = router;
