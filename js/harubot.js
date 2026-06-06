const API = 'https://haru-shop-backend-production.up.railway.app';

const QUICK_REPLIES = [
    'Tư vấn chuột gaming',
    'Chuột dưới 2 triệu',
    'So sánh ATK F1 vs X1',
    'Polling rate là gì?',
    'Còn hàng gì không?',
];

let chatHistory = [];
let isTyping = false;

// ── KHỞI TẠO ─────────────────────────────────
function initHaruBot() {
    // Tạo nút chat
    const btn = document.createElement('div');
    btn.id = 'harubot-btn';
    btn.title = 'Chat với HaruBot';
    btn.innerHTML = `🤖<span class="bot-badge"></span>`;
    document.body.appendChild(btn);

    // Tạo cửa sổ chat
    const win = document.createElement('div');
    win.id = 'harubot-window';
    win.innerHTML = `
        <div class="hb-header">
            <div class="hb-avatar">🤖</div>
            <div class="hb-info">
                <div class="hb-name">HaruBot</div>
                <div class="hb-status">Đang hoạt động</div>
            </div>
            <button class="hb-close" id="hb-close-btn">✕</button>
        </div>
        <div class="hb-messages" id="hb-messages"></div>
        <div class="hb-quick-replies" id="hb-quick-replies"></div>
        <div class="hb-input-area">
            <textarea id="hb-input" placeholder="Hỏi HaruBot..." rows="1"></textarea>
            <button id="hb-send"><i class="fas fa-paper-plane"></i></button>
        </div>
    `;
    document.body.appendChild(win);

    // Gắn events
    btn.addEventListener('click', toggleChat);
    document.getElementById('hb-close-btn').addEventListener('click', closeChat);
    document.getElementById('hb-send').addEventListener('click', sendMessage);
    document.getElementById('hb-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Auto resize textarea
    document.getElementById('hb-input').addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 80) + 'px';
    });

    // Quick replies
    renderQuickReplies();

    // Tin nhắn chào
    setTimeout(() => {
        addBotMessage('Xin chào! Mình là **HaruBot** 🤖\nMình có thể tư vấn gear gaming và sản phẩm tại Haru Shop cho bạn. Bạn cần mình giúp gì không?');
    }, 500);
}

// ── TOGGLE / CLOSE ────────────────────────────
function toggleChat() {
    const win = document.getElementById('harubot-window');
    win.classList.toggle('active');
    if (win.classList.contains('active')) {
        document.getElementById('hb-input').focus();
    }
}

function closeChat() {
    document.getElementById('harubot-window').classList.remove('active');
}

// ── QUICK REPLIES ─────────────────────────────
function renderQuickReplies() {
    const container = document.getElementById('hb-quick-replies');
    if (!container) return;
    container.innerHTML = QUICK_REPLIES.map(q => `
        <button class="hb-quick-btn" onclick="handleQuickReply('${q}')">${q}</button>
    `).join('');
}

function handleQuickReply(text) {
    document.getElementById('hb-quick-replies').innerHTML = '';
    document.getElementById('hb-input').value = text;
    sendMessage();
}

// ── GỬI TIN NHẮN ─────────────────────────────
async function sendMessage() {
    if (isTyping) return;
    const input = document.getElementById('hb-input');
    const msg = input.value.trim();
    if (!msg) return;

    input.value = '';
    input.style.height = 'auto';
    document.getElementById('hb-quick-replies').innerHTML = '';

    addUserMessage(msg);
    chatHistory.push({ role: 'user', text: msg });

    showTyping();
    document.getElementById('hb-send').disabled = true;
    isTyping = true;

    try {
        const res = await fetch(`${API}/api/harubot/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: msg,
                history: chatHistory.slice(-10) // Chỉ gửi 10 tin nhắn gần nhất
            })
        });

        const data = await res.json();
        removeTyping();

        if (data.reply) {
            addBotMessage(data.reply);
            chatHistory.push({ role: 'model', text: data.reply });
        } else {
            addBotMessage('Xin lỗi, mình gặp lỗi rồi. Bạn thử lại nhé!');
        }
    } catch (e) {
        removeTyping();
        addBotMessage('Mất kết nối server rồi. Bạn thử lại sau nhé!');
    } finally {
        document.getElementById('hb-send').disabled = false;
        isTyping = false;
    }
}

// ── RENDER MESSAGES ───────────────────────────
function addUserMessage(text) {
    const container = document.getElementById('hb-messages');
    const div = document.createElement('div');
    div.className = 'hb-msg user';
    div.innerHTML = `
        <div class="hb-msg-avatar">👤</div>
        <div class="hb-bubble">${escapeHtml(text)}</div>
    `;
    container.appendChild(div);
    scrollToBottom();
}

function addBotMessage(text) {
    const container = document.getElementById('hb-messages');
    const div = document.createElement('div');
    div.className = 'hb-msg bot';
    div.innerHTML = `
        <div class="hb-msg-avatar">🤖</div>
        <div class="hb-bubble">${formatBotText(text)}</div>
    `;
    container.appendChild(div);
    scrollToBottom();
}

function showTyping() {
    const container = document.getElementById('hb-messages');
    const div = document.createElement('div');
    div.className = 'hb-msg bot hb-typing';
    div.id = 'hb-typing-indicator';
    div.innerHTML = `
        <div class="hb-msg-avatar">🤖</div>
        <div class="hb-bubble">
            <div class="hb-dots">
                <span></span><span></span><span></span>
            </div>
        </div>
    `;
    container.appendChild(div);
    scrollToBottom();
}

function removeTyping() {
    const el = document.getElementById('hb-typing-indicator');
    if (el) el.remove();
}

// ── HELPERS ───────────────────────────────────
function scrollToBottom() {
    const container = document.getElementById('hb-messages');
    if (container) container.scrollTop = container.scrollHeight;
}

function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
}

function formatBotText(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');
}

// ── KHỞI CHẠY ─────────────────────────────────
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHaruBot);
} else {
    initHaruBot();
}
