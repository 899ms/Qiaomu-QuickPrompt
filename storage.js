(function (root) {
  const STORAGE_KEY = "qiaomuQuickPromptItems";
  const SETTINGS_KEY = "qiaomuQuickPromptSettings";

  const defaultSettings = {
    shortcutExpansionEnabled: true
  };

  const defaultItems = [
    {
      id: "seed-summarize",
      title: "总结内容",
      content: "请总结以下内容，提炼核心观点、关键事实和可执行建议。输出使用简洁的中文项目符号。",
      category: "Prompt",
      shortcut: "sum",
      tags: ["总结", "中文"],
      favorite: true,
      usageCount: 0,
      createdAt: "2026-05-18T00:00:00.000Z",
      updatedAt: "2026-05-18T00:00:00.000Z"
    },
    {
      id: "seed-polish",
      title: "润色表达",
      content: "请在不改变原意的前提下润色下面这段文字，让表达更清晰、自然、有说服力。保留中文语气，不要过度营销化。",
      category: "Prompt",
      shortcut: "polish",
      tags: ["写作", "润色"],
      favorite: true,
      usageCount: 0,
      createdAt: "2026-05-18T00:00:00.000Z",
      updatedAt: "2026-05-18T00:00:00.000Z"
    },
    {
      id: "seed-reply",
      title: "收到，稍后处理",
      content: "收到，我先看一下，稍后给你反馈。",
      category: "常用语",
      shortcut: "later",
      tags: ["回复"],
      favorite: false,
      usageCount: 0,
      createdAt: "2026-05-18T00:00:00.000Z",
      updatedAt: "2026-05-18T00:00:00.000Z"
    },
    {
      id: "seed-qiaomu",
      title: "乔木 Prompt",
      content: "请用乔木风格处理以下内容：判断问题本质，给出清晰结构，避免空话，输出可执行结论。",
      category: "Prompt",
      shortcut: "qiaomu",
      tags: ["乔木", "默认"],
      favorite: true,
      usageCount: 0,
      createdAt: "2026-05-18T00:00:00.000Z",
      updatedAt: "2026-05-18T00:00:00.000Z"
    }
  ];

  function getAllSeedItems() {
    const yaoSeedItems = Array.isArray(root.QuickPromptYaoSeedItems)
      ? root.QuickPromptYaoSeedItems
      : [];
    return defaultItems.concat(yaoSeedItems);
  }

  function getFromStorage(keys) {
    return chrome.storage.local.get(keys);
  }

  function setToStorage(values) {
    return chrome.storage.local.set(values);
  }

  function normalizeTags(tags) {
    if (Array.isArray(tags)) {
      return tags.map((tag) => String(tag).trim()).filter(Boolean);
    }

    return String(tags || "")
      .split(/[,\uFF0C]/)
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  function normalizeShortcut(shortcut) {
    return String(shortcut || "")
      .trim()
      .replace(/\^+$/g, "");
  }

  function normalizeItem(item) {
    const now = new Date().toISOString();
    return {
      id: item.id || `prompt-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title: String(item.title || "").trim(),
      content: String(item.content || ""),
      category: String(item.category || "Prompt").trim() || "Prompt",
      shortcut: normalizeShortcut(item.shortcut),
      tags: normalizeTags(item.tags),
      favorite: Boolean(item.favorite),
      usageCount: Number.isFinite(Number(item.usageCount)) ? Number(item.usageCount) : 0,
      createdAt: item.createdAt || now,
      updatedAt: item.updatedAt || now
    };
  }

  async function ensureSeedData() {
    const result = await getFromStorage([STORAGE_KEY, SETTINGS_KEY]);
    const updates = {};

    if (!Array.isArray(result[STORAGE_KEY])) {
      updates[STORAGE_KEY] = getAllSeedItems();
    } else {
      const existingIds = new Set(result[STORAGE_KEY].map((item) => item.id));
      const existingShortcuts = new Set(result[STORAGE_KEY].map((item) => normalizeShortcut(item.shortcut)).filter(Boolean));
      const missingSeedItems = getAllSeedItems().filter((item) => {
        const shortcut = normalizeShortcut(item.shortcut);
        return !existingIds.has(item.id) && (!shortcut || !existingShortcuts.has(shortcut));
      });

      if (missingSeedItems.length > 0) {
        updates[STORAGE_KEY] = result[STORAGE_KEY].concat(missingSeedItems);
      }
    }

    if (!result[SETTINGS_KEY]) {
      updates[SETTINGS_KEY] = defaultSettings;
    }

    if (Object.keys(updates).length > 0) {
      await setToStorage(updates);
    }
  }

  async function getItems() {
    await ensureSeedData();
    const result = await getFromStorage(STORAGE_KEY);
    return Array.isArray(result[STORAGE_KEY]) ? result[STORAGE_KEY].map(normalizeItem) : [];
  }

  async function saveItems(items) {
    const normalized = items.map(normalizeItem);
    await setToStorage({ [STORAGE_KEY]: normalized });
    return normalized;
  }

  async function getSettings() {
    await ensureSeedData();
    const result = await getFromStorage(SETTINGS_KEY);
    return Object.assign({}, defaultSettings, result[SETTINGS_KEY] || {});
  }

  async function saveSettings(settings) {
    const nextSettings = Object.assign({}, defaultSettings, settings || {});
    await setToStorage({ [SETTINGS_KEY]: nextSettings });
    return nextSettings;
  }

  async function upsertItem(item) {
    const items = await getItems();
    const normalized = normalizeItem(Object.assign({}, item, { updatedAt: new Date().toISOString() }));
    const existingIndex = items.findIndex((candidate) => candidate.id === normalized.id);

    if (existingIndex >= 0) {
      items[existingIndex] = Object.assign({}, items[existingIndex], normalized);
    } else {
      items.unshift(normalized);
    }

    return saveItems(items);
  }

  async function deleteItem(id) {
    const items = await getItems();
    return saveItems(items.filter((item) => item.id !== id));
  }

  async function recordUsage(id) {
    const items = await getItems();
    const now = new Date().toISOString();
    const nextItems = items.map((item) => {
      if (item.id !== id) {
        return item;
      }

      return Object.assign({}, item, {
        usageCount: Number(item.usageCount || 0) + 1,
        lastUsedAt: now,
        updatedAt: now
      });
    });

    await saveItems(nextItems);
    return nextItems.find((item) => item.id === id) || null;
  }

  async function findByShortcut(shortcut) {
    const cleanShortcut = normalizeShortcut(shortcut);
    if (!cleanShortcut) {
      return null;
    }

    const items = await getItems();
    return items.find((item) => item.shortcut === cleanShortcut) || null;
  }

  root.QuickPromptStore = {
    STORAGE_KEY,
    SETTINGS_KEY,
    defaultItems,
    getAllSeedItems,
    ensureSeedData,
    getItems,
    saveItems,
    getSettings,
    saveSettings,
    upsertItem,
    deleteItem,
    recordUsage,
    findByShortcut,
    normalizeItem,
    normalizeTags,
    normalizeShortcut
  };
})(globalThis);
