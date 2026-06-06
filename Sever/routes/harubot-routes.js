const express = require('express');
const router = express.Router();
const harubotController = require('../controllers/harubot-controller');

router.post('/chat', harubotController.chat);

module.exports = router;