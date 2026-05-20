(function (root) {
  const STORAGE_KEY = "qiaomuQuickPromptItems";
  const SETTINGS_KEY = "qiaomuQuickPromptSettings";

  const defaultSettings = {
    shortcutExpansionEnabled: true,
    shortcutTrigger: "@"
  };

  const supportedShortcutTriggers = ["@", "/", ";", "#"];

  const defaultItems = [
    {
      id: "seed-summarize",
      title: "总结内容",
      content: "请总结以下内容，提炼核心观点、关键事实和可执行建议。输出使用简洁的中文项目符号。",
      category: "AI工作",
      promptType: "text",
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
      category: "写作内容",
      promptType: "text",
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
      promptType: "text",
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
      category: "AI工作",
      promptType: "text",
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
    const imageSeedItems = Array.isArray(root.QuickPromptImageSeedItems)
      ? root.QuickPromptImageSeedItems
      : [];
    const qiaomuSeedItems = Array.isArray(root.QuickPromptQiaomuSeedItems)
      ? root.QuickPromptQiaomuSeedItems
      : [];
    const aiBoostSeedItems = Array.isArray(root.QuickPromptAiBoostSeedItems)
      ? root.QuickPromptAiBoostSeedItems
      : [];
    return defaultItems.concat(yaoSeedItems, imageSeedItems, qiaomuSeedItems, aiBoostSeedItems);
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
      .replace(/[\^@/;#]+$/g, "");
  }

  function normalizeShortcutTrigger(trigger) {
    const value = String(trigger || "").trim();
    return supportedShortcutTriggers.includes(value) ? value : "@";
  }

  function normalizeCategory(item) {
    const rawCategory = String(item.category || "").trim();
    const title = String(item.title || "");
    const tags = normalizeTags(item.tags);

    if (rawCategory === "生图提示词") {
      const sceneTag = tags.find((tag) => {
        return /[\u4e00-\u9fff]/.test(tag)
          && tag !== "GPT-Image2"
          && !tag.startsWith("@");
      });

      return sceneTag || "图像创作";
    }

    if (rawCategory.startsWith("乔木 Prompt · ")) {
      return rawCategory.replace("乔木 Prompt · ", "").trim() || "AI工作";
    }

    if (rawCategory === "乔木 Prompt") {
      if (/Vibe Coding|编程|需求文档/i.test(title)) {
        return "AI编程";
      }

      if (/PUA|反思|思考/i.test(title)) {
        return "AI思考";
      }

      return "AI工作";
    }

    if (!rawCategory || rawCategory === "Prompt") {
      return "AI工作";
    }

    return rawCategory;
  }

  function normalizePromptType(promptType, item) {
    const rawType = String(promptType || "").trim().toLowerCase();

    if (["text", "文本"].includes(rawType)) {
      return "text";
    }

    if (["image", "生图", "图片"].includes(rawType)) {
      return "image";
    }

    if (["video", "生视频", "视频"].includes(rawType)) {
      return "video";
    }

    if (item.previewImage && (item.previewImage.thumbnailUrl || item.previewImage.fullUrl)) {
      return "image";
    }

    const tags = normalizeTags(item.tags).join(" ");
    const mediaHint = `${item.title || ""} ${tags}`;

    if (/Sora|Veo|Runway|Pika|视频生成|生视频/i.test(mediaHint)) {
      return "video";
    }

    if (/GPT-Image|生图|图像生成|图片生成/i.test(`${item.category || ""} ${mediaHint}`)) {
      return "image";
    }

    return "text";
  }

  function isAiBoostSeedItem(item) {
    return String(item.id || "").startsWith("ai-boost-")
      || item.source?.name === "ai-boost/awesome-prompts";
  }

  function getSeedItemById() {
    const seedItemById = new Map();
    getAllSeedItems().forEach((item) => {
      if (item.id) {
        seedItemById.set(item.id, item);
      }
    });
    return seedItemById;
  }

  function updateSeedTitleIfUnchanged(item, seedItemById) {
    if (!isAiBoostSeedItem(item) || !item.id || !seedItemById.has(item.id)) {
      return item;
    }

    const seedItem = seedItemById.get(item.id);
    const originalTitle = String(seedItem.source?.originalTitle || "").trim();
    const currentTitle = String(item.title || "").trim();
    const seedTitle = String(seedItem.title || "").trim();

    if (!seedTitle || seedTitle === currentTitle || (originalTitle && currentTitle !== originalTitle)) {
      return item;
    }

    return Object.assign({}, item, {
      title: seedTitle,
      source: Object.assign({}, item.source || {}, {
        originalTitle
      })
    });
  }

  function normalizeItem(item) {
    const now = new Date().toISOString();
    const promptType = normalizePromptType(item.promptType, item);
    const normalized = {
      id: item.id || `prompt-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title: String(item.title || "").trim(),
      content: String(item.content || ""),
      category: normalizeCategory(item),
      promptType,
      shortcut: normalizeShortcut(item.shortcut),
      tags: normalizeTags(item.tags),
      favorite: Boolean(item.favorite),
      usageCount: Number.isFinite(Number(item.usageCount)) ? Number(item.usageCount) : 0,
      createdAt: item.createdAt || now,
      updatedAt: item.updatedAt || now
    };

    if (promptType === "image" && item.previewImage && (item.previewImage.thumbnailUrl || item.previewImage.fullUrl)) {
      normalized.previewImage = {
        thumbnailUrl: String(item.previewImage.thumbnailUrl || item.previewImage.fullUrl || ""),
        fullUrl: String(item.previewImage.fullUrl || item.previewImage.thumbnailUrl || ""),
        alt: String(item.previewImage.alt || item.title || "")
      };
    }

    if (item.source && typeof item.source === "object") {
      normalized.source = Object.assign({}, item.source);
    }

    return normalized;
  }

  async function ensureSeedData() {
    const result = await getFromStorage([STORAGE_KEY, SETTINGS_KEY]);
    const updates = {};

    if (!Array.isArray(result[STORAGE_KEY])) {
      updates[STORAGE_KEY] = getAllSeedItems().map(normalizeItem);
    } else {
      const seedItemById = getSeedItemById();
      const existingItems = result[STORAGE_KEY]
        .map((item) => updateSeedTitleIfUnchanged(item, seedItemById))
        .map(normalizeItem);
      const existingIds = new Set(existingItems.map((item) => item.id));
      const existingShortcuts = new Set(existingItems.map((item) => normalizeShortcut(item.shortcut)).filter(Boolean));
      const missingSeedItems = getAllSeedItems().filter((item) => {
        const shortcut = normalizeShortcut(item.shortcut);
        return !existingIds.has(item.id) && (!shortcut || !existingShortcuts.has(shortcut));
      }).map(normalizeItem);
      const hasNormalizedChanges = existingItems.some((item, index) => {
        const previous = result[STORAGE_KEY][index] || {};
        return item.category !== previous.category
          || item.promptType !== previous.promptType
          || Boolean(item.previewImage) !== Boolean(previous.previewImage)
          || item.title !== previous.title
          || item.source?.originalTitle !== previous.source?.originalTitle;
      });

      if (missingSeedItems.length > 0 || hasNormalizedChanges) {
        updates[STORAGE_KEY] = existingItems.concat(missingSeedItems);
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
    nextSettings.shortcutTrigger = normalizeShortcutTrigger(nextSettings.shortcutTrigger);
    await setToStorage({ [SETTINGS_KEY]: nextSettings });
    return nextSettings;
  }

  async function resetSeedData() {
    const normalizedSeeds = getAllSeedItems().map(normalizeItem);
    await setToStorage({ [STORAGE_KEY]: normalizedSeeds });
    return normalizedSeeds;
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
        lastUsedAt: now
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
    resetSeedData,
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
    normalizeShortcut,
    normalizeShortcutTrigger,
    normalizeCategory,
    normalizePromptType
  };
})(globalThis);
