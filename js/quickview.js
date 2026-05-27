document.addEventListener('DOMContentLoaded', () => {
    const qvOverlay = document.getElementById('quick-view-overlay');
    const qvCloseBtn = document.getElementById('quick-view-close-btn');
    const qvImg = document.getElementById('qv-main-img');
    const qvTitle = document.getElementById('qv-title');
    const qvPrice = document.getElementById('qv-price');
    const qvModelList = document.getElementById('qv-model-list');
    const qvColorList = document.getElementById('qv-color-list');
    const qvModelText = document.getElementById('qv-selected-model');
    const qvColorText = document.getElementById('qv-selected-color');
    const qtyInput = document.getElementById('qv-input-qty');
    const btnMinus = document.getElementById('qv-qty-minus');
    const btnPlus = document.getElementById('qv-qty-plus');
    const btnAddToCart = document.getElementById('qv-add-to-cart');
    const btnViewDetails = document.getElementById('qv-view-details');

    let currentProduct = null;
    let selectedVariantId = null;
    let selectedModel = '';
    let selectedColor = '';
    let currentPrice = 0;
    let quantity = 1;

    document.body.addEventListener('click', async (e) => {
        const btn = e.target.closest('.quick-add-btn') || e.target.closest('.reco-quick-add');
        if (btn) {
            e.preventDefault();
            const productId = btn.getAttribute('data-id');
            if (productId) await openQuickView(productId);
        }
    });

    async function openQuickView(id) {
        try {
            const res = await fetch(`https://haru-shop-backend-production.up.railway.app/api/products/${id}`);
            const product = await res.json();

            if (!product || product.error) { alert("Không tìm thấy thông tin sản phẩm."); return; }

            currentProduct = product;
            quantity = 1;
            qtyInput.value = 1;
            qvTitle.innerText = product.name;
            btnViewDetails.href = `product-detail.html?id=${product.id}`;

            const variants = product.variants || [];

            // ── LẤY DANH SÁCH MODEL DUY NHẤT ──
            const uniqueModels = [...new Set(variants.map(v => v.model_name).filter(Boolean))];

            if (uniqueModels.length > 0) {
                selectedModel = uniqueModels[0];
                qvModelText.innerText = selectedModel;
                qvModelList.innerHTML = uniqueModels.map((m, i) => `
                    <button class="model-btn option-btn ${i === 0 ? 'active' : ''}" data-name="${m}">${m}</button>
                `).join('');
            } else {
                selectedModel = '';
                qvModelText.innerText = '';
                qvModelList.innerHTML = '<span style="font-size:13px; color:#999;">Không có tuỳ chọn</span>';
            }

            // ── VẼ MÀU THEO MODEL ĐANG CHỌN ──
            renderColors(variants, selectedModel);

            qvOverlay.classList.add('active');
            bindOptionEvents(variants);

        } catch (err) {
            console.error("Lỗi Quick View:", err);
            alert("Lỗi kết nối Server!");
        }
    }

    function renderColors(variants, modelName) {
        // Lọc variant theo model đang chọn (nếu có model)
        const filtered = modelName
            ? variants.filter(v => v.model_name === modelName)
            : variants;

        if (filtered.length === 0) {
            qvColorList.innerHTML = '<span style="font-size:13px; color:#999;">Không có tuỳ chọn</span>';
            return;
        }

        // Chọn màu đầu tiên mặc định
        const first = filtered[0];
        selectedColor = first.color_name;
        selectedVariantId = first.variant_id;
        currentPrice = first.price;
        qvColorText.innerText = selectedColor;

        // Hiển thị ảnh màu đầu tiên
        const firstImg = first.color_img ? (first.color_img.startsWith('../') ? first.color_img : '../' + first.color_img) : ('../' + currentProduct.image);
        qvImg.src = firstImg;
        updatePrice();

        qvColorList.innerHTML = filtered.map((v, i) => {
            let imgSrc = v.color_img ? (v.color_img.startsWith('../') ? v.color_img : '../' + v.color_img) : ('../' + currentProduct.image);
            return `
            <button class="color-variant-btn ${i === 0 ? 'active' : ''}"
                    data-variant-id="${v.variant_id}"
                    data-name="${v.color_name}"
                    data-price="${v.price}"
                    data-img="${imgSrc}"
                    title="${v.color_name}">
                <img src="${imgSrc}" alt="${v.color_name}">
            </button>`;
        }).join('');
    }

    function bindOptionEvents(variants) {
        // Chọn Model
        qvModelList.querySelectorAll('.model-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                qvModelList.querySelectorAll('.model-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedModel = btn.getAttribute('data-name');
                qvModelText.innerText = selectedModel;
                renderColors(variants, selectedModel);
                // Gắn lại event màu sau khi render mới
                bindColorEvents();
            });
        });

        bindColorEvents();
    }

    function bindColorEvents() {
        qvColorList.querySelectorAll('.color-variant-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                qvColorList.querySelectorAll('.color-variant-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedColor = btn.getAttribute('data-name');
                selectedVariantId = btn.getAttribute('data-variant-id');
                currentPrice = btn.getAttribute('data-price');
                qvColorText.innerText = selectedColor;
                qvImg.src = btn.getAttribute('data-img');
                updatePrice();
            });
        });
    }

    function updatePrice() {
        qvPrice.innerText = Number(currentPrice).toLocaleString('vi-VN') + ' Đ';
    }

    if (btnMinus) btnMinus.addEventListener('click', () => { if (quantity > 1) { quantity--; qtyInput.value = quantity; } });
    if (btnPlus) btnPlus.addEventListener('click', () => { quantity++; qtyInput.value = quantity; });

    if (btnAddToCart) {
        btnAddToCart.addEventListener('click', async () => {
            if (!currentProduct) return;

            let userEmail = null;
            try {
                const user = JSON.parse(localStorage.getItem('haru-current-user'));
                if (user && user.email) userEmail = user.email;
            } catch (e) { }
            if (!userEmail) userEmail = localStorage.getItem('user_email') || localStorage.getItem('email');

            if (!userEmail) {
                if (typeof showToast === 'function') showToast("Vui lòng đăng nhập để mua hàng!", false);
                else alert("Vui lòng đăng nhập để mua hàng!");
                setTimeout(() => window.location.href = 'login.html', 1500);
                return;
            }

            const originalText = btnAddToCart.innerText;
            btnAddToCart.innerText = "ĐANG THÊM VÀO GIỎ...";
            btnAddToCart.style.opacity = "0.7";

            try {
                const response = await fetch('https://haru-shop-backend-production.up.railway.app/api/cart', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_email: userEmail,
                        product_id: currentProduct.id,
                        quantity: quantity,
                        variant_id: selectedVariantId,  // ✅ Gửi variant_id chuẩn
                        selected_model: selectedModel,
                        selected_color: selectedColor
                    })
                });
                const result = await response.json();

                if (result.success) {
                    qvOverlay.classList.remove('active');

                    let variantInfo = [];
                    if (selectedModel) variantInfo.push(selectedModel);
                    if (selectedColor) variantInfo.push(selectedColor);
                    let displayName = currentProduct.name + (variantInfo.length > 0 ? ` (${variantInfo.join(' - ')})` : '');

                    if (typeof showToast === 'function') showToast(`Đã thêm ${displayName} vào giỏ!`);
                    if (typeof loadCartFromDB === 'function') loadCartFromDB();
                    else setTimeout(() => window.location.reload(), 1000);
                }
            } catch (error) {
                console.error("Lỗi thêm vào giỏ:", error);
                if (typeof showToast === 'function') showToast("Lỗi kết nối khi thêm vào giỏ hàng!");
            } finally {
                btnAddToCart.innerText = originalText;
                btnAddToCart.style.opacity = "1";
            }
        });
    }

    if (qvCloseBtn) qvCloseBtn.addEventListener('click', () => qvOverlay.classList.remove('active'));
    if (qvOverlay) qvOverlay.addEventListener('click', (e) => { if (e.target === qvOverlay) qvOverlay.classList.remove('active'); });
});