const express = require('express');
const router = express.Router();
const mobileAuthController = require('../controllers/mobileAuthController');
const authMiddleware = require('../controllers/authMiddleware');

router.post('/register', mobileAuthController.register);
router.post('/verify', mobileAuthController.verify);
router.post('/login', mobileAuthController.login);
router.post('/forgot-password', mobileAuthController.forgotPassword);
router.post('/reset-password', mobileAuthController.resetPassword);
router.post('/logout', authMiddleware, mobileAuthController.logout);
router.get('/queue-status', mobileAuthController.getQueueStatus);

// Sosyal Medya Auth Endpointleri
router.post('/auth/google', mobileAuthController.googleAuth);
router.post('/auth/facebook', mobileAuthController.facebookAuth);
router.post('/auth/apple', mobileAuthController.appleAuth);

module.exports = router;