document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
        document.querySelector('.pdp-container').innerHTML = '<h2 style="text-align:center; margin-top:50px;">Không tìm thấy sản phẩm</h2>';
        return;
    }

    let productData = null;
    let selectedModel = '';
    let selectedColor = '';
    let currentPrice = 0;
    let quantity = 1;
    let currentVariantId = null;

    let galleryImages = [];
    let currentImageIndex = 0;

    const titleEl = document.getElementById('product-title');
    const priceEl = document.getElementById('product-price');
    const oldPriceEl = document.getElementById('product-old-price');
    const descEl = document.getElementById('product-desc');
    const specsEl = document.getElementById('product-specs');
    const modelContainer = document.getElementById('model-selector');
    const colorContainer = document.getElementById('color-selector');
    const modelText = document.getElementById('selected-model-text');
    const colorText = document.getElementById('selected-color-text');
    const subtotalEl = document.getElementById('subtotal-price');
    const qtyInput = document.getElementById('input-qty');
    const mainImg = document.getElementById('main-product-img');

    // Chuẩn hóa đường dẫn ảnh (luôn tìm từ gốc website /img/)
    function getCorrectImagePath(path) {
        if (!path) return '/img/default.png';
        const cleanPath = path.replace('../', '').replace('./', '');
        return '/' + cleanPath;
    }

    try {
        const res = await fetch(`https://haru-shop-backend-production-188a.up.railway.app/api/products/${productId}`);
        productData = await res.json();
        renderProduct();
    } catch (err) {
        console.error("Lỗi kết nối Server:", err);
    }

    function renderProduct() {
        if (titleEl) titleEl.innerText = productData.name || 'Đang cập nhật...';
        if (descEl) descEl.innerHTML = productData.description || '';

        if (productData.specs && Array.isArray(productData.specs) && specsEl) {
            specsEl.innerHTML = productData.specs.map(s =>
                `<li><strong>${s.spec_label}:</strong> ${s.spec_value}</li>`
            ).join('');
        }

        if (productData.variants && Array.isArray(productData.variants) && productData.variants.length > 0) {
            const uniqueModels = [...new Set(productData.variants.map(v => v.model_name).filter(Boolean))];
            const uniqueColors = [];
            const colorNames = new Set();

            productData.variants.forEach(v => {
                if (v.color_name && !colorNames.has(v.color_name)) {
                    colorNames.add(v.color_name);
                    uniqueColors.push({ name: v.color_name, hex: v.color_hex, image: v.color_img });
                }
            });

            const defaultVariant = productData.variants[0];
            selectedModel = uniqueModels.length > 0 ? defaultVariant.model_name : null;
            selectedColor = uniqueColors.length > 0 ? defaultVariant.color_name : null;

            if (uniqueModels.length > 0) {
                if (modelText) modelText.innerText = selectedModel;
                if (modelContainer) {
                    modelContainer.innerHTML = uniqueModels.map((mName) => `
                        <button class="model-btn ${mName === selectedModel ? 'active' : ''}" data-name="${mName}">
                            ${mName}
                        </button>
                    `).join('');
                }
            } else {
                if (modelContainer) modelContainer.parentElement.style.display = 'none';
            }

            if (uniqueColors.length > 0) {
                if (colorText) colorText.innerText = selectedColor;
                if (colorContainer) {
                    colorContainer.innerHTML = uniqueColors.map((c) => {
                        let imgSrc = getCorrectImagePath(c.image);
                        return `
                        <button class="color-variant-btn ${c.name === selectedColor ? 'active' : ''}" 
                                data-name="${c.name}" title="${c.name}">
                            <img src="${imgSrc}" alt="${c.name}">
                        </button>
                        `;
                    }).join('');
                }
            }

            updateVariantInfo();

        } else {
            currentPrice = productData.price || 0;
            updatePriceDisplay();
            if (mainImg && productData.image) {
                mainImg.src = getCorrectImagePath(productData.image);
            }
        }

        initImageGallery();
        bindEvents();
    }

    function updateVariantInfo() {
        if (!productData.variants || productData.variants.length === 0) return;

        const matchedVariant = productData.variants.find(v =>
            (v.model_name === selectedModel || (!v.model_name && !selectedModel)) &&
            (v.color_name === selectedColor || (!v.color_name && !selectedColor))
        );

        if (matchedVariant) {
            currentVariantId = matchedVariant.variant_id; // Chú ý: Backend cần cái này
            currentPrice = matchedVariant.price || 0;
            updatePriceDisplay();

            if (matchedVariant.color_img && mainImg) {
                mainImg.src = getCorrectImagePath(matchedVariant.color_img);
                syncGalleryWithMainImage(matchedVariant.color_img);
            }
        } else {
            currentPrice = 0;
            updatePriceDisplay();
            if (priceEl) priceEl.innerText = "Liên hệ";
        }
    }

    function updatePriceDisplay() {
        if (currentPrice == 0) return;
        const formattedPrice = Number(currentPrice).toLocaleString('vi-VN');
        const oldPrice = Number(currentPrice * 1.2).toLocaleString('vi-VN');
        if (priceEl) priceEl.innerText = formattedPrice + ' Đ';
        if (oldPriceEl) oldPriceEl.innerText = oldPrice + ' Đ';
        const subtotal = Number(currentPrice) * quantity;
        if (subtotalEl) subtotalEl.innerText = subtotal.toLocaleString('vi-VN') + ' Đ';
    }

    function bindEvents() {
        document.querySelectorAll('.model-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.model-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                selectedModel = e.target.getAttribute('data-name');
                if (modelText) modelText.innerText = selectedModel;
                updateVariantInfo();
            });
        });

        document.querySelectorAll('.color-variant-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetBtn = e.target.closest('.color-variant-btn');
                if (!targetBtn) return;

                document.querySelectorAll('.color-variant-btn').forEach(b => b.classList.remove('active'));
                targetBtn.classList.add('active');
                selectedColor = targetBtn.getAttribute('data-name');
                if (colorText) colorText.innerText = selectedColor;
                updateVariantInfo();
            });
        });

        document.getElementById('btn-qty-minus')?.addEventListener('click', () => {
            if (quantity > 1) { quantity--; if (qtyInput) qtyInput.value = quantity; updatePriceDisplay(); }
        });
        document.getElementById('btn-qty-plus')?.addEventListener('click', () => {
            quantity++; if (qtyInput) qtyInput.value = quantity; updatePriceDisplay();
        });

        // ==========================================
        // FIX: THÊM GIỎ HÀNG, HIỆN TOAST CHUẨN & LOAD CART TỨC THÌ
        // ==========================================
        const btnAddToCart = document.getElementById('btn-add-to-cart');
        if (btnAddToCart) {
            btnAddToCart.addEventListener('click', async () => {
                const userEmail = typeof getSafeUserEmail === 'function' ? getSafeUserEmail() : null;

                if (!userEmail) {
                    showLocalToast("Vui lòng đăng nhập để thêm vào giỏ hàng!", false);
                    setTimeout(() => window.location.href = 'login.html', 1500);
                    return;
                }

                btnAddToCart.disabled = true;
                const oldContent = btnAddToCart.innerHTML;
                btnAddToCart.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang thêm...';

                try {
                    const payload = {
                        user_email: userEmail,
                        product_id: productId,
                        variant_id: currentVariantId,
                        quantity: quantity
                    };

                    const response = await fetch('https://haru-shop-backend-production-188a.up.railway.app/api/cart', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    const result = await response.json();

                    if (result.success) {
                        // 1. Hiện thông báo liền
                        showLocalToast(`Đã thêm vào giỏ hàng!`);

                        // 2. Ép load lại giỏ hàng NGAY LẬP TỨC (không chờ mở)
                        if (typeof window.loadCartFromDB === 'function') {
                            window.loadCartFromDB();
                        }
                    } else {
                        showLocalToast(`Thêm thất bại: ${result.message}`, false);
                    }

                } catch (error) {
                    console.error("Lỗi:", error);
                    showLocalToast("Lỗi kết nối Server!", false);
                } finally {
                    btnAddToCart.disabled = false;
                    btnAddToCart.innerHTML = oldContent;
                }
            });
        }

        document.getElementById('btn-buy-now')?.addEventListener('click', () => {
            document.getElementById('btn-add-to-cart').click();
            setTimeout(() => { window.location.href = 'checkout.html'; }, 500);
        });

        document.getElementById('prev-img-btn')?.addEventListener('click', () => { moveGallery(-1); });
        document.getElementById('next-img-btn')?.addEventListener('click', () => { moveGallery(1); });
        document.getElementById('prev-thumb-btn')?.addEventListener('click', () => { moveGallery(-1); });
        document.getElementById('next-thumb-btn')?.addEventListener('click', () => { moveGallery(1); });
    }

    function initImageGallery() {
        galleryImages = [];
        const uniqueImages = new Set();

        if (productData.variants && productData.variants.length > 0) {
            productData.variants.forEach(v => {
                let img = v.color_img || productData.image;
                if (img) {
                    let cleanImg = getCorrectImagePath(img);
                    if (!uniqueImages.has(cleanImg)) {
                        uniqueImages.add(cleanImg);
                        galleryImages.push(cleanImg);
                    }
                }
            });
        } else if (productData.image) {
            let img = getCorrectImagePath(productData.image);
            galleryImages.push(img);
        }

        currentImageIndex = 0;
        updateGalleryUI();
    }

    function moveGallery(step) {
        if (galleryImages.length === 0) return;
        currentImageIndex = (currentImageIndex + step + galleryImages.length) % galleryImages.length;
        updateGalleryUI();

        const currentImgPath = galleryImages[currentImageIndex];
        const matchedVariant = productData.variants?.find(v => (v.color_img && getCorrectImagePath(v.color_img) === currentImgPath));

        if (matchedVariant) {
            selectedColor = matchedVariant.color_name;
            if (colorText) colorText.innerText = selectedColor;

            document.querySelectorAll('.color-variant-btn').forEach(btn => {
                if (btn.getAttribute('data-name') === selectedColor) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
            updateVariantInfo();
        }
    }

    function updateGalleryUI() {
        const galleryContainer = document.getElementById('thumbnail-gallery');
        if (!mainImg || galleryImages.length === 0) return;

        mainImg.style.opacity = 0.6;
        setTimeout(() => {
            mainImg.src = galleryImages[currentImageIndex];
            mainImg.style.opacity = 1;
        }, 150);

        if (galleryContainer) {
            galleryContainer.innerHTML = '';
            galleryImages.forEach((imgUrl, index) => {
                const imgEl = document.createElement('img');
                imgEl.src = imgUrl;
                imgEl.className = `thumb-img ${index === currentImageIndex ? 'active' : ''}`;

                imgEl.addEventListener('click', () => {
                    currentImageIndex = index;
                    updateGalleryUI();

                    const matchedVariant = productData.variants?.find(v => (v.color_img && getCorrectImagePath(v.color_img) === imgUrl));
                    if (matchedVariant) {
                        selectedColor = matchedVariant.color_name;
                        if (colorText) colorText.innerText = selectedColor;
                        document.querySelectorAll('.color-variant-btn').forEach(btn => {
                            if (btn.getAttribute('data-name') === selectedColor) btn.classList.add('active');
                            else btn.classList.remove('active');
                        });
                        updateVariantInfo();
                    }
                });
                galleryContainer.appendChild(imgEl);
            });

            const activeThumb = galleryContainer.querySelector('.active');
            if (activeThumb) activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }

    function syncGalleryWithMainImage(imagePath) {
        const cleanPath = getCorrectImagePath(imagePath);
        const index = galleryImages.findIndex(img => img === cleanPath);
        if (index !== -1) {
            currentImageIndex = index;
            const thumbs = document.querySelectorAll('.thumb-img');
            thumbs.forEach((t, i) => {
                if (i === index) {
                    t.classList.add('active');
                    t.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                } else t.classList.remove('active');
            });
        }
    }

    // --- PHẦN ĐÁNH GIÁ (REVIEW) ---
    // (Giữ nguyên như bản sửa getSafeUserEmail của sếp)
    const btnOpenReview = document.getElementById('btn-open-review');
    const reviewFormContainer = document.getElementById('review-form-container');
    const submitReviewBtn = document.getElementById('submit-review-btn');
    const reviewErrorMsg = document.getElementById('review-error-msg');

    if (productId) {
        fetchReviews(productId);
    }

    function generateStars(rating) {
        let starsHtml = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= rating) starsHtml += '<i class="fas fa-star" style="color: #f5c518;"></i>';
            else starsHtml += '<i class="far fa-star" style="color: #ccc;"></i>';
        }
        return starsHtml;
    }

    async function fetchReviews(id) {
        try {
            const res = await fetch(`https://haru-shop-backend-production-188a.up.railway.app/api/products/${id}/reviews`);
            const data = await res.json();

            if (document.getElementById('avg-rating-text')) document.getElementById('avg-rating-text').innerText = `${data.averageRating}/5`;
            if (document.getElementById('total-reviews-text')) document.getElementById('total-reviews-text').innerText = `(${data.totalReviews} lượt đánh giá)`;
            if (document.getElementById('avg-stars')) document.getElementById('avg-stars').innerHTML = generateStars(Math.round(data.averageRating));

            const listContainer = document.getElementById('reviews-list-container');
            if (listContainer) {
                if (data.reviews.length === 0) {
                    listContainer.innerHTML = '<p style="text-align: center; color: #777;">Chưa có đánh giá nào. Hãy là người đầu tiên!</p>';
                    return;
                }

                listContainer.innerHTML = data.reviews.map(rev => {
                    const dateObj = new Date(rev.created_at);
                    const formattedDate = `${dateObj.getDate()}/${dateObj.getMonth() + 1}/${dateObj.getFullYear()}`;
                    return `
                        <div class="review-item" style="border-bottom: 1px solid #eaeaea; padding: 20px 0;">
                            <div class="review-header" style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <strong>${rev.username}</strong>
                                <span style="color: #999; font-size: 13px;">${formattedDate}</span>
                            </div>
                            <div class="stars">${generateStars(rev.rating)}</div>
                            <p style="margin-top: 10px; color: #555; line-height: 1.5;">${rev.comment}</p>
                        </div>
                    `;
                }).join('');
            }

        } catch (err) {
            console.error("Lỗi tải đánh giá:", err);
        }
    }

    if (btnOpenReview) {
        btnOpenReview.addEventListener('click', () => {
            const userEmail = typeof getSafeUserEmail === 'function' ? getSafeUserEmail() : null;

            if (!userEmail) {
                if (document.getElementById('login-modal')) document.getElementById('login-modal').classList.add('active');
                return;
            }
            reviewFormContainer.style.display = reviewFormContainer.style.display === 'none' ? 'block' : 'none';
        });
    }

    if (submitReviewBtn) {
        submitReviewBtn.addEventListener('click', async () => {
            const ratingHiddenInput = document.getElementById('review-rating');
            const rating = ratingHiddenInput ? ratingHiddenInput.value : 5;
            const comment = document.getElementById('review-comment').value.trim();
            const userEmail = typeof getSafeUserEmail === 'function' ? getSafeUserEmail() : null;

            if (!comment) {
                reviewErrorMsg.innerText = "Vui lòng nhập nội dung đánh giá!";
                reviewErrorMsg.style.display = 'block';
                return;
            }

            if (!userEmail) {
                reviewErrorMsg.innerText = "Lỗi nhận diện tài khoản. Sếp F5 tải lại trang nhé!";
                reviewErrorMsg.style.display = 'block';
                return;
            }

            submitReviewBtn.disabled = true;
            submitReviewBtn.innerText = "Đang gửi...";
            reviewErrorMsg.style.display = 'none';

            try {
                const res = await fetch(`https://haru-shop-backend-production-188a.up.railway.app/api/products/${productId}/reviews`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: userEmail, rating: rating, comment: comment })
                });
                const data = await res.json();

                if (data.success) {
                    if (document.getElementById('success-modal')) document.getElementById('success-modal').classList.add('active');
                    reviewFormContainer.style.display = 'none';
                    document.getElementById('review-comment').value = '';
                    reviewErrorMsg.style.display = 'none';
                    fetchReviews(productId);
                } else {
                    reviewErrorMsg.innerText = data.message;
                    reviewErrorMsg.style.display = 'block';
                }
            } catch (err) {
                reviewErrorMsg.innerText = "Lỗi kết nối Server! Sếp kiểm tra lại Backend nhé.";
                reviewErrorMsg.style.display = 'block';
            } finally {
                submitReviewBtn.disabled = false;
                submitReviewBtn.innerText = "Gửi đánh giá";
            }
        });
    }

    // ==========================================
    // FIXED: THÔNG BÁO TOAST "XANH MƯỢT" KIỂU WISHLIST (KHÔNG PHỤ THUỘC CSS BÊN NGOÀI)
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

        // 1. Bảng màu mới theo ý sếp
        const mainBgColor = '#ffffff'; // Nền trắng
        const textColor = '#333333';   // Chữ đen (dùng mã 333 cho dịu mắt)
        const accentColor = isSuccess ? '#4caf50' : '#f44336'; // Icon xanh lá hoặc đỏ

        // 2. CSS Style
        toast.style.cssText = `
            background-color: ${mainBgColor}; 
            color: ${textColor}; 
            padding: 12px 20px; 
            border-radius: 4px; 
            /* Tăng bóng đổ để nền trắng nổi bật, không bị chìm vào web */
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

        // 3. Nội dung Toast: Icon tô màu xanh lá, chữ đen in đậm nhẹ
        toast.innerHTML = `
            <i class="fas ${isSuccess ? 'fa-check-circle' : 'fa-times-circle'}" style="font-size: 1.2rem; color: ${accentColor};"></i>
            <span style="font-weight: 500;">${message}</span>
        `;

        container.appendChild(toast);

        // Animation bay vào
        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(0)';
            toast.style.opacity = '1';
        });

        // Tự đóng sau 3 giây
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            toast.style.opacity = '0';
            setTimeout(() => {
                if (container.contains(toast)) toast.remove();
            }, 300);
        }, 3000);
    }
});