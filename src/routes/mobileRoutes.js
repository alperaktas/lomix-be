const express = require('express');
const router = express.Router();
const mobileAuthController = require('../controllers/mobileAuthController');
const authMiddleware = require('../middleware/authMiddleware');
const isAdmin = require('../middleware/isAdmin');

router.post('/auth/register', mobileAuthController.register);
router.post('/auth/login', mobileAuthController.login);
router.post('/auth/verify', mobileAuthController.verify);
router.post('/auth/logout', authMiddleware, mobileAuthController.logout);
router.post('/auth/forgot-password', mobileAuthController.forgotPassword);
router.post('/auth/reset-password', mobileAuthController.resetPassword);
router.get('/queue-status', authMiddleware, isAdmin, mobileAuthController.getQueueStatus);

// Sosyal Medya Auth Endpointleri
router.post('/auth/google', mobileAuthController.googleAuth);
router.post('/auth/facebook', mobileAuthController.facebookAuth);
router.post('/auth/apple', mobileAuthController.appleAuth);

module.exports = router;