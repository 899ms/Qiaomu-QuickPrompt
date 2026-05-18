const state = {
  items: [],
  settings: {},
  selectedId: null,
  query: "",
  category: "全部"
};

const elements = {
  searchInput: document.getElementById("searchInput"),
  shortcutToggle: document.getElementById("shortcutToggle"),
  categoryTabs: document.getElementById("categoryTabs"),
  panelLayout: document.getElementById("panelLayout"),
  promptList: document.getElementById("promptList"),
  editorDialog: document.getElementById("editorDialog"),
  editorForm: document.getElementById("editorForm"),
  toast: document.getElementById("toast"),
  editorTitle: document.getElementById("editorTitle"),
  itemId: document.getElementById("itemId"),
  titleInput: document.getElementById("titleInput"),
  categoryInput: document.getElementById("categoryInput"),
  categoryOptions: document.getElementById("categoryOptions"),
  shortcutInput: document.getElementById("shortcutInput"),
  tagsInput: document.getElementById("tagsInput"),
  contentInput: document.getElementById("contentInput"),
  favoriteInput: document.getElementById("favoriteInput"),
  deleteButton: document.getElementById("deleteButton"),
  cancelButton: document.getElementById("cancelButton"),
  copyButton: document.getElementById("copyButton"),
  newItemButton: document.getElementById("newItemButton"),
  exportButton: document.getElementById("exportButton"),
  importInput: document.getElementById("importInput"),
  statusLine: document.getElementById("statusLine")
};

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getCategories() {
  const categories = new Set(state.items.map((item) => item.category || "Prompt"));
  return ["全部", ...Array.from(categories).sort((a, b) => a.localeCompare(b, "zh-CN"))];
}

function matchesQuery(item) {
  if (!state.query) {
    return true;
  }

  const haystack = [
    item.title,
    item.content,
    item.category,
    item.shortcut,
    ...(item.tags || [])
  ].join(" ").toLowerCase();

  return haystack.includes(state.query.toLowerCase());
}

function getVisibleItems() {
  return state.items
    .filter((item) => state.category === "全部" || item.category === state.category)
    .filter(matchesQuery)
    .sort((a, b) => {
      if (a.favorite !== b.favorite) {
        return a.favorite ? -1 : 1;
      }
      return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
    });
}

function renderCategories() {
  const categories = getCategories();
  elements.categoryTabs.innerHTML = categories.map((category) => `
    <button class="tab-button ${category === state.category ? "is-active" : ""}" data-category="${escapeHtml(category)}">
      ${escapeHtml(category)}
    </button>
  `).join("");

  elements.categoryOptions.innerHTML = categories
    .filter((category) => category !== "全部")
    .map((category) => `<option value="${escapeHtml(category)}"></option>`)
    .join("");
}

function renderList() {
  const visibleItems = getVisibleItems();

  if (!visibleItems.length) {
    elements.promptList.innerHTML = `
      <div class="empty-state panel-empty">
        <strong>还没有匹配内容</strong>
        <span>新增一个 Prompt，或换个关键词搜索。</span>
      </div>
    `;
    return;
  }

  elements.promptList.innerHTML = visibleItems.map((item) => `
    <article class="prompt-card ${item.id === state.selectedId ? "is-selected" : ""}" data-id="${item.id}">
      <div class="prompt-main">
        <div class="prompt-title-row">
          <h2>${escapeHtml(item.title)}</h2>
          ${item.favorite ? '<span class="favorite-mark" title="收藏">★</span>' : ""}
        </div>
        <p>${escapeHtml(item.content)}</p>
        <div class="meta-row">
          <span>${escapeHtml(item.category)}</span>
          ${item.shortcut ? `<code>${escapeHtml(item.shortcut)}^</code>` : ""}
          ${(item.tags || []).slice(0, 2).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
        </div>
      </div>
      <button class="copy-button" data-copy-id="${item.id}">复制</button>
    </article>
  `).join("");
}

function renderAll() {
  renderCategories();
  renderList();
  elements.shortcutToggle.checked = Boolean(state.settings.shortcutExpansionEnabled);
}

function showEditor() {
  if (!elements.editorDialog.open) {
    elements.editorDialog.showModal();
  }
}

function hideEditor() {
  if (elements.editorDialog.open) {
    elements.editorDialog.close();
  }
}

function setStatus(message) {
  elements.statusLine.textContent = message;
  if (message) {
    window.clearTimeout(setStatus.timer);
    setStatus.timer = window.setTimeout(() => {
      elements.statusLine.textContent = "";
    }, 2200);
  }
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    elements.toast.classList.remove("is-visible");
  }, 1600);
}

function markCopiedButton(button) {
  if (!button) {
    return;
  }

  const previousText = button.textContent;
  button.textContent = "已复制";
  button.classList.add("is-copied");
  window.clearTimeout(button.copyTimer);
  button.copyTimer = window.setTimeout(() => {
    button.textContent = previousText || "复制";
    button.classList.remove("is-copied");
  }, 1400);
}

function resetForm() {
  state.selectedId = null;
  elements.editorTitle.textContent = "新增内容";
  elements.itemId.value = "";
  elements.titleInput.value = "";
  elements.categoryInput.value = "Prompt";
  elements.shortcutInput.value = "";
  elements.tagsInput.value = "";
  elements.contentInput.value = "";
  elements.favoriteInput.checked = false;
  elements.deleteButton.disabled = true;
  showEditor();
  renderList();
  elements.titleInput.focus();
}

function selectItem(id) {
  const item = state.items.find((candidate) => candidate.id === id);
  if (!item) {
    return;
  }

  state.selectedId = id;
  elements.editorTitle.textContent = "编辑内容";
  elements.itemId.value = item.id;
  elements.titleInput.value = item.title;
  elements.categoryInput.value = item.category;
  elements.shortcutInput.value = item.shortcut || "";
  elements.tagsInput.value = (item.tags || []).join(", ");
  elements.contentInput.value = item.content;
  elements.favoriteInput.checked = Boolean(item.favorite);
  elements.deleteButton.disabled = false;
  showEditor();
  renderList();
}

function getFormItem() {
  return window.QuickPromptStore.normalizeItem({
    id: elements.itemId.value || undefined,
    title: elements.titleInput.value,
    category: elements.categoryInput.value || "Prompt",
    shortcut: elements.shortcutInput.value,
    tags: elements.tagsInput.value,
    content: elements.contentInput.value,
    favorite: elements.favoriteInput.checked,
    createdAt: state.items.find((item) => item.id === elements.itemId.value)?.createdAt
  });
}

function validateItem(item) {
  if (!item.title) {
    elements.titleInput.focus();
    setStatus("请填写标题。");
    return false;
  }

  if (!item.content) {
    elements.contentInput.focus();
    setStatus("请填写内容。");
    return false;
  }

  if (item.shortcut) {
    const duplicate = state.items.find((candidate) => {
      return candidate.id !== item.id && candidate.shortcut === item.shortcut;
    });

    if (duplicate) {
      elements.shortcutInput.focus();
      setStatus(`简写已被「${duplicate.title}」使用。`);
      return false;
    }
  }

  return true;
}

async function saveCurrentItem(event) {
  event.preventDefault();
  const item = getFormItem();
  if (!validateItem(item)) {
    return;
  }

  const beforeIds = new Set(state.items.map((candidate) => candidate.id));
  state.items = await window.QuickPromptStore.upsertItem(item);
  const savedItem = state.items.find((candidate) => candidate.id === item.id)
    || state.items.find((candidate) => !beforeIds.has(candidate.id))
    || state.items[0];
  state.selectedId = savedItem ? savedItem.id : null;
  renderAll();
  setStatus("已保存。");
  hideEditor();
  showToast("已保存");
}

async function deleteCurrentItem() {
  if (!state.selectedId) {
    return;
  }

  const item = state.items.find((candidate) => candidate.id === state.selectedId);
  if (!item || !window.confirm(`删除「${item.title}」？`)) {
    return;
  }

  await window.QuickPromptStore.deleteItem(item.id);
  state.items = await window.QuickPromptStore.getItems();
  state.selectedId = null;
  renderAll();
  setStatus("已删除。");
  hideEditor();
  showToast("已删除");
}

async function copyCurrentItem() {
  const item = elements.itemId.value
    ? state.items.find((candidate) => candidate.id === elements.itemId.value)
    : getFormItem();

  if (!item || !item.content) {
    setStatus("没有可复制的内容。");
    return;
  }

  try {
    await navigator.clipboard.writeText(item.content);
    if (item.id) {
      await window.QuickPromptStore.recordUsage(item.id);
      state.items = await window.QuickPromptStore.getItems();
      renderAll();
    }
    setStatus("已复制。");
    showToast("已复制");
  } catch (error) {
    setStatus("复制失败。");
    showToast("复制失败");
  }
}

async function copyItemById(id, button) {
  const item = state.items.find((candidate) => candidate.id === id);
  if (!item) {
    return;
  }

  try {
    await navigator.clipboard.writeText(item.content);
    markCopiedButton(button);
    await window.QuickPromptStore.recordUsage(item.id);
    state.items = await window.QuickPromptStore.getItems();
    renderAll();
    setStatus("已复制。");
    showToast(`已复制：${item.title}`);
  } catch (error) {
    setStatus("复制失败。");
    showToast("复制失败");
  }
}

function exportData() {
  const payload = {
    app: "Qiaomu-QuickPrompt",
    version: 1,
    exportedAt: new Date().toISOString(),
    items: state.items
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `qiaomu-quickprompt-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function importData(file) {
  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const incomingItems = Array.isArray(parsed) ? parsed : parsed.items;

    if (!Array.isArray(incomingItems)) {
      throw new Error("JSON 中没有 items 数组。");
    }

    const existingById = new Map(state.items.map((item) => [item.id, item]));
    incomingItems.map(window.QuickPromptStore.normalizeItem).forEach((item) => {
      existingById.set(item.id, item);
    });

    await window.QuickPromptStore.saveItems(Array.from(existingById.values()));
    state.items = await window.QuickPromptStore.getItems();
    renderAll();
    setStatus("导入完成。");
  } catch (error) {
    setStatus(`导入失败：${error.message}`);
  } finally {
    elements.importInput.value = "";
  }
}

async function init() {
  await window.QuickPromptStore.ensureSeedData();
  state.items = await window.QuickPromptStore.getItems();
  state.settings = await window.QuickPromptStore.getSettings();
  renderAll();
  hideEditor();
}

elements.searchInput.addEventListener("input", () => {
  state.query = elements.searchInput.value.trim();
  renderList();
});

elements.categoryTabs.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) {
    return;
  }
  state.category = button.dataset.category;
  renderAll();
});

elements.promptList.addEventListener("click", (event) => {
  const copyButton = event.target.closest("[data-copy-id]");
  if (copyButton) {
    event.stopPropagation();
    copyItemById(copyButton.dataset.copyId, copyButton);
    return;
  }

  const card = event.target.closest("[data-id]");
  if (card) {
    selectItem(card.dataset.id);
  }
});

elements.editorForm.addEventListener("submit", saveCurrentItem);
elements.deleteButton.addEventListener("click", deleteCurrentItem);
elements.cancelButton.addEventListener("click", hideEditor);
elements.copyButton.addEventListener("click", copyCurrentItem);
elements.newItemButton.addEventListener("click", resetForm);
elements.exportButton.addEventListener("click", exportData);
elements.importInput.addEventListener("change", () => importData(elements.importInput.files[0]));

elements.shortcutToggle.addEventListener("change", async () => {
  state.settings.shortcutExpansionEnabled = elements.shortcutToggle.checked;
  await window.QuickPromptStore.saveSettings(state.settings);
  setStatus(elements.shortcutToggle.checked ? "已启用简写替换。" : "已关闭简写替换。");
});

init();
