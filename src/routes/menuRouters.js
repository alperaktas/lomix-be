const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware, menuController.getMenus);

module.exports = router;
