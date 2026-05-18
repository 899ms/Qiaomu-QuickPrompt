const state = {
  items: [],
  query: "",
  filter: "all"
};

const searchInput = document.getElementById("searchInput");
const promptList = document.getElementById("promptList");
const openSidePanel = document.getElementById("openSidePanel");
const manageButton = document.getElementById("manageButton");
const chips = Array.from(document.querySelectorAll(".chip"));

function matchesQuery(item, query) {
  if (!query) {
    return true;
  }

  const haystack = [
    item.title,
    item.content,
    item.category,
    item.shortcut,
    ...(item.tags || [])
  ].join(" ").toLowerCase();

  return haystack.includes(query.toLowerCase());
}

function getFilteredItems() {
  let items = state.items.slice();

  if (state.filter === "favorite") {
    items = items.filter((item) => item.favorite);
  }

  if (state.filter === "recent") {
    items = items.filter((item) => item.lastUsedAt).sort((a, b) => {
      return new Date(b.lastUsedAt || 0) - new Date(a.lastUsedAt || 0);
    });
  } else {
    items.sort((a, b) => {
      if (a.favorite !== b.favorite) {
        return a.favorite ? -1 : 1;
      }
      return Number(b.usageCount || 0) - Number(a.usageCount || 0);
    });
  }

  return items.filter((item) => matchesQuery(item, state.query)).slice(0, 8);
}

function renderEmpty() {
  promptList.innerHTML = `
    <div class="empty-state">
      <strong>没有匹配内容</strong>
      <span>打开侧边栏新增 Prompt 或常用语。</span>
    </div>
  `;
}

function renderItems() {
  const items = getFilteredItems();

  if (!items.length) {
    renderEmpty();
    return;
  }

  promptList.innerHTML = items.map((item) => `
    <article class="prompt-card compact-card" data-id="${item.id}">
      <div class="prompt-main">
        <div class="prompt-title-row">
          <h2>${escapeHtml(item.title)}</h2>
          ${item.favorite ? '<span class="favorite-mark" title="收藏">★</span>' : ""}
        </div>
        <p>${escapeHtml(item.content)}</p>
        <div class="meta-row">
          <span>${escapeHtml(item.category)}</span>
          ${item.shortcut ? `<code>${escapeHtml(item.shortcut)}^</code>` : ""}
        </div>
      </div>
      <button class="copy-button" data-copy-id="${item.id}">复制</button>
    </article>
  `).join("");
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function copyItem(id) {
  const item = state.items.find((candidate) => candidate.id === id);
  if (!item) {
    return;
  }

  await navigator.clipboard.writeText(item.content);
  await window.QuickPromptStore.recordUsage(id);
  state.items = await window.QuickPromptStore.getItems();
  renderItems();
}

async function openPanel() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (tab && tab.id) {
      await chrome.sidePanel.open({ tabId: tab.id });
    } else {
      await chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
    }
  } catch (error) {
    window.open(chrome.runtime.getURL("sidepanel.html"));
  }
}

async function init() {
  await window.QuickPromptStore.ensureSeedData();
  state.items = await window.QuickPromptStore.getItems();
  renderItems();
}

searchInput.addEventListener("input", () => {
  state.query = searchInput.value.trim();
  renderItems();
});

chips.forEach((chip) => {
  chip.addEventListener("click", () => {
    state.filter = chip.dataset.filter;
    chips.forEach((candidate) => candidate.classList.toggle("is-active", candidate === chip));
    renderItems();
  });
});

promptList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-copy-id]");
  if (button) {
    copyItem(button.dataset.copyId);
  }
});

openSidePanel.addEventListener("click", openPanel);
manageButton.addEventListener("click", openPanel);

init();
