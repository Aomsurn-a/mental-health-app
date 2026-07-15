const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

router.get('/', authMiddleware, roleMiddleware('psychologist'), patientController.getMyPatients);
router.get('/:patient_id', authMiddleware, roleMiddleware('psychologist'), patientController.getPatientDetail);
router.post('/record', authMiddleware, roleMiddleware('psychologist'), patientController.addPatientRecord);
router.get('/:patient_id/records', authMiddleware, roleMiddleware('psychologist'), patientController.getPatientRecords);

module.exports = router;