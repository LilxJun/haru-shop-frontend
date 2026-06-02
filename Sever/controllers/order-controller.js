const pool = require('../config/db');

// BẮT BUỘC CÓ CHỮ exports. Ở TẤT CẢ CÁC HÀM
exports.createOrder = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { email, lastname, address, city, phone, shipping_fee, total_amount, payment_method } = req.body;

        const userRes = await client.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userRes.rows.length === 0) throw new Error('Không tìm thấy tài khoản');
        const userId = userRes.rows[0].id;

        const cartRes = await client.query(`
            SELECT c.product_id, c.quantity, c.variant_id, c.selected_model, c.selected_color, COALESCE(pv.price, p.price) AS price
            FROM cart c
            JOIN products p ON c.product_id = p.id
            LEFT JOIN product_variants pv ON c.variant_id = pv.variant_id
            WHERE c.user_id = $1
        `, [userId]);

        if (cartRes.rows.length === 0) throw new Error('Giỏ hàng trống!');

        const orderQuery = `INSERT INTO orders (user_id, email, customer_name, address, city, phone, shipping_fee, total_amount, payment_method) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`;
        const orderResult = await client.query(orderQuery, [userId, email, lastname, address, city, phone, shipping_fee, total_amount, payment_method]);
        const newOrderId = orderResult.rows[0].id;

        for (let item of cartRes.rows) {
            await client.query(`INSERT INTO order_items (order_id, product_id, quantity, price, variant_id, selected_model, selected_color) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [newOrderId, item.product_id, item.quantity, item.price, item.variant_id, item.selected_model, item.selected_color]);
            await client.query(`UPDATE products SET stock = GREATEST(stock - $1, 0) WHERE id = $2`, [item.quantity, item.product_id]);
        }

        await client.query('DELETE FROM cart WHERE user_id = $1', [userId]);
        await client.query('COMMIT');
        res.json({ success: true, orderId: newOrderId });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ success: false, message: err.message });
    } finally {
        client.release();
    }
};

exports.getAdminOrders = async (req, res) => {
    try {
        const query = `
            SELECT o.*, COALESCE(json_agg(json_build_object('product_id', oi.product_id, 'quantity', oi.quantity, 'price', oi.price, 'selected_model', oi.selected_model, 'selected_color', oi.selected_color, 'variant_id', oi.variant_id, 'product_name', p.name, 'product_image', COALESCE(pv.color_img, p.image))) FILTER (WHERE oi.id IS NOT NULL), '[]') as items
            FROM orders o LEFT JOIN order_items oi ON o.id = oi.order_id LEFT JOIN products p ON oi.product_id = p.id LEFT JOIN product_variants pv ON oi.variant_id = pv.variant_id
            GROUP BY o.id ORDER BY o.created_at DESC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getUserOrders = async (req, res) => {
    const { email } = req.params;
    try {
        const userRes = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userRes.rows.length === 0) return res.json([]);
        const userId = userRes.rows[0].id;

        const query = `
            SELECT o.*, COALESCE(json_agg(json_build_object('product_id', oi.product_id, 'quantity', oi.quantity, 'price', oi.price, 'selected_model', oi.selected_model, 'selected_color', oi.selected_color, 'product_name', p.name, 'product_image', COALESCE(pv.color_img, p.image))) FILTER (WHERE oi.id IS NOT NULL), '[]') as items
            FROM orders o LEFT JOIN order_items oi ON o.id = oi.order_id LEFT JOIN products p ON oi.product_id = p.id LEFT JOIN product_variants pv ON oi.variant_id = pv.variant_id
            WHERE o.user_id = $1 GROUP BY o.id ORDER BY o.created_at DESC
        `;
        const result = await pool.query(query, [userId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateOrderStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        await pool.query('UPDATE orders SET status = $1 WHERE id = $2', [status, id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
};