const express = require('express');
const cors = require('cors');
const pool = require('./config/db'); // Kích hoạt kết nối DB
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Import Routes
const authRoutes = require('./routes/auth-routes');
const productRoutes = require('./routes/product-routes');
const cartRoutes = require('./routes/cart-routes');
const orderRoutes = require('./routes/order-routes');
const couponRoutes = require('./routes/coupon-routes');
const harubotRoutes = require('./routes/harubot-routes');
const voucherController = require('./controllers/voucher-controller');


// Gắn Routes
app.use('/api', authRoutes); // /api/login, /api/register...
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/harubot', harubotRoutes);
// CÁC API CHO QUẢN LÝ VOUCHER
app.get('/api/vouchers', voucherController.getAllVouchers);
app.post('/api/vouchers', voucherController.createVoucher);
app.delete('/api/vouchers/:id', voucherController.deleteVoucher);



// Xử lý đóng Server an toàn
process.on('SIGINT', async () => {
    console.log('\n⚠️ Đang đóng các kết nối Database...');
    try {
        await pool.end();
        console.log('🛑 Server Haru đã tắt an toàn. Hẹn gặp lại sếp!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Lỗi khi đóng Server:', err.stack);
        process.exit(1);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`--- SERVER ĐANG CHẠY TẠI CỔNG ${PORT} ---`);
});