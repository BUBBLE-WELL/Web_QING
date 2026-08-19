/**
 * Qing Bot Widget — portfolio AI assistant
 * Vanilla JS, no dependencies.
 *
 * API URL auto-detects: local wrangler dev on localhost, production otherwise.
 * To override, set window.QING_BOT_API before this script loads.
 */
(function () {
  "use strict";

  // ─── CONFIG ────────────────────────────────────────────────────────────────
  var BOT_API_URL = window.QING_BOT_API || (function () {
    var h = location.hostname;
    if (h === "localhost" || h === "127.0.0.1") {
      return "http://127.0.0.1:8787/api/chat";
    }
    // China mirror — served from jiyiji.cn, calls the local Node proxy
    // (Cloudflare Workers is unreachable from mainland China)
    if (h === "jiyiji.cn" || h.endsWith(".jiyiji.cn")) {
      return "https://jiyiji.cn/webqing/api/chat";
    }
    return "https://qing-portfolio-bot.jellycwq.workers.dev/api/chat";
  }());

  var STORAGE_KEY = "qing-bot-history";
  var MAX_HISTORY_TURNS = 10;

  // ─── GUIDED ROUNDS ─────────────────────────────────────────────────────────
  // Sequential question chips shown when the panel is in zoomed/docked mode.
  // Each chip, when clicked, auto-sends its question as if the visitor typed it.
  // Chips appear one-at-a-time after each exchange (like the workshop card reveal).
  var GUIDED_ROUNDS = [
    {
      label_cn: "介绍一下 Qing",
      label_en: "Introduce Qing",
      q_cn: "用一两句话介绍一下 Qing：她是谁、在做什么研究？",
      q_en: "Introduce Qing in a sentence or two — who is she and what does she research?",
    },
    {
      label_cn: "论文做了什么",
      label_en: "About the thesis",
      q_cn: "她的硕士论文研究了什么？核心问题和发现是什么？",
      q_en: "What is her master's thesis about? What was the core question and finding?",
    },
    {
      label_cn: "她会写代码吗",
      label_en: "Can she code?",
      q_cn: "她会写代码吗？用什么技术栈？做过什么项目？",
      q_en: "Can she code? What's her tech stack and what has she built?",
    },
    {
      label_cn: "在找什么工作",
      label_en: "Job hunting",
      q_cn: "她目前在找什么类型的工作？什么样的团队适合她？",
      q_en: "What roles is she looking for right now, and what team would she fit?",
    },
    {
      label_cn: "Workshop 是什么",
      label_en: "About the workshop",
      q_cn: "网站里的 AI Workshop 是什么？怎么进入？",
      q_en: "What is the AI Workshop on this site, and how do I enter it?",
    },
  ];

  // ─── HTML ESCAPE ───────────────────────────────────────────────────────────
  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ─── LANGUAGE DETECTION ────────────────────────────────────────────────────
  // Follows the portfolio's language toggle (EN / 中文 button) first.
  // Falls back to browser language if the portfolio state isn't available.
  function detectLang() {
    if (typeof window.getPortfolioContext === "function") {
      try {
        var ctx = window.getPortfolioContext();
        // Portfolio state uses "zh"; the bot's internal copy uses "cn".
        if (ctx && (ctx.lang === "zh" || ctx.lang === "cn")) return "cn";
        if (ctx && ctx.lang === "en") return "en";
      } catch (e) {}
    }
    var documentLang = (document.documentElement.getAttribute("lang") || "en").toLowerCase();
    if (documentLang.indexOf("zh") === 0) return "cn";
    var nav = (navigator.language || "en").toLowerCase();
    return nav.startsWith("zh") ? "cn" : "en";
  }

  // ─── MARKDOWN RENDERER ─────────────────────────────────────────────────────
  // Handles: ## headers, **bold**, *italic*, `code`, [link](url),
  //          - bullet lists, 1. ordered lists, blank-line paragraphs.
  function renderMarkdown(raw) {
    var lines = raw.split("\n");
    var out = [];
    var listItems = [];
    var listType = null; // 'ul' or 'ol'

    function flushList() {
      if (!listItems.length) return;
      out.push("<" + listType + ' class="qb-list">' + listItems.join("") + "</" + listType + ">");
      listItems = [];
      listType = null;
    }

    function applyInline(s) {
      // Links  [text](https://...)
      s = s.replace(
        /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
      );
      // Inline code  `text`
      s = s.replace(/`([^`]+)`/g, '<code class="qb-code">$1</code>');
      // Bold  **text**
      s = s.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
      // Italic  *text*
      s = s.replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
      return s;
    }

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];

      // Horizontal rule  ---  ***  ___
      if (/^(\-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
        flushList();
        out.push('<hr class="qb-hr">');
        continue;
      }

      var hm = line.match(/^(#{1,4})\s+(.+)$/);
      if (hm) {
        flushList();
        var lvl = Math.min(hm[1].length + 2, 6);
        out.push("<h" + lvl + ' class="qb-h">' + applyInline(esc(hm[2])) + "</h" + lvl + ">");
        continue;
      }

      var ulm = line.match(/^\s*[-*]\s+(.+)$/);
      if (ulm) {
        if (listType && listType !== "ul") flushList();
        listType = "ul";
        listItems.push("<li>" + applyInline(esc(ulm[1])) + "</li>");
        continue;
      }

      var olm = line.match(/^\s*\d+\.\s+(.+)$/);
      if (olm) {
        if (listType && listType !== "ol") flushList();
        listType = "ol";
        listItems.push("<li>" + applyInline(esc(olm[1])) + "</li>");
        continue;
      }

      if (!line.trim()) {
        flushList();
        continue;
      }

      flushList();
      out.push("<p>" + applyInline(esc(line)) + "</p>");
    }

    flushList();
    return out.join("\n");
  }

  // ─── SESSION HISTORY ───────────────────────────────────────────────────────
  function loadHistory() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      return arr.slice(-MAX_HISTORY_TURNS * 2);
    } catch (e) {
      return [];
    }
  }

  function saveHistory(h) {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(h)); } catch (e) {}
  }

  function pushHistory(h, role, content) {
    h.push({ role: role, content: content });
    if (h.length > MAX_HISTORY_TURNS * 2) {
      h.splice(0, h.length - MAX_HISTORY_TURNS * 2);
    }
    saveHistory(h);
  }

  // ─── DOM REFS ──────────────────────────────────────────────────────────────
  var widget   = document.getElementById("qb-widget");
  var panel    = document.getElementById("qb-panel");
  var thread   = document.getElementById("qb-thread");
  var form     = document.getElementById("qb-form");
  var input    = document.getElementById("qb-input");
  var sendBtn  = document.getElementById("qb-send");
  var closeBtn = document.getElementById("qb-close");
  var clearBtn = document.getElementById("qb-clear");
  var zoomBtn  = document.getElementById("qb-zoom");

  // Bail silently if widget not present on this page.
  if (!panel || !thread || !form || !input) return;

  // Inject mode badge span into title (shown only in zoomed mode via CSS).
  var titleSpan = panel.querySelector(".qb-title");
  var modeBadge = document.createElement("span");
  modeBadge.className = "qb-mode-badge";
  modeBadge.textContent = "guided";
  if (titleSpan) titleSpan.appendChild(modeBadge);

  // ─── STATE ────────────────────────────────────────────────────────────────
  var history    = loadHistory();
  var isOpen     = false;
  var isBusy     = false;
  var isZoomed   = false;
  var roundsDone = 0; // how many guided rounds have been sent/answered

  // Original DOM position — saved before reparenting into .main-area
  var widgetOriginalParent = widget.parentNode;
  var widgetOriginalNext   = widget.nextSibling;

  // Rail view-switcher tabs element (created lazily, injected into .left-rail)
  var railTabs = null;

  // ─── PANEL OPEN / CLOSE ───────────────────────────────────────────────────
  function openPanel() {
    isOpen = true;
    panel.removeAttribute("hidden");
    panel.setAttribute("aria-hidden", "false");
    widget.setAttribute("data-open", "");

    if (!thread.querySelector(".qb-msg")) {
      if (history.length === 0) {
        appendWelcome();
      } else {
        renderHistoryMessages();
      }
    }
    input.focus();
  }

  function closePanel() {
    isOpen = false;
    // Also exit zoom when closing
    if (isZoomed) exitZoom();
    panel.setAttribute("hidden", "");
    panel.setAttribute("aria-hidden", "true");
    widget.removeAttribute("data-open");
  }

  function clearChat() {
    history = [];
    roundsDone = 0;
    saveHistory([]);
    thread.innerHTML = "";
    appendWelcome();
    // If zoomed, show first round chip again after clearing
    if (isZoomed) {
      setTimeout(maybeShowNextRound, 350);
    }
  }

  // ─── RAIL VIEW-SWITCHER TABS ──────────────────────────────────────────────
  // Two side-by-side tab cards injected at the top of .left-rail when the bot
  // is in zoom/main-area mode.
  //   Left card  = "← Portfolio" — click to exit bot zoom and restore spider chat
  //   Right card = "● Qing Bot"   — current active mode (no action)
  function createRailTabs() {
    if (railTabs) return;
    var lang = detectLang();
    var cn = lang === "cn";

    railTabs = document.createElement("div");
    railTabs.className = "qb-rail-tabs";
    railTabs.innerHTML =
      // Left: Portfolio tab (active in normal mode, clickable to exit zoom)
      '<button class="qb-rail-tab qb-rail-tab--portfolio" type="button" id="qb-tab-portfolio">' +
        '<span class="qb-rail-tab-icon">▪</span>' +
        '<span class="qb-rail-tab-label">' + (cn ? "作品集" : "Portfolio") + '</span>' +
        '<span class="qb-rail-tab-sub">' + (cn ? "对话" : "Chat") + '</span>' +
      '</button>' +
      // Right: Qing Bot tab (passive in normal mode, clickable to enter zoom)
      '<button class="qb-rail-tab qb-rail-tab--bot" type="button" id="qb-tab-bot">' +
        '<span class="qb-rail-tab-icon">●</span>' +
        '<span class="qb-rail-tab-label">Qing Bot</span>' +
        '<span class="qb-rail-tab-sub">' + (cn ? "问她" : "Ask her") + '</span>' +
      '</button>';
    syncRailTabsLanguage();

    // Portfolio tab: leave the bot view completely; do not restore a floating panel.
    railTabs.querySelector("#qb-tab-portfolio").addEventListener("click", closePanel);
    // Qing Bot tab: enter zoom (no-op in zoom mode — CSS pointer-events:none)
    railTabs.querySelector("#qb-tab-bot").addEventListener("click", function () {
      if (!isZoomed) enterZoom();
    });
  }

  function insertRailTabs() {
    createRailTabs();
    var convIndex = document.getElementById("conversation-index");
    var leftRail  = convIndex && convIndex.closest(".left-rail");
    if (leftRail && convIndex) {
      var prev = convIndex.previousElementSibling;
      if (!prev || !prev.classList.contains("qb-rail-tabs")) {
        leftRail.insertBefore(railTabs, convIndex);
      }
    }
  }

  function removeRailTabs() {
    if (railTabs && railTabs.parentNode) railTabs.parentNode.removeChild(railTabs);
  }

  // Keep the Navigator labels in the same language as the portfolio without
  // rebuilding the interactive rail or replacing its event listeners.
  function syncRailTabsLanguage() {
    if (!railTabs) return;
    var cn = detectLang() === "cn";
    var portfolioLabel = railTabs.querySelector("#qb-tab-portfolio .qb-rail-tab-label");
    var portfolioSub = railTabs.querySelector("#qb-tab-portfolio .qb-rail-tab-sub");
    var botSub = railTabs.querySelector("#qb-tab-bot .qb-rail-tab-sub");
    if (portfolioLabel) portfolioLabel.textContent = cn ? "作品集" : "Portfolio";
    if (portfolioSub) portfolioSub.textContent = cn ? "对话" : "Chat";
    if (botSub) botSub.textContent = cn ? "问她" : "Ask her";
    syncGuidedRoundLanguage();
  }

  function syncGuidedRoundLanguage() {
    var cn = detectLang() === "cn";
    thread.querySelectorAll("[data-round-index]").forEach(function (row) {
      if (row.classList.contains("qb-round-row--used")) return;
      var round = GUIDED_ROUNDS[Number(row.getAttribute("data-round-index"))];
      var chip = row.querySelector(".qb-round-chip");
      if (round && chip) chip.textContent = cn ? round.label_cn : round.label_en;
    });
  }

  // Inject tabs whenever the story view becomes active (body data-state="story").
  // This covers: initial load in story view AND navigation from landing.
  (function watchStoryView() {
    function tryInject() {
      if (document.body.dataset.state === "story") insertRailTabs();
    }
    tryInject(); // in case already in story view
    var obs = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        if (m.type === "attributes" && m.attributeName === "data-state") tryInject();
        if (m.type === "attributes" && m.attributeName === "data-lang") syncRailTabsLanguage();
      });
    });
    obs.observe(document.body, { attributes: true, attributeFilter: ["data-state", "data-lang"] });
    var langObs = new MutationObserver(syncRailTabsLanguage);
    langObs.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  }());

  // ─── ZOOM / DOCK MODE ─────────────────────────────────────────────────────
  // Zoomed: bot panel is reparented into .main-area, replacing the spider
  // conversation (#chat-thread). The left-rail index items become bot-topic chips.
  // Falls back to full-height right panel if .main-area isn't found (e.g. landing page).

  function enterZoom() {
    isZoomed = true;
    widget.classList.add("qb-widget--zoomed");
    document.body.setAttribute("data-qb-zoom", "true");

    // Reset drag transform
    dragTranslate = { x: 0, y: 0 };
    widget.style.transform = "";

    if (zoomBtn) {
      zoomBtn.textContent = "↙";
      zoomBtn.setAttribute("title", "收起 / exit bot view");
    }

    // Try to dock into .main-area (story view)
    var mainArea = document.querySelector(".main-area");
    var chatThread = document.getElementById("chat-thread");
    if (mainArea && chatThread) {
      // Reparent widget before #chat-thread so it occupies that slot
      mainArea.insertBefore(widget, chatThread);
      // Inject the two-tab view-switcher into the left rail
      insertRailTabs();
    }
    // If no .main-area, the CSS fallback (right-side fixed panel) applies.

    if (!isOpen) openPanel();
    if (!thread.querySelector(".qb-round-row")) {
      setTimeout(maybeShowNextRound, 350);
    }
  }

  function exitZoom() {
    isZoomed = false;
    widget.classList.remove("qb-widget--zoomed");
    document.body.removeAttribute("data-qb-zoom");

    // Restore widget to original DOM position
    if (widgetOriginalParent) {
      if (widgetOriginalNext && widgetOriginalNext.parentNode === widgetOriginalParent) {
        widgetOriginalParent.insertBefore(widget, widgetOriginalNext);
      } else {
        widgetOriginalParent.appendChild(widget);
      }
    }

    if (zoomBtn) {
      zoomBtn.textContent = "↗";
      zoomBtn.setAttribute("title", "放大 / dock bot");
    }
  }

  function toggleZoom() {
    if (isZoomed) exitZoom();
    else enterZoom();
  }

  // ─── CONVERSATION-INDEX INTERCEPT ─────────────────────────────────────────
  // When bot is zoomed, clicking a left-rail index item sends the bot a question
  // about that topic instead of scrolling the (now-hidden) spider conversation.
  // Uses capture phase on document to run before kg-app.js's bubble-phase listener.
  document.addEventListener("click", function (e) {
    if (!isZoomed) return;
    var item = e.target.closest && e.target.closest(".conversation-index-item");
    if (!item) return;

    e.preventDefault();
    e.stopImmediatePropagation(); // prevent kg-app.js scroll handler

    var strong = item.querySelector("strong");
    var text = (strong ? strong.textContent : item.textContent).trim().slice(0, 80);

    if (!isOpen) openPanel();
    var lang = detectLang();
    var q = lang === "cn"
      ? "能详细说说「" + text + "」？"
      : "Tell me more about: \"" + text + "\"";
    sendMessage(q);
  }, true /* capture */);

  // ─── GUIDED ROUND CHIPS ───────────────────────────────────────────────────
  // Show the next round chip inside the thread.
  // CSS hides .qb-round-row in normal mode; visible only when zoomed.
  function maybeShowNextRound() {
    if (!isZoomed) return;
    if (roundsDone >= GUIDED_ROUNDS.length) return;
    // Don't stack chips — only show one pending chip at a time
    if (thread.querySelector(".qb-round-row:not(.qb-round-row--used)")) return;
    appendRoundChip(GUIDED_ROUNDS[roundsDone], roundsDone);
  }

  function appendRoundChip(round, roundIdx) {
    var lang = detectLang();
    var label = lang === "cn" ? round.label_cn : round.label_en;

    var row = document.createElement("div");
    // qb-msg for layout + qb-round-row for CSS show/hide
    row.className = "qb-msg qb-round-row";
    row.setAttribute("data-round-index", String(roundIdx));

    var chip = document.createElement("button");
    chip.type = "button";
    chip.className = "qb-round-chip";
    chip.textContent = label;

    chip.addEventListener("click", function () {
      // Mark this chip as used
      chip.disabled = true;
      chip.classList.add("qb-round-chip--used");
      row.classList.add("qb-round-row--used");
      // Advance counter *before* sending so maybeShowNextRound uses correct index
      roundsDone = roundIdx + 1;
      var q = lang === "cn" ? round.q_cn : round.q_en;
      // Send as if the visitor typed it; show next chip after bot replies
      sendMessage(q, function onAfterRound() {
        setTimeout(maybeShowNextRound, 500);
      });
    });

    row.appendChild(chip);
    thread.appendChild(row);
    scrollToBottom();
  }

  // ─── MESSAGE RENDERING ────────────────────────────────────────────────────
  function appendWelcome() {
    var msg = detectLang() === "cn"
      ? "你好！我是 Qing 的作品集助手。可以问我她的研究课题、项目经历、技术背景——或者任何你想了解的。"
      : "Hi! I'm Qing's portfolio assistant. Ask me about her research, projects, tech background, or what she's looking for.";
    appendAssistant(msg);
  }

  function renderHistoryMessages() {
    history.forEach(function (msg) {
      if (msg.role === "user") {
        appendUser(msg.content);
      } else if (msg.role === "assistant") {
        appendAssistant(msg.content);
      }
    });
  }

  function appendUser(text) {
    var div = document.createElement("div");
    div.className = "qb-msg qb-msg--user";
    var bubble = document.createElement("div");
    bubble.className = "qb-bubble";
    bubble.textContent = text;
    div.appendChild(bubble);
    thread.appendChild(div);
    scrollToBottom();
  }

  function appendAssistant(markdown) {
    var div = document.createElement("div");
    div.className = "qb-msg qb-msg--assistant";
    var bubble = document.createElement("div");
    bubble.className = "qb-bubble";
    bubble.innerHTML = renderMarkdown(markdown);
    div.appendChild(bubble);
    thread.appendChild(div);
    scrollToBottom();
    return div;
  }

  function showTyping() {
    var div = document.createElement("div");
    div.className = "qb-msg qb-msg--assistant";
    div.innerHTML = '<div class="qb-bubble qb-bubble--typing"><span class="typing-dots"><span></span><span></span><span></span></span></div>';
    thread.appendChild(div);
    scrollToBottom();
    return div;
  }

  function scrollToBottom() {
    thread.scrollTop = thread.scrollHeight;
  }

  // ─── INPUT STATE ──────────────────────────────────────────────────────────
  function setInputBusy(busy) {
    isBusy = busy;
    input.disabled = busy;
    sendBtn.disabled = busy;
  }

  function autoResize() {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 120) + "px";
  }

  // ─── PAGE CONTEXT ─────────────────────────────────────────────────────────
  function getPageContext() {
    if (typeof window.getPortfolioContext === "function") {
      try { return window.getPortfolioContext(); } catch (e) {}
    }
    return null;
  }

  // ─── SEND ─────────────────────────────────────────────────────────────────
  // onAfter (optional): called after bot successfully renders last bubble.
  // Used by round chips to show the next chip.
  var SEGMENT_DELAY = 300; // ms between paragraph bubbles

  function sendMessage(text, onAfter) {
    if (isBusy || !text.trim()) return;

    setInputBusy(true);
    appendUser(text);

    var historySnapshot = history.slice();
    var typingEl = showTyping();

    fetch(BOT_API_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message: text,
        lang: detectLang(),
        history: historySnapshot,
        pageContext: getPageContext(),
      }),
    })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        var reply = (data && typeof data.reply === "string") ? data.reply.trim() : "";
        if (!reply) throw new Error("empty reply");

        typingEl.remove();

        // Split by blank lines → each paragraph becomes its own bubble.
        // This creates a conversational rhythm instead of a wall of text.
        var segments = reply
          .split(/\n{2,}/)
          .map(function (s) { return s.trim(); })
          .filter(Boolean);

        // Recursive display: show each segment with a small delay.
        function showSegment(idx) {
          appendAssistant(segments[idx]);
          if (idx < segments.length - 1) {
            setTimeout(function () { showSegment(idx + 1); }, SEGMENT_DELAY);
          } else {
            // Last segment shown — wrap up
            pushHistory(history, "user", text);
            pushHistory(history, "assistant", reply);
            setInputBusy(false);
            input.focus();
            if (typeof onAfter === "function") onAfter();
          }
        }

        showSegment(0);
      })
      .catch(function () {
        typingEl.remove();
        var errMsg = detectLang() === "cn"
          ? "抱歉，连接出了问题，请稍后再试。"
          : "Sorry, something went wrong. Please try again.";
        appendAssistant(errMsg);
        setInputBusy(false);
        input.focus();
      });
    // Note: no .finally() — busy state is managed inside .then() and .catch()
    // to keep it active until all segments finish rendering.
  }

  // ─── DRAGGABLE HEADER ─────────────────────────────────────────────────────
  // Uses CSS transform so bottom/right anchoring stays intact.
  // Drag is disabled when zoomed (panel is docked).
  var header = panel.querySelector(".qb-header");
  var dragState = null;
  var dragTranslate = { x: 0, y: 0 };

  if (header) {
    header.addEventListener("mousedown", function (e) {
      // Skip if zoomed (panel is docked, no need to drag)
      if (isZoomed) return;
      if (e.target.tagName === "BUTTON" || e.target.closest("button")) return;
      e.preventDefault();
      dragState = { startX: e.clientX - dragTranslate.x, startY: e.clientY - dragTranslate.y };
      document.addEventListener("mousemove", onDrag);
      document.addEventListener("mouseup", stopDrag);
      widget.style.userSelect = "none";
    });
  }

  function onDrag(e) {
    if (!dragState) return;
    dragTranslate.x = e.clientX - dragState.startX;
    dragTranslate.y = e.clientY - dragState.startY;
    widget.style.transform = "translate(" + dragTranslate.x + "px, " + dragTranslate.y + "px)";
  }

  function stopDrag() {
    dragState = null;
    document.removeEventListener("mousemove", onDrag);
    document.removeEventListener("mouseup", stopDrag);
    widget.style.userSelect = "";
  }

  // ─── WORKSHOP AUTO-COLLAPSE ───────────────────────────────────────────────
  document.addEventListener("portfolio:workshop-enter", function () {
    if (isOpen) closePanel();
  });

  // ─── EVENT LISTENERS ──────────────────────────────────────────────────────
  // Landing CTA: move into the story shell first, then open the docked bot.
  // This keeps the landing page free of a floating panel.
  var landingBtn = document.getElementById("qb-landing-btn");
  if (landingBtn) {
    landingBtn.addEventListener("click", function () {
      if (document.body.dataset.state === "landing") {
        // Reuse the portfolio's normal USER_HI transition so the underlying
        // chat thread and question choices are initialized before docking.
        var hiButton = document.getElementById("hi-bubble");
        if (hiButton) {
          hiButton.click();
          window.setTimeout(enterZoom, 620);
          return;
        }
      }
      enterZoom();
    });
  }

  closeBtn.addEventListener("click", closePanel);
  clearBtn.addEventListener("click", clearChat);

  if (zoomBtn) {
    zoomBtn.addEventListener("click", toggleZoom);
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text) return;
    input.value = "";
    input.style.height = "auto";
    sendMessage(text);
  });

  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    }
  });

  input.addEventListener("input", autoResize);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && isOpen) closePanel();
  });

}());
