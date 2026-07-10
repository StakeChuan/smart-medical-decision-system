(function () {
  const state = {
    users: [],
    conversations: [],
    selectedConversationId: null,
    selectedUser: null,
    messages: [],
    unreadCount: 0,
    isFetching: false,
    conversationPage: 1,
    pageSize: 5,
  };

  const $ = (selector) => document.querySelector(selector);
  const request = (...args) => window.request(...args);
  const toast = (message) => window.toast(message);
  const escapeHtml = (value) => window.escapeHtml(value);
  const formatDateTime = (value) => window.formatDateTime(value);
  const currentUserId = () => window.currentUserId();

  function pick(obj, keys, fallback = undefined) {
    if (!obj) return fallback;
    for (const key of keys) {
      if (obj[key] !== undefined && obj[key] !== null) return obj[key];
    }
    return fallback;
  }

  function getUserId(user) {
    return Number(pick(user, ["id", "user_id", "用户ID"], 0));
  }

  function userName(user) {
    if (!user) return "未选择用户";
    return pick(user, ["real_name", "真实姓名"]) || pick(user, ["username", "用户名"]) || `用户 ${getUserId(user)}`;
  }

  function userRole(user) {
    return pick(user, ["role", "角色"], "user");
  }

  function getConversationId(conversation) {
    return Number(pick(conversation, ["conversation_id", "会话ID"], 0));
  }

  function peerUser(conversation) {
    return pick(conversation, ["peer_user", "聊天对象"], null);
  }

  function lastMessage(conversation) {
    return pick(conversation, ["last_message", "最后一条消息"], "");
  }

  function lastMessageTime(conversation) {
    return pick(conversation, ["last_message_time", "最后消息时间"], "");
  }

  function unreadCount(conversation) {
    return Number(pick(conversation, ["unread_count", "未读数量"], 0));
  }

  function messageSenderId(message) {
    return Number(pick(message, ["sender_id", "发送者ID"], 0));
  }

  function messageContent(message) {
    return pick(message, ["content", "消息内容"], "");
  }

  function messageCreatedAt(message) {
    return pick(message, ["created_at", "发送时间"], "");
  }

  function messageIsRead(message) {
    return Boolean(pick(message, ["is_read", "是否已读"], false));
  }

  function roleLabel(role) {
    return role === "admin" ? "管理员" : role === "doctor" ? "医生" : role || "用户";
  }

  function setStatus(message) {
    const el = $("#messageFetchStatus");
    if (el) el.textContent = message;
  }

  function updateMessageNavBadge() {
    const nav = document.querySelector('[data-target="messages"]');
    if (!nav) return;
    let badge = nav.querySelector(".message-nav-badge");
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "message-nav-badge";
      nav.appendChild(badge);
    }

    nav.classList.toggle("has-unread", state.unreadCount > 0);
    badge.textContent = state.unreadCount > 99 ? "99+" : String(state.unreadCount);
    badge.hidden = state.unreadCount <= 0;
    nav.setAttribute("aria-label", state.unreadCount > 0 ? `消息中心，${state.unreadCount} 条未读消息` : "消息中心");
  }

  function resetState() {
    state.users = [];
    state.conversations = [];
    state.selectedConversationId = null;
    state.selectedUser = null;
    state.messages = [];
    state.unreadCount = 0;
    state.isFetching = false;
    state.conversationPage = 1;
  }

  function clampPage(page, totalItems, pageSize) {
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    return Math.min(Math.max(1, page), totalPages);
  }

  function pageItems(items, page, pageSize) {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }

  function renderConversationPagination() {
    const container = $("#messageConversationPagination");
    if (!container) return;
    const total = state.conversations.length;
    const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
    state.conversationPage = clampPage(state.conversationPage, total, state.pageSize);

    if (total <= state.pageSize) {
      container.innerHTML = "";
      return;
    }

    container.innerHTML = `
      <button class="ghost-btn" type="button" data-message-page="${state.conversationPage - 1}" ${state.conversationPage <= 1 ? "disabled" : ""}>上一页</button>
      <span>第 ${state.conversationPage} / ${totalPages} 页 · 共 ${total} 个会话</span>
      <button class="ghost-btn" type="button" data-message-page="${state.conversationPage + 1}" ${state.conversationPage >= totalPages ? "disabled" : ""}>下一页</button>
    `;

    container.querySelectorAll("[data-message-page]").forEach((button) => {
      button.addEventListener("click", () => {
        state.conversationPage = clampPage(Number(button.dataset.messagePage), total, state.pageSize);
        renderConversations();
      });
    });
  }

  function findConversationByUserId(userId) {
    return state.conversations.find((item) => getUserId(peerUser(item)) === userId) || null;
  }

  function renderUsers() {
    const select = $("#messageUserSelect");
    if (!select) return;
    if (!state.users.length) {
      select.innerHTML = '<option value="">暂无可聊天用户</option>';
      return;
    }

    select.innerHTML = ['<option value="">请选择聊天对象</option>']
      .concat(
        state.users.map(
          (user) =>
            `<option value="${getUserId(user)}">${escapeHtml(userName(user))} / ${escapeHtml(roleLabel(userRole(user)))}</option>`
        )
      )
      .join("");

    if (getUserId(state.selectedUser)) {
      select.value = String(getUserId(state.selectedUser));
    }
  }

  function renderConversations() {
    const list = $("#messageConversationList");
    const hint = $("#messageUnreadHint");
    if (hint) {
      hint.textContent = state.unreadCount > 0
        ? `未读 ${state.unreadCount} 条 · ${state.conversations.length} 个会话`
        : `${state.conversations.length} 个会话 · 暂无未读`;
      hint.classList.toggle("message-unread-active", state.unreadCount > 0);
    }
    updateMessageNavBadge();
    if (!list) return;

    if (!state.conversations.length) {
      list.innerHTML = '<div class="report-empty">暂无会话，选择用户后发送第一条消息即可开始。</div>';
      renderConversationPagination();
      return;
    }

    state.conversationPage = clampPage(state.conversationPage, state.conversations.length, state.pageSize);
    const visibleConversations = pageItems(state.conversations, state.conversationPage, state.pageSize);

    list.innerHTML = visibleConversations
      .map((conversation) => {
        const id = getConversationId(conversation);
        const user = peerUser(conversation);
        const unread = unreadCount(conversation);
        const active = state.selectedConversationId === id;
        return `
          <div class="patient-row conversation-row ${active ? "active" : ""} ${unread ? "unread" : ""}" data-conversation-id="${id}">
            <div>
              <div class="conversation-meta">
                <strong>${escapeHtml(userName(user))}</strong>
                <span>${escapeHtml(formatDateTime(lastMessageTime(conversation)))}</span>
              </div>
              <p>${escapeHtml(roleLabel(userRole(user)))}${unread ? ` · ${unread} 条未读` : ""}</p>
              <p class="conversation-preview">${escapeHtml(lastMessage(conversation) || "暂无消息记录")}</p>
            </div>
            <div class="row-actions">
              ${unread ? `<span class="unread-badge">${unread}</span>` : ""}
            </div>
          </div>
        `;
      })
      .join("");

    list.querySelectorAll("[data-conversation-id]").forEach((item) => {
      item.addEventListener("click", async () => {
        await window.openMessageConversation(Number(item.dataset.conversationId));
      });
    });
    renderConversationPagination();
  }

  function renderMessages() {
    const list = $("#messageList");
    if (!list) return;

    if (!state.selectedUser && !state.selectedConversationId) {
      $("#messagePanelTitle").textContent = "消息详情";
      $("#messagePanelHint").textContent = "尚未选择会话";
      $("#closeMessageConversationBtn").hidden = true;
      list.innerHTML = '<div class="report-empty">请选择左侧会话，或先选择聊天对象。</div>';
      return;
    }

    $("#messagePanelTitle").textContent = userName(state.selectedUser);
    $("#messagePanelHint").textContent = state.selectedConversationId ? "历史消息" : "尚未开始会话";
    $("#closeMessageConversationBtn").hidden = false;

    if (!state.messages.length) {
      list.innerHTML = '<div class="report-empty">暂无消息记录，发送第一条消息开始沟通。</div>';
      return;
    }

    list.innerHTML = state.messages
      .map((message) => {
        const isSelf = messageSenderId(message) === currentUserId();
        const readLabel = isSelf ? (messageIsRead(message) ? "对方已读" : "未读") : "对方消息";
        return `
          <div class="message-item ${isSelf ? "self" : "other"}">
            <div class="message-meta">
              <span>${isSelf ? "我" : escapeHtml(userName(state.selectedUser))}</span>
              <span>${escapeHtml(formatDateTime(messageCreatedAt(message)))} / ${readLabel}</span>
            </div>
            <p class="message-body">${escapeHtml(messageContent(message))}</p>
          </div>
        `;
      })
      .join("");

    list.scrollTop = list.scrollHeight;
  }

  async function loadUsers() {
    state.users = await request("/messages/users");
    renderUsers();
  }

  async function loadConversations() {
    state.conversations = await request("/messages/conversations");
    state.unreadCount = state.conversations.reduce((sum, item) => sum + unreadCount(item), 0);
    state.conversationPage = clampPage(state.conversationPage, state.conversations.length, state.pageSize);
    if (state.selectedConversationId) {
      const active = state.conversations.find((item) => getConversationId(item) === state.selectedConversationId);
      if (active) state.selectedUser = peerUser(active);
    }
    renderUsers();
    renderConversations();
  }

  async function loadConversationMessages(conversationId, options = {}) {
    const { markRead = true } = options;
    state.selectedConversationId = conversationId;
    if (markRead) {
      await request(`/messages/conversations/${conversationId}/read`, { method: "POST" });
    }
    state.messages = await request(`/messages/conversations/${conversationId}`);
    const active = state.conversations.find((item) => getConversationId(item) === state.selectedConversationId);
    if (active) state.selectedUser = peerUser(active);
    if (markRead) {
      await loadConversations();
    } else {
      renderConversations();
    }
    renderMessages();
  }

  async function ensureLoaded() {
    if (!state.users.length) await loadUsers();
    await loadConversations();
    if (state.selectedConversationId) {
      await loadConversationMessages(state.selectedConversationId, { markRead: false });
    } else {
      renderMessages();
    }
  }

  async function openConversationByUser(userId) {
    const existing = findConversationByUserId(userId);
    const user = state.users.find((item) => getUserId(item) === userId) || peerUser(existing) || null;
    if (!user) {
      toast("请选择有效的聊天对象");
      return;
    }

    state.selectedUser = user;
    if (existing) {
      await loadConversationMessages(getConversationId(existing));
      setStatus(`已打开与${userName(user)}的会话`);
    } else {
      state.selectedConversationId = null;
      state.messages = [];
      renderUsers();
      renderConversations();
      renderMessages();
      setStatus(`已选择${userName(user)}，发送第一条消息开始会话`);
    }
  }

  function closeCurrentConversation() {
    state.selectedConversationId = null;
    state.selectedUser = null;
    state.messages = [];
    const select = $("#messageUserSelect");
    if (select) select.value = "";
    renderUsers();
    renderConversations();
    renderMessages();
    setStatus("已退出当前会话");
  }

  async function fetchMessages() {
    if (state.isFetching) return;
    state.isFetching = true;
    $("#fetchMessagesBtn").disabled = true;
    setStatus("正在收取消息，请稍候...");

    try {
      const query = state.selectedConversationId ? `?conversation_id=${state.selectedConversationId}` : "";
      const data = await request(`/messages/fetch${query}`, { method: "POST" });
      state.conversations = pick(data, ["conversations", "会话列表"], []);
      state.unreadCount = pick(data, ["unread_message_count", "未读总数"], 0);
      if (state.selectedConversationId) {
        state.messages = pick(data, ["current_messages", "当前会话消息"], []);
      }
      if (state.selectedConversationId) {
        const active = state.conversations.find((item) => getConversationId(item) === state.selectedConversationId);
        if (active) state.selectedUser = peerUser(active);
      }
      renderUsers();
      renderConversations();
      renderMessages();

      const newMessageCount = pick(data, ["new_message_count", "新消息数量"], 0);
      if (newMessageCount > 0) {
        const message = `收到 ${newMessageCount} 条新消息`;
        setStatus(message);
        toast(message);
      } else {
        setStatus("暂无新消息");
        toast("暂无新消息");
      }
    } catch (error) {
      setStatus("收取消息失败");
      toast(error.message);
    } finally {
      state.isFetching = false;
      $("#fetchMessagesBtn").disabled = false;
    }
  }

  async function sendMessage(event) {
    event.preventDefault();
    const content = $("#messageInput").value.trim();
    if (!content) {
      toast("请输入消息内容");
      return;
    }
    if (!state.selectedUser) {
      toast("请先选择聊天对象");
      return;
    }

    try {
      await request("/messages", {
        method: "POST",
        body: JSON.stringify({
          receiver_id: getUserId(state.selectedUser),
          content,
        }),
      });
      $("#messageInput").value = "";
      await loadConversations();
      const active = findConversationByUserId(getUserId(state.selectedUser));
      if (active) {
        await loadConversationMessages(getConversationId(active), { markRead: false });
      }
      setStatus("消息发送成功");
      toast("消息已发送");
    } catch (error) {
      toast(error.message);
    }
  }

  window.openMessageConversation = async function openMessageConversation(conversationId) {
    const active = state.conversations.find((item) => getConversationId(item) === conversationId);
    if (!active) return;
    state.selectedUser = peerUser(active);
    await loadConversationMessages(conversationId);
    setStatus(`已打开与${userName(state.selectedUser)}的会话`);
  };

  function bindEvents() {
    const messageNav = document.querySelector('[data-target="messages"]');
    if (messageNav) {
      messageNav.addEventListener("click", ensureLoaded);
    }

    $("#openMessageUserBtn")?.addEventListener("click", async () => {
      const userId = Number($("#messageUserSelect").value);
      if (!userId) {
        toast("请选择聊天对象");
        return;
      }
      await openConversationByUser(userId);
    });
    $("#fetchMessagesBtn")?.addEventListener("click", fetchMessages);
    $("#closeMessageConversationBtn")?.addEventListener("click", closeCurrentConversation);
    $("#messageForm")?.addEventListener("submit", sendMessage);
    $("#logoutBtn")?.addEventListener("click", () => {
      resetState();
      renderUsers();
      renderConversations();
      renderMessages();
    });
  }

  bindEvents();
  renderUsers();
  renderConversations();
  renderMessages();
})();
