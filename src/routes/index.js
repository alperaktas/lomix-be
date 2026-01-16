const express = require('express');
const router = express.Router();
const authRoutes = require('./authRoutes');
const menuRoutes = require('./menuRoutes');

router.use('/auth', authRoutes);
router.use('/menus', menuRoutes);

module.exports = router;