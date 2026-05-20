const state = {
  items: [],
  settings: {},
  query: "",
  filter: "all",
  previewId: null
};

const searchInput = document.getElementById("searchInput");
const promptList = document.getElementById("promptList");
const openSidePanel = document.getElementById("openSidePanel");
const manageButton = document.getElementById("manageButton");
const chips = Array.from(document.querySelectorAll(".chip"));
const imagePreviewOverlay = document.getElementById("imagePreviewOverlay");
const previewImage = document.getElementById("previewImage");
const previewTitle = document.getElementById("previewTitle");
const previewMeta = document.getElementById("previewMeta");
const previewPrompt = document.getElementById("previewPrompt");
const closePreviewButton = document.getElementById("closePreviewButton");
const previewCopyButton = document.getElementById("previewCopyButton");
const previewSourceLink = document.getElementById("previewSourceLink");

function matchesQuery(item, query) {
  if (!query) {
    return true;
  }

  const haystack = [
    item.title,
    item.content,
    item.category,
    getPromptTypeLabel(item.promptType),
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
      ${renderPreviewThumb(item)}
      <div class="prompt-main">
        <div class="prompt-title-row">
          <h2>${escapeHtml(item.title)}</h2>
          ${item.favorite ? '<span class="favorite-mark" title="收藏">★</span>' : ""}
        </div>
        <p>${escapeHtml(item.content)}</p>
        <div class="meta-row">
          <span>${escapeHtml(item.category)}</span>
          <span>${escapeHtml(getPromptTypeLabel(item.promptType))}</span>
          ${item.shortcut ? `<code>${escapeHtml(item.shortcut)}${escapeHtml(state.settings.shortcutTrigger || "@")}</code>` : ""}
        </div>
      </div>
      <button class="copy-button" data-copy-id="${item.id}">复制</button>
    </article>
  `).join("");
}

function renderPreviewThumb(item) {
  if (item.promptType !== "image" || !item.previewImage || !item.previewImage.thumbnailUrl) {
    return "";
  }

  const alt = item.previewImage.alt || item.title;
  return `
    <button class="preview-thumb compact-thumb" type="button" data-preview-id="${item.id}" title="查看参考图" aria-label="查看「${escapeHtml(item.title)}」参考图">
      <img src="${escapeHtml(item.previewImage.thumbnailUrl)}" alt="${escapeHtml(alt)}" loading="lazy">
    </button>
  `;
}

function getPromptTypeLabel(promptType) {
  if (promptType === "image") {
    return "生图";
  }

  if (promptType === "video") {
    return "生视频";
  }

  return "文本";
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

function showImagePreview(id) {
  const item = state.items.find((candidate) => candidate.id === id);
  if (!item || item.promptType !== "image" || !item.previewImage) {
    return;
  }

  state.previewId = id;
  previewImage.src = item.previewImage.fullUrl || item.previewImage.thumbnailUrl;
  previewImage.alt = item.previewImage.alt || item.title;
  previewTitle.textContent = item.title;
  previewMeta.textContent = [item.category, item.source?.sourceLabel].filter(Boolean).join(" · ");
  previewPrompt.textContent = item.content;

  if (item.source?.url) {
    previewSourceLink.href = item.source.url;
    previewSourceLink.hidden = false;
  } else {
    previewSourceLink.hidden = true;
    previewSourceLink.removeAttribute("href");
  }

  imagePreviewOverlay.hidden = false;
  closePreviewButton.focus();
}

function hideImagePreview() {
  state.previewId = null;
  imagePreviewOverlay.hidden = true;
  previewImage.removeAttribute("src");
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
  state.settings = await window.QuickPromptStore.getSettings();
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
  const previewButton = event.target.closest("[data-preview-id]");
  if (previewButton) {
    event.stopPropagation();
    showImagePreview(previewButton.dataset.previewId);
    return;
  }

  const button = event.target.closest("[data-copy-id]");
  if (button) {
    copyItem(button.dataset.copyId);
  }
});

openSidePanel.addEventListener("click", openPanel);
manageButton.addEventListener("click", openPanel);
closePreviewButton.addEventListener("click", hideImagePreview);
previewCopyButton.addEventListener("click", () => {
  if (state.previewId) {
    copyItem(state.previewId);
  }
});
imagePreviewOverlay.addEventListener("click", (event) => {
  if (event.target === imagePreviewOverlay) {
    hideImagePreview();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !imagePreviewOverlay.hidden) {
    hideImagePreview();
  }
});

init();
