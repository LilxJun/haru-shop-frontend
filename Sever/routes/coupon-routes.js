const express = require('express');
const router = express.Router();
const couponController = require('../controllers/coupon-controller');

router.post('/check', couponController.checkCoupon);

module.exports = router;