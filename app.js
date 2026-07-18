/* =======================================================
   ZIPLOOT - SMS GATEWAY APP CONTROLLER (v2 - Real Numbers)
   ======================================================= */

document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();

  // DOM Elements
  const numbersLoading = document.getElementById('numbers-loading');
  const numbersGrid = document.getElementById('numbers-grid');
  const countryFilter = document.getElementById('country-filter');

  const inboxDefault = document.getElementById('inbox-default');
  const messagesLoading = document.getElementById('messages-loading');
  const messagesContainer = document.getElementById('messages-container');
  const messagesList = document.getElementById('messages-list');
  const refreshMessagesBtn = document.getElementById('refresh-messages');

  const activeFlag = document.getElementById('active-flag');
  const activeNumberText = document.getElementById('active-number-text');
  const copyActiveNumberBtn = document.getElementById('copy-active-number');

  let allNumbers = [];
  let selectedNum = null;
  let selectedCountry = 'all';

  const flagMap = {
    'US': '🇺🇸', 'GB': '🇬🇧', 'CA': '🇨🇦', 'DE': '🇩🇪',
    'FR': '🇫🇷', 'SE': '🇸🇪', 'NL': '🇳🇱', 'PL': '🇵🇱',
    'FI': '🇫🇮', 'NZ': '🇳🇿', 'IN': '🇮🇳'
  };

  // Fetch REAL numbers from API
  async function fetchNumbers() {
    try {
      numbersLoading.classList.remove('hidden');
      numbersGrid.classList.add('hidden');

      const res = await fetch('/api/get-numbers');
      const data = await res.json();

      allNumbers = data.numbers || [];
      
      if (allNumbers.length === 0 && data.error) {
        numbersLoading.innerHTML = `<p style="color:#ef4444;"><i data-lucide="alert-triangle"></i> ${data.error}</p>`;
        lucide.createIcons();
        return;
      }

      renderNumbers();
    } catch (e) {
      console.error("Failed to load numbers:", e);
      numbersLoading.innerHTML = `<p style="color:#ef4444;"><i data-lucide="alert-triangle"></i> Network error. Please try again.</p>`;
      lucide.createIcons();
    }
  }

  // Render number cards
  function renderNumbers() {
    numbersGrid.innerHTML = '';

    const filtered = allNumbers.filter(n => {
      if (selectedCountry === 'all') return true;
      return n.country === selectedCountry;
    });

    if (filtered.length === 0) {
      numbersGrid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:#94a3b8;">No active numbers for this country.</div>`;
      numbersLoading.classList.add('hidden');
      numbersGrid.classList.remove('hidden');
      return;
    }

    filtered.forEach(num => {
      const card = document.createElement('div');
      const isActive = selectedNum && selectedNum.number === num.number;
      card.className = `number-card ${isActive ? 'active' : ''}`;
      card.innerHTML = `
        <div class="card-meta">
          <span class="card-country">
            <span class="card-flag">${flagMap[num.country] || '🌐'}</span>
            <span>${num.countryName || num.country}</span>
          </span>
          <span class="status-badge"><i data-lucide="check" style="width:12px;height:12px;color:#06b6d4;display:inline-block;vertical-align:middle;margin-right:3px;"></i>Online</span>
        </div>
        <div class="card-number">${num.formattedNumber || num.number}</div>
      `;

      card.addEventListener('click', () => {
        document.querySelectorAll('.number-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        selectActiveNumber(num);
      });

      numbersGrid.appendChild(card);
    });

    numbersLoading.classList.add('hidden');
    numbersGrid.classList.remove('hidden');
    lucide.createIcons();
  }

  // Select number & load messages
  function selectActiveNumber(num) {
    selectedNum = num;
    activeFlag.textContent = flagMap[num.country] || '🌐';
    activeNumberText.textContent = num.formattedNumber || num.number;

    refreshMessagesBtn.classList.remove('hidden');
    refreshMessagesBtn.disabled = false;

    fetchMessages();
  }

  // Highlight OTP codes
  function highlightOTPCodes(text) {
    return text.replace(/\b\d{4,8}\b/g, (match) => `<span class="otp-badge">${match}</span>`);
  }

  // Fetch messages for selected number
  async function fetchMessages() {
    if (!selectedNum) return;

    inboxDefault.classList.add('hidden');
    messagesContainer.classList.add('hidden');
    messagesLoading.classList.remove('hidden');
    refreshMessagesBtn.disabled = true;

    try {
      const params = new URLSearchParams({
        number: selectedNum.number,
        numberId: selectedNum.numberId || '',
        country: selectedNum.country || 'us'
      });
      
      const res = await fetch(`/api/get-messages?${params}`);
      const data = await res.json();

      if (data.source === 'live') {
        renderMessages(data.messages || []);
      } else {
        // Show "View Online" fallback with direct link
        const viewUrl = data.viewOnline || selectedNum.messageUrl || 'https://sms-receive.net/';
        showViewOnline(viewUrl, data.info || '');
      }
    } catch (e) {
      console.error("Failed to load messages:", e);
      const viewUrl = selectedNum.messageUrl || 'https://sms-receive.net/';
      showViewOnline(viewUrl, 'Network error fetching messages.');
    } finally {
      refreshMessagesBtn.disabled = false;
    }
  }

  // Show "View Online" fallback when scraping is blocked
  function showViewOnline(url, info) {
    messagesList.innerHTML = `
      <div style="text-align:center; padding:40px 20px;">
        <i data-lucide="external-link" style="width:48px;height:48px;color:#06b6d4;margin-bottom:16px;opacity:0.6;"></i>
        <p style="color:#94a3b8;margin-bottom:8px;font-size:0.95rem;">${info || 'Messages are available on the source website.'}</p>
        <p style="color:#64748b;margin-bottom:20px;font-size:0.85rem;">This number is real and active. Click below to view incoming SMS directly:</p>
        <a href="${url}" target="_blank" rel="noopener" 
           style="display:inline-block; background:linear-gradient(135deg,#06b6d4,#a855f7); color:#fff; 
                  padding:12px 28px; border-radius:50px; font-weight:700; font-size:14px; 
                  text-decoration:none; box-shadow:0 4px 15px rgba(6,182,212,0.4); transition:transform 0.2s;">
          <i data-lucide="external-link" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:6px;"></i>
          VIEW MESSAGES ONLINE
        </a>
        <p style="color:#475569;margin-top:16px;font-size:0.8rem;">
          Send your SMS to <strong>${selectedNum ? selectedNum.formattedNumber : 'the selected number'}</strong>, 
          then click the button above to check delivery.
        </p>
      </div>
    `;
    messagesLoading.classList.add('hidden');
    messagesContainer.classList.remove('hidden');
    lucide.createIcons();
  }

  // Render real message cards
  function renderMessages(messages) {
    messagesList.innerHTML = '';

    if (messages.length === 0) {
      messagesList.innerHTML = `<div style="text-align:center;padding:60px 20px;color:#94a3b8;">
        <i data-lucide="mail-warning" style="width:40px;height:40px;margin-bottom:12px;opacity:0.3;"></i>
        <p>No SMS logs found yet. Send a verification code and click Refresh.</p>
      </div>`;
      messagesLoading.classList.add('hidden');
      messagesContainer.classList.remove('hidden');
      lucide.createIcons();
      return;
    }

    messages.forEach(msg => {
      const card = document.createElement('div');
      card.className = 'message-card';
      card.innerHTML = `
        <div class="message-meta">
          <span class="message-sender">${msg.sender || 'Unknown'}</span>
          <span>${msg.time || 'Just now'}</span>
        </div>
        <div class="message-text">${highlightOTPCodes(msg.text)}</div>
      `;
      messagesList.appendChild(card);
    });

    messagesLoading.classList.add('hidden');
    messagesContainer.classList.remove('hidden');
  }

  // Events
  countryFilter.addEventListener('change', (e) => {
    selectedCountry = e.target.value;
    renderNumbers();
  });

  refreshMessagesBtn.addEventListener('click', () => fetchMessages());

  copyActiveNumberBtn.addEventListener('click', () => {
    if (!selectedNum) return;
    const numToCopy = selectedNum.formattedNumber || selectedNum.number;
    navigator.clipboard.writeText(numToCopy).then(() => {
      const orig = copyActiveNumberBtn.innerHTML;
      copyActiveNumberBtn.innerHTML = `<i data-lucide="check"></i> Copied!`;
      lucide.createIcons();
      setTimeout(() => { copyActiveNumberBtn.innerHTML = orig; lucide.createIcons(); }, 1500);
    });
  });

  // Start
  fetchNumbers();
});
