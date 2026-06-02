const pool = require('../config/db'); // Nếu sếp để DB ở thư mục config
// hoặc const pool = require('../db'); tùy cấu trúc của sếp

// --- Các hàm phụ trợ (để nguyên bên trong file này) ---
const PRIZES = [
    { id: 'mouse', name: 'Chuột ATK Blazing Sky F1 Leviathan', type: 'mouse', weight: 0.5 },
    { id: 'v20', name: 'Voucher giảm 20%', type: 'voucher', weight: 5, discount: 20 },
    { id: 'v15', name: 'Voucher giảm 15%', type: 'voucher', weight: 10, discount: 15 },
    { id: 'v10', name: 'Voucher giảm 10%', type: 'voucher', weight: 15, discount: 10 },
    { id: 'v5', name: 'Voucher giảm 5%', type: 'voucher', weight: 20, discount: 5 },
    { id: 'none', name: 'Chúc bạn may mắn lần sau', type: 'none', weight: 49.5 },
];

function rollPrize() {
    const total = PRIZES.reduce((s, p) => s + p.weight, 0);
    let rand = Math.random() * total;
    for (const p of PRIZES) {
        rand -= p.weight;
        if (rand <= 0) return p;
    }
    return PRIZES[PRIZES.length - 1];
}

function generateCouponCode(prefix) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = prefix;
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}

// --- Các hàm Controller (Bắt buộc phải có chữ exports.) ---

// Hàm kiểm tra lượt quay
exports.checkGiveaway = async (req, res) => {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'Thiếu email' });

    try {
        const userRes = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userRes.rows.length === 0) return res.json({ hasSpun: false });
        const userId = userRes.rows[0].id;

        const entryRes = await pool.query(
            'SELECT * FROM giveaway_entries WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
            [userId]
        );

        if (entryRes.rows.length === 0) return res.json({ hasSpun: false });

        const e = entryRes.rows[0];
        res.json({
            hasSpun: true,
            entry: {
                prizeId: e.prize_type === 'none' ? 'none' : e.coupon_code,
                prizeName: e.prize_name,
                prizeType: e.prize_type,
                couponCode: e.coupon_code
            }
        });
    } catch (err) {
        console.error('❌ LỖI CHECK GIVEAWAY:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// Hàm xử lý quay số
exports.spinGiveaway = async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Thiếu email' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Tìm user
        const userRes = await client.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Không tìm thấy tài khoản' });
        }
        const userId = userRes.rows[0].id;

        // Kiểm tra đã quay chưa
        const checkRes = await client.query(
            'SELECT id FROM giveaway_entries WHERE user_id = $1',
            [userId]
        );
        if (checkRes.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Bạn đã tham gia rồi!' });
        }

        // Roll prize
        const prize = rollPrize();
        let couponCode = null;

        // Tạo voucher nếu trúng
        if (prize.type === 'voucher') {
            const prefix = `HARU${prize.discount}_`;
            couponCode = generateCouponCode(prefix);

            await client.query(
                `INSERT INTO coupons (code, discount_percent, is_freeship, is_active, user_id)
                 VALUES ($1, $2, false, true, $3)`,
                [couponCode, prize.discount, userId]
            );
        } else if (prize.type === 'mouse') {
            couponCode = 'GRAND_PRIZE';
        }

        // Lưu lịch sử
        await client.query(
            `INSERT INTO giveaway_entries (user_id, prize_name, prize_type, coupon_code)
             VALUES ($1, $2, $3, $4)`,
            [userId, prize.name, prize.type, couponCode]
        );

        await client.query('COMMIT');

        res.json({
            success: true,
            prizeId: prize.id,
            prizeName: prize.name,
            prizeType: prize.type,
            couponCode: couponCode
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ LỖI GIVEAWAY SPIN:', err.message);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};