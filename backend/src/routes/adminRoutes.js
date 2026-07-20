const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const adminOnly = [authMiddleware, roleMiddleware('admin')];

router.get('/stats', ...adminOnly, adminController.getDashboardStats);
router.get('/users', ...adminOnly, adminController.getAllUsers);
router.post('/users', ...adminOnly, adminController.createUser);
router.put('/users/:id', ...adminOnly, adminController.updateUser);
router.patch('/users/:id/password', ...adminOnly, adminController.resetPassword);
router.delete('/users/:id', ...adminOnly, adminController.deleteUser);
router.get('/complaints', ...adminOnly, adminController.getAllComplaints);
router.patch('/complaints/:id/status', ...adminOnly, adminController.updateComplaintStatus);

module.exports = router;