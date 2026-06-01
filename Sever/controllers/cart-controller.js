const pool = require('../config/db');

exports.addToCart = async (req, res) => {
    const { user_email, product_id, quantity, variant_id } = req.body;
    try {
        const userRes = await pool.query('SELECT id FROM users WHERE email = $1', [user_email]);
        if (userRes.rows.length === 0) return res.status(404).json({ success: false, message: "User not found" });
        const userId = userRes.rows[0].id;

        await pool.query(
            `INSERT INTO cart (user_id, product_id, quantity, variant_id) VALUES ($1, $2, $3, $4) 
             ON CONFLICT (user_id, product_id, variant_id) DO UPDATE SET quantity = cart.quantity + EXCLUDED.quantity`,
            [userId, product_id, quantity || 1, variant_id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.getCart = async (req, res) => {
    const { email } = req.params;
    try {
        const userRes = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userRes.rows.length === 0) return res.json([]);
        const userId = userRes.rows[0].id;

        const cartRes = await pool.query(`
            SELECT c.id, c.product_id, c.quantity, c.variant_id, p.name AS product_name, 
                   COALESCE(pv.price, p.price) AS product_price, COALESCE(pv.color_img, p.image) AS product_image, 
                   pv.model_name AS selected_model, pv.color_name AS selected_color
            FROM cart c
            JOIN products p ON c.product_id = p.id
            LEFT JOIN product_variants pv ON c.variant_id = pv.variant_id
            WHERE c.user_id = $1 ORDER BY c.id ASC
        `, [userId]);

        res.json(cartRes.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateCart = async (req, res) => {
    const { id } = req.params;
    const { quantity } = req.body;
    try {
        await pool.query('UPDATE cart SET quantity = $1 WHERE id = $2', [quantity, id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
};

exports.deleteItem = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM cart WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
};

exports.clearCart = async (req, res) => {
    const { email } = req.params;
    try {
        const userRes = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userRes.rows.length === 0) return res.status(404).json({ success: false });
        const userId = userRes.rows[0].id;

        await pool.query('DELETE FROM cart WHERE user_id = $1', [userId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
};