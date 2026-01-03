import React, { useState, useEffect } from 'react';
import { Settings, Globe, Palette, Key, Brain, Save, RotateCcw, Database, Download, Upload, Copy, Check, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { AppSettings, DEFAULT_APP_SETTINGS, FeatureType, ModelType, Language, getAllModels, getModelById } from '../types';
import ModelManager from './ModelManager';
import { downloadEnvFile, copyEnvContent } from '../utils/envConfig';
import { getErrorMessage } from '../types/errors'; // Added import for getErrorMessage

interface SettingsProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
  onClose: () => void;
}

export default function SettingsComponent({ settings, onSettingsChange, onClose }: SettingsProps) {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [showApiKey, setShowApiKey] = useState(false);
  const [activeTab, setActiveTab] = useState<'api' | 'models' | 'env'>('api');
  const [copySuccess, setCopySuccess] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  const { showSuccess, showError } = useToast();

  // 监听 localSettings 变化，检测是否有未保存的修改
  useEffect(() => {
    const changed = JSON.stringify(localSettings) !== JSON.stringify(settings);
    setHasUnsavedChanges(changed);
  }, [localSettings, settings]);

  // 功能名称映射
  const featureNames: Record<FeatureType, { zh: string; en: string }> = {
    [FeatureType.Interview]: { zh: '访谈功能 (快速)', en: 'Interview (Fast)' },
    [FeatureType.Mentor]: { zh: 'AI导师 (深度)', en: 'AI Mentor (Deep)' },
    [FeatureType.Feedback]: { zh: '反馈应用 (深度)', en: 'Feedback Apply (Deep)' },
    [FeatureType.Critique]: { zh: '详细批评 (深度)', en: 'Detailed Critique (Deep)' },
    [FeatureType.Classify]: { zh: '文本分类 (快速)', en: 'Text Classification (Fast)' },
    [FeatureType.Rewrite]: { zh: '重构功能 (深度)', en: 'Rewrite (Deep)' },
    [FeatureType.ReverseEngineer]: { zh: '逆向工程 (快速)', en: 'Reverse Engineer (Fast)' }
  };

  const isZh = localSettings.language === Language.Chinese;

  // 关闭模态框前检查是否有未保存的修改
  const handleClose = () => {
    if (hasUnsavedChanges) {
      const confirmed = confirm(
        isZh
          ? '您有未保存的更改，确定要关闭吗？所有更改将丢失。'
          : 'You have unsaved changes. Are you sure you want to close? All changes will be lost.'
      );
      if (!confirmed) return;
    }
    onClose();
  };

  const handleSave = () => {
    onSettingsChange(localSettings);
    localStorage.setItem('promptmaster-settings', JSON.stringify(localSettings));
    onClose();
  };

  const handleReset = () => {
    setLocalSettings(DEFAULT_APP_SETTINGS);
  };

  const updateApiKey = (apiKey: string) => {
    setLocalSettings((prev: AppSettings) => ({
      ...prev,
      api: {
        ...prev.api,
        geminiApiKey: apiKey
      }
    }));
  };

  const updateDefaultApiKey = (apiKey: string) => {
    setLocalSettings((prev: AppSettings) => ({
      ...prev,
      api: {
        ...prev.api,
        defaultApiKey: apiKey
      }
    }));
  };

  const updateDefaultBaseUrl = (baseUrl: string) => {
    setLocalSettings((prev: AppSettings) => ({
      ...prev,
      api: {
        ...prev.api,
        defaultBaseUrl: baseUrl
      }
    }));
  };

  const updateModel = (feature: FeatureType, model: string) => {
    setLocalSettings((prev: AppSettings) => ({
      ...prev,
      api: {
        ...prev.api,
        models: {
          ...prev.api.models,
          [feature]: model
        }
      }
    }));
  };

  const updateLanguage = (language: Language) => {
    setLocalSettings((prev: AppSettings) => ({
      ...prev,
      language
    }));
  };

  const updateTheme = (theme: 'light' | 'dark' | 'system') => {
    setLocalSettings((prev: AppSettings) => ({
      ...prev,
      theme
    }));
  };

  // 测试 API 连接
  const handleTestConnection = async () => {
    const isDeepSeek = localSettings.api.activeProvider === 'deepseek';
    const activeKey = isDeepSeek ? localSettings.api.deepseekApiKey : localSettings.api.geminiApiKey;

    if (!activeKey) {
      showError(isZh ? '请先输入 API Key' : 'Please enter an API Key first');
      return;
    }

    setTestingConnection(true);
    try {
      const apiTest = await import('../services/apiTest');
      let result;

      if (isDeepSeek) {
        result = await apiTest.testDeepSeekConnection(activeKey);
      } else {
        result = await apiTest.testGeminiConnection(activeKey);
      }

      if (result.success) {
        showSuccess(isZh ? '✅ 连接成功！API Key 有效。' : '✅ Connection successful! API Key is valid.');
      } else {
        showError(isZh ? `❌ 连接失败：${result.error}` : `❌ Connection failed: ${result.error}`);
      }
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      showError(isZh ? `❌ 测试失败：${errorMessage}` : `❌ Test failed: ${errorMessage}`);
    } finally {
      setTestingConnection(false);
    }
  };

  // 导出.env.local文件
  const handleExportEnv = () => {
    downloadEnvFile(localSettings);
  };

  // 复制.env.local内容到剪贴板
  const handleCopyEnv = async () => {
    const success = await copyEnvContent(localSettings);
    if (success) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  // 读取.env.local文件
  const handleImportEnv = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const content = e.target?.result as string;
      if (content) {
        try {
          // 这里暂时只读取，不自动应用
          // 用户可以选择是否应用导入的配置
          const parsedSettings = JSON.stringify(content, null, 2);
          console.log('Imported env content:', parsedSettings);
          alert(isZh ?
            '环境配置已读取，请检查控制台输出。\n\n注意：出于安全考虑，请手动复制相关配置到.env.local文件中。' :
            'Environment configuration has been read, please check console output.\n\nNote: For security reasons, please manually copy the relevant configuration to .env.local file.'
          );
        } catch (error) {
          alert(isZh ?
            '导入失败：文件格式不正确' :
            'Import failed: Invalid file format'
          );
        }
      }
    };
    reader.readAsText(file);
    // 清空input值，允许重复选择同一个文件
    event.target.value = '';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border ${settings.theme === 'light'
        ? 'bg-white border-gray-300'
        : 'bg-gray-800 border-gray-700'
        }`}>
        {/* Header */}
        <div className="bg-blue-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings className="w-8 h-8" />
              <h1 className="text-2xl font-bold">
                {isZh ? '设置' : 'Settings'}
              </h1>
            </div>
            <button
              onClick={handleClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Unsaved Changes Warning */}
        {hasUnsavedChanges && (
          <div className="bg-yellow-500/10 border-l-4 border-yellow-500 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                <span className={`font-medium ${settings.theme === 'light' ? 'text-yellow-700' : 'text-yellow-300'
                  }`}>
                  {isZh ? '您有未保存的更改' : 'You have unsaved changes'}
                </span>
              </div>
              <button
                onClick={handleSave}
                className="px-4 py-1.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors text-sm font-medium"
              >
                {isZh ? '立即保存' : 'Save Now'}
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className={`p-6 overflow-y-auto max-h-[calc(90vh-200px)] ${settings.theme === 'light' ? 'bg-gray-50' : ''
          }`}>
          {/* Tab Navigation */}
          <div className={`flex border-b mb-6 ${settings.theme === 'light' ? 'border-gray-300' : 'border-gray-700'
            }`}>
            <button
              onClick={() => setActiveTab('api')}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === 'api'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
            >
              {isZh ? '基础配置' : 'Basic Config'}
            </button>
            <button
              onClick={() => setActiveTab('models')}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === 'models'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
            >
              <Database className="inline w-4 h-4 mr-2" />
              {isZh ? '模型管理' : 'Model Management'}
            </button>
            <button
              onClick={() => setActiveTab('env')}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === 'env'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
            >
              <Key className="inline w-4 h-4 mr-2" />
              {isZh ? '环境配置' : 'Environment'}
            </button>
          </div>

          {/* API Configuration Tab */}
          {activeTab === 'api' && (
            <div className="space-y-8">
              {/* AI Provider Configuration */}
              <div className={`border rounded-lg p-6 ${settings.theme === 'light'
                ? 'border-gray-300 bg-white'
                : 'border-gray-600 bg-gray-700/50'
                }`}>
                <div className="flex items-center gap-2 mb-6">
                  <div className={`p-2 rounded-lg ${settings.theme === 'light' ? 'bg-blue-100' : 'bg-blue-900/30'}`}>
                    <Key className="w-5 h-5 text-blue-500" />
                  </div>
                  <h2 className={`text-xl font-semibold ${settings.theme === 'light' ? 'text-gray-900' : 'text-white'
                    }`}>
                    {isZh ? 'AI 服务提供商' : 'AI Provider'}
                  </h2>
                </div>

                {/* Provider Selector */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <button
                    onClick={() => {
                      setLocalSettings(prev => ({
                        ...prev,
                        api: {
                          ...prev.api,
                          activeProvider: 'google-gemini' as any
                        }
                      }));
                    }}
                    className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${localSettings.api.activeProvider === 'google-gemini'
                      ? 'border-blue-500 bg-blue-500/10 text-blue-500'
                      : 'border-gray-600 hover:border-gray-500 text-gray-400'
                      }`}
                  >
                    <span className="font-bold">Google Gemini</span>
                  </button>

                  <button
                    onClick={() => {
                      // Switch to DeepSeek and auto-configure models
                      setLocalSettings(prev => ({
                        ...prev,
                        api: {
                          ...prev.api,
                          activeProvider: 'deepseek' as any,
                          // Auto-switch models to DeepSeek if they are currently set to Gemini defaults
                          models: {
                            ...prev.api.models,
                            [FeatureType.Interview]: 'deepseek-chat',
                            [FeatureType.Mentor]: 'deepseek-chat',
                            [FeatureType.Feedback]: 'deepseek-chat',
                            [FeatureType.Critique]: 'deepseek-chat',
                            [FeatureType.Classify]: 'deepseek-chat',
                            [FeatureType.Rewrite]: 'deepseek-chat',
                            [FeatureType.ReverseEngineer]: 'deepseek-chat'
                          }
                        }
                      }));
                      if (isZh) {
                        showSuccess('已切换至 DeepSeek，相关模型已自动配置');
                      } else {
                        showSuccess('Switched to DeepSeek, models auto-configured');
                      }
                    }}
                    className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${localSettings.api.activeProvider === 'deepseek'
                      ? 'border-blue-500 bg-blue-500/10 text-blue-500'
                      : 'border-gray-600 hover:border-gray-500 text-gray-400'
                      }`}
                  >
                    <span className="font-bold">DeepSeek</span>
                    <span className="text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded">Fast</span>
                  </button>
                </div>

                {/* API Key Inputs based on selection */}
                <div className="space-y-4">

                  {/* Google Gemini Input */}
                  {localSettings.api.activeProvider === 'google-gemini' && (
                    <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                      <label className={`block text-sm font-medium mb-2 ${settings.theme === 'light' ? 'text-gray-700' : 'text-gray-200'
                        }`}>
                        Google Gemini API Key
                      </label>
                      <div className="relative">
                        <input
                          type={showApiKey ? 'text' : 'password'}
                          value={localSettings.api.geminiApiKey}
                          onChange={(e) => updateApiKey(e.target.value)}
                          placeholder="AIzaSy..."
                          className={`w-full px-4 py-2 border rounded-lg pr-12 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${settings.theme === 'light'
                            ? 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                            : 'bg-gray-900 border-gray-600 text-gray-100 placeholder-gray-600'
                            }`}
                        />
                        <button
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                        >
                          {showApiKey ? '👁️' : '👁️‍🗨️'}
                        </button>
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        {isZh ? '国内用户请注意网络连接' : 'Note connection requirements in China'}
                      </p>
                    </div>
                  )}

                  {/* DeepSeek Input */}
                  {localSettings.api.activeProvider === 'deepseek' && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                      <label className={`block text-sm font-medium mb-2 ${settings.theme === 'light' ? 'text-gray-700' : 'text-gray-200'
                        }`}>
                        DeepSeek API Key
                      </label>
                      <div className="relative">
                        <input
                          type={showApiKey ? 'text' : 'password'}
                          value={localSettings.api.deepseekApiKey || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLocalSettings(prev => ({
                              ...prev,
                              api: { ...prev.api, deepseekApiKey: val }
                            }));
                          }}
                          placeholder="sk-..."
                          className={`w-full px-4 py-2 border rounded-lg pr-12 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${settings.theme === 'light'
                            ? 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                            : 'bg-gray-900 border-gray-600 text-gray-100 placeholder-gray-600'
                            }`}
                        />
                        <button
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                        >
                          {showApiKey ? '👁️' : '👁️‍🗨️'}
                        </button>
                      </div>
                      <p className="mt-2 text-xs text-green-500 flex items-center gap-1">
                        <CheckCircle size={12} />
                        {isZh ? '已自动配置 Base URL 和模型' : 'Base URL and models auto-configured'}
                      </p>
                    </div>
                  )}

                  <button
                    onClick={handleTestConnection}
                    disabled={testingConnection || (localSettings.api.activeProvider === 'google-gemini' ? !localSettings.api.geminiApiKey : !localSettings.api.deepseekApiKey)}
                    className={`mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 text-sm border rounded-lg transition-all ${testingConnection
                      ? 'bg-gray-600 cursor-wait'
                      : 'border-blue-500 text-blue-400 hover:bg-blue-600/10'
                      }`}
                  >
                    {testingConnection ? (
                      <>
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                        {isZh ? '测试中...' : 'Testing...'}
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        {isZh ? '测试连接' : 'Test Connection'}
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Global Default Settings */}
              <div className={`border rounded-lg p-6 ${settings.theme === 'light'
                ? 'border-gray-300 bg-white'
                : 'border-gray-600 bg-gray-700/50'
                }`}>
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="w-5 h-5 text-green-400" />
                  <h2 className={`text-xl font-semibold ${settings.theme === 'light' ? 'text-gray-900' : 'text-white'
                    }`}>
                    {isZh ? '全局默认设置' : 'Global Default Settings'}
                  </h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${settings.theme === 'light' ? 'text-gray-700' : 'text-gray-200'
                      }`}>
                      {isZh ? '默认 API Key' : 'Default API Key'}
                    </label>
                    <input
                      type="password"
                      value={localSettings.api.defaultApiKey || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateDefaultApiKey(e.target.value)}
                      placeholder={isZh ? '用于所有自定义模型的默认API Key' : 'Default API key for all custom models'}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${settings.theme === 'light'
                        ? 'bg-white border-gray-300 text-gray-900'
                        : 'bg-gray-900 border-gray-600 text-gray-100'
                        }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${settings.theme === 'light' ? 'text-gray-700' : 'text-gray-200'
                      }`}>
                      {isZh ? '默认 Base URL' : 'Default Base URL'}
                    </label>
                    <input
                      type="url"
                      value={localSettings.api.defaultBaseUrl || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateDefaultBaseUrl(e.target.value)}
                      placeholder={isZh ? '例如: https://api.openai.com' : 'e.g.: https://api.openai.com'}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${settings.theme === 'light'
                        ? 'bg-white border-gray-300 text-gray-900'
                        : 'bg-gray-900 border-gray-600 text-gray-100'
                        }`}
                    />
                  </div>
                </div>
              </div>

              {/* General Settings */}
              <div className={`border rounded-lg p-6 ${settings.theme === 'light'
                ? 'border-gray-300 bg-white'
                : 'border-gray-600 bg-gray-800/50'
                }`}>
                <div className="flex items-center gap-2 mb-4">
                  <Palette className="w-5 h-5 text-purple-400" />
                  <h2 className={`text-xl font-semibold ${settings.theme === 'light' ? 'text-gray-900' : 'text-white'
                    }`}>
                    {isZh ? '通用设置' : 'General Settings'}
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Language */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${settings.theme === 'light' ? 'text-gray-700' : 'text-gray-200'
                      }`}>
                      {isZh ? '界面语言' : 'Interface Language'}
                    </label>
                    <select
                      value={localSettings.language}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateLanguage(e.target.value as Language)}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${settings.theme === 'light'
                        ? 'bg-white border-gray-300 text-gray-900'
                        : 'bg-gray-900 border-gray-600 text-gray-100'
                        }`}
                    >
                      <option value={Language.Chinese}>简体中文</option>
                      <option value={Language.English}>English</option>
                    </select>
                  </div>

                  {/* Theme */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${settings.theme === 'light' ? 'text-gray-700' : 'text-gray-200'
                      }`}>
                      {isZh ? '主题' : 'Theme'}
                    </label>
                    <div className="flex gap-3">
                      <button
                        onClick={() => updateTheme('light')}
                        className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${localSettings.theme === 'light'
                          ? 'border-blue-500 bg-blue-600/20 text-blue-400'
                          : 'border-gray-600 hover:border-gray-500 text-gray-300'
                          }`}
                      >
                        {isZh ? '浅色' : 'Light'}
                      </button>
                      <button
                        onClick={() => updateTheme('dark')}
                        className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${localSettings.theme === 'dark'
                          ? 'border-blue-500 bg-blue-600/20 text-blue-400'
                          : 'border-gray-600 hover:border-gray-500 text-gray-300'
                          }`}
                      >
                        {isZh ? '深色' : 'Dark'}
                      </button>
                      <button
                        onClick={() => updateTheme('system')}
                        className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${localSettings.theme === 'system'
                          ? 'border-blue-500 bg-blue-600/20 text-blue-400'
                          : 'border-gray-600 hover:border-gray-500 text-gray-300'
                          }`}
                      >
                        {isZh ? '跟随系统' : 'System'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Models Tab */}
          {activeTab === 'models' && (
            <div className="space-y-8">
              <ModelManager
                settings={localSettings}
                onSettingsChange={setLocalSettings}
              />

              {/* Function to Model Assignment */}
              <div className={`border rounded-lg p-6 ${settings.theme === 'light'
                ? 'border-gray-300 bg-white'
                : 'border-gray-600 bg-gray-700/50'
                }`}>
                <div className="flex items-center gap-2 mb-4">
                  <Brain className="w-5 h-5 text-purple-400" />
                  <h2 className={`text-xl font-semibold ${settings.theme === 'light' ? 'text-gray-900' : 'text-white'
                    }`}>
                    {isZh ? '功能模型分配' : 'Function Model Assignment'}
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(featureNames).map(([feature, names]) => {
                    const allModels = getAllModels(localSettings.api.customModels);
                    return (
                      <div key={feature} className={`flex items-center justify-between p-3 rounded-lg border ${settings.theme === 'light'
                        ? 'bg-gray-50 border-gray-300'
                        : 'bg-gray-900 border-gray-600'
                        }`}>
                        <span className={`text-sm font-medium ${settings.theme === 'light' ? 'text-gray-700' : 'text-gray-200'
                          }`}>
                          {isZh ? names.zh : names.en}
                        </span>
                        <select
                          value={localSettings.api.models[feature as FeatureType]}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateModel(feature as FeatureType, e.target.value)}
                          className={`px-3 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 ${settings.theme === 'light'
                            ? 'bg-white border-gray-300 text-gray-900'
                            : 'bg-gray-800 border-gray-600 text-gray-100'
                            }`}
                        >
                          {allModels.map((model) => (
                            <option key={model.id} value={model.id}>
                              {model.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Environment Configuration Tab */}
          {activeTab === 'env' && (
            <div className="space-y-8">
              {/* Export Configuration */}
              <div className={`border rounded-lg p-6 ${settings.theme === 'light'
                ? 'border-gray-300 bg-white'
                : 'border-gray-600 bg-gray-700/50'
                }`}>
                <div className="flex items-center gap-2 mb-4">
                  <Download className="w-5 h-5 text-green-400" />
                  <h2 className={`text-xl font-semibold ${settings.theme === 'light' ? 'text-gray-900' : 'text-white'
                    }`}>
                    {isZh ? '导出环境配置' : 'Export Environment Configuration'}
                  </h2>
                </div>

                <p className={`mb-6 ${settings.theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                  }`}>
                  {isZh
                    ? '将当前的API配置导出为 .env.local 文件格式。这样可以将敏感信息安全地存储在项目根目录中，不会被提交到版本控制系统。'
                    : 'Export the current API configuration as .env.local file format. This securely stores sensitive information in the project root directory, preventing it from being committed to version control.'
                  }
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={handleExportEnv}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    {isZh ? '下载 .env.local' : 'Download .env.local'}
                  </button>
                  <button
                    onClick={handleCopyEnv}
                    className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition-colors ${copySuccess
                      ? 'bg-green-600 text-white'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                  >
                    {copySuccess ? (
                      <>
                        <Check className="w-4 h-4" />
                        {isZh ? '已复制' : 'Copied'}
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        {isZh ? '复制到剪贴板' : 'Copy to Clipboard'}
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Import Configuration */}
              <div className={`border rounded-lg p-6 ${settings.theme === 'light'
                ? 'border-gray-300 bg-white'
                : 'border-gray-600 bg-gray-700/50'
                }`}>
                <div className="flex items-center gap-2 mb-4">
                  <Upload className="w-5 h-5 text-yellow-400" />
                  <h2 className={`text-xl font-semibold ${settings.theme === 'light' ? 'text-gray-900' : 'text-white'
                    }`}>
                    {isZh ? '导入环境配置' : 'Import Environment Configuration'}
                  </h2>
                </div>

                <p className={`mb-6 ${settings.theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                  }`}>
                  {isZh
                    ? '从现有的 .env.local 文件中导入配置。请注意，出于安全考虑，导入的配置需要手动确认后才会应用。'
                    : 'Import configuration from existing .env.local file. Note that for security reasons, imported configurations require manual confirmation before being applied.'
                  }
                </p>

                <div className="space-y-4">
                  <input
                    type="file"
                    accept=".env,.env.local,.txt"
                    onChange={handleImportEnv}
                    className="hidden"
                    id="env-file-input"
                  />
                  <label
                    htmlFor="env-file-input"
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    {isZh ? '选择 .env.local 文件' : 'Select .env.local File'}
                  </label>
                </div>
              </div>

              {/* Instructions */}
              <div className={`border rounded-lg p-6 ${settings.theme === 'light'
                ? 'border-gray-300 bg-white'
                : 'border-gray-600 bg-gray-700/50'
                }`}>
                <div className="flex items-center gap-2 mb-4">
                  <Key className="w-5 h-5 text-blue-400" />
                  <h2 className={`text-xl font-semibold ${settings.theme === 'light' ? 'text-gray-900' : 'text-white'
                    }`}>
                    {isZh ? '使用说明' : 'Usage Instructions'}
                  </h2>
                </div>

                <div className={`space-y-4 ${settings.theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                  }`}>
                  <div>
                    <h3 className={`font-semibold mb-2 ${settings.theme === 'light' ? 'text-gray-900' : 'text-white'
                      }`}>
                      {isZh ? '1. 环境变量格式' : '1. Environment Variable Format'}
                    </h3>
                    <p className="text-sm">
                      {isZh
                        ? '导出的配置会自动转换为环境变量格式，支持 VITE_ 前缀，确保在开发环境中能够正确加载。'
                        : 'Exported configurations are automatically converted to environment variable format with VITE_ prefix, ensuring proper loading in development environment.'
                      }
                    </p>
                  </div>

                  <div>
                    <h3 className={`font-semibold mb-2 ${settings.theme === 'light' ? 'text-gray-900' : 'text-white'
                      }`}>
                      {isZh ? '2. 安全性' : '2. Security'}
                    </h3>
                    <p className="text-sm">
                      {isZh
                        ? '.env.local 文件已自动添加到 .gitignore，不会被提交到版本控制系统，可以安全地存储 API 密钥。'
                        : '.env.local file is automatically added to .gitignore and will not be committed to version control, allowing safe storage of API keys.'
                      }
                    </p>
                  </div>

                  <div>
                    <h3 className={`font-semibold mb-2 ${settings.theme === 'light' ? 'text-gray-900' : 'text-white'
                      }`}>
                      {isZh ? '3. 优先级' : '3. Priority'}
                    </h3>
                    <p className="text-sm">
                      {isZh
                        ? '环境变量的优先级：环境变量 > 应用内设置 > 默认配置。建议将敏感配置存储在环境变量中。'
                        : 'Environment variable priority: Environment Variables > In-App Settings > Default Configuration. It\'s recommended to store sensitive configurations in environment variables.'
                      }
                    </p>
                  </div>

                  <div>
                    <h3 className={`font-semibold mb-2 ${settings.theme === 'light' ? 'text-gray-900' : 'text-white'
                      }`}>
                      {isZh ? '4. 重启应用' : '4. Restart Application'}
                    </h3>
                    <p className="text-sm">
                      {isZh
                        ? '修改 .env.local 文件后，需要重启开发服务器才能使新的环境变量生效。'
                        : 'After modifying .env.local file, you need to restart the development server for new environment variables to take effect.'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`border-t p-6 flex justify-between ${settings.theme === 'light'
          ? 'border-gray-300 bg-gray-50'
          : 'border-gray-700 bg-gray-900/50'
          }`}>
          <button
            onClick={handleReset}
            className={`flex items-center gap-2 px-4 py-2 transition-colors ${settings.theme === 'light'
              ? 'text-gray-600 hover:text-gray-900'
              : 'text-gray-400 hover:text-gray-200'
              }`}
          >
            <RotateCcw className="w-4 h-4" />
            {isZh ? '重置为默认' : 'Reset to Default'}
          </button>
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className={`px-6 py-2 border rounded-lg transition-colors ${settings.theme === 'light'
                ? 'border-gray-300 text-gray-700 hover:bg-gray-100'
                : 'border-gray-600 text-gray-300 hover:bg-gray-700'
                }`}
            >
              {isZh ? '取消' : 'Cancel'}
            </button>
            <button
              onClick={handleSave}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg transition-all ${hasUnsavedChanges
                ? 'bg-green-600 hover:bg-green-700 animate-pulse'
                : 'bg-blue-600 hover:bg-blue-700'
                } text-white`}
            >
              <Save className="w-4 h-4" />
              {isZh ? '保存设置' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div >
  );
}