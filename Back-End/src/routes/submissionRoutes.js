const express = require('express');
const router = express.Router();
const submissionController = require('../controllers/submissionController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// Public or User routes (Submission creation)
// Note: Originally /submit/:id_prog
router.post('/submit/:id_prog', authenticateToken, submissionController.createSubmission);

// User routes
router.get('/all-MyReports', authenticateToken, submissionController.getMyReports);
router.get('/ReportDetails/:id', authenticateToken, submissionController.getSubmissionById);

// Admin routes
router.get('/all-Submited', authenticateToken, authorizeRoles('admin'), submissionController.getPendingSubmissions);
router.get('/Submited_His', authenticateToken, authorizeRoles('admin'), submissionController.getSubmissionHistory);
// Note: Original code had GET for status updates. Changing to POST/PUT for best practice.
router.post('/StatusUP/:id', authenticateToken, authorizeRoles('admin'), submissionController.approveSubmission);
router.post('/StatusDown/:id', authenticateToken, authorizeRoles('admin'), submissionController.rejectSubmissionWithStrike);
router.post('/StatusDownNostrike/:id', authenticateToken, authorizeRoles('admin'), submissionController.rejectSubmissionNoStrike);
router.delete('/DeleteReport/:id', authenticateToken, authorizeRoles('admin'), submissionController.deleteSubmission);

module.exports = router;
