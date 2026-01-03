import { AppSettings, DEFAULT_APP_SETTINGS, ApiProvider, CustomModel, FeatureType } from '../types';
import { parseEnvContent } from './envConfig';

/**
 * 从环境变量加载配置
 */
export const loadSettingsFromEnv = (): Partial<AppSettings> => {
  const settings: Partial<AppSettings> = {
    api: {
      geminiApiKey: '',
      models: {
        [FeatureType.Interview]: '',
        [FeatureType.Mentor]: '',
        [FeatureType.Feedback]: '',
        [FeatureType.Critique]: '',
        [FeatureType.Classify]: '',
        [FeatureType.Rewrite]: '',
        [FeatureType.ReverseEngineer]: ''
      },
      customModels: []
    },
    language: 'zh' as any,
    theme: 'dark' as any
  };

  // 检查是否在浏览器环境中
  if (typeof window === 'undefined') {
    // Node.js环境 - 从process.env读取
    return loadFromNodeEnv();
  } else {
    // 浏览器环境 - 从import.meta.env读取（Vite）
    return loadFromBrowserEnv();
  }
};

/**
 * 在浏览器环境(Vite)中读取环境变量
 */
const loadFromBrowserEnv = (): Partial<AppSettings> => {
  const settings: Partial<AppSettings> = {
    api: {
      geminiApiKey: '',
      models: {
        [FeatureType.Interview]: '',
        [FeatureType.Mentor]: '',
        [FeatureType.Feedback]: '',
        [FeatureType.Critique]: '',
        [FeatureType.Classify]: '',
        [FeatureType.Rewrite]: '',
        [FeatureType.ReverseEngineer]: ''
      },
      customModels: []
    },
    language: 'zh' as any,
    theme: 'dark' as any
  };

  // 从Vite环境变量读取
  const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;
  const defaultApiKey = import.meta.env.VITE_DEFAULT_API_KEY;
  const defaultBaseUrl = import.meta.env.VITE_DEFAULT_BASE_URL;
  const modelMapping = import.meta.env.VITE_MODEL_MAPPING;
  const appLanguage = import.meta.env.VITE_APP_LANGUAGE;
  const appTheme = import.meta.env.VITE_APP_THEME;

  if (settings.api) {
    if (geminiApiKey) {
      settings.api.geminiApiKey = geminiApiKey;
    }

    if (defaultApiKey) {
      settings.api.defaultApiKey = defaultApiKey;
    }

    if (defaultBaseUrl) {
      settings.api.defaultBaseUrl = defaultBaseUrl;
    }

    // 解析模型映射
    if (modelMapping) {
      try {
        settings.api.models = JSON.parse(modelMapping);
      } catch (e) {
        console.warn('Failed to parse model mapping from environment variables:', e);
      }
    }

    // 解析自定义模型
    const customModels = parseCustomModelsFromEnv();
    if (customModels.length > 0) {
      settings.api.customModels = customModels;
    }
  }

  if (appLanguage) {
    settings.language = appLanguage as any;
  }

  if (appTheme) {
    settings.theme = appTheme as any;
  }

  return settings;
};

/**
 * 在Node.js环境中读取环境变量
 * Note: 这是一个纯浏览器应用，此函数返回空配置
 */
const loadFromNodeEnv = (): Partial<AppSettings> => {
  // 浏览器端应用不支持 Node.js 环境变量
  // 用户需要通过 Settings UI 配置 API Key
  return {
    api: {
      geminiApiKey: '',
      models: {
        [FeatureType.Interview]: '',
        [FeatureType.Mentor]: '',
        [FeatureType.Feedback]: '',
        [FeatureType.Critique]: '',
        [FeatureType.Classify]: '',
        [FeatureType.Rewrite]: '',
        [FeatureType.ReverseEngineer]: ''
      },
      customModels: []
    },
    language: 'zh' as any,
    theme: 'dark' as any
  };
};

/**
 * 从环境变量解析自定义模型配置
 * 仅在浏览器环境中从 import.meta.env 读取
 */
const parseCustomModelsFromEnv = (): CustomModel[] => {
  const models: CustomModel[] = [];

  // 仅支持浏览器环境的 Vite 环境变量
  if (typeof window === 'undefined') {
    return models;
  }

  const envVars = import.meta.env;

  Object.keys(envVars).forEach(key => {
    if ((key as string).startsWith('VITE_CUSTOM_MODEL_') && (key as string).endsWith('_API_KEY')) {
      const keyStr = key as string;
      const modelId = keyStr
        .replace('VITE_CUSTOM_MODEL_', '')
        .replace('_API_KEY', '')
        .toLowerCase();

      const model: CustomModel = {
        id: modelId,
        name: modelId,
        provider: ApiProvider.Custom,
        modelName: envVars[`VITE_CUSTOM_MODEL_${modelId.toUpperCase()}_NAME`] as string || modelId,
        apiKey: envVars[keyStr] as string,
        baseUrl: envVars[`VITE_CUSTOM_MODEL_${modelId.toUpperCase()}_BASE_URL`] as string,
        maxTokens: envVars[`VITE_CUSTOM_MODEL_${modelId.toUpperCase()}_MAX_TOKENS`] ?
          parseInt(envVars[`VITE_CUSTOM_MODEL_${modelId.toUpperCase()}_MAX_TOKENS`] as string) : undefined
      };

      // 只有当有API Key时才添加
      if (model.apiKey) {
        models.push(model);
      }
    }
  });

  return models;
};

/**
 * 合并环境变量配置和默认配置
 */
export const mergeWithEnvSettings = (userSettings: AppSettings): AppSettings => {
  const envSettings = loadSettingsFromEnv();

  // 深度合并配置
  const mergedSettings: AppSettings = {
    language: userSettings.language || envSettings.language || DEFAULT_APP_SETTINGS.language,
    theme: userSettings.theme || envSettings.theme || DEFAULT_APP_SETTINGS.theme,
    api: {
      ...DEFAULT_APP_SETTINGS.api,
      ...envSettings.api,
      ...userSettings.api,
      models: {
        ...DEFAULT_APP_SETTINGS.api.models,
        ...(envSettings.api?.models || {}),
        ...userSettings.api.models
      },
      customModels: [
        ...(DEFAULT_APP_SETTINGS.api.customModels || []),
        ...(envSettings.api?.customModels || []),
        ...(userSettings.api.customModels || [])
      ]
    }
  };

  return mergedSettings;
};

/**
 * 检查是否有有效的环境变量配置
 */
export const hasValidEnvConfig = (): boolean => {
  const envSettings = loadSettingsFromEnv();

  return !!(envSettings.api?.geminiApiKey ||
    envSettings.api?.defaultApiKey ||
    (envSettings.api?.customModels && envSettings.api.customModels.length > 0));
};