# PromptMaster AI - 交互式提示词工程助手

PromptMaster AI 是一个基于 Google Gemini AI 的智能提示词（Prompt）编写工具。它通过"苏格拉底式"的访谈引导用户理清需求，并提供了一个带有 AI 实时建议、批评和重构功能的智能编辑器，帮助用户打造高质量的 AI 指令。

## ✨ 核心功能

### 第一阶段：智能访谈 (Interview Stage)
*   **引导式提问**：AI 顾问（Consultant）通过对话引导，系统性地收集提示词的四大支柱（Pillar）：**角色 (Persona)**、**任务 (Task)**、**背景 (Context)**、**格式 (Format)**。
*   **动态选项**：针对每个问题生成 3 个具体选项，支持用户"换一批 (Reroll)"或自定义输入。
*   **思维链 (Thinking)**：使用 Gemini 的思维配置，确保逻辑连贯，不会产生幻觉。
*   **双语支持**：完整支持简体中文和英文的无缝切换。

### 第二阶段：智能编辑器 (Smart Editor)
*   **深度扫描 (Deep Scan)**：一键分析全文，识别模糊、薄弱或逻辑混乱的片段，并提供具体的修改建议。
*   **AI 导师 (AI Mentor)**：实时监控（防打扰模式）提示词质量，提供全局性的优化建议。
*   **智能采纳与撤回**：
    *   **一键采纳**：快速应用 AI 导师的修改建议。
    *   **即时撤回 (Undo)**：采纳建议后支持一键撤回修改，即使 AI 已生成了新的反馈建议，撤回功能依然有效，防止误操作。
*   **局部/全文重构**：
    *   **重构全文**：基于"随机性"温度（0.8）生成全新的措辞和结构，激发灵感。
    *   **局部重写**：选中特定文本进行精准优化（温度 0.3），保持上下文连贯。
*   **文本锁定 (Locking)**：支持锁定特定的关键片段，防止 AI 在重构时修改这些内容。自动分类识别锁定内容的类型（角色、任务等）。

### 直接导入与逆向分析
*   **导入现有提示词**：支持直接粘贴已有的提示词。
*   **逆向上下文分析 (Context Reverse Engineering)**：AI 会自动分析用户粘贴的文本，逆向推导出隐含的角色、任务和背景信息，从而让编辑器能够基于正确的上下文提供优化建议。

### 个性化设置与模型管理
*   **全功能设置中心**：模块化的设置界面，包含 API 配置、模型管理和环境配置三大标签页。
*   **自定义模型支持**：
    *   添加和管理自定义 AI 模型（支持 Google AI Studio 和第三方 API）
    *   为不同功能分配不同的模型（访谈、导师、重写等）
    *   内置预定义模型（Gemini Pro 和 Gemini Flash）
*   **环境变量配置**：支持通过 `.env.local` 文件批量导入/导出模型和 API 配置。
*   **语言切换**：支持中英文界面快速切换。
*   **主题切换**：完整的浅色/深色主题支持，所有组件均已优化以确保在两种模式下的可读性。

## 🎨 用户界面特性

*   **完美的主题支持**：浅色和深色主题下所有 UI 元素都经过精心优化，确保最佳可读性和视觉体验。
*   **响应式设计**：适配不同屏幕尺寸。
*   **流畅动画**：页面过渡和交互动画提升用户体验。
*   **直观的进度指示**：清晰的阶段导航（需求访谈 → 智能编辑器）。

## 🛠️ 技术栈

*   **Frontend**: React 19, TypeScript
*   **Styling**: Tailwind CSS
*   **AI Integration**: Google GenAI SDK (`@google/genai`)
*   **Icons**: Lucide React
*   **Build Tool**: Vite

## 🚀 快速开始

### 1. 环境准备
确保您的系统已安装 [Node.js](https://nodejs.org/) (建议 v18+)。

### 2. 克隆并安装依赖

```bash
# 克隆项目（或下载源码）
cd promptmaster-ai

# 安装依赖
npm install
```

### 3. 配置 API Key

**方式一：使用 UI 设置（推荐）**

1. 启动开发服务器（见步骤 4）
2. 打开应用后，点击右上角的"设置"图标 ⚙️
3. 在"基础配置"标签页中输入您的 **Gemini API Key**
4. 点击"保存设置"

**方式二：使用环境变量文件**

在项目根目录创建 `.env.local` 文件：

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

> 💡 **获取 API Key**: 访问 [Google AI Studio](https://aistudio.google.com/apikey) 获取免费的 Gemini API Key。

### 4. 启动开发服务器

```bash
npm run dev
```

应用将在 `http://localhost:5173` 启动（或终端显示的端口）。

### 5. 构建生产版本

```bash
npm run build
npm run preview
```

## 📂 项目结构

```
.
├── index.html              # 入口 HTML
├── index.tsx               # React 入口文件
├── App.tsx                 # 主应用组件 (路由/状态/主题管理)
├── types.ts                # TypeScript 类型定义
├── index.css               # 全局样式和 Tailwind 配置
├── vite.config.ts          # Vite 配置文件
├── services/
│   └── geminiService.ts    # Gemini API 调用逻辑 (核心 AI 逻辑)
├── components/
│   ├── InterviewStage.tsx  # 阶段一：访谈对话组件
│   ├── EditorStage.tsx     # 阶段二：编辑器与 AI 交互组件
│   ├── Settings.tsx        # 设置模态框组件
│   └── ModelManager.tsx    # 模型管理组件
└── utils/
    └── envLoader.ts        # 环境变量加载工具
```

## 🎯 使用指南

### 创建新提示词（推荐）
1. 点击"创建新提示词"卡片
2. 按照 AI 的引导回答问题
3. 为每个问题选择预设选项或输入自定义答案
4. 不满意选项时可点击"换一批"
5. 完成访谈后，AI 会生成初始提示词
6. 在智能编辑器中继续优化

### 优化现有提示词
1. 点击"优化现有提示词"卡片
2. 粘贴您的提示词
3. AI 会自动分析并逆向推导上下文
4. 直接进入智能编辑器进行优化

### 编辑器使用技巧
*   **深度扫描**: 分析全文并识别需要改进的地方
*   **AI 导师**: 实时提供优化建议（防打扰模式）
*   **文本锁定**: 保护关键内容不被 AI 修改
*   **局部重写**: 选中文本后精准优化
*   **重构全文**: 一键生成全新版本（可多次尝试）

### 模型管理
1. 打开设置 → "模型管理"标签
2. 添加自定义模型（支持 Google AI Studio 和第三方 API）
3. 为不同功能（访谈、导师、重写等）分配专用模型
4. 调整每个功能的默认参数（temperature、top-p 等）

## 💡 高级技巧

1.  **稳定性控制**：在编辑器模式下，建议先手动修改明显的问题，再点击"深度扫描"获取 AI 的精细建议。
2.  **锁定功能**：对于必须保留的特定术语或数据格式，请务必先选中并点击"锁定 (Lock)"，然后再使用"重构全文"。
3.  **温度机制**：
    *   全文重构使用较高温度（0.8）提供更多样化的结果
    *   局部重写使用较低温度（0.3）保证准确性
    *   可在设置中为每个功能自定义温度参数
4.  **批量配置**: 使用环境变量文件 `.env.local` 可以快速配置多个模型和 API Key，适合团队部署。

## 🔧 配置选项

### 支持的环境变量

在 `.env.local` 中可配置：

```env
# Gemini API Key（必需）
GEMINI_API_KEY=your_api_key

# 默认 API 配置（可选）
DEFAULT_BASE_URL=https://api.example.com
DEFAULT_API_KEY=backup_api_key

# 功能模型映射（可选）
INTERVIEW_MODEL=gemini-flash
MENTOR_MODEL=gemini-pro
DEEP_SCAN_MODEL=gemini-pro
REWRITE_MODEL=gemini-pro
REVERSE_ENGINEER_MODEL=gemini-flash
```

完整配置说明请查看设置界面中的"环境配置"标签。

## 🎨 主题定制

应用支持浅色和深色两种主题：
- 打开设置 → "基础配置"
- 选择"浅色"或"深色"主题
- 所有组件会自动切换并保持最佳可读性

## 🗺️ 未来计划

查看 [优化计划](./optimization_plan.md) 了解即将到来的功能和改进。

主要规划：
- ✅ 完整的浅色/深色主题支持
- 🔄 状态管理优化（Context API）
- 📱 移动端响应式改进
- 📚 提示词模板库
- 🔗 分享链接功能
- 🧪 自动化测试覆盖

## 🐛 问题反馈

如遇到问题或有功能建议，欢迎提交 Issue。

## 📄 License

MIT License - 可自由使用、修改和分发。

---

**Made with ❤️ using React, TypeScript, and Google Gemini AI**