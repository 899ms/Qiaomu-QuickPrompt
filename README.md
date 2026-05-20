# Qiaomu-QuickPrompt

> 把常用提示词放进 Chrome 侧边栏，搜索、复制、简写展开都在当前网页里完成。
> A local Chrome extension for searching, copying, and expanding reusable prompts.

**[中文](#中文) | [English](#english)**

---

<a name="中文"></a>
## 中文

你写 Prompt 时，经常要翻笔记、找模板、复制一大段文字。

Qiaomu-QuickPrompt 把提示词库放进 Chrome 侧边栏：点插件图标打开，搜索标题或正文，一键复制；也可以在网页输入框里输入 `qiaomu@` 这类简写，自动展开成完整提示词。

### 功能

- 点击插件图标直接打开 Chrome 侧边栏
- 按分类浏览提示词和常用语
- 全文搜索：标题、正文、分类、简写、标签都会匹配
- 一键复制，复制后有明确反馈
- 新增 / 编辑用弹窗完成，不占用默认列表空间
- 创建内容时可选择文本、生图、生视频；生图可填写缩略图 URL，留空则不显示缩略图
- 标签可选，不影响全文搜索
- 支持 `简写@` 在网页输入框中展开
- 本地 `chrome.storage.local` 保存
- 支持 JSON 导入 / 导出
- 内置 117 条中文提示词，来自 Yao Open Prompts
- 内置 442 条 GPT-Image2 生图提示词，带参考图缩略图和大图预览
- 内置 50 条乔木精选 Prompt，来自本地乔木 Prompt 库
- 内置 240 条 ai-boost/awesome-prompts 英文提示词，覆盖编程、Agent、产品、研究、创意、多媒体等场景

### 安装

1. 下载或 clone 本仓库。
2. 打开 Chrome 的 `chrome://extensions`。
3. 开启右上角 Developer mode。
4. 点击 Load unpacked，选择本仓库目录。
5. 如果更新了代码，回到 `chrome://extensions` 点击 Reload。

### 使用

点击浏览器工具栏里的 Qiaomu-QuickPrompt 图标，侧边栏会直接打开。

常见操作：

- 搜索 `标题`、`公众号`、`GEO`、`标题优化` 等关键词。
- 点击列表里的“复制”按钮。
- 点击“新增”，在弹窗里保存自己的提示词。
- 新建时先选择文本、生图或生视频；只有生图会显示缩略图 URL 输入框。
- 给常用提示词设置简写，例如 `sum`。
- 在普通网页输入框里输入 `sum@`，会自动替换为完整提示词。

### 权限说明

- `storage`：保存本地提示词库和设置。
- `clipboardWrite`：点击复制按钮时写入剪贴板。
- `sidePanel`：显示 Chrome 侧边栏。
- `activeTab`：配合侧边栏打开当前标签页。
- `<all_urls>`：让 `简写@` 展开功能可以在普通网页输入框中工作。

### 内置提示词来源

本扩展内置 [Yao Open Prompts](https://github.com/yaojingang/yao-open-prompts) 的中文提示词，作者为 姚金刚，提示词文本采用 CC BY 4.0 许可。

生图提示词来自 [GPT-Image2 Prompt Gallery](https://gpt-image2.canghe.ai/) / [awesome-gpt-image-2](https://github.com/freestylefly/awesome-gpt-image-2)，作者为 freestylefly，项目采用 MIT 许可。参考图在插件里以远程缩略图方式展示，点击缩略图可查看大图。

乔木精选 Prompt 来自本地乔木 Prompt 库，整理为 50 条可复制条目，覆盖写作、学习、论文解读、播客、视频、设计、Vibe Coding、小红书和 Suno 歌词等场景。

英文工程提示词来自 [ai-boost/awesome-prompts](https://github.com/ai-boost/awesome-prompts)，整理为 240 条可复制条目，项目采用 GPL-3.0 许可。

导入的提示词存放在 `seed-prompts.js`、`seed-image-prompts.js`、`seed-qiaomu-prompts.js` 和 `seed-ai-boost-prompts.js`，每条都保留了来源元数据。

### 许可

- 扩展代码：MIT License。
- 内置提示词文本：来自 Yao Open Prompts，遵循 CC BY 4.0。
- 生图提示词：来自 awesome-gpt-image-2，遵循 MIT License。
- ai-boost/awesome-prompts 提示词：遵循 GPL-3.0。

### Troubleshooting

| 问题 | 处理 |
| --- | --- |
| 输入 `qiaomu@` 没有展开 | 先在 `chrome://extensions` Reload 插件，再刷新目标网页。Chrome 已打开页面不会自动注入新版脚本。 |
| 在 `chrome://extensions` 里无法展开 | Chrome 内部页面不允许普通扩展注入 content script，这是浏览器限制。 |
| 复制按钮没反应 | 确认插件已 Reload；如果仍失败，检查该页面是否限制剪贴板权限。 |
| 内置提示词没出现 | Reload 插件后重新打开侧边栏；缺失的内置提示词会自动补进本地库，不覆盖已有内容。 |

---

<a name="english"></a>
## English

Qiaomu-QuickPrompt keeps reusable prompts in a Chrome side panel. Open the extension, search by title or full prompt text, copy with one click, or type a shortcut like `sum@` in a webpage input to expand it into the full prompt.

### Features

- Opens the Chrome side panel directly from the extension icon
- Category browsing and full-text search
- One-click copy with visual feedback
- Dialog-based add/edit flow
- Text, image, and video prompt types; image prompts can use an optional thumbnail URL
- Optional tags
- `shortcut@` expansion in webpage inputs
- Local storage via `chrome.storage.local`
- JSON import/export
- 117 built-in Chinese prompts from Yao Open Prompts
- 442 built-in GPT-Image2 image prompts with reference thumbnails and preview modal
- 50 built-in QiaoMu curated prompts
- 240 built-in English prompts from ai-boost/awesome-prompts

### Install

1. Download or clone this repository.
2. Open `chrome://extensions`.
3. Enable Developer mode.
4. Click Load unpacked and select this repository directory.
5. Click Reload after code updates.

### Attribution

Built-in prompt text comes from [Yao Open Prompts](https://github.com/yaojingang/yao-open-prompts) by 姚金刚 and is licensed under CC BY 4.0.

Built-in image prompt cases come from [GPT-Image2 Prompt Gallery](https://gpt-image2.canghe.ai/) / [awesome-gpt-image-2](https://github.com/freestylefly/awesome-gpt-image-2) by freestylefly and are licensed under MIT.

Built-in QiaoMu prompts are curated from the local QiaoMu prompt library.

Built-in English engineering prompts come from [ai-boost/awesome-prompts](https://github.com/ai-boost/awesome-prompts), licensed under GPL-3.0.

Extension code is MIT licensed.
