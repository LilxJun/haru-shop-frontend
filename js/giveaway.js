const API = 'https://haru-shop-backend-production.up.railway.app';

const PRIZES = [
    { id: 'mouse', icon: '🏆', name: 'Chuột ATK F1 Leviathan', type: 'mouse', weight: 0.5 },
    { id: 'v20', icon: '🎫', name: 'Voucher giảm 20%', type: 'voucher', weight: 5, discount: 20 },
    { id: 'v15', icon: '🎟', name: 'Voucher giảm 15%', type: 'voucher', weight: 10, discount: 15 },
    { id: 'v10', icon: '🏷', name: 'Voucher giảm 10%', type: 'voucher', weight: 15, discount: 10 },
    { id: 'v5', icon: '💌', name: 'Voucher giảm 5%', type: 'voucher', weight: 20, discount: 5 },
    { id: 'none', icon: '🍀', name: 'Chúc bạn may mắn lần sau', type: 'none', weight: 49.5 },
];

document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    initSlotItems();
    checkUserStatus();

    document.getElementById('btn-spin')?.addEventListener('click', doSpin);
    document.getElementById('popup-close')?.addEventListener('click', () => {
        document.getElementById('result-popup').classList.remove('active');
    });
});

// ── PARTICLES ──────────────────────────────────────────────
function initParticles() {
    const container = document.getElementById('particles');
    if (!container) return;
    for (let i = 0; i < 18; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        const size = Math.random() * 4 + 2;
        p.style.cssText = `
            width:${size}px; height:${size}px;
            left:${Math.random() * 100}%;
            bottom:${Math.random() * 20}px;
            animation-duration:${4 + Math.random() * 6}s;
            animation-delay:${Math.random() * 6}s;
            opacity:${0.2 + Math.random() * 0.4};
        `;
        container.appendChild(p);
    }
}

// ── SLOT ITEMS ──────────────────────────────────────────────
function initSlotItems() {
    const container = document.getElementById('slot-items');
    if (!container) return;
    // Tạo danh sách dài để cuộn
    const repeated = [];
    for (let i = 0; i < 6; i++) repeated.push(...PRIZES);
    repeated.push(...PRIZES); // thêm 1 lần nữa để đủ cuộn

    container.innerHTML = repeated.map(p => `
        <div class="slot-item ${p.type === 'mouse' ? 'gold' : ''}">
            <span class="si-icon">${p.icon}</span>
            <span>${p.name}</span>
        </div>
    `).join('');
}

// ── CHECK USER ──────────────────────────────────────────────
async function checkUserStatus() {
    const user = getSafeUser();

    if (!user) {
        show('login-notice');
        hide('spin-box');
        hide('already-spun');
        return;
    }

    try {
        const res = await fetch(`${API}/api/giveaway/check?email=${encodeURIComponent(user.email)}`);
        const data = await res.json();

        if (data.hasSpun) {
            showPastResult(data.entry);
        } else {
            show('spin-box');
        }
    } catch (e) {
        show('spin-box'); // Nếu lỗi, vẫn cho quay (server sẽ check lại)
    }
}

// ── SPIN ────────────────────────────────────────────────────
async function doSpin() {
    const user = getSafeUser();
    if (!user) { window.location.href = 'login.html'; return; }

    const btn = document.getElementById('btn-spin');
    btn.disabled = true;
    btn.textContent = '⚡ ĐANG QUAY...';

    // Animate slot
    const slotItems = document.getElementById('slot-items');
    let offset = 0;
    const itemH = 64;
    const totalItems = slotItems.children.length;

    // Cuộn nhanh trước
    let speed = 8;
    let spins = 0;
    const spinInterval = setInterval(() => {
        offset += speed;
        if (offset >= totalItems * itemH) offset = 0;
        slotItems.style.transform = `translateY(-${offset}px)`;
        spins++;

        // Tăng tốc rồi giảm tốc
        if (spins < 20) speed = Math.min(speed + 2, 48);
        if (spins > 40) speed = Math.max(speed - 2, 8);
    }, 16);

    // Gọi API
    let result = null;
    try {
        const res = await fetch(`${API}/api/giveaway/spin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email })
        });
        result = await res.json();
    } catch (e) {
        clearInterval(spinInterval);
        btn.disabled = false;
        btn.textContent = '⚡ THỬ VẬN MAY';
        showToast('Lỗi kết nối server!', false);
        return;
    }

    // Dừng slot sau 2.5s
    setTimeout(() => {
        clearInterval(spinInterval);

        // Snap đến prize đúng
        const prizeIdx = PRIZES.findIndex(p => p.id === result.prizeId);
        const targetOffset = (Math.floor(totalItems / 2) + prizeIdx) * itemH - itemH; // căn giữa
        slotItems.style.transition = 'transform 0.5s cubic-bezier(0.25,0.46,0.45,0.94)';
        slotItems.style.transform = `translateY(-${targetOffset % (totalItems * itemH)}px)`;

        setTimeout(() => {
            slotItems.style.transition = '';
            showResultPopup(result);
            showPastResult(result);
        }, 600);
    }, 2500);
}

// ── RESULT POPUP ─────────────────────────────────────────────
function showResultPopup(result) {
    const popup = document.getElementById('result-popup');
    const card = document.getElementById('popup-card');
    const emoji = document.getElementById('popup-emoji');
    const title = document.getElementById('popup-title');
    const desc = document.getElementById('popup-desc');
    const couponArea = document.getElementById('popup-coupon-area');

    card.className = 'popup-card';

    if (result.prizeType === 'mouse') {
        card.classList.add('gold-card');
        emoji.textContent = '🏆';
        title.textContent = 'CHÚC MỪNG!!!';
        desc.innerHTML = 'Bạn đã trúng <strong style="color:#f5c842">Chuột ATK Blazing Sky F1 Leviathan</strong>!<br>Chúng tôi sẽ liên hệ qua email để giao hàng cho bạn.';
        couponArea.innerHTML = '';
        launchConfetti();
    } else if (result.prizeType === 'voucher') {
        card.classList.add('blue-card');
        emoji.textContent = '🎫';
        title.textContent = 'BẠN TRÚNG VOUCHER!';
        desc.innerHTML = `Bạn nhận được <strong style="color:#60a5fa">${result.prizeName}</strong>.<br>Mã đã được lưu vào tài khoản. Bấm để copy:`;
        couponArea.innerHTML = `
            <div class="popup-coupon" onclick="copyCode('${result.couponCode}')" title="Bấm để copy">
                ${result.couponCode} <i class="fas fa-copy" style="font-size:16px; color:#888;"></i>
            </div>
            <div style="color:#666; font-size:12px; margin-top:6px;">Bấm vào mã để copy</div>
        `;
        launchConfetti(12);
    } else {
        card.classList.add('gray-card');
        emoji.textContent = '🍀';
        title.textContent = 'CHÚC BẠN MAY MẮN!';
        desc.textContent = 'Lần này chưa trúng. Cảm ơn bạn đã tham gia Haru Giveaway!';
        couponArea.innerHTML = '';
    }

    popup.classList.add('active');
}

// ── PAST RESULT ──────────────────────────────────────────────
function showPastResult(entry) {
    hide('spin-box');
    hide('login-notice');
    show('already-spun');

    const card = document.getElementById('past-result-card');
    const icon = document.getElementById('past-result-icon');
    const titleEl = document.getElementById('past-result-title');
    const descEl = document.getElementById('past-result-desc');
    const couponArea = document.getElementById('past-coupon-area');

    if (entry.prizeType === 'mouse') {
        card.className = 'result-display win-mouse';
        icon.textContent = '🏆';
        titleEl.textContent = 'Bạn đã trúng Grand Prize!';
        descEl.textContent = 'Chuột ATK Blazing Sky F1 Leviathan — Chúng tôi sẽ liên hệ để giao hàng.';
        couponArea.innerHTML = '';
    } else if (entry.prizeType === 'voucher') {
        card.className = 'result-display win-voucher';
        icon.textContent = '🎫';
        titleEl.textContent = 'Phần thưởng của bạn';
        descEl.textContent = `Bạn đã nhận: ${entry.prizeName}. Mã voucher đã được lưu vào tài khoản.`;
        couponArea.innerHTML = `
            <div class="coupon-code-box" onclick="copyCode('${entry.couponCode}')">
                ${entry.couponCode} <i class="fas fa-copy" style="font-size:14px; color:#888;"></i>
            </div>
            <div class="coupon-copy-hint">Dùng mã này khi thanh toán để được giảm giá</div>
        `;
    } else {
        card.className = 'result-display';
        icon.textContent = '🍀';
        titleEl.textContent = 'Bạn đã tham gia!';
        descEl.textContent = 'Lần này chưa trúng thưởng. Cảm ơn bạn đã tham gia Haru Giveaway!';
        couponArea.innerHTML = '';
    }
}

// ── CONFETTI ──────────────────────────────────────────────────
function launchConfetti(count = 40) {
    const colors = ['#f5c842', '#fff', '#3b82f6', '#10b981', '#ef4444', '#f97316'];
    for (let i = 0; i < count; i++) {
        setTimeout(() => {
            const el = document.createElement('div');
            el.className = 'confetti-piece';
            el.style.cssText = `
                left: ${Math.random() * 100}vw;
                top: -20px;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                width: ${6 + Math.random() * 8}px;
                height: ${6 + Math.random() * 8}px;
                border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
                animation-duration: ${1.5 + Math.random() * 2}s;
                animation-delay: ${Math.random() * 0.5}s;
            `;
            document.body.appendChild(el);
            setTimeout(() => el.remove(), 3500);
        }, i * 40);
    }
}

// ── HELPERS ──────────────────────────────────────────────────
function getSafeUser() {
    try {
        const u = JSON.parse(localStorage.getItem('haru-current-user'));
        if (u && u.email) return u;
    } catch (e) { }
    return null;
}

function copyCode(code) {
    navigator.clipboard.writeText(code).then(() => {
        showToast(`Đã copy mã: ${code}`, true);
    }).catch(() => {
        showToast(`Mã của bạn: ${code}`, true);
    });
}

function show(id) { const el = document.getElementById(id); if (el) el.style.display = 'block'; }
function hide(id) { const el = document.getElementById(id); if (el) el.style.display = 'none'; }

function showToast(msg, ok = true) {
    let c = document.getElementById('toast-container');
    if (!c) { c = document.createElement('div'); c.id = 'toast-container'; c.style.cssText = 'position:fixed;top:20px;right:20px;z-index:99999;'; document.body.appendChild(c); }
    const t = document.createElement('div');
    t.style.cssText = `background:#fff;color:#333;padding:12px 20px;border-radius:6px;margin-bottom:10px;box-shadow:0 4px 12px rgba(0,0,0,0.2);border-left:4px solid ${ok ? '#10b981' : '#ef4444'};font-size:14px;font-weight:600;`;
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}
