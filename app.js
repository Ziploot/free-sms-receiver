/* =======================================================
   ZIPLOOT - SMS GATEWAY APP CONTROLLER
   ======================================================= */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide Icons
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
  let selectedNumber = null;
  let selectedCountry = 'all';

  // Country Flags Map
  const flagMap = {
    'US': '🇺🇸',
    'GB': '🇬🇧',
    'CA': '🇨🇦',
    'DE': '🇩🇪',
    'FR': '🇫🇷',
    'SE': '🇸🇪',
    'NL': '🇳🇱'
  };

  // Fetch Active Numbers from API
  async function fetchNumbers() {
    try {
      const res = await fetch('/api/get-numbers');
      const data = await res.json();
      
      allNumbers = data.numbers || [];
      renderNumbers();
    } catch (e) {
      console.error("Failed to load numbers: ", e);
      numbersLoading.innerHTML = `<p style="color:#ef4444;"><i data-lucide="alert-triangle"></i> Network error. Please try again.</p>`;
      lucide.createIcons();
    }
  }

  // Render Numbers list filtered by selected country
  function renderNumbers() {
    numbersGrid.innerHTML = '';
    
    const filtered = allNumbers.filter(n => {
      if (selectedCountry === 'all') return true;
      return n.country === selectedCountry;
    });

    if (filtered.length === 0) {
      numbersGrid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 40px; color:#94a3b8;">No active numbers available for this country.</div>`;
      numbersLoading.classList.add('hidden');
      numbersGrid.classList.remove('hidden');
      return;
    }

    filtered.forEach(num => {
      const card = document.createElement('div');
      card.className = `number-card ${selectedNumber === num.number ? 'active' : ''}`;
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
  }

  // Select Active Number & Load Messages
  function selectActiveNumber(num) {
    selectedNumber = num.number;
    activeFlag.textContent = flagMap[num.country] || '🌐';
    activeNumberText.textContent = num.formattedNumber || num.number;

    refreshMessagesBtn.classList.remove('hidden');
    refreshMessagesBtn.disabled = false;

    fetchMessages();
  }

  // Helper to Highlight OTP Codes in message text strings
  function highlightOTPCodes(text) {
    // Regex looking for 4 to 8 digit numerical codes (often labeled as code, pin, otp, verification, etc.)
    const codeRegex = /\b\d{4,8}\b/g;
    return text.replace(codeRegex, (match) => `<span class="otp-badge">${match}</span>`);
  }

  // Fetch Message Inbox for Selected Number
  async function fetchMessages() {
    if (!selectedNumber) return;

    inboxDefault.classList.add('hidden');
    messagesContainer.classList.add('hidden');
    messagesLoading.classList.remove('hidden');
    refreshMessagesBtn.disabled = true;

    try {
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        const mockMsgs = [
          { sender: "Google", time: "2 minutes ago", text: "G-483921 is your Google verification code. Do not share this code." },
          { sender: "WhatsApp", time: "5 minutes ago", text: "Your WhatsApp verification code is: 8492. Or tap here to verify your device." },
          { sender: "Discord", time: "12 minutes ago", text: "Your Discord security login code is 849202. Valid for 10 minutes." },
          { sender: "Netflix", time: "25 minutes ago", text: "Your temporary Netflix access code is 483921. Please use this to verify your login." }
        ];
        renderMessages(mockMsgs);
        return;
      }

      const res = await fetch(`/api/get-messages?number=${selectedNumber}`);
      const data = await res.json();
      
      renderMessages(data.messages || []);
    } catch (e) {
      console.error("Failed to load messages: ", e);
      messagesLoading.innerHTML = `<p style="color:#ef4444;"><i data-lucide="alert-triangle"></i> Failed to retrieve inbox logs.</p>`;
      lucide.createIcons();
    } finally {
      refreshMessagesBtn.disabled = false;
    }
  }

  // Render Message elements list
  function renderMessages(messages) {
    messagesList.innerHTML = '';
    
    if (messages.length === 0) {
      messagesList.innerHTML = `<div style="text-align:center; padding: 60px 20px; color:#94a3b8;"><i data-lucide="mail-warning" style="width:40px;height:40px;margin-bottom:12px;opacity:0.3;"></i><p>No SMS logs found. Send your verification code now and click Refresh.</p></div>`;
      messagesLoading.classList.add('hidden');
      messagesContainer.classList.remove('hidden');
      lucide.createIcons();
      return;
    }

    messages.forEach(msg => {
      const card = document.createElement('div');
      card.className = 'message-card';
      
      const formattedText = highlightOTPCodes(msg.text);
      
      card.innerHTML = `
        <div class="message-meta">
          <span class="message-sender">${msg.sender || 'Unknown'}</span>
          <span>${msg.time || 'Received Just Now'}</span>
        </div>
        <div class="message-text">${formattedText}</div>
      `;
      messagesList.appendChild(card);
    });

    messagesLoading.classList.add('hidden');
    messagesContainer.classList.remove('hidden');
  }

  // Filter Event
  countryFilter.addEventListener('change', (e) => {
    selectedCountry = e.target.value;
    renderNumbers();
  });

  // Refresh Inbox Action
  refreshMessagesBtn.addEventListener('click', () => {
    fetchMessages();
  });

  // Copy Active Number logic
  copyActiveNumberBtn.addEventListener('click', () => {
    if (!selectedNumber) return;
    
    navigator.clipboard.writeText(selectedNumber).then(() => {
      const originalHTML = copyActiveNumberBtn.innerHTML;
      copyActiveNumberBtn.innerHTML = `<i data-lucide="check"></i> Copied!`;
      lucide.createIcons();
      setTimeout(() => {
        copyActiveNumberBtn.innerHTML = originalHTML;
        lucide.createIcons();
      }, 1500);
    });
  });

  // If localhost, directly render static elements to guarantee capture synchronicity
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    numbersLoading.classList.add('hidden');
    numbersGrid.classList.remove('hidden');
    allNumbers = [
      { number: "18503838493", country: "US", countryName: "United States", formattedNumber: "+1 (850) 383-8493" },
      { number: "447483928193", country: "GB", countryName: "United Kingdom", formattedNumber: "+44 7483 928193" },
      { number: "16139281938", country: "CA", countryName: "Canada", formattedNumber: "+1 (613) 928-1938" },
      { number: "4917639281938", country: "DE", countryName: "Germany", formattedNumber: "+49 176 39281938" },
      { number: "33609382819", country: "FR", countryName: "France", formattedNumber: "+33 6 0938 2819" },
      { number: "46709382819", country: "SE", countryName: "Sweden", formattedNumber: "+46 70 938 2819" }
    ];
    renderNumbers();
    
    // Select first card immediately
    const firstNum = allNumbers[0];
    selectedNumber = firstNum.number;
    activeFlag.textContent = flagMap[firstNum.country] || '🌐';
    activeNumberText.textContent = firstNum.formattedNumber || firstNum.number;
    refreshMessagesBtn.classList.remove('hidden');
    refreshMessagesBtn.disabled = false;
    
    inboxDefault.classList.add('hidden');
    messagesLoading.classList.add('hidden');
    messagesContainer.classList.remove('hidden');
    const mockMsgs = [
      { sender: "Google", time: "2 minutes ago", text: "G-483921 is your Google verification code. Do not share this code." },
      { sender: "WhatsApp", time: "5 minutes ago", text: "Your WhatsApp verification code is: 8492. Or tap here to verify your device." },
      { sender: "Discord", time: "12 minutes ago", text: "Your Discord security login code is 849202. Valid for 10 minutes." },
      { sender: "Netflix", time: "25 minutes ago", text: "Your temporary Netflix access code is 483921. Please use this to verify your login." }
    ];
    renderMessages(mockMsgs);
    
    // Set active class on DOM card
    setTimeout(() => {
      const firstDOMCard = document.querySelector('.number-card');
      if (firstDOMCard) firstDOMCard.classList.add('active');
    }, 100);
  } else {
    // Start initialization for Vercel production
    fetchNumbers();
  }
});
