const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

// User
router.get('/psychologists', authMiddleware, appointmentController.getPsychologists);
router.post('/', authMiddleware, appointmentController.createAppointment);
router.get('/my-appointments', authMiddleware, appointmentController.getMyAppointments);
router.patch('/:id/cancel', authMiddleware, appointmentController.cancelAppointment);

// นักจิต
router.get('/psy-appointments', authMiddleware, roleMiddleware('psychologist'), appointmentController.getPsychologistAppointments);
router.patch('/:id/status', authMiddleware, roleMiddleware('psychologist'), appointmentController.updateAppointmentStatus);
router.post('/by-psy', authMiddleware, roleMiddleware('psychologist'), appointmentController.createAppointmentByPsy);

module.exports = router;