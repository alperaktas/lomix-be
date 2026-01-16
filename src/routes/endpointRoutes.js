const express = require('express');
const router = express.Router();
const endpointController = require('../controllers/endpointController');

router.get('/', endpointController.getAll);

module.exports = router;