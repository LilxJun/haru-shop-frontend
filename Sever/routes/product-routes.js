const express = require('express');
const router = express.Router();
const productController = require('../controllers/product-controller');

// Public routes
router.get('/', productController.getAllProducts);
router.get('/filter', productController.filterProducts);
router.get('/stock-stats', productController.getStockStats);
router.get('/homepage-products', productController.getHomepageProducts);
router.get('/:id', productController.getProductDetail);
router.get('/:id/reviews', productController.getReviews);
router.post('/:id/reviews', productController.addReview);

// Admin routes
router.post('/add-complete', productController.addCompleteProduct);
router.put('/admin/:id/stock', productController.updateStock);
router.delete('/admin/:id', productController.deleteProduct);

module.exports = router;