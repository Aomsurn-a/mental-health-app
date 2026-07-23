const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const psyOnly = [authMiddleware, roleMiddleware('psychologist')];

router.get('/weeks', ...psyOnly, scheduleController.getWeeks);
router.post('/weeks', ...psyOnly, scheduleController.createWeek);
router.get('/weeks/:id', ...psyOnly, scheduleController.getWeekDetail);
router.put('/weeks/:id', ...psyOnly, scheduleController.updateWeek);
router.delete('/weeks/:id', ...psyOnly, scheduleController.deleteWeek);

router.get('/available/:psy_id', authMiddleware, scheduleController.getAvailableSlots);

module.exports = router;
