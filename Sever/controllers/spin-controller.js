const pool = require('../config/db');

// Cấu hình giải thưởng và tỉ lệ trúng (weight)
const PRIZES = [
    { id: 'v20', name: 'Voucher giảm 20%', type: 'voucher', weight: 5, discount: 20 },
    { id: 'v10', name: 'Voucher giảm 10%', type: 'voucher', weight: 15, discount: 10 },
    { id: 'v5', name: 'Voucher giảm 5%', type: 'voucher', weight: 30, discount: 5 },
    { id: 'none', name: 'Chúc bạn may mắn lần sau', type: 'none', weight: 50 }
];

// Thuật toán quay số (Weighted Random)
function rollPrize() {
    const totalWeight = PRIZES.reduce((sum, p) => sum + p.weight, 0);
    let randomNum = Math.random() * totalWeight;
    for (const prize of PRIZES) {
        randomNum -= prize.weight;
        if (randomNum <= 0) return prize;
    }
    return PRIZES[PRIZES.length - 1];
}

exports.playSpin = async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Vui lòng đăng nhập để quay!' });

    try {
        // 1. Kiểm tra xem user này đã quay chưa
        const checkRes = await pool.query('SELECT * FROM spin_history WHERE email = $1', [email]);
        if (checkRes.rows.length > 0) {
            return res.status(400).json({ error: 'Bạn đã hết lượt quay! Mỗi tài khoản chỉ được tham gia 1 lần.' });
        }

        // 2. Quay số lấy phần thưởng
        const prize = rollPrize();
        let generatedCode = null;

        await pool.query('BEGIN'); // Bắt đầu Transaction

        // 3. Lưu lịch sử đã quay
        await pool.query('INSERT INTO spin_history (email, prize_name) VALUES ($1, $2)', [email, prize.name]);

        // 4. Nếu trúng Voucher, tạo mã và lưu vào bảng vouchers
        if (prize.type === 'voucher') {
            // Tạo mã code ngẫu nhiên dạng SPIN-XXXX
            generatedCode = 'SPIN-' + Math.random().toString(36).substring(2, 6).toUpperCase();

            // Set hạn sử dụng là 7 ngày sau
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7);

            // Lưu vào bảng vouchers (bảng anh em mình vừa tạo lúc nãy)
            await pool.query(
                'INSERT INTO vouchers (code, discount_percent, expires_at) VALUES ($1, $2, $3)',
                [generatedCode, prize.discount, expiresAt.toISOString()]
            );
        }

        await pool.query('COMMIT'); // Kết thúc Transaction

        res.json({
            success: true,
            prize: prize.name,
            code: generatedCode
        });

    } catch (err) {
        await pool.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại sau!' });
    }
};