const state = {
  items: [],
  settings: {},
  selectedId: null,
  query: "",
  category: "全部",
  previewId: null,
  categories: []
};

const elements = {
  mainView: document.getElementById("mainView"),
  settingsPage: document.getElementById("settingsPage"),
  openSettingsButton: document.getElementById("openSettingsButton"),
  backToMainButton: document.getElementById("backToMainButton"),
  searchInput: document.getElementById("searchInput"),
  shortcutToggle: document.getElementById("shortcutToggle"),
  triggerOptions: document.getElementById("triggerOptions"),
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
  categorySelectedLabel: document.getElementById("categorySelectedLabel"),
  categoryMenuButton: document.getElementById("categoryMenuButton"),
  categoryMenu: document.getElementById("categoryMenu"),
  typeTextInput: document.getElementById("typeTextInput"),
  typeImageInput: document.getElementById("typeImageInput"),
  typeVideoInput: document.getElementById("typeVideoInput"),
  shortcutInput: document.getElementById("shortcutInput"),
  tagsInput: document.getElementById("tagsInput"),
  contentInput: document.getElementById("contentInput"),
  thumbnailUrlField: document.getElementById("thumbnailUrlField"),
  thumbnailUrlInput: document.getElementById("thumbnailUrlInput"),
  favoriteToggle: document.getElementById("favoriteToggle"),
  deleteButton: document.getElementById("deleteButton"),
  cancelButton: document.getElementById("cancelButton"),
  copyButton: document.getElementById("copyButton"),
  newItemButton: document.getElementById("newItemButton"),
  exportButton: document.getElementById("exportButton"),
  importInput: document.getElementById("importInput"),
  resetSeedsButton: document.getElementById("resetSeedsButton"),
  statusLine: document.getElementById("statusLine"),
  imagePreviewOverlay: document.getElementById("imagePreviewOverlay"),
  previewImage: document.getElementById("previewImage"),
  previewTitle: document.getElementById("previewTitle"),
  previewMeta: document.getElementById("previewMeta"),
  previewPrompt: document.getElementById("previewPrompt"),
  closePreviewButton: document.getElementById("closePreviewButton"),
  previewCopyButton: document.getElementById("previewCopyButton"),
  previewSourceLink: document.getElementById("previewSourceLink")
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
  const categories = new Set(state.categories);
  state.items.forEach((item) => categories.add(window.QuickPromptStore.normalizeCategory(item)));
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
    getPromptTypeLabel(item.promptType),
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

  elements.categoryMenu.innerHTML = categories
    .filter((category) => category !== "全部")
    .map((category) => `
      <button type="button" class="category-menu-item" role="option" data-category-option="${escapeHtml(category)}">
        ${escapeHtml(category)}
      </button>
    `)
    .join("");
}

function setEditorCategory(category) {
  const value = category || "AI工作";
  elements.categoryInput.value = value;
  elements.categorySelectedLabel.textContent = value;
}

function showCategoryMenu() {
  elements.categoryMenu.hidden = false;
  elements.categoryMenuButton.setAttribute("aria-expanded", "true");
}

function hideCategoryMenu() {
  elements.categoryMenu.hidden = true;
  elements.categoryMenuButton.setAttribute("aria-expanded", "false");
}

function toggleCategoryMenu() {
  if (elements.categoryMenu.hidden) {
    showCategoryMenu();
  } else {
    hideCategoryMenu();
  }
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
    <article class="prompt-card ${item.id === state.selectedId ? "is-selected" : ""}" data-id="${item.id}" title="点击复制提示词">
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
          ${item.shortcut ? `<code>${escapeHtml(item.shortcut)}${escapeHtml(getShortcutTrigger())}</code>` : ""}
          ${(item.tags || []).slice(0, 2).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
        </div>
      </div>
      <span class="card-copy-count" aria-hidden="true">${Number(item.usageCount) || 0}次</span>
      <button class="card-edit-button" data-edit-id="${item.id}" type="button" title="编辑" aria-label="编辑「${escapeHtml(item.title)}」">
        <svg class="button-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 20h9"></path>
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
        </svg>
      </button>
    </article>
  `).join("");
}

function getShortcutTrigger() {
  return state.settings.shortcutTrigger || "@";
}

function renderSettings() {
  const enabled = Boolean(state.settings.shortcutExpansionEnabled);
  elements.shortcutToggle.classList.toggle("is-on", enabled);
  elements.shortcutToggle.setAttribute("aria-checked", String(enabled));
  elements.shortcutToggle.querySelector(".switch-label").textContent = enabled ? "启用" : "关闭";

  const trigger = getShortcutTrigger();
  elements.triggerOptions.querySelectorAll("[data-trigger]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.trigger === trigger);
  });
}

function renderPreviewThumb(item) {
  if (item.promptType !== "image" || !item.previewImage || !item.previewImage.thumbnailUrl) {
    return "";
  }

  const alt = item.previewImage.alt || item.title;
  return `
    <button class="preview-thumb" type="button" data-preview-id="${item.id}" title="查看参考图" aria-label="查看「${escapeHtml(item.title)}」参考图">
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

function getSelectedPromptType() {
  const checked = elements.editorForm.querySelector('input[name="promptType"]:checked');
  return checked ? checked.value : "text";
}

function setSelectedPromptType(promptType) {
  const normalized = window.QuickPromptStore.normalizePromptType(promptType, {});
  elements.typeTextInput.checked = normalized === "text";
  elements.typeImageInput.checked = normalized === "image";
  elements.typeVideoInput.checked = normalized === "video";
  updateMediaFields();
}

function updateMediaFields() {
  const isImage = getSelectedPromptType() === "image";
  elements.thumbnailUrlField.hidden = !isImage;
  elements.thumbnailUrlField.classList.toggle("is-visible", isImage);
  elements.thumbnailUrlInput.disabled = !isImage;
  if (!isImage) {
    elements.thumbnailUrlInput.value = "";
  }
}

function setFavorite(value) {
  const isFavorite = Boolean(value);
  elements.favoriteToggle.classList.toggle("is-active", isFavorite);
  elements.favoriteToggle.setAttribute("aria-pressed", String(isFavorite));
  elements.favoriteToggle.setAttribute("aria-label", isFavorite ? "取消收藏" : "收藏");
}

function isFavoriteSelected() {
  return elements.favoriteToggle.classList.contains("is-active");
}

function renderAll() {
  renderCategories();
  renderList();
  renderSettings();
}

function showSettings() {
  elements.mainView.hidden = true;
  elements.settingsPage.hidden = false;
}

function showMainView() {
  elements.settingsPage.hidden = true;
  elements.mainView.hidden = false;
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

function showImagePreview(id) {
  const item = state.items.find((candidate) => candidate.id === id);
  if (!item || item.promptType !== "image" || !item.previewImage) {
    return;
  }

  state.previewId = id;
  elements.previewImage.src = item.previewImage.fullUrl || item.previewImage.thumbnailUrl;
  elements.previewImage.alt = item.previewImage.alt || item.title;
  elements.previewTitle.textContent = item.title;
  elements.previewMeta.textContent = [item.category, item.source?.sourceLabel].filter(Boolean).join(" · ");
  elements.previewPrompt.textContent = item.content;

  if (item.source?.url) {
    elements.previewSourceLink.href = item.source.url;
    elements.previewSourceLink.hidden = false;
  } else {
    elements.previewSourceLink.hidden = true;
    elements.previewSourceLink.removeAttribute("href");
  }

  elements.imagePreviewOverlay.hidden = false;
  elements.closePreviewButton.focus();
}

function hideImagePreview() {
  state.previewId = null;
  elements.imagePreviewOverlay.hidden = true;
  elements.previewImage.removeAttribute("src");
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

function markCardCopied(card) {
  if (!card) {
    return;
  }

  card.classList.add("is-copied");
  window.clearTimeout(card.copyTimer);
  card.copyTimer = window.setTimeout(() => {
    card.classList.remove("is-copied");
  }, 650);
}

function resetForm() {
  state.selectedId = null;
  elements.editorTitle.textContent = "新增内容";
  elements.itemId.value = "";
  elements.titleInput.value = "";
  setEditorCategory("AI工作");
  setSelectedPromptType("text");
  elements.shortcutInput.value = "";
  elements.tagsInput.value = "";
  elements.contentInput.value = "";
  elements.thumbnailUrlInput.value = "";
  setFavorite(false);
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
  setEditorCategory(item.category);
  setSelectedPromptType(item.promptType);
  elements.shortcutInput.value = item.shortcut || "";
  elements.tagsInput.value = (item.tags || []).join(", ");
  elements.contentInput.value = item.content;
  elements.thumbnailUrlInput.value = item.previewImage?.thumbnailUrl || item.previewImage?.fullUrl || "";
  setFavorite(item.favorite);
  elements.deleteButton.disabled = false;
  showEditor();
  renderList();
}

function getFormItem() {
  const existingItem = state.items.find((item) => item.id === elements.itemId.value);
  const promptType = getSelectedPromptType();
  const thumbnailUrl = elements.thumbnailUrlInput.value.trim();
  return window.QuickPromptStore.normalizeItem({
    id: elements.itemId.value || undefined,
    title: elements.titleInput.value,
    category: elements.categoryInput.value || "AI工作",
    promptType,
    shortcut: elements.shortcutInput.value,
    tags: elements.tagsInput.value,
    content: elements.contentInput.value,
    favorite: isFavoriteSelected(),
    createdAt: existingItem?.createdAt,
    previewImage: promptType === "image" && thumbnailUrl
      ? {
          thumbnailUrl,
          fullUrl: thumbnailUrl,
          alt: elements.titleInput.value
        }
      : undefined,
    source: existingItem?.source
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
    markCardCopied(button ? button.closest(".prompt-card") : elements.promptList.querySelector(`[data-id="${CSS.escape(id)}"]`));
    await window.QuickPromptStore.recordUsage(item.id);
    state.items = await window.QuickPromptStore.getItems();
    renderAll();
    markCardCopied(elements.promptList.querySelector(`[data-id="${CSS.escape(id)}"]`));
    setStatus("已复制。");
    showToast(`已复制：${item.title}`);
  } catch (error) {
    setStatus("复制失败。");
    showToast("复制失败");
  }
}

function exportData() {
  const payload = {
    app: "乔木快捷提示词",
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: state.settings,
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
    if (parsed && parsed.settings && typeof parsed.settings === "object") {
      state.settings = await window.QuickPromptStore.saveSettings(Object.assign({}, state.settings, parsed.settings));
    }
    state.items = await window.QuickPromptStore.getItems();
    renderAll();
    setStatus("导入完成。");
    showToast("导入完成");
  } catch (error) {
    setStatus(`导入失败：${error.message}`);
    showToast("导入失败");
  } finally {
    elements.importInput.value = "";
  }
}

async function resetSeedData() {
  const confirmed = window.confirm("重置内置提示词会用当前版本的内置数据覆盖提示词库。你自己新增或修改的提示词可能会丢失。确定继续吗？");
  if (!confirmed) {
    return;
  }

  state.items = await window.QuickPromptStore.resetSeedData();
  state.selectedId = null;
  state.category = "全部";
  renderAll();
  setStatus("已重置内置提示词。");
  showToast("已重置内置提示词");
}

async function loadCategories() {
  try {
    const response = await fetch("categories.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();
    state.categories = Array.isArray(payload.categories)
      ? payload.categories.map((category) => String(category).trim()).filter(Boolean)
      : [];
  } catch (error) {
    state.categories = [];
  }
}

async function init() {
  await loadCategories();
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
  const previewButton = event.target.closest("[data-preview-id]");
  if (previewButton) {
    event.stopPropagation();
    showImagePreview(previewButton.dataset.previewId);
    return;
  }

  const editButton = event.target.closest("[data-edit-id]");
  if (editButton) {
    event.stopPropagation();
    selectItem(editButton.dataset.editId);
    return;
  }

  const card = event.target.closest("[data-id]");
  if (card) {
    copyItemById(card.dataset.id);
  }
});

elements.openSettingsButton.addEventListener("click", showSettings);
elements.backToMainButton.addEventListener("click", showMainView);
elements.editorForm.addEventListener("submit", saveCurrentItem);
elements.deleteButton.addEventListener("click", deleteCurrentItem);
elements.cancelButton.addEventListener("click", hideEditor);
elements.copyButton.addEventListener("click", copyCurrentItem);
elements.newItemButton.addEventListener("click", resetForm);
elements.typeTextInput.addEventListener("change", updateMediaFields);
elements.typeImageInput.addEventListener("change", updateMediaFields);
elements.typeVideoInput.addEventListener("change", updateMediaFields);
elements.favoriteToggle.addEventListener("click", () => {
  setFavorite(!isFavoriteSelected());
});
elements.categoryMenuButton.addEventListener("click", toggleCategoryMenu);
elements.categoryMenu.addEventListener("click", (event) => {
  const option = event.target.closest("[data-category-option]");
  if (!option) {
    return;
  }

  setEditorCategory(option.dataset.categoryOption);
  hideCategoryMenu();
  elements.categoryMenuButton.focus();
});
elements.exportButton.addEventListener("click", exportData);
elements.importInput.addEventListener("change", () => importData(elements.importInput.files[0]));
elements.resetSeedsButton.addEventListener("click", resetSeedData);
elements.closePreviewButton.addEventListener("click", hideImagePreview);
elements.previewCopyButton.addEventListener("click", () => {
  if (state.previewId) {
    copyItemById(state.previewId, elements.previewCopyButton);
  }
});
elements.imagePreviewOverlay.addEventListener("click", (event) => {
  if (event.target === elements.imagePreviewOverlay) {
    hideImagePreview();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !elements.imagePreviewOverlay.hidden) {
    hideImagePreview();
    return;
  }

  if (event.key === "Escape" && !elements.categoryMenu.hidden) {
    hideCategoryMenu();
  }
});

document.addEventListener("click", (event) => {
  if (!elements.categoryMenu.hidden && !event.target.closest(".category-combobox")) {
    hideCategoryMenu();
  }
});

elements.shortcutToggle.addEventListener("click", async () => {
  state.settings.shortcutExpansionEnabled = !state.settings.shortcutExpansionEnabled;
  state.settings = await window.QuickPromptStore.saveSettings(state.settings);
  renderSettings();
  setStatus(state.settings.shortcutExpansionEnabled ? "已启用简写替换。" : "已关闭简写替换。");
  showToast(state.settings.shortcutExpansionEnabled ? "已启用简写替换" : "已关闭简写替换");
});

elements.triggerOptions.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-trigger]");
  if (!button) {
    return;
  }

  state.settings.shortcutTrigger = button.dataset.trigger;
  state.settings = await window.QuickPromptStore.saveSettings(state.settings);
  renderAll();
  setStatus(`简写触发符已改为 ${state.settings.shortcutTrigger}`);
  showToast(`触发符：${state.settings.shortcutTrigger}`);
});

init();
