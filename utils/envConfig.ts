import { AppSettings, CustomModel, ApiProvider, PREDEFINED_MODELS, ApiConfig, FeatureType } from '../types';

/**
 * 将AppSettings转换为.env.local文件内容
 */
export const settingsToEnvContent = (settings: AppSettings): string => {
  const lines: string[] = [];

  // 添加文件头注释
  lines.push('# PromptMaster AI Configuration');
  lines.push('# Generated on ' + new Date().toLocaleString());
  lines.push('');

  // Google Gemini API Key (兼容现有格式)
  if (settings.api.geminiApiKey) {
    lines.push('# Google Gemini API Key');
    lines.push(`GEMINI_API_KEY=${settings.api.geminiApiKey}`);
    lines.push(`VITE_GEMINI_API_KEY=${settings.api.geminiApiKey}`);
    lines.push('');
  }

  // 全局默认配置
  if (settings.api.defaultApiKey) {
    lines.push('# Global Default API Key');
    lines.push(`VITE_DEFAULT_API_KEY=${settings.api.defaultApiKey}`);
    lines.push('');
  }

  if (settings.api.defaultBaseUrl) {
    lines.push('# Global Default Base URL');
    lines.push(`VITE_DEFAULT_BASE_URL=${settings.api.defaultBaseUrl}`);
    lines.push('');
  }

  // 自定义模型配置
  if (settings.api.customModels.length > 0) {
    lines.push('# Custom Models Configuration');
    settings.api.customModels.forEach((model, index) => {
      lines.push(`# ${model.name} (${model.provider})`);

      if (model.apiKey) {
        lines.push(`VITE_CUSTOM_MODEL_${model.id.toUpperCase()}_API_KEY=${model.apiKey}`);
      }

      if (model.baseUrl) {
        lines.push(`VITE_CUSTOM_MODEL_${model.id.toUpperCase()}_BASE_URL=${model.baseUrl}`);
      }

      if (model.modelName) {
        lines.push(`VITE_CUSTOM_MODEL_${model.id.toUpperCase()}_NAME=${model.modelName}`);
      }

      if (model.maxTokens) {
        lines.push(`VITE_CUSTOM_MODEL_${model.id.toUpperCase()}_MAX_TOKENS=${model.maxTokens}`);
      }

      if (model.temperature !== undefined) {
        lines.push(`VITE_CUSTOM_MODEL_${model.id.toUpperCase()}_TEMPERATURE=${model.temperature}`);
      }

      lines.push('');
    });
  }

  // 模型映射配置 (JSON格式存储)
  const modelMapping = JSON.stringify(settings.api.models);
  lines.push('# Feature to Model Mapping');
  lines.push(`VITE_MODEL_MAPPING=${modelMapping}`);
  lines.push('');

  // 其他设置
  lines.push('# App Settings');
  lines.push(`VITE_APP_LANGUAGE=${settings.language}`);
  lines.push(`VITE_APP_THEME=${settings.theme}`);

  return lines.join('\n');
};

/**
 * 解析.env.local文件内容为AppSettings
 */
export const parseEnvContent = (envContent: string): Partial<AppSettings> => {
  const lines = envContent.split('\n');
  const envVars: Record<string, string> = {};

  // 解析环境变量
  lines.forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const eqIndex = line.indexOf('=');
      if (eqIndex > 0) {
        const key = line.substring(0, eqIndex).trim();
        const value = line.substring(eqIndex + 1).trim();
        envVars[key] = value;
      }
    }
  });

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

  // 解析API配置
  if (settings.api) {
    // Gemini API Key
    if (envVars.GEMINI_API_KEY) {
      settings.api.geminiApiKey = envVars.GEMINI_API_KEY;
    } else if (envVars.VITE_GEMINI_API_KEY) {
      settings.api.geminiApiKey = envVars.VITE_GEMINI_API_KEY;
    }

    // 默认配置
    if (envVars.VITE_DEFAULT_API_KEY) {
      settings.api.defaultApiKey = envVars.VITE_DEFAULT_API_KEY;
    }

    if (envVars.VITE_DEFAULT_BASE_URL) {
      settings.api.defaultBaseUrl = envVars.VITE_DEFAULT_BASE_URL;
    }

    // 解析模型映射
    if (envVars.VITE_MODEL_MAPPING) {
      try {
        settings.api.models = JSON.parse(envVars.VITE_MODEL_MAPPING);
      } catch (e) {
        console.warn('Failed to parse model mapping from env');
      }
    }

    // 解析自定义模型
    const customModels: CustomModel[] = [];
    Object.keys(envVars).forEach(key => {
      if (key.startsWith('VITE_CUSTOM_MODEL_') && key.endsWith('_API_KEY')) {
        const modelId = key.replace('VITE_CUSTOM_MODEL_', '').replace('_API_KEY', '').toLowerCase();
        const model: CustomModel = {
          id: modelId,
          name: modelId,
          provider: ApiProvider.Custom,
          modelName: envVars[`VITE_CUSTOM_MODEL_${modelId.toUpperCase()}_NAME`] || modelId,
          apiKey: envVars[key],
          baseUrl: envVars[`VITE_CUSTOM_MODEL_${modelId.toUpperCase()}_BASE_URL`],
          maxTokens: (() => {
            const val = envVars[`VITE_CUSTOM_MODEL_${modelId.toUpperCase()}_MAX_TOKENS`];
            return val ? parseInt(val) : undefined;
          })(),
          temperature: (() => {
            const val = envVars[`VITE_CUSTOM_MODEL_${modelId.toUpperCase()}_TEMPERATURE`];
            return val ? parseFloat(val) : undefined;
          })()
        };
        customModels.push(model);
      }
    });

    if (customModels.length > 0) {
      settings.api.customModels = customModels;
    }
  }

  // 解析其他设置
  if (envVars.VITE_APP_LANGUAGE) {
    settings.language = envVars.VITE_APP_LANGUAGE as any;
  }

  if (envVars.VITE_APP_THEME) {
    settings.theme = envVars.VITE_APP_THEME as any;
  }

  return settings;
};

/**
 * 下载.env.local文件
 */
export const downloadEnvFile = (settings: AppSettings) => {
  const content = settingsToEnvContent(settings);
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = '.env.local';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * 复制.env.local内容到剪贴板
 */
export const copyEnvContent = async (settings: AppSettings): Promise<boolean> => {
  try {
    const content = settingsToEnvContent(settings);
    await navigator.clipboard.writeText(content);
    return true;
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
};