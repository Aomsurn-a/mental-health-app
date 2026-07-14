const express = require('express');
const router = express.Router();
const moodController = require('../controllers/moodController');
const { authMiddleware } = require('../middleware/auth');

router.post('/', authMiddleware, moodController.saveMood);
router.get('/my-moods', authMiddleware, moodController.getMyMoods);
router.get('/:date', authMiddleware, moodController.getMoodByDate);

module.exports = router;