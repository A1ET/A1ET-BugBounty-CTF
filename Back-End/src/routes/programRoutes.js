const express = require('express');
const router = express.Router();
const programController = require('../controllers/programController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// Public routes
router.get('/latest-titles', programController.getLatestPrograms);
router.get('/all-titles', programController.getAllPrograms);
router.get('/entry/:id', programController.getProgramById);

// Protected routes (Admin only)
router.post('/save-data', authenticateToken, authorizeRoles('admin'), programController.createProgram);
router.post('/update-title/:id', authenticateToken, authorizeRoles('admin'), programController.updateProgram);
router.delete('/delete-title/:id', authenticateToken, authorizeRoles('admin'), programController.deleteProgram);

module.exports = router;
