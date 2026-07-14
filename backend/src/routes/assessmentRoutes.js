const express = require('express');
const router = express.Router();
const assessmentController = require('../controllers/assessmentController');
const { authMiddleware } = require('../middleware/auth');

router.get('/sets', authMiddleware, assessmentController.getSets);
router.get('/sets/:id', authMiddleware, assessmentController.getSetById);
router.post('/submit', authMiddleware, assessmentController.submitAssessment);
router.get('/my-results', authMiddleware, assessmentController.getMyResults);

module.exports = router;