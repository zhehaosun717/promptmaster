
export enum Sender {
  User = 'user',
  AI = 'ai',
  System = 'system'
}

export enum Language {
  Chinese = 'zh',
  English = 'en'
}

export interface ChatMessage {
  id: string;
  sender: Sender;
  text: string;
  options?: string[]; // Optional list of choices for the user
  timestamp: number;
}

// Structured response from Gemini
export interface InterviewResponse {
  question: string;
  options: string[];
  isFinalDraft?: boolean;
  generatedPrompt?: string;
}

export enum AppStage {
  Home = 'home', // Selection screen
  Interview = 'interview', // Initial gathering of requirements
  Generating = 'generating', // Creating the first draft
  Editor = 'editor', // Manual editing with AI mentor
}

export interface MentorFeedback {
  type: 'praise' | 'suggestion' | 'warning' | 'insight';
  content: string;
}

export interface Suggestion {
  id: string;
  originalText: string;
  suggestedText: string;
  reason: string;
  type: 'clarity' | 'tone' | 'structure' | 'grammar';
}

export enum Pillar {
  Persona = 'Persona',
  Task = 'Task',
  Context = 'Context',
  Format = 'Format',
  Other = 'Other'
}

export interface LockedSegment {
  id: string;
  text: string;
  pillar: Pillar | 'pending';
}

// API Configuration Types
export enum ModelType {
  GeminiPro = 'gemini-3-pro-preview',
  GeminiFlash = 'gemini-3-flash-preview'
}

export enum ApiProvider {
  GoogleGemini = 'google-gemini',
  DeepSeek = 'deepseek',
  OpenAI = 'openai',
  Anthropic = 'anthropic',
  Custom = 'custom'
}

export interface CustomModel {
  id: string;
  name: string;
  provider: ApiProvider;
  modelName: string; // 实际的模型名称
  baseUrl?: string;
  apiKey?: string;
  description?: string;
  maxTokens?: number;
  temperature?: number;
}

// 预定义的模型列表
export const PREDEFINED_MODELS: CustomModel[] = [
  {
    id: 'gemini-pro',
    name: 'Gemini Pro (深度推理)',
    provider: ApiProvider.GoogleGemini,
    modelName: ModelType.GeminiPro,
    description: '强大的推理能力，适合复杂任务'
  },
  {
    id: 'gemini-flash',
    name: 'Gemini Flash (快速响应)',
    provider: ApiProvider.GoogleGemini,
    modelName: ModelType.GeminiFlash,
    description: '快速响应，适合实时交互'
  },
  {
    id: 'deepseek-chat',
    name: 'DeepSeek Chat (V3)',
    provider: ApiProvider.DeepSeek,
    modelName: 'deepseek-chat',
    description: 'DeepSeek V3 通用大模型，推理能力强',
    baseUrl: 'https://api.deepseek.com'
  },
  {
    id: 'deepseek-reasoner',
    name: 'DeepSeek Reasoner (R1)',
    provider: ApiProvider.DeepSeek,
    modelName: 'deepseek-reasoner',
    description: 'DeepSeek R1 推理模型，擅长复杂逻辑',
    baseUrl: 'https://api.deepseek.com'
  }
];

export enum FeatureType {
  Interview = 'interview',         // 访谈功能 - 快速响应
  Mentor = 'mentor',              // AI导师反馈 - 深度推理
  Feedback = 'feedback',           // 具体反馈应用 - 深度推理
  Critique = 'critique',          // 详细批评 - 深度分析
  Classify = 'classify',          // 文本分类 - 轻量级任务
  Rewrite = 'rewrite',            // 重构功能 - 创意任务
  ReverseEngineer = 'reverse-engineer' // 逆向工程 - 快速分析
}

export interface ApiConfig {
  // 当前激活的首选提供商（用于快捷设置）
  activeProvider: ApiProvider;
  // 默认Google Gemini API Key
  geminiApiKey: string;
  // DeepSeek API Key
  deepseekApiKey: string;
  // 全局默认设置
  defaultBaseUrl?: string;
  defaultApiKey?: string;
  // 功能到模型的映射（使用模型ID）
  models: {
    [key in FeatureType]: string;
  };
  // 自定义模型列表
  customModels: CustomModel[];
}

export interface AppSettings {
  api: ApiConfig;
  language: Language;
  theme: 'light' | 'dark' | 'system';
}

// Default API Configuration
export const DEFAULT_API_CONFIG: ApiConfig = {
  activeProvider: ApiProvider.GoogleGemini,
  geminiApiKey: '',
  deepseekApiKey: '',
  defaultBaseUrl: '',
  defaultApiKey: '',
  models: {
    [FeatureType.Interview]: 'gemini-flash',     // 访谈需要快速响应
    [FeatureType.Mentor]: 'gemini-pro',          // 导师需要深度推理
    [FeatureType.Feedback]: 'gemini-pro',        // 反馈需要深度推理
    [FeatureType.Critique]: 'gemini-pro',        // 批评需要深度分析
    [FeatureType.Classify]: 'gemini-flash',      // 分类是轻量级任务
    [FeatureType.Rewrite]: 'gemini-pro',         // 重构需要创意能力
    [FeatureType.ReverseEngineer]: 'gemini-flash' // 逆向工程是快速分析
  },
  customModels: []
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  api: DEFAULT_API_CONFIG,
  language: Language.Chinese,
  theme: 'light'
};

// 辅助函数
export const getAllModels = (customModels: CustomModel[] = []): CustomModel[] => {
  return [...PREDEFINED_MODELS, ...customModels];
};

export const getModelById = (modelId: string, customModels: CustomModel[] = []): CustomModel | undefined => {
  const allModels = getAllModels(customModels);
  return allModels.find(model => model.id === modelId);
};

export const getApiKeyForModel = (model: CustomModel, settings: AppSettings): string => {
  // 优先使用模型自己的API Key
  if (model.apiKey) return model.apiKey;

  // 其次使用全局默认API Key
  if (settings.api.defaultApiKey) return settings.api.defaultApiKey;

  // 最后根据提供商使用相应的Key
  switch (model.provider) {
    case ApiProvider.GoogleGemini:
      return settings.api.geminiApiKey;
    case ApiProvider.DeepSeek:
      return settings.api.deepseekApiKey;
    default:
      return settings.api.defaultApiKey || '';
  }
};

export const getBaseUrlForModel = (model: CustomModel, settings: AppSettings): string | undefined => {
  // 优先使用模型自己的base URL
  if (model.baseUrl) return model.baseUrl;

  // 其次使用全局默认base URL
  return settings.api.defaultBaseUrl;
};

// ========== Template Library Types ==========

export type TemplateCategory =
  | 'coding'
  | 'writing'
  | 'research'
  | 'business'
  | 'creative'
  | 'custom';

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  prompt: string;
  context?: string;
  tags: string[];
  isBuiltIn: boolean;
  createdAt: number;
  updatedAt: number;
}

export const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategory, { zh: string; en: string }> = {
  coding: { zh: '编程开发', en: 'Coding' },
  writing: { zh: '写作创作', en: 'Writing' },
  research: { zh: '研究分析', en: 'Research' },
  business: { zh: '商务办公', en: 'Business' },
  creative: { zh: '创意设计', en: 'Creative' },
  custom: { zh: '自定义', en: 'Custom' }
};