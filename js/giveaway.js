// Thay đổi thành URL Backend của sếp trên Railway
const API_URL = 'https://haru-shop-backend-production.up.railway.app';

const prizesList = [
    "🖱️ Chuột ATK Blazing Sky F1 Leviathan",
    "🎫 Voucher giảm 20%",
    "🎫 Voucher giảm 15%",
    "🎫 Voucher giảm 10%",
    "🎫 Voucher giảm 5%",
    "🍀 Chúc bạn may mắn lần sau"
];

document.addEventListener("DOMContentLoaded", async () => {
    const user = JSON.parse(localStorage.getItem('haru_user'));
    const btn = document.getElementById('spin-btn');
    const prizeBox = document.getElementById('prize-box');
    const resultArea = document.getElementById('result-area');

    if (!user) {
        btn.innerText = "VUI LÒNG ĐĂNG NHẬP";
        btn.disabled = true;
        return;
    }

    // Kiểm tra xem user đã quay chưa khi vừa vào trang
    try {
        const res = await fetch(`${API_URL}/api/giveaway/check?email=${encodeURIComponent(user.email)}`);
        const data = await res.json();
        if (data.hasSpun) {
            btn.innerText = "ĐÃ THAM GIA";
            btn.disabled = true;
            showResult(data.entry.prizeName, data.entry.couponCode);
        }
    } catch (e) {
        console.error("Lỗi check:", e);
    }

    // Sự kiện khi bấm quay
    btn.addEventListener('click', async () => {
        btn.disabled = true;
        btn.innerText = "ĐANG QUAY...";

        // 1. Tạo hiệu ứng nhấp nháy giải thưởng giả (Slot effect)
        let count = 0;
        const spinInterval = setInterval(() => {
            prizeBox.innerText = prizesList[count % prizesList.length];
            prizeBox.style.color = count % 2 === 0 ? "#fff" : "#d4af37";
            count++;
        }, 100);

        // 2. Gọi API để lấy kết quả thật
        try {
            const res = await fetch(`${API_URL}/api/giveaway/spin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: user.email })
            });
            const data = await res.json();

            // 3. Dừng hiệu ứng sau 3 giây và chốt kết quả
            setTimeout(() => {
                clearInterval(spinInterval);

                if (data.success) {
                    prizeBox.innerText = `🎉 ${data.prizeName} 🎉`;
                    prizeBox.style.color = "#00ffcc";
                    btn.innerText = "HOÀN TẤT";
                    showResult(data.prizeName, data.couponCode);
                } else {
                    prizeBox.innerText = "⚠️ Lỗi: " + data.error;
                    prizeBox.style.color = "red";
                    btn.innerText = "THỬ VẬN MAY";
                    btn.disabled = false; // Cho phép thử lại nếu lỗi mạng
                }
            }, 3000); // 3000ms = 3 giây quay

        } catch (error) {
            clearInterval(spinInterval);
            prizeBox.innerText = "⚠️ Mất kết nối máy chủ!";
            btn.innerText = "THỬ LẠI";
            btn.disabled = false;
        }
    });

    function showResult(prizeName, couponCode) {
        resultArea.style.display = "block";
        document.getElementById('result-title').innerText = `Kết quả: ${prizeName}`;

        if (couponCode && couponCode !== 'none' && couponCode !== 'GRAND_PRIZE') {
            document.getElementById('result-desc').innerHTML = `
                Mã Voucher của bạn: <span class="voucher-code">${couponCode}</span><br>
                <small>Mã đã được tự động lưu vào tài khoản. Hãy áp dụng ở bước thanh toán nhé!</small>
            `;
        } else if (couponCode === 'GRAND_PRIZE') {
            document.getElementById('result-desc').innerHTML = "Haru Shop sẽ liên hệ qua email để trao giải đặc biệt cho bạn!";
        } else {
            document.getElementById('result-desc').innerHTML = "Cảm ơn bạn đã tham gia sự kiện của Haru Shop!";
        }
    }
});