const express = require('express');
const router = express.Router();
const giveawayController = require('../controllers/giveaway-controller');

// Khai báo các đường dẫn API và trỏ tới hàm xử lý trong Controller
router.get('/check', giveawayController.checkStatus);
router.post('/spin', giveawayController.spinWheel);

module.exports = router;