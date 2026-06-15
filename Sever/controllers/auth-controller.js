require('dotenv').config();
const pool = require('../config/db');
const nodemailer = require('nodemailer');

// const transporter = nodemailer.createTransport({
//     service: 'gmail',
//     auth: {
//         user: process.env.EMAIL_USER,
//         pass: process.env.EMAIL_PASS  // Nodemailer sẽ tự lấy cái mã viết liền từ Railway
//     }
// });

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'linn70180@gmail.com',     // Điền thẳng email của sếp vào đây
        pass: 'sslhtttgbjfxhfvg'         // Điền thẳng mã App Password viết liền vào đây
    }
});

exports.register = async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) return res.status(400).json({ success: false, message: 'Email đã được sử dụng!' });

        await pool.query('INSERT INTO users (username, email, password) VALUES ($1, $2, $3)', [username, email, password]);
        res.json({ success: true, message: 'Đăng ký thành công!' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi Server!' });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const userRes = await pool.query('SELECT * FROM users WHERE email = $1 AND password = $2', [email, password]);
        if (userRes.rows.length > 0) {
            res.json({
                success: true,
                user: {
                    username: userRes.rows[0].username,
                    email: userRes.rows[0].email,
                    role: userRes.rows[0].role
                }
            });
        } else {
            res.status(401).json({ success: false, message: 'Sai email hoặc mật khẩu!' });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi Server!' });
    }
};

exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const userRes = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Email này chưa được đăng ký!' });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = new Date(Date.now() + 15 * 60000);

        await pool.query('UPDATE users SET otp = $1, otp_expiry = $2 WHERE email = $3', [otp, expiry, email]);

        const mailOptions = {
            from: '"Haru Shop - Gaming Gear" <' + process.env.EMAIL_USER + '>',
            to: email,
            subject: 'Mã xác nhận khôi phục mật khẩu - Haru Shop',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f8fafc; border-radius: 8px; max-width: 500px; margin: auto;">
                    <h2 style="color: #0b1120; text-align: center;">KHÔI PHỤC MẬT KHẨU</h2>
                    <p style="color: #334155; font-size: 16px;">Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản Haru Shop. Vui lòng sử dụng mã OTP dưới đây để tiếp tục:</p>
                    <div style="background-color: #0b1120; color: #fbbf24; font-size: 28px; font-weight: bold; letter-spacing: 5px; text-align: center; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        ${otp}
                    </div>
                    <p style="color: #ef4444; font-size: 14px; font-style: italic;">* Mã này sẽ hết hạn trong vòng 15 phút.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: 'Đã gửi mã OTP đến email!' });
    } catch (err) {
        // IN LỖI CHI TIẾT RA CONSOLE CỦA RAILWAY
        console.error("=== LỖI GỬI MAIL CHI TIẾT ===");
        console.error(err);
        console.error("=============================");

        // TRẢ LỖI THẬT VỀ CHO TRANG WEB ĐỂ DỄ ĐỌC
        res.status(500).json({
            success: false,
            message: 'Lỗi gửi mail chi tiết: ' + err.message
        });
    }
};

exports.resetPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;
    try {
        const userRes = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userRes.rows.length === 0) return res.status(404).json({ success: false, message: 'User không tồn tại!' });

        const user = userRes.rows[0];
        const now = new Date();

        if (user.otp !== otp) return res.status(400).json({ success: false, message: 'Mã OTP không chính xác!' });
        if (now > user.otp_expiry) return res.status(400).json({ success: false, message: 'Mã OTP đã hết hạn!' });

        await pool.query('UPDATE users SET password = $1, otp = NULL, otp_expiry = NULL WHERE email = $2', [newPassword, email]);
        res.json({ success: true, message: 'Đổi mật khẩu thành công!' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi Server!' });
    }
};