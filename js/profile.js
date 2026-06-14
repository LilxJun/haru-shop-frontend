document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 1. HÀM LẤY EMAIL NGƯỜI DÙNG CHUẨN
    // ==========================================
    function getSafeUserEmail() {
        let directEmail = localStorage.getItem('user_email') || localStorage.getItem('email') || localStorage.getItem('userEmail');
        if (directEmail && !directEmail.startsWith('{')) return directEmail.replace(/['"]/g, '');
        for (let i = 0; i < localStorage.length; i++) {
            let key = localStorage.key(i);
            try {
                let data = JSON.parse(localStorage.getItem(key));
                if (data && typeof data === 'object' && data.email) return data.email;
            } catch (e) { }
        }
        return null;
    }

    const userEmail = getSafeUserEmail();

    // ==========================================
    // 2. XỬ LÝ CHUYỂN TAB (ORDERS / PROFILE)
    // ==========================================
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.style.display = 'none');

            btn.classList.add('active');
            const targetId = btn.getAttribute('data-tab');
            if (document.getElementById(targetId)) {
                document.getElementById(targetId).style.display = 'block';
            }
        });
    });

    // ==========================================
    // 3. ĐỔ DỮ LIỆU VÀO TAB PROFILE
    // ==========================================
    try {
        const userData = {
            name: userEmail ? userEmail.split('@')[0] : "Khách hàng",
            email: userEmail || "Chưa đăng nhập",
            country: "Việt Nam"
        };

        if (document.getElementById('profile-name')) document.getElementById('profile-name').innerText = userData.name;
        if (document.getElementById('profile-email')) document.getElementById('profile-email').innerText = userData.email;
        if (document.getElementById('address-name')) document.getElementById('address-name').innerText = userData.name;

    } catch (error) {
        console.error("Lỗi lấy dữ liệu Profile:", error);
    }

    // ==========================================
    // 4. LOAD DANH SÁCH ĐƠN HÀNG TỪ DATABASE
    // ==========================================
    async function loadUserOrders() {
        const container = document.getElementById('orders-container');
        if (!container || !userEmail) return;

        try {
            const res = await fetch(`https://haru-shop-backend-production-188a.up.railway.app/api/orders/user/${userEmail}`);
            const orders = await res.json();

            // KỊCH BẢN 1: KHÔNG CÓ ĐƠN HÀNG
            if (orders.length === 0) {
                container.classList.add('empty-orders-card');
                container.innerHTML = `
                    <h3>Chưa có đơn hàng nào</h3>
                    <p>Truy cập cửa hàng để đặt hàng.</p>
                    <a href="mice.html" class="go-shopping-btn">Đi đến cửa hàng</a>
                `;
                return;
            }

            // KỊCH BẢN 2: CÓ ĐƠN HÀNG
            container.classList.remove('empty-orders-card');
            let html = '<h3 style="margin-bottom: 25px; font-size: 22px;">Lịch sử đơn hàng của bạn</h3>';

            orders.forEach(o => {
                let statusColor = '#f59e0b'; let statusText = 'Chờ xử lý';
                if (o.status === 'Shipping') { statusColor = '#3b82f6'; statusText = 'Đang giao'; }
                if (o.status === 'Completed') { statusColor = '#10b981'; statusText = 'Hoàn thành'; }
                if (o.status === 'Cancelled') { statusColor = '#ef4444'; statusText = 'Đã hủy'; }

                const dateStr = new Date(o.created_at).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' });

                html += `
                <div style="border: 1px solid #eaeaea; border-radius: 8px; margin-bottom: 20px; padding: 20px; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f0f0f0; padding-bottom: 15px; margin-bottom: 15px;">
                        <div>
                            <strong style="font-size: 16px; color: #111;">Mã đơn: #${o.id}</strong><br>
                            <span style="font-size: 13px; color: #777;">Ngày đặt: ${dateStr}</span>
                        </div>
                        <div style="text-align: right;">
                            <span style="background: ${statusColor}; color: white; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">${statusText}</span><br>
                            <strong style="color: #ef4444; font-size: 16px; display: inline-block; margin-top: 8px;">Tổng: ${Number(o.total_amount).toLocaleString('vi-VN')} Đ</strong>
                        </div>
                    </div>
                `;

                o.items.forEach(item => {
                    let variant = [];
                    if (item.selected_model && item.selected_model !== 'Mặc định') variant.push(item.selected_model);
                    if (item.selected_color && item.selected_color !== 'Mặc định') variant.push(item.selected_color);
                    let variantStr = variant.length > 0 ? `<span style="color:#6366f1;">(${variant.join(' - ')})</span>` : '';

                    let finalImage = item.product_image;
                    if (item.product_colors && item.selected_color && item.selected_color !== 'Mặc định') {
                        try {
                            const colorsArray = typeof item.product_colors === 'string' ? JSON.parse(item.product_colors) : item.product_colors;
                            if (Array.isArray(colorsArray) && colorsArray.length > 0) {
                                const variantColorData = colorsArray.find(c => c.name === item.selected_color);
                                if (variantColorData && variantColorData.image) finalImage = variantColorData.image;
                            }
                        } catch (e) { }
                    }
                    let imgSrc = finalImage && finalImage.startsWith('../') ? finalImage : '../' + (finalImage || 'IMG/default.png');

                    html += `
                    <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 15px;">
                        <img src="${imgSrc}" style="width: 80px; height: 80px; object-fit: contain; background: transparent; border: none; padding: 0;">
                        <div style="flex-grow: 1;">
                            <div style="font-weight: 600; font-size: 16px; color: #333; margin-bottom: 6px;">${item.product_name} ${variantStr}</div>
                            <div style="font-size: 14px; color: #666;">Số lượng: x<strong style="color: #111;">${item.quantity}</strong></div>
                        </div>
                        <div style="font-weight: bold; font-size: 15px; color: #111;">
                            ${Number(item.price).toLocaleString('vi-VN')} Đ
                        </div>
                    </div>`;
                });

                html += `</div>`;
            });

            container.innerHTML = html;
        } catch (e) {
            console.error(e);
            container.innerHTML = '<p style="color:red; text-align:center;">Lỗi tải dữ liệu. Vui lòng thử lại sau.</p>';
        }
    }

    // ==========================================
    // 5. LOAD DANH SÁCH VOUCHER (TỪ HÒM CS:GO)
    // ==========================================
    async function loadMyVouchers() {
        const container = document.getElementById('voucher-list-container');
        if (!container || !userEmail) return;

        try {
            const res = await fetch(`https://haru-shop-backend-production-188a.up.railway.app/api/vouchers/user/${userEmail}`);
            const data = await res.json();

            if (data.length === 0) {
                container.innerHTML = `
                    <div style="background: #f8fafc; border: 1px dashed #cbd5e1; padding: 20px; border-radius: 8px; text-align: center;">
                        <p style="color: #64748b; margin-bottom: 10px;">Bạn chưa có mã giảm giá nào.</p>
                        <a href="spin.html" style="display: inline-block; background: #0b1120; color: #fff; padding: 10px 20px; border-radius: 4px; text-decoration: none; font-weight: bold;">
                            <i class="fas fa-box-open"></i> Đến Mở Hòm Tiếp Tế Ngay
                        </a>
                    </div>
                `;
                return;
            }

            let html = '<div style="display: flex; flex-wrap: wrap; gap: 15px;">';
            data.forEach(item => {
                if (item.voucher_code) {
                    html += `
                        <div style="background: #fff; border: 2px dashed #e74c3c; padding: 20px; border-radius: 12px; min-width: 250px; flex: 1; position: relative; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                            <div style="position: absolute; top: 10px; right: -25px; background: #e74c3c; color: white; padding: 5px 30px; font-size: 11px; font-weight: bold; transform: rotate(45deg);">CHƯA DÙNG</div>
                            <div style="font-weight: bold; color: #475569; margin-bottom: 8px; font-size: 14px;">Mã từ sự kiện mở hòm</div>
                            <div style="font-size: 24px; font-weight: 900; color: #e74c3c; letter-spacing: 2px; margin-bottom: 5px;">${item.voucher_code}</div>
                            <div style="font-size: 16px; font-weight: bold; color: #1e293b; margin-bottom: 10px;">${item.prize_name}</div>
                            <div style="font-size: 12px; color: #64748b;">* Nhập mã này tại bước Thanh toán</div>
                        </div>
                    `;
                } else {
                    html += `
                        <div style="background: #f1f5f9; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; min-width: 250px; flex: 1;">
                            <div style="color: #64748b; margin-bottom: 5px; font-size: 14px;">Lịch sử tham gia:</div>
                            <div style="font-weight: bold; color: #1e293b; font-size: 16px;">${item.prize_name}</div>
                        </div>
                    `;
                }
            });
            html += '</div>';
            container.innerHTML = html;

        } catch (error) {
            console.error(error);
            container.innerHTML = '<p style="color: #ef4444;">Lỗi kết nối! Không thể tải kho Voucher.</p>';
        }
    }

    // Khởi chạy các hàm
    loadUserOrders();
    loadMyVouchers(); // Gọi thêm hàm tải Voucher ở đây
});