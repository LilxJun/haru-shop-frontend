const pool = require('../config/db');

// 1. Lấy danh sách Voucher hiển thị ra bảng
exports.getAllVouchers = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM vouchers ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Lỗi khi lấy danh sách voucher' });
    }
};

// 2. Thêm Voucher mới
exports.createVoucher = async (req, res) => {
    const { code, discount_percent, expires_at } = req.body;
    if (!code || !discount_percent || !expires_at) {
        return res.status(400).json({ error: 'Vui lòng nhập đủ thông tin' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO vouchers (code, discount_percent, expires_at) VALUES ($1, $2, $3) RETURNING *',
            [code.toUpperCase(), discount_percent, expires_at]
        );
        res.json({ success: true, message: 'Thêm voucher thành công!', voucher: result.rows[0] });
    } catch (err) {
        res.status(400).json({ error: 'Mã voucher này đã tồn tại!' });
    }
};

// 3. Xóa Voucher
exports.deleteVoucher = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM vouchers WHERE id = $1', [id]);
        res.json({ success: true, message: 'Đã xóa voucher' });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi khi xóa voucher' });
    }
};