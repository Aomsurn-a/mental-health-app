const router=require('express').Router();
const {authMiddleware,roleMiddleware}=require('../middleware/auth');
router.post('/chat/:patientId/summarize',authMiddleware,roleMiddleware('psychologist'),require('../controllers/chatSummaryController').summarize);
module.exports=router;
