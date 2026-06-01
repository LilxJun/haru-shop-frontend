const pool = require('../config/db');

exports.checkCoupon = async (req, res) => {
    const { code } = req.body;
    try {
        const result = await pool.query('SELECT * FROM coupons WHERE code = $1 AND is_active = TRUE', [code.toUpperCase()]);
        if (result.rows.length > 0) {
            const coupon = result.rows[0];
            res.json({
                success: true,
                discount_percent: coupon.discount_percent,
                is_freeship: coupon.is_freeship,
                message: "Áp dụng mã thành công!"
            });
        } else {
            res.json({ success: false, message: "Mã giảm giá không tồn tại hoặc đã hết hạn!" });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: "Lỗi máy chủ!" });
    }
};