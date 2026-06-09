document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // 1. MÁY QUÉT EMAIL TỰ ĐỘNG & THIẾT LẬP
    // ==========================================
    function getSafeUserEmail() {
        try {
            const currentUserJSON = localStorage.getItem('haru-current-user');
            if (currentUserJSON) {
                const currentUser = JSON.parse(currentUserJSON);
                if (currentUser && currentUser.email) {
                    return currentUser.email;
                }
            }
        } catch (e) {
            console.error("Lỗi đọc user");
        }
        return localStorage.getItem('user_email') || localStorage.getItem('email');
    }

    const currentUserEmail = getSafeUserEmail();

    if (!currentUserEmail) {
        alert("Vui lòng đăng nhập để thanh toán!");
        window.location.href = 'login.html';
        return;
    }

    const checkoutForm = document.getElementById('checkout-form');
    const cartItemsContainer = document.querySelector('.checkout-cart-items');

    const emailInputBox = document.getElementById('email');
    if (emailInputBox) {
        emailInputBox.value = currentUserEmail;
    }

    const costRows = document.querySelectorAll('.cost-row');
    const subtotalElement = costRows[0].querySelector('span:nth-child(2)');
    const shippingElement = costRows[1].querySelector('span:nth-child(2)');
    const totalElement = document.querySelector('.total-price');
    const shippingRadios = document.querySelectorAll('input[name="shipping"]');

    let subtotal = 0;
    let shippingCost = 30000;

    // ==========================================
    // 2. HÀM KIỂM TRA LỖI FORM (VALIDATION)
    // ==========================================
    function validateField(inputId, groupId) {
        const input = document.getElementById(inputId);
        const group = document.getElementById(groupId);
        if (!input || !group) return true;

        if (input.value.trim() === "") {
            input.classList.add('input-error');
            group.classList.add('has-error');
            return false;
        } else {
            input.classList.remove('input-error');
            group.classList.remove('has-error');
            return true;
        }
    }

    const allInputs = document.querySelectorAll('#checkout-form input');
    allInputs.forEach(input => {
        input.addEventListener('input', function () {
            this.classList.remove('input-error');
            const group = this.closest('.input-group');
            if (group) group.classList.remove('has-error');
        });
    });

    // ==========================================
    // 3. XỬ LÝ KHI BẤM NÚT "THANH TOÁN NGAY" (ĐÃ XÓA PHẦN TRÙNG LẶP)
    // ==========================================
    const paymentModal = document.getElementById('payment-modal');
    const closePaymentBtn = document.getElementById('close-payment-btn');
    const btnConfirmPaid = document.getElementById('btn-confirm-paid');
    let pendingOrderData = null;

    if (closePaymentBtn) closePaymentBtn.addEventListener('click', () => paymentModal.classList.remove('active'));

    if (checkoutForm) {
        checkoutForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            // 1. LẤY HỌ VÀ TÊN RỒI GHÉP LẠI
            const hoInput = document.getElementById('checkout-ho');
            const tenInput = document.getElementById('checkout-ten');

            const ho = hoInput ? hoInput.value.trim() : "";
            const ten = tenInput ? tenInput.value.trim() : "";
            const fullName = (ho + " " + ten).trim();

            let isNameOk = false;
            if (!ho || !ten) {
                showLocalToast("Vui lòng nhập đầy đủ Họ và Tên để giao hàng!", false);
                if (hoInput && !ho) hoInput.classList.add('input-error');
                if (tenInput && !ten) tenInput.classList.add('input-error');
            } else {
                isNameOk = true;
            }

            // 2. Kiểm tra các trường bắt buộc khác
            const isEmailOk = validateField('email', 'group-email');
            const isProvinceOk = validateField('province', 'group-province');
            const isDistrictOk = validateField('district', 'group-district');
            const isWardOk = validateField('ward', 'group-ward');
            const isAddressOk = validateField('address', 'group-address');
            const isPhoneOk = validateField('phone', 'group-phone');

            // 3. Nếu TẤT CẢ ĐỀU OK thì mới gom data, CÒN KHÔNG THÌ DỪNG LUÔN
            if (isEmailOk && isNameOk && isProvinceOk && isDistrictOk && isWardOk && isAddressOk && isPhoneOk) {

                const addressEl = document.getElementById('address');
                const wardEl = document.getElementById('ward');
                const districtEl = document.getElementById('district');
                const provinceEl = document.getElementById('province');
                const phoneEl = document.getElementById('phone');

                if (!addressEl || !wardEl || !districtEl || !provinceEl || !phoneEl) {
                    showLocalToast("Lỗi hệ thống: Không tìm thấy trường dữ liệu!", false);
                    return;
                }

                const submitBtn = document.querySelector('.btn-pay-now');

                const fullAddress = `${addressEl.value.trim()}, ${wardEl.value}, ${districtEl.value}`;
                const cityName = provinceEl.value;
                const paymentMethod = document.querySelector('input[name="payment"]:checked').value;
                const finalTotal = (subtotal - (subtotal * discountPercent / 100)) + shippingCost;

                pendingOrderData = {
                    email: currentUserEmail,
                    customer_name: fullName,
                    lastname: fullName,
                    address: fullAddress,
                    city: cityName,
                    phone: phoneEl.value.trim(),
                    shipping_fee: shippingCost,
                    total_amount: finalTotal,
                    payment_method: paymentMethod
                };

                // KIỂM TRA PHƯƠNG THỨC THANH TOÁN
                if (paymentMethod === 'cod') {
                    submitBtn.innerText = 'Đang xử lý đơn hàng...';
                    submitBtn.disabled = true;
                    await processOrderToServer(pendingOrderData, submitBtn);
                } else {
                    const title = document.getElementById('payment-modal-title');
                    const appName = document.getElementById('payment-app-name');

                    if (paymentMethod === 'momo') {
                        title.innerHTML = 'Thanh toán <span style="color:#d82d8b">MoMo</span>';
                        appName.innerText = 'MoMo';
                    } else {
                        title.innerHTML = 'Thanh toán <span style="color:#3b82f6">Ngân Hàng</span>';
                        appName.innerText = 'App Ngân Hàng';
                    }

                    document.getElementById('payment-amount-display').innerText = finalTotal.toLocaleString('vi-VN') + ' Đ';
                    document.getElementById('payment-memo').innerText = 'HARU_' + Math.floor(Math.random() * 90000 + 10000);
                    paymentModal.classList.add('active');
                }
            } else {
                window.scrollTo({ top: 100, behavior: 'smooth' });
                showLocalToast("Vui lòng điền đầy đủ và chính xác thông tin giao hàng!", false);
            }
        });
    }

    if (btnConfirmPaid) {
        btnConfirmPaid.addEventListener('click', async () => {
            const originalText = btnConfirmPaid.innerHTML;
            btnConfirmPaid.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xác nhận...';
            btnConfirmPaid.disabled = true;

            setTimeout(async () => {
                const submitBtn = document.querySelector('.btn-pay-now');
                await processOrderToServer(pendingOrderData, submitBtn);

                btnConfirmPaid.innerHTML = originalText;
                btnConfirmPaid.disabled = false;
                paymentModal.classList.remove('active');
            }, 2000);
        });
    }

    // ==========================================
    // 4. HÀM HIỂN THỊ POPUP & LƯU LÊN SERVER (ĐÃ FIX LỖI INDEX)
    // ==========================================
    function showSuccessOrderPopup(orderId) {
        const popupHTML = `
            <div id="haru-success-overlay" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.6); display: flex; align-items: center; justify-content: center; z-index: 100000; opacity: 0; transition: opacity 0.4s ease; backdrop-filter: blur(5px);">
                <div style="background: #fff; padding: 40px; border-radius: 16px; text-align: center; max-width: 450px; width: 90%; transform: scale(0.8) translateY(20px); opacity: 0; transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); box-shadow: 0 20px 40px rgba(0,0,0,0.2);">
                    <div style="width: 80px; height: 80px; background: #e8f5e9; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                        <i class="fas fa-check" style="font-size: 40px; color: #4caf50;"></i>
                    </div>
                    <h2 style="color: #333; margin-bottom: 15px; font-size: 24px; font-weight: 700;">Đặt hàng thành công!</h2>
                    <p style="color: #666; font-size: 15px; margin-bottom: 25px; line-height: 1.6;">
                        Cảm ơn bạn đã mua sắm tại Haru Shop.<br>
                        Mã đơn hàng của bạn là: <strong style="color: #0b1120;">#${orderId}</strong>
                    </p>
                    <button id="btn-back-home" style="background: #0b1120; color: #fff; border: none; padding: 14px 30px; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; transition: background 0.3s; width: 100%;">
                        Quay về trang chủ
                    </button>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', popupHTML);

        const overlay = document.getElementById('haru-success-overlay');
        const popupContent = overlay.querySelector('div');

        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            popupContent.style.transform = 'scale(1) translateY(0)';
            popupContent.style.opacity = '1';
        });

        document.getElementById('btn-back-home').addEventListener('click', () => {
            window.location.href = 'index.html'; // ĐÃ FIX INDEX.HTML
        });
    }

    async function processOrderToServer(orderData, submitBtn) {
        try {
            const response = await fetch('https://haru-shop-backend-production-188a.up.railway.app/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });
            const result = await response.json();

            if (result.success) {
                showSuccessOrderPopup(result.orderId); // GỌI POPUP XỊN
            } else {
                showLocalToast("Lỗi hệ thống: " + result.message, false);
                if (submitBtn) { submitBtn.innerText = 'Thanh toán ngay'; submitBtn.disabled = false; }
            }
        } catch (error) {
            console.error("Lỗi khi chốt đơn:", error);
            showLocalToast("Mất kết nối với máy chủ!", false);
            if (submitBtn) { submitBtn.innerText = 'Thanh toán ngay'; submitBtn.disabled = false; }
        }
    }

    // ==========================================
    // 5. LẤY DỮ LIỆU TỪ DATABASE VÀ VẼ RA CỘT BÊN PHẢI
    // ==========================================
    async function loadCheckoutCart() {
        try {
            const response = await fetch(`https://haru-shop-backend-production-188a.up.railway.app/api/cart/${currentUserEmail}`);
            const cartData = await response.json();
            renderCheckoutItems(cartData);
        } catch (error) {
            console.error("Lỗi tải giỏ hàng thanh toán:", error);
        }
    }

    function renderCheckoutItems(cart) {
        if (!cartItemsContainer) return;
        cartItemsContainer.innerHTML = '';
        subtotal = 0;

        if (!cart || cart.length === 0) {
            cartItemsContainer.innerHTML = '<p style="font-size: 14px; color: #737373;">Giỏ hàng của bạn đang trống.</p>';
            updateCosts();
            return;
        }

        cart.forEach(item => {
            subtotal += Number(item.product_price) * item.quantity;
            const formattedPrice = Number(item.product_price).toLocaleString('vi-VN');

            let finalImage = item.product_image;
            let imgSrc = '../img/default.png';
            if (finalImage) {
                let dbImage = finalImage.replace(/^IMG\//i, 'img/');
                imgSrc = dbImage.startsWith('../') ? dbImage : '../' + dbImage;
            }

            let variantHTML = '';
            let textParts = [];

            if (item.selected_model && item.selected_model !== 'Mặc định' && item.selected_model !== 'undefined') {
                textParts.push(item.selected_model);
            }
            if (item.selected_color && item.selected_color !== 'Mặc định' && item.selected_color !== 'undefined') {
                textParts.push(item.selected_color);
            }

            if (textParts.length > 0) {
                variantHTML = `<p style="font-size: 12px; color: #737373; margin-top: 4px;">${textParts.join(' / ')}</p>`;
            }

            const itemHTML = `
            <div class="checkout-item">
                <div class="item-image-wrapper">
                    <img src="${imgSrc}" alt="${item.product_name}">
                    <span class="item-quantity">${item.quantity}</span>
                </div>
                <div class="item-info">
                    <h4>${item.product_name}</h4>
                    ${variantHTML} 
                </div>
                <div class="item-price">
                    <span style="font-weight: 500;">${formattedPrice} Đ</span>
                </div>
            </div>
        `;
            cartItemsContainer.insertAdjacentHTML('beforeend', itemHTML);
        });

        updateCosts();
    }

    // ==========================================
    // 6. CẬP NHẬT TỔNG TIỀN VÀ PHÍ VẬN CHUYỂN
    // ==========================================
    function updateCosts() {
        const currentShippingMethod = document.querySelector('input[name="shipping"]:checked');
        shippingCost = isFreeship ? 0 : Number(currentShippingMethod.value);

        const discountAmount = (subtotal * discountPercent) / 100;
        const total = (subtotal - discountAmount) + shippingCost;

        if (subtotalElement) subtotalElement.innerText = subtotal.toLocaleString('vi-VN') + ' Đ';

        if (shippingElement) {
            if (isFreeship) {
                shippingElement.innerHTML = '<span style="color: #28a745; font-weight: bold;">Miễn phí</span>';
            } else {
                shippingElement.innerText = shippingCost.toLocaleString('vi-VN') + ' Đ';
            }
        }

        if (totalElement) {
            totalElement.innerHTML = `
                ${discountAmount > 0 ? `<div style="font-size: 14px; color: #e74c3c; margin-bottom: 5px;">- Giảm giá: ${discountAmount.toLocaleString('vi-VN')} Đ</div>` : ''}
                <small>VNĐ</small> ${total.toLocaleString('vi-VN')} Đ
            `;
        }
    }

    shippingRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            shippingCost = Number(e.target.value);
            updateCosts();
        });
    });

    // ==========================================
    // 7. XỬ LÝ MÃ GIẢM GIÁ
    // ==========================================
    const btnApplyDiscount = document.querySelector('.btn-apply-discount');
    const discountInput = document.querySelector('.discount-section input');

    let discountPercent = 0;
    let isFreeship = false;
    let appliedCouponCode = null;

    if (btnApplyDiscount && discountInput) {
        btnApplyDiscount.addEventListener('click', async () => {
            const code = discountInput.value.trim().toUpperCase();

            if (code === '') {
                showLocalToast('Vui lòng nhập mã giảm giá!', false);
                return;
            }

            const originalBtnText = btnApplyDiscount.innerText;
            btnApplyDiscount.innerText = "...";
            btnApplyDiscount.disabled = true;

            try {
                const response = await fetch('https://haru-shop-backend-production-188a.up.railway.app/api/coupons/check', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code: code })
                });

                const data = await response.json();

                if (data.success) {
                    discountPercent = data.discount_percent;
                    isFreeship = data.is_freeship;
                    appliedCouponCode = code;

                    if (isFreeship) {
                        showLocalToast('Áp dụng thành công! Bạn được miễn phí vận chuyển.', true);
                    } else {
                        showLocalToast(`Áp dụng thành công! Mã giảm ${discountPercent}% tổng đơn hàng.`, true);
                    }
                } else {
                    showLocalToast(data.message, false);
                    discountPercent = 0;
                    isFreeship = false;
                    appliedCouponCode = null;
                }

                updateCosts();
            } catch (error) {
                console.error("Lỗi kiểm tra mã:", error);
                showLocalToast("Lỗi kết nối đến máy chủ!", false);
            } finally {
                btnApplyDiscount.innerText = originalBtnText;
                btnApplyDiscount.disabled = false;
            }
        });
    }

    // ==========================================
    // 8. GỌI API TỈNH/THÀNH PHỐ VIỆT NAM
    // ==========================================
    const provinceSelect = document.getElementById('province');
    const districtSelect = document.getElementById('district');
    const wardSelect = document.getElementById('ward');

    if (provinceSelect && districtSelect && wardSelect) {
        let localData = [];

        fetch('https://provinces.open-api.vn/api/?depth=3')
            .then(res => res.json())
            .then(data => {
                localData = data;
                data.forEach(p => {
                    provinceSelect.innerHTML += `<option value="${p.name}" data-code="${p.code}">${p.name}</option>`;
                });
            })
            .catch(err => console.error("Lỗi tải dữ liệu tỉnh thành:", err));

        provinceSelect.addEventListener('change', function () {
            districtSelect.innerHTML = '<option value="">Chọn Quận / Huyện *</option>';
            wardSelect.innerHTML = '<option value="">Chọn Phường / Xã *</option>';
            wardSelect.disabled = true;

            const selectedCode = this.options[this.selectedIndex].getAttribute('data-code');
            if (selectedCode) {
                const province = localData.find(p => p.code == selectedCode);
                province.districts.forEach(d => {
                    districtSelect.innerHTML += `<option value="${d.name}" data-code="${d.code}">${d.name}</option>`;
                });
                districtSelect.disabled = false;
            } else {
                districtSelect.disabled = true;
            }
        });

        districtSelect.addEventListener('change', function () {
            wardSelect.innerHTML = '<option value="">Chọn Phường / Xã *</option>';

            const selectedCode = this.options[this.selectedIndex].getAttribute('data-code');
            if (selectedCode) {
                const provCode = provinceSelect.options[provinceSelect.selectedIndex].getAttribute('data-code');
                const province = localData.find(p => p.code == provCode);
                const district = province.districts.find(d => d.code == selectedCode);

                district.wards.forEach(w => {
                    wardSelect.innerHTML += `<option value="${w.name}">${w.name}</option>`;
                });
                wardSelect.disabled = false;
            } else {
                wardSelect.disabled = true;
            }
        });
    }

    // ==========================================
    // THÔNG BÁO TOAST "NỀN TRẮNG, CHỮ ĐEN, TÍCH XANH LÁ" (Cho Checkout)
    // ==========================================
    function showLocalToast(message, isSuccess = true) {
        let container = document.getElementById('haru-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'haru-toast-container';
            container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 999999; display: flex; flex-direction: column; gap: 10px; pointer-events: none;';
            document.body.appendChild(container);
        }
        const toast = document.createElement('div');
        const mainBgColor = '#ffffff';
        const textColor = '#333333';
        const accentColor = isSuccess ? '#4caf50' : '#f44336';

        toast.style.cssText = `
            background-color: ${mainBgColor}; 
            color: ${textColor}; 
            padding: 12px 20px; 
            border-radius: 4px; 
            box-shadow: 0 4px 12px rgba(0,0,0,0.15); 
            display: flex; 
            align-items: center;
            gap: 10px;
            font-size: 15px;
            font-family: sans-serif;
            transition: all 0.3s ease-in-out;
            transform: translateX(100%);
            opacity: 0;
            border-left: 5px solid ${accentColor}; 
        `;
        toast.innerHTML = `
            <i class="fas ${isSuccess ? 'fa-check-circle' : 'fa-times-circle'}" style="font-size: 1.2rem; color: ${accentColor};"></i>
            <span style="font-weight: 500;">${message}</span>
        `;
        container.appendChild(toast);

        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(0)';
            toast.style.opacity = '1';
        });

        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            toast.style.opacity = '0';
            setTimeout(() => { if (container.contains(toast)) toast.remove(); }, 300);
        }, 3000);
    }

    // Khởi chạy
    loadCheckoutCart();
});