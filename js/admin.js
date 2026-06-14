document.addEventListener('DOMContentLoaded', () => {

    // --- 1. HÀM TẢI DANH SÁCH SẢN PHẨM LÊN BẢNG ---
    async function loadAdminProducts() {
        const tbody = document.getElementById('admin-product-list');
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Đang tải dữ liệu...</td></tr>';

        try {
            const response = await fetch('https://haru-shop-backend-production-188a.up.railway.app/api/products');
            const products = await response.json();

            tbody.innerHTML = products.map(p => {
                const imgPath = p.image.startsWith('../') ? p.image : '../' + p.image;
                const statusHtml = p.stock > 0
                    ? `<span class="status-badge status-in">Còn hàng</span>`
                    : `<span class="status-badge status-out">Hết hàng</span>`;

                return `
                    <tr>
                        <td>${p.id}</td>
                        <td><img src="${imgPath}" class="img-preview" alt="img"></td>
                        <td style="font-weight: bold;">${p.name}</td>
                        <td style="color: red; font-weight: bold;">${Number(p.price).toLocaleString('vi-VN')} Đ</td>
                        <td style="text-transform: uppercase;">${p.category}</td>
                        <td>
                            <input type="number" class="stock-input" id="stock-${p.id}" value="${p.stock}" min="0">
                            <br>
                            ${statusHtml}
                        </td>
                        <td>
                            <button class="btn btn-update" onclick="updateStock(${p.id})">Lưu Kho</button>
                            <button class="btn btn-zero" onclick="setOutOfStock(${p.id})">Hết Hàng</button>
                            <button class="btn btn-delete" style="margin-top: 5px;" onclick="deleteProduct(${p.id})">Xóa</button>
                        </td>
                    </tr>
                `;
            }).join('');
        } catch (error) {
            console.error("Lỗi:", error);
            tbody.innerHTML = '<tr><td colspan="7">Lỗi kết nối Server!</td></tr>';
        }
    }

    // --- 2A. HÀM THÊM Ô NHẬP MODEL MỚI ---
    document.getElementById('btn-add-model').addEventListener('click', () => {
        const list = document.getElementById('model-list');
        const div = document.createElement('div');
        div.className = 'model-item';
        div.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px;';
        div.innerHTML = `
            <input type="text" class="model-name" placeholder="Tên model (VD: Extreme)">
            <button type="button" class="btn btn-delete" onclick="this.parentElement.remove()"><i class="fas fa-trash"></i></button>
        `;
        list.appendChild(div);
    });

    // --- 2B. HÀM THÊM Ô NHẬP MÀU SẮC MỚI ---
    document.getElementById('btn-add-color').addEventListener('click', () => {
        const list = document.getElementById('color-list');
        const div = document.createElement('div');
        div.className = 'color-item';
        div.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px;';
        div.innerHTML = `
            <input type="color" class="color-hex" value="#ffffff" style="height: 38px; width: 50px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px;" title="Chọn mã màu">
            <input type="text" class="color-name" placeholder="Tên màu (VD: White)" required>
            <input type="text" class="color-img" placeholder="img/TenFile.jpg (VD: img/ATK-F1-Black.jpg)" required>
            <button type="button" class="btn btn-delete" onclick="this.parentElement.remove()"><i class="fas fa-trash"></i></button>
        `;
        list.appendChild(div);
    });

    // --- 2C. HÀM THÊM Ô NHẬP THÔNG SỐ (SPECS) ---
    document.getElementById('btn-add-spec').addEventListener('click', () => {
        const list = document.getElementById('spec-list');
        const div = document.createElement('div');
        div.className = 'spec-item';
        div.style.cssText = 'display: flex; gap: 15px; margin-bottom: 15px; align-items: center;';
        div.innerHTML = `
            <input type="text" class="spec-label" placeholder="Tên thông số (VD: Trọng lượng)">
            <input type="text" class="spec-value" placeholder="Giá trị (VD: 48g)">
            <button type="button" class="btn btn-delete" onclick="this.parentElement.remove()"><i class="fas fa-trash"></i></button>
        `;
        list.appendChild(div);
    });

    // --- 3. XỬ LÝ KHI BẤM NÚT "THÊM SẢN PHẨM" ---
    document.getElementById('add-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        // 3A. Gom dữ liệu Model
        const modelItems = document.querySelectorAll('.model-item');
        let modelsArray = [];
        modelItems.forEach(item => {
            const mName = item.querySelector('.model-name').value.trim();
            if (mName) {
                modelsArray.push(mName);
            }
        });

        // 3B. Gom dữ liệu Màu sắc
        const colorItems = document.querySelectorAll('.color-item');
        let colorsArray = [];
        colorItems.forEach(item => {
            const cHex = item.querySelector('.color-hex').value;
            const cName = item.querySelector('.color-name').value.trim();
            const cImg = item.querySelector('.color-img').value.trim();
            if (cName && cImg) {
                colorsArray.push({ hex: cHex, name: cName, image: cImg });
            }
        });

        if (colorsArray.length === 0) {
            alert("Vui lòng thêm ít nhất 1 màu sắc và hình ảnh!");
            return;
        }

        // Lấy giá và số lượng kho cấu hình cơ bản
        const basePrice = document.getElementById('add-price').value;
        const baseStock = document.getElementById('add-stock').value;

        // 3C. TẠO MẢNG BIẾN THỂ (VARIANTS)
        let variantsList = [];
        colorsArray.forEach(color => {
            if (modelsArray.length > 0) {
                modelsArray.forEach(modelName => {
                    variantsList.push({
                        modelName: modelName,
                        colorName: color.name,
                        colorHex: color.hex,
                        colorImg: color.image,
                        price: basePrice,
                        stock: baseStock
                    });
                });
            } else {
                variantsList.push({
                    modelName: null,
                    colorName: color.name,
                    colorHex: color.hex,
                    colorImg: color.image,
                    price: basePrice,
                    stock: baseStock
                });
            }
        });

        // 3D. Gom dữ liệu Specs (Thông số kỹ thuật)
        const specItems = document.querySelectorAll('.spec-item');
        let specsArray = [];
        specItems.forEach(item => {
            const sLabel = item.querySelector('.spec-label').value.trim();
            const sValue = item.querySelector('.spec-value').value.trim();
            if (sLabel && sValue) {
                specsArray.push({ label: sLabel, value: sValue });
            }
        });

        // 3E. Lấy dữ liệu Mô tả
        const descriptionValue = document.getElementById('add-description').value.trim();

        // 3F. Đóng gói sản phẩm mới
        const newProduct = {
            name: document.getElementById('add-name').value,
            category: document.getElementById('add-category').value,
            description: descriptionValue ? descriptionValue : null,
            variants: variantsList,
            specs: specsArray.length > 0 ? specsArray : null
        };

        try {
            const res = await fetch('https://haru-shop-backend-production-188a.up.railway.app/api/products/add-complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newProduct)
            });
            const data = await res.json();
            if (data.success) {
                alert("Thêm sản phẩm thành công!");
                document.getElementById('add-form').reset();

                // Khôi phục form trống
                document.getElementById('color-list').innerHTML = `
                    <div class="color-item" style="display: flex; gap: 10px; margin-bottom: 10px;">
                        <input type="color" class="color-hex" value="#000000" style="height: 38px; width: 50px; cursor: pointer; border: 1px solid #ccc; border-radius: 4px;" title="Chọn mã màu">
                        <input type="text" class="color-name" placeholder="Tên màu (VD: Black)" required>
                        <input type="text" class="color-img" placeholder="img/TenFile.jpg (VD: img/ATK-F1-Black.jpg)" required>
                        <button type="button" class="btn btn-delete" onclick="this.parentElement.remove()"><i class="fas fa-trash"></i></button>
                    </div>`;
                document.getElementById('model-list').innerHTML = `
                    <div class="model-item" style="display: flex; gap: 10px; margin-bottom: 10px;">
                        <input type="text" class="model-name" placeholder="Tên model (VD: Ultimate, Pro Max...)">
                        <button type="button" class="btn btn-delete" onclick="this.parentElement.remove()"><i class="fas fa-trash"></i></button>
                    </div>`;
                document.getElementById('spec-list').innerHTML = `
                    <div class="spec-item" style="display: flex; gap: 15px; margin-bottom: 15px; align-items: center;">
                        <input type="text" class="spec-label" placeholder="Tên thông số (VD: Cảm biến)">
                        <input type="text" class="spec-value" placeholder="Giá trị (VD: PAW 3950HS)">
                        <button type="button" class="btn btn-delete" onclick="this.parentElement.remove()"><i class="fas fa-trash"></i></button>
                    </div>`;
                document.getElementById('add-description').value = '';

                loadAdminProducts();
            } else {
                alert("Lỗi: " + data.error);
            }
        } catch (err) {
            console.error(err);
        }
    });

    // --- 4. CÁC HÀM XỬ LÝ TRONG BẢNG SẢN PHẨM ---
    window.updateStock = async (id) => {
        const newStock = document.getElementById(`stock-${id}`).value;
        try {
            const res = await fetch(`https://haru-shop-backend-production-188a.up.railway.app/api/products/admin/${id}/stock`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stock: newStock })
            });
            if (res.ok) {
                alert("Cập nhật kho thành công!");
                loadAdminProducts();
            }
        } catch (err) {
            alert("Cập nhật thất bại!");
        }
    };

    window.setOutOfStock = async (id) => {
        if (confirm("Xác nhận đổi sản phẩm này thành Hết hàng?")) {
            try {
                const res = await fetch(`https://haru-shop-backend-production-188a.up.railway.app/api/products/admin/${id}/stock`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ stock: 0 })
                });
                if (res.ok) loadAdminProducts();
            } catch (err) {
                alert("Thao tác thất bại!");
            }
        }
    };

    window.deleteProduct = async (id) => {
        if (confirm("CẢNH BÁO: Bạn có chắc chắn muốn xóa hẳn sản phẩm này khỏi Shop không?")) {
            try {
                const res = await fetch(`https://haru-shop-backend-production-188a.up.railway.app/api/products/admin/${id}`, {
                    method: 'DELETE'
                });
                if (res.ok) {
                    alert("Đã xóa sản phẩm!");
                    loadAdminProducts();
                }
            } catch (err) {
                alert("Xóa thất bại!");
            }
        }
    };

    // ==========================================
    // 5. TẢI VÀ HIỂN THỊ DANH SÁCH ĐƠN HÀNG
    // ==========================================
    async function loadAdminOrders() {
        const tbody = document.getElementById('admin-orders-list');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Đang tải đơn hàng...</td></tr>';

        try {
            const response = await fetch('https://haru-shop-backend-production-188a.up.railway.app/api/orders/admin');
            const textResponse = await response.text();
            let orders;
            try {
                orders = JSON.parse(textResponse);
            } catch (e) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: red;">Lỗi Server: Không trả về dữ liệu chuẩn.</td></tr>';
                return;
            }

            if (!Array.isArray(orders)) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: red;">Lỗi dữ liệu: Không nhận được mảng đơn hàng.</td></tr>';
                return;
            }

            if (orders.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #666;">Chưa có đơn hàng nào.</td></tr>';
                return;
            }

            tbody.innerHTML = orders.map(o => {
                const itemsList = Array.isArray(o.items) ? o.items : [];
                const itemsHtml = itemsList.map(item => {
                    let model = (item.selected_model && item.selected_model !== 'Mặc định') ? item.selected_model : '';
                    let color = (item.selected_color && item.selected_color !== 'Mặc định') ? item.selected_color : '';
                    let variantLine = [model, color].filter(Boolean).join(' / ');

                    let imgSrc = '../img/default.png';
                    if (item.product_image && item.product_image !== 'null') {
                        let dbImage = item.product_image.replace(/^IMG\//i, 'img/');
                        imgSrc = dbImage.startsWith('../') ? dbImage : '../' + dbImage;
                    }

                    let prodName = item.product_name || 'Sản phẩm không xác định';

                    return `
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 8px;">
                    <img src="${imgSrc}" style="width: 40px; height: 40px; object-fit: contain; border-radius: 4px; background: #f8fafc; border: 1px solid #e2e8f0;">
                    <div style="font-size: 13px;">
                        <b>${prodName}</b><br>
                        ${variantLine ? `<span style="color:#6366f1; font-size:12px;">📦 ${variantLine}</span><br>` : ''}
                        Số lượng: <b style="color: #ef4444;">${item.quantity || 0}</b> | Giá: ${Number(item.price || 0).toLocaleString('vi-VN')} Đ
                    </div>
                </div>`;
                }).join('');

                let statusColor = '#f59e0b';
                let statusText = 'Chờ xử lý';
                if (o.status === 'Shipping') { statusColor = '#3b82f6'; statusText = 'Đang giao'; }
                else if (o.status === 'Completed') { statusColor = '#10b981'; statusText = 'Hoàn thành'; }
                else if (o.status === 'Cancelled') { statusColor = '#ef4444'; statusText = 'Đã hủy'; }

                return `
            <tr>
                <td>#${o.id || ''}</td>
                <td><b>${o.customer_name || ''}</b><br>${o.phone || ''}</td>
                <td>${itemsHtml}</td>
                <td><b>${Number(o.total_amount || 0).toLocaleString('vi-VN')} Đ</b></td>
                <td><span style="background-color:${statusColor}; color:white; padding: 4px 8px; border-radius: 12px; font-size:12px;">${statusText}</span></td>
                <td>
                    <select onchange="updateOrderStatus(${o.id}, this.value)">
                        <option value="Pending" ${o.status === 'Pending' ? 'selected' : ''}>Chờ xử lý</option>
                        <option value="Shipping" ${o.status === 'Shipping' ? 'selected' : ''}>Đang giao</option>
                        <option value="Completed" ${o.status === 'Completed' ? 'selected' : ''}>Hoàn thành</option>
                        <option value="Cancelled" ${o.status === 'Cancelled' ? 'selected' : ''}>Hủy đơn</option>
                    </select>
                </td>
            </tr>`;
            }).join('');
        } catch (error) {
            console.error("Lỗi Frontend:", error);
        }
    }

    // ==========================================
    // 6. CẬP NHẬT TRẠNG THÁI ĐƠN HÀNG
    // ==========================================
    window.updateOrderStatus = async (id, newStatus) => {
        try {
            const res = await fetch(`https://haru-shop-backend-production-188a.up.railway.app/api/orders/admin/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) {
                loadAdminOrders();
            } else {
                alert("Cập nhật thất bại!");
            }
        } catch (e) {
            alert("Lỗi kết nối khi cập nhật!");
        }
    }

    // ==========================================
    // 7. QUẢN LÝ VOUCHER (MÃ GIẢM GIÁ)
    // ==========================================
    async function loadVouchers() {
        const tbody = document.getElementById('voucher-table-body');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Đang tải dữ liệu...</td></tr>';

        try {
            const res = await fetch('https://haru-shop-backend-production-188a.up.railway.app/api/vouchers');
            const data = await res.json();

            if (!data || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #666;">Chưa có mã giảm giá nào.</td></tr>';
                return;
            }

            tbody.innerHTML = data.map(v => {
                const date = new Date(v.expires_at).toLocaleDateString('vi-VN');
                const isExpired = new Date(v.expires_at) < new Date();
                const status = isExpired ? '<span style="color:#ef4444; font-weight:bold;">Hết hạn</span>' : '<span style="color:#10b981; font-weight:bold;">Còn hạn</span>';

                return `
                    <tr>
                        <td><strong>${v.code}</strong></td>
                        <td style="color: #ef4444; font-weight: bold;">${v.discount_percent}%</td>
                        <td>${date}</td>
                        <td>${status}</td>
                        <td>
                            <button onclick="deleteVoucher(${v.id})" class="btn btn-delete" style="padding: 6px 12px;"><i class="fas fa-trash"></i> Xóa</button>
                        </td>
                    </tr>
                `;
            }).join('');
        } catch (err) {
            console.error(err);
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: red;">Lỗi tải dữ liệu voucher!</td></tr>';
        }
    }

    // Hàm gắn vào window để gọi từ nút HTML
    window.addVoucher = async () => {
        const code = document.getElementById('v-code').value.trim();
        const discount_percent = document.getElementById('v-discount').value;
        const expires_at = document.getElementById('v-date').value;

        if (!code || !discount_percent || !expires_at) {
            return alert("Vui lòng điền đủ thông tin!");
        }

        try {
            const res = await fetch('https://haru-shop-backend-production-188a.up.railway.app/api/vouchers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, discount_percent, expires_at })
            });

            const data = await res.json();
            if (data.success) {
                alert("Thêm mã giảm giá thành công!");
                // Xóa trắng form nhập
                document.getElementById('v-code').value = '';
                document.getElementById('v-discount').value = '';
                document.getElementById('v-date').value = '';
                loadVouchers(); // Render lại bảng
            } else {
                alert(data.error || "Thêm thất bại!");
            }
        } catch (err) {
            alert("Lỗi kết nối server!");
        }
    };

    window.deleteVoucher = async (id) => {
        if (!confirm("Sếp có chắc chắn muốn xóa mã này không?")) return;

        try {
            const res = await fetch(`https://haru-shop-backend-production-188a.up.railway.app/api/vouchers/${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                alert("Đã xóa mã giảm giá!");
                loadVouchers();
            } else {
                alert("Xóa thất bại!");
            }
        } catch (err) {
            alert("Lỗi kết nối server!");
        }
    };

    // Gọi các hàm tải dữ liệu ngay khi vào trang Admin
    loadAdminProducts();
    loadAdminOrders();
    loadVouchers();

    // ==========================================
    // 8. LOGIC CHUYỂN TAB (DASHBOARD MENU)
    // ==========================================
    const menuItems = document.querySelectorAll('.menu-item');
    const tabPanes = document.querySelectorAll('.tab-pane');

    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            // 1. Gỡ viền sáng ở tất cả các nút Menu
            menuItems.forEach(m => m.classList.remove('active'));
            // 2. Ẩn tất cả các màn hình Nội dung
            tabPanes.forEach(t => t.classList.remove('active'));

            // 3. Đánh dấu nút Menu vừa bấm
            item.classList.add('active');

            // 4. Mở màn hình Nội dung tương ứng (dựa vào data-target)
            const targetId = item.getAttribute('data-target');
            const targetTab = document.getElementById(targetId);
            if (targetTab) {
                targetTab.classList.add('active');
            }
        });
    });

});