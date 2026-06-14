const fetch = require('node-fetch');
const pool = require('../config/db');

exports.chat = async (req, res) => {
    const { message, history } = req.body;
    if (!message) return res.status(400).json({ error: 'Missing message' });

    try {
        // Lấy danh sách sản phẩm từ DB
        const productsRes = await pool.query('SELECT id, name, price, category, stock FROM products ORDER BY category ASC');
        const products = productsRes.rows;

        const productList = products.map(p =>
            `- ${p.name} | Danh muc: ${p.category} | Gia: ${Number(p.price).toLocaleString('vi-VN')} VND | ${p.stock > 0 ? 'Con hang' : 'Het hang'}`
        ).join('\n');

        const systemPrompt = `Ban la HaruBot, tro ly AI cua Haru Shop - chuyen ban gear gaming cao cap.
Ban biet tieng Viet, tra loi than thien va nhiet tinh.
Cac tu ky thuat nhu: polling rate, switch, sensor, DPI, wireless, USB dongle, Hall Effect, rapid trigger... giu nguyen tieng Anh, khong dich.

DANH SACH SAN PHAM HIEN TAI CUA HARU SHOP:
${productList}

HUONG DAN:
- Tu van san pham phu hop voi nhu cau nguoi dung (budget, kieu cam, game choi...)
- Giai thich thong so ky thuat ro rang, de hieu
- Neu san pham het hang thi bao nguoi dung va goi y san pham tuong tu
- Neu duoc hoi gia thi tra loi chinh xac theo danh sach tren
- Khong biet thi noi khong biet, khong bịa
- Tra loi ngan gon, khong qua 200 tu moi tin nhan`;

        const contents = [];

        // Them lich su chat
        if (history && Array.isArray(history)) {
            history.forEach(h => {
                contents.push({ role: h.role, parts: [{ text: h.text }] });
            });
        }

        // Them tin nhan moi
        contents.push({ role: 'user', parts: [{ text: message }] });

        const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    system_instruction: { parts: [{ text: systemPrompt }] },
                    contents: contents,
                    generationConfig: { maxOutputTokens: 500, temperature: 0.7 }
                })
            }
        );

        const data = await geminiRes.json();

        if (data.error) {
            console.error('Gemini error:', data.error);
            return res.status(500).json({ error: data.error.message });
        }

        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Xin loi, toi khong hieu cau hoi nay.';
        res.json({ reply });

    } catch (err) {
        console.error('HaruBot error:', err.message);
        res.status(500).json({ error: err.message });
    }
};