const pool = require('../config/db');

exports.getAllProducts = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM products ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Lỗi Server" });
    }
};

exports.filterProducts = async (req, res) => {
    try {
        let { category, minPrice, maxPrice, sortBy, in_stock, out_of_stock, page, limit } = req.query;
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 8;
        const offset = (page - 1) * limit;

        let queryParams = [];
        let whereClauses = [];
        let paramIndex = 1;

        if (category) { whereClauses.push(`category = $${paramIndex}`); queryParams.push(category); paramIndex++; }
        if (minPrice && minPrice > 0) { whereClauses.push(`price >= $${paramIndex}`); queryParams.push(minPrice); paramIndex++; }
        if (maxPrice && maxPrice > 0) { whereClauses.push(`price <= $${paramIndex}`); queryParams.push(maxPrice); paramIndex++; }

        if (in_stock === 'true' && out_of_stock !== 'true') whereClauses.push(`stock > 0`);
        else if (out_of_stock === 'true' && in_stock !== 'true') whereClauses.push(`stock <= 0`);

        const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
        let orderString = 'ORDER BY id ASC';
        if (sortBy === 'price-asc') orderString = 'ORDER BY price ASC';
        if (sortBy === 'price-desc') orderString = 'ORDER BY price DESC';
        if (sortBy === 'name-asc') orderString = 'ORDER BY name ASC';
        if (sortBy === 'name-desc') orderString = 'ORDER BY name DESC';

        const countQuery = `SELECT COUNT(*) FROM products ${whereString}`;
        const countRes = await pool.query(countQuery, queryParams);
        const totalItems = parseInt(countRes.rows[0].count);
        const totalPages = Math.ceil(totalItems / limit);

        const dataQuery = `SELECT * FROM products ${whereString} ${orderString} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        queryParams.push(limit, offset);

        const result = await pool.query(dataQuery, queryParams);
        res.json({ products: result.rows, totalPages, currentPage: page });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getStockStats = async (req, res) => {
    try {
        const { category } = req.query;
        let query = `SELECT COUNT(CASE WHEN stock > 0 THEN 1 END) AS in_stock_count, COUNT(CASE WHEN stock <= 0 THEN 1 END) AS out_of_stock_count FROM products`;
        let queryParams = [];
        if (category) { query += ` WHERE category = $1`; queryParams.push(category); }
        const result = await pool.query(query, queryParams);
        res.json({ in_stock: parseInt(result.rows[0].in_stock_count) || 0, out_of_stock: parseInt(result.rows[0].out_of_stock_count) || 0 });
    } catch (err) {
        res.status(500).json({ error: "Lỗi đếm số lượng" });
    }
};

exports.getHomepageProducts = async (req, res) => {
    const section = req.query.section;
    let queryColumn = '';
    switch (section) {
        case 'top_gear': queryColumn = 'is_top_gear'; break;
        case 'best_seller': queryColumn = 'is_best_seller'; break;
        case 'new_release': queryColumn = 'is_new'; break;
        default: return res.status(400).json({ message: 'Mục không hợp lệ!' });
    }
    try {
        const result = await pool.query(`SELECT * FROM products WHERE ${queryColumn} = TRUE LIMIT 5`);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi Server!' });
    }
};

exports.getProductDetail = async (req, res) => {
    const { id } = req.params;
    try {
        const productRes = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
        if (productRes.rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });

        let product = productRes.rows[0];
        const variantsRes = await pool.query('SELECT * FROM product_variants WHERE product_id = $1', [id]);
        product.variants = variantsRes.rows;

        const specsRes = await pool.query('SELECT * FROM product_specs WHERE product_id = $1', [id]);
        product.specs = specsRes.rows;

        res.json(product);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getReviews = async (req, res) => {
    const { id } = req.params;
    try {
        const query = `SELECT r.id, r.rating, r.comment, r.created_at, u.username FROM reviews r JOIN users u ON r.user_id = u.id WHERE r.product_id = $1 ORDER BY r.created_at DESC`;
        const result = await pool.query(query, [id]);
        const reviews = result.rows;
        const totalReviews = reviews.length;
        const averageRating = totalReviews > 0 ? (reviews.reduce((sum, rev) => sum + rev.rating, 0) / totalReviews).toFixed(1) : 0;
        res.json({ reviews, totalReviews, averageRating });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi Server' });
    }
};

exports.addReview = async (req, res) => {
    const { id } = req.params;
    const { email, rating, comment } = req.body;
    try {
        const userRes = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userRes.rows.length === 0) return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập để đánh giá!' });
        const userId = userRes.rows[0].id;

        const checkRes = await pool.query('SELECT id FROM reviews WHERE product_id = $1 AND user_id = $2', [id, userId]);
        if (checkRes.rows.length > 0) return res.status(400).json({ success: false, message: 'Bạn đã đánh giá sản phẩm này rồi!' });

        await pool.query('INSERT INTO reviews (product_id, user_id, rating, comment) VALUES ($1, $2, $3, $4)', [id, userId, rating, comment]);
        res.json({ success: true, message: 'Đã gửi đánh giá thành công!' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi Server' });
    }
};

exports.addCompleteProduct = async (req, res) => {
    const { name, category, description, variants, specs } = req.body;
    if (!name || !category) return res.status(400).json({ error: "Tên sản phẩm và danh mục là bắt buộc!" });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const defaultPrice = variants && variants.length > 0 ? variants[0].price : 0;
        const defaultStock = variants && variants.length > 0 ? variants[0].stock : 0;
        const defaultImage = variants && variants.length > 0 ? variants[0].colorImg : null;

        const insertProductSQL = `INSERT INTO products (name, category, price, stock, image, description) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`;
        const productResult = await client.query(insertProductSQL, [name, category, defaultPrice, defaultStock, defaultImage, description || null]);
        const newProductId = productResult.rows[0].id;

        if (variants && variants.length > 0) {
            const insertVariantSQL = `INSERT INTO product_variants (product_id, model_name, color_name, color_hex, color_img, price, stock) VALUES ($1, $2, $3, $4, $5, $6, $7)`;
            for (let v of variants) {
                await client.query(insertVariantSQL, [newProductId, v.modelName || null, v.colorName, v.colorHex, v.colorImg, v.price, v.stock]);
            }
        }

        if (specs && specs.length > 0) {
            const insertSpecSQL = `INSERT INTO product_specs (product_id, spec_label, spec_value) VALUES ($1, $2, $3)`;
            for (let s of specs) {
                if (s.label && s.value) await client.query(insertSpecSQL, [newProductId, s.label, s.value]);
            }
        }

        await client.query('COMMIT');
        res.status(201).json({ success: true, message: "Thêm sản phẩm thành công!", productId: newProductId });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ success: false, error: "Lỗi hệ thống!" });
    } finally {
        client.release();
    }
};

exports.updateStock = async (req, res) => {
    const { id } = req.params;
    const { stock } = req.body;
    try {
        await pool.query('UPDATE products SET stock = $1 WHERE id = $2', [stock, id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.deleteProduct = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM products WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};