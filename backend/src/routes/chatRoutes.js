const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authMiddleware } = require('../middleware/auth');

router.get('/list', authMiddleware, chatController.getChatList);
router.get('/messages/:partner_id', authMiddleware, chatController.getMessages);
router.post('/send', authMiddleware, chatController.sendMessage);
router.get('/new', authMiddleware, chatController.getNewMessages);

module.exports = router;