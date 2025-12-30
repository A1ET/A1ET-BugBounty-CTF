const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/login', authController.userLogin);
router.post('/register', authController.userRegister);
router.post('/admin/login', authController.adminLogin);

module.exports = router;
