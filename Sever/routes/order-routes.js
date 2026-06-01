const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order-controller');

router.post('/', orderController.createOrder);
router.get('/admin', orderController.getAdminOrders);
router.get('/user/:email', orderController.getUserOrders);
router.put('/admin/:id/status', orderController.updateOrderStatus);

module.exports = router;