const router=require('express').Router();
const {authMiddleware,roleMiddleware}=require('../middleware/auth');
const controller=require('../controllers/preSessionController');
router.use(authMiddleware,roleMiddleware('psychologist'));
router.get('/patients/:patientId/session-summary',controller.sessionSummary);
router.post('/patients/:patientId/session-summary',controller.sessionSummary);
router.get('/patients/:patientId/risk-bullets',controller.riskBullets);
module.exports=router;
