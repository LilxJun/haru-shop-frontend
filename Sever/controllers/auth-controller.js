const pool = require('../config/db');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
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
            from: '"Haru Shop" <linn70180@gmail.com>',
            to: email,
            subject: 'Khôi phục mật khẩu - Haru Shop',
            html: `<div style="padding: 20px;"><h2>Xin chào!</h2><p>Mã OTP của bạn là: <strong>${otp}</strong></p></div>`
        };

        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: 'Đã gửi mã OTP đến email!' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi Server không thể gửi mail!' });
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