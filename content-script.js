const TRIGGER = "^";
const TOKEN_PATTERN = /([^\s\^]{1,64})\^$/;
let cachedItems = [];
let cachedSettings = { shortcutExpansionEnabled: true };
let isComposing = false;
let cacheReady = false;

function isEditableTarget(target) {
  if (!target || target.disabled || target.readOnly) {
    return false;
  }

  if (target instanceof HTMLInputElement) {
    const blockedTypes = new Set([
      "button",
      "checkbox",
      "color",
      "date",
      "datetime-local",
      "file",
      "hidden",
      "image",
      "month",
      "number",
      "password",
      "radio",
      "range",
      "reset",
      "submit",
      "time",
      "week"
    ]);
    return !blockedTypes.has(target.type);
  }

  return target instanceof HTMLTextAreaElement || target.isContentEditable;
}

function normalizeShortcut(shortcut) {
  return String(shortcut || "").trim().replace(/\^+$/g, "");
}

async function findPrompt(shortcut) {
  const cleanShortcut = normalizeShortcut(shortcut);
  let item = cachedItems.find((candidate) => candidate.shortcut === cleanShortcut);

  if (!item && !cacheReady) {
    await refreshCache();
    item = cachedItems.find((candidate) => candidate.shortcut === cleanShortcut);
  }

  return item || null;
}

function getTextBeforeCursor(element) {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    return element.value.slice(0, element.selectionStart || 0);
  }

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return "";
  }

  const range = selection.getRangeAt(0);
  const probe = range.cloneRange();
  probe.selectNodeContents(element);
  probe.setEnd(range.endContainer, range.endOffset);
  return probe.toString();
}

function replaceInTextField(element, shortcutWithTrigger, content) {
  const start = element.selectionStart || 0;
  const end = element.selectionEnd || start;
  const replaceStart = start - shortcutWithTrigger.length;
  if (replaceStart < 0) {
    return false;
  }

  const nextValue = `${element.value.slice(0, replaceStart)}${content}${element.value.slice(end)}`;
  setNativeValue(element, nextValue);
  const nextCursor = replaceStart + content.length;
  element.setSelectionRange(nextCursor, nextCursor);
  element.dispatchEvent(new InputEvent("input", {
    bubbles: true,
    inputType: "insertReplacementText",
    data: content
  }));
  return true;
}

function setNativeValue(element, value) {
  const prototype = element instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");

  if (descriptor && descriptor.set) {
    descriptor.set.call(element, value);
  } else {
    element.value = value;
  }
}

function replaceInContentEditable(element, shortcutWithTrigger, content) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return false;
  }

  const range = selection.getRangeAt(0);
  if (!element.contains(range.commonAncestorContainer)) {
    return false;
  }

  const replaceRange = range.cloneRange();
  let remaining = shortcutWithTrigger.length;
  let node = range.endContainer;
  let offset = range.endOffset;

  while (node && remaining > 0) {
    if (node.nodeType === Node.TEXT_NODE) {
      const take = Math.min(offset, remaining);
      replaceRange.setStart(node, offset - take);
      remaining -= take;
      break;
    }
    node = node.previousSibling || node.parentNode;
    offset = node && node.textContent ? node.textContent.length : 0;
  }

  if (remaining > 0) {
    return false;
  }

  replaceRange.deleteContents();
  const textNode = document.createTextNode(content);
  replaceRange.insertNode(textNode);
  range.setStartAfter(textNode);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
  element.dispatchEvent(new InputEvent("input", {
    bubbles: true,
    inputType: "insertReplacementText",
    data: content
  }));
  return true;
}

async function refreshCache() {
  try {
    const response = await chrome.runtime.sendMessage({ type: "GET_QUICK_PROMPTS" });
    if (response && response.ok) {
      cachedItems = Array.isArray(response.items) ? response.items : [];
      cachedSettings = response.settings || cachedSettings;
      cacheReady = true;
    }
  } catch (error) {
    cachedItems = [];
    cacheReady = false;
  }
}

async function recordUsage(id) {
  try {
    await chrome.runtime.sendMessage({ type: "RECORD_USAGE", id });
  } catch (error) {
    // Usage stats should never interrupt typing.
  }
}

async function tryExpandFromTarget(target) {
  if (isComposing || !cachedSettings.shortcutExpansionEnabled) {
    return;
  }

  if (!isEditableTarget(target)) {
    return;
  }

  const textBeforeCursor = getTextBeforeCursor(target);
  const match = textBeforeCursor.match(TOKEN_PATTERN);
  if (!match) {
    return;
  }

  const shortcut = match[1];
  const item = await findPrompt(shortcut);
  if (!item) {
    return;
  }

  const shortcutWithTrigger = `${shortcut}${TRIGGER}`;
  const replaced = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
    ? replaceInTextField(target, shortcutWithTrigger, item.content)
    : replaceInContentEditable(target, shortcutWithTrigger, item.content);

  if (replaced) {
    recordUsage(item.id);
  }
}

function handleInput(event) {
  if (event.data === TRIGGER) {
    tryExpandFromTarget(event.target);
  }
}

function handleKeyup(event) {
  if (event.key === TRIGGER || event.code === "Digit6") {
    tryExpandFromTarget(event.target);
  }
}

document.addEventListener("compositionstart", () => {
  isComposing = true;
}, true);

document.addEventListener("compositionend", () => {
  isComposing = false;
}, true);

document.addEventListener("input", handleInput, true);
document.addEventListener("keyup", handleKeyup, true);

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") {
    return;
  }

  if (changes.qiaomuQuickPromptItems || changes.qiaomuQuickPromptSettings) {
    refreshCache();
  }
});

refreshCache();
