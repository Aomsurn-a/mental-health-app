const express = require('express');
const router = express.Router();
const hospitalController = require('../controllers/hospitalController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const adminOnly = [authMiddleware, roleMiddleware('admin')];

router.get('/', authMiddleware, hospitalController.getAllHospitals);
router.get('/psychologists-same-hospital/:current_psy_id', authMiddleware, hospitalController.getPsychologistsSameHospital);
router.post('/', ...adminOnly, hospitalController.createHospital);
router.put('/:id', ...adminOnly, hospitalController.updateHospital);
router.delete('/:id', ...adminOnly, hospitalController.deleteHospital);
router.get('/:id/psychologists', authMiddleware, hospitalController.getPsychologistsByHospital);
router.post('/:id/psychologists', ...adminOnly, hospitalController.assignPsychologist);
router.delete('/:id/psychologists/:psy_id', ...adminOnly, hospitalController.removePsychologist);

module.exports = router;
