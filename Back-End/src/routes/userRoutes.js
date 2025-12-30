const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// User routes
router.get('/profile', authenticateToken, userController.getMyProfile);
router.post('/update-profile', authenticateToken, userController.updateProfile);
router.get('/user-profile', authenticateToken, userController.getMyProfile); // Alias
router.get('/notifications', authenticateToken, userController.getNotifications);
router.post('/notifications/mark-read', authenticateToken, userController.markNotificationsRead);

// Admin routes
router.get('/all-Users', authenticateToken, authorizeRoles('admin'), userController.getAllUsers);
router.get('/UserDetails/:id', authenticateToken, authorizeRoles('admin'), userController.getUserDetails);
router.get('/BlockUsers/:id', authenticateToken, authorizeRoles('admin'), userController.blockUser);
router.get('/UnBlockUsers/:id', authenticateToken, authorizeRoles('admin'), userController.unblockUser);
router.get('/count_users', userController.countUsers); // Public?

module.exports = router;
