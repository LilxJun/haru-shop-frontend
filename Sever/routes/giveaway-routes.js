const express = require('express');
const router = express.Router();
const giveawayController = require('../controllers/giveaway-controller');

// Đảm bảo tên hàm ở đây khớp với tên hàm đã export bên file controller
router.get('/check', giveawayController.checkGiveaway);
router.post('/spin', giveawayController.spinGiveaway);

module.exports = router;