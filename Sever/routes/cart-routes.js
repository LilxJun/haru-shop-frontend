const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cart-controller');

router.post('/', cartController.addToCart);
router.get('/:email', cartController.getCart);
router.put('/:id', cartController.updateCart);
router.delete('/:id', cartController.deleteItem);
router.delete('/clear/:email', cartController.clearCart);

module.exports = router;