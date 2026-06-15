/* =======================================
   XỬ LÝ QUÊN MẬT KHẨU & ĐỔI MẬT KHẨU BẰNG OTP
   ======================================= */

document.addEventListener('DOMContentLoaded', () => {
    const step1Form = document.getElementById('step1-forgot-form');
    const step2Form = document.getElementById('step2-reset-form');
    const emailInput = document.getElementById('forgot-email');
    const btnSendOtp = document.getElementById('btn-send-otp');
    const step1Error = document.getElementById('step1-error');

    const otpInput = document.getElementById('reset-otp');
    const newPassInput = document.getElementById('reset-new-password');
    const btnResetPass = document.getElementById('btn-reset-pass');
    const step2Error = document.getElementById('step2-error');
    const toggleResetPassword = document.getElementById('toggle-reset-password');

    let savedEmail = '';

    // --- HÀM 0: ẨN/HIỆN MẬT KHẨU (Sửa lỗi liệt nút con mắt) ---
    if (toggleResetPassword) {
        toggleResetPassword.addEventListener('click', function () {
            const type = newPassInput.getAttribute('type') === 'password' ? 'text' : 'password';
            newPassInput.setAttribute('type', type);
            this.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
        });
    }

    // --- HÀM 1: POPUP THÔNG BÁO XỊN XÒ GIỮA MÀN HÌNH ---
    function showSuccessPopup(message) {
        // Tạo lớp phủ nền mờ
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 9999; display: flex; align-items: center; justify-content: center; opacity: 0; transition: 0.3s ease; backdrop-filter: blur(5px);';

        // Tạo khung Popup phong cách Gaming
        const box = document.createElement('div');
        box.style.cssText = 'background: rgba(30, 41, 59, 0.95); padding: 40px; border-radius: 16px; text-align: center; border: 1px solid #10b981; box-shadow: 0 0 30px rgba(16, 185, 129, 0.3); transform: scale(0.8); transition: 0.3s ease; max-width: 400px; width: 90%;';

        box.innerHTML = `
            <i class="fas fa-check-circle" style="font-size: 60px; color: #10b981; margin-bottom: 20px;"></i>
            <h3 style="color: #f8fafc; font-size: 24px; margin-bottom: 15px;">Thành công!</h3>
            <p style="color: #94a3b8; font-size: 16px; margin-bottom: 25px;">${message}</p>
            <button id="btn-popup-ok" style="background: #10b981; color: #fff; border: none; padding: 12px 30px; font-size: 16px; font-weight: bold; border-radius: 8px; cursor: pointer; width: 100%; transition: 0.3s;">Đăng nhập ngay</button>
        `;

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        // Kích hoạt hiệu ứng xuất hiện
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            box.style.transform = 'scale(1)';
        });

        // Bấm nút chuyển về trang Login
        document.getElementById('btn-popup-ok').addEventListener('click', () => {
            window.location.href = 'login.html';
        });
    }

    // --- HÀM 2: GỬI EMAIL LẤY OTP ---
    if (step1Form) {
        step1Form.addEventListener('submit', async (e) => {
            e.preventDefault();
            savedEmail = emailInput.value.trim();

            if (!savedEmail) return;

            step1Error.style.display = 'none';
            btnSendOtp.disabled = true;
            btnSendOtp.innerText = 'Đang gửi mã...';

            try {
                const response = await fetch('https://haru-shop-backend-production-188a.up.railway.app/api/forgot-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: savedEmail })
                });
                const data = await response.json();

                if (data.success) {
                    step1Form.style.display = 'none';
                    step2Form.style.display = 'block';
                } else {
                    step1Error.innerText = data.message;
                    step1Error.style.display = 'block';
                    btnSendOtp.disabled = false;
                    btnSendOtp.innerText = 'Gửi mã OTP';
                }
            } catch (err) {
                step1Error.innerText = 'Lỗi kết nối Server!';
                step1Error.style.display = 'block';
                btnSendOtp.disabled = false;
                btnSendOtp.innerText = 'Gửi mã OTP';
            }
        });
    }

    // --- HÀM 3: ĐỔI MẬT KHẨU BẰNG OTP ---
    if (step2Form) {
        step2Form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const otp = otpInput.value.trim();
            const newPassword = newPassInput.value;

            // Kiểm tra mật khẩu dài tối thiểu 8 ký tự
            if (newPassword.length < 8) {
                step2Error.innerText = 'Mật khẩu phải có ít nhất 8 ký tự.';
                step2Error.style.display = 'block';
                return;
            }

            step2Error.style.display = 'none';
            btnResetPass.disabled = true;
            btnResetPass.innerText = 'Đang xác nhận...';

            try {
                const response = await fetch('https://haru-shop-backend-production-188a.up.railway.app/api/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: savedEmail, otp: otp, newPassword: newPassword })
                });
                const data = await response.json();

                if (data.success) {
                    btnResetPass.innerText = 'Thành công!';
                    btnResetPass.style.backgroundColor = '#10b981'; // Nút xanh lá

                    // Thay thế alert() bằng Popup xịn
                    setTimeout(() => {
                        showSuccessPopup('Mật khẩu của bạn đã được thiết lập lại an toàn.');
                    }, 500);

                } else {
                    step2Error.innerText = data.message;
                    step2Error.style.display = 'block';
                    btnResetPass.disabled = false;
                    btnResetPass.innerText = 'Xác nhận đổi mật khẩu';
                }
            } catch (err) {
                step2Error.innerText = 'Lỗi kết nối Server!';
                step2Error.style.display = 'block';
                btnResetPass.disabled = false;
                btnResetPass.innerText = 'Xác nhận đổi mật khẩu';
            }
        });
    }
});