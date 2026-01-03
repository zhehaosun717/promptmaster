import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Save, X, Globe, Key, Database } from 'lucide-react';
import { CustomModel, ApiProvider, PREDEFINED_MODELS, getAllModels } from '../types';
import { AppSettings } from '../types';
import Modal from './common/Modal';

interface ModelManagerProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

interface EditingModel extends CustomModel {
  isNew?: boolean;
}

export default function ModelManager({ settings, onSettingsChange }: ModelManagerProps) {
  const [editingModel, setEditingModel] = useState<EditingModel | null>(null);
  const [isAddingModel, setIsAddingModel] = useState(false);

  const allModels = getAllModels(settings.api.customModels);
  const isZh = settings.language === 'zh';

  const addNewModel = () => {
    const newModel: EditingModel = {
      id: `custom-${Date.now()}`,
      name: '',
      provider: ApiProvider.Custom,
      modelName: '',
      description: '',
      isNew: true
    };
    setEditingModel(newModel);
    setIsAddingModel(true);
  };

  const editModel = (model: CustomModel) => {
    setEditingModel({ ...model });
    setIsAddingModel(false);
  };

  const saveModel = () => {
    if (!editingModel) return;

    if (!editingModel.name.trim() || !editingModel.modelName.trim()) {
      alert(isZh ? '请填写模型名称和模型标识' : 'Please fill in model name and model identifier');
      return;
    }

    const updatedSettings = { ...settings };
    const customModels = [...settings.api.customModels];

    if (editingModel.isNew) {
      customModels.push({ ...editingModel });
    } else {
      const index = customModels.findIndex(m => m.id === editingModel.id);
      if (index >= 0) {
        customModels[index] = { ...editingModel };
      }
    }

    updatedSettings.api.customModels = customModels;
    onSettingsChange(updatedSettings);
    setEditingModel(null);
    setIsAddingModel(false);
  };

  const deleteModel = (modelId: string) => {
    console.log('deleteModel called with modelId:', modelId);
    console.log('Current custom models:', settings.api.customModels);

    if (!confirm(isZh ? '确定要删除这个模型吗？' : 'Are you sure you want to delete this model?')) {
      console.log('Delete cancelled by user');
      return;
    }

    console.log('Delete confirmed, proceeding...');
    const updatedSettings = { ...settings };
    updatedSettings.api.customModels = settings.api.customModels.filter(m => m.id !== modelId);

    // 检查是否有功能正在使用这个模型，如果有，切换到默认模型
    Object.keys(updatedSettings.api.models).forEach(feature => {
      if (updatedSettings.api.models[feature as keyof typeof updatedSettings.api.models] === modelId) {
        updatedSettings.api.models[feature as keyof typeof updatedSettings.api.models] = 'gemini-flash';
      }
    });

    console.log('Calling onSettingsChange with updated settings:', updatedSettings);
    onSettingsChange(updatedSettings);
    console.log('Delete complete');
  };

  const cancelEdit = () => {
    setEditingModel(null);
    setIsAddingModel(false);
  };

  const getProviderIcon = (provider: ApiProvider) => {
    switch (provider) {
      case ApiProvider.GoogleGemini:
        return '🔷';
      case ApiProvider.OpenAI:
        return '🤖';
      case ApiProvider.Anthropic:
        return '🧠';
      case ApiProvider.Custom:
        return '⚙️';
      default:
        return '🔌';
    }
  };

  const getProviderDisplayName = (provider: ApiProvider) => {
    switch (provider) {
      case ApiProvider.GoogleGemini:
        return isZh ? 'Google Gemini' : 'Google Gemini';
      case ApiProvider.OpenAI:
        return 'OpenAI';
      case ApiProvider.Anthropic:
        return isZh ? 'Anthropic Claude' : 'Anthropic Claude';
      case ApiProvider.Custom:
        return isZh ? '自定义' : 'Custom';
      default:
        return provider;
    }
  };

  return (
    <div className="space-y-6">
      {/* 模型列表 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className={`font-medium ${settings.theme === 'light' ? 'text-gray-900' : 'text-white'
            }`}>
            {isZh ? '模型列表' : 'Model List'}
          </h3>
          <button
            onClick={addNewModel}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {isZh ? '添加自定义模型' : 'Add Custom Model'}
          </button>
        </div>

        <div className="grid gap-3">
          {/* 预定义模型 */}
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            {isZh ? '预定义模型' : 'Predefined Models'}
          </div>
          {PREDEFINED_MODELS.map((model) => (
            <div key={model.id} className={`flex items-center justify-between p-3 rounded-lg border ${settings.theme === 'light'
              ? 'bg-gray-50 border-gray-300'
              : 'bg-gray-800/50 border-gray-600'
              }`}>
              <div className="flex items-center gap-3">
                <span className="text-lg">{getProviderIcon(model.provider)}</span>
                <div>
                  <div className={`font-medium ${settings.theme === 'light' ? 'text-gray-900' : 'text-gray-200'
                    }`}>{model.name}</div>
                  <div className="text-xs text-gray-400">{model.description}</div>
                </div>
              </div>
              <div className={`text-xs px-2 py-1 rounded ${settings.theme === 'light'
                ? 'bg-gray-200 text-gray-700'
                : 'bg-gray-700 text-gray-300'
                }`}>
                {model.provider === ApiProvider.GoogleGemini ? 'Google Gemini' : model.provider}
              </div>
            </div>
          ))}

          {/* 自定义模型 */}
          {settings.api.customModels.length > 0 && (
            <>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 mt-4">
                {isZh ? '自定义模型' : 'Custom Models'}
              </div>
              {settings.api.customModels.map((model) => (
                <div key={model.id} className={`flex items-center justify-between p-3 rounded-lg border ${settings.theme === 'light'
                  ? 'bg-gray-50 border-gray-300'
                  : 'bg-gray-800/50 border-gray-600'
                  }`}>
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{getProviderIcon(model.provider)}</span>
                    <div>
                      <div className={`font-medium ${settings.theme === 'light' ? 'text-gray-900' : 'text-gray-200'
                        }`}>{model.name}</div>
                      <div className="text-xs text-gray-400">{model.description || model.modelName}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`text-xs px-2 py-1 rounded ${settings.theme === 'light'
                      ? 'bg-gray-200 text-gray-700'
                      : 'bg-gray-700 text-gray-300'
                      }`}>
                      {getProviderDisplayName(model.provider)}
                    </div>
                    <button
                      onClick={() => editModel(model)}
                      className="p-1.5 text-gray-400 hover:text-blue-400 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteModel(model.id)}
                      className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* 编辑模型表单 */}
      <Modal
        isOpen={!!editingModel}
        onClose={cancelEdit}
        title={isAddingModel ? (isZh ? '添加自定义模型' : 'Add Custom Model') : (isZh ? '编辑模型' : 'Edit Model')}
        theme={settings.theme}
        maxWidth="2xl"
        headerGradient={true}
        footer={
          <>
            <button
              onClick={cancelEdit}
              className="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors text-gray-300"
            >
              {isZh ? '取消' : 'Cancel'}
            </button>
            <button
              onClick={saveModel}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              {isAddingModel ? (isZh ? '添加模型' : 'Add Model') : (isZh ? '保存更改' : 'Save Changes')}
            </button>
          </>
        }
      >
        {editingModel && (
          <div className="space-y-4">
            {/* 基本信息 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${settings.theme === 'light' ? 'text-gray-700' : 'text-gray-200'
                  }`}>
                  {isZh ? '模型名称' : 'Model Name'}
                </label>
                <input
                  type="text"
                  value={editingModel.name}
                  onChange={(e) => setEditingModel({ ...editingModel, name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${settings.theme === 'light'
                    ? 'bg-white border-gray-300 text-gray-900'
                    : 'bg-gray-900 border-gray-600 text-gray-100'
                    }`}
                  placeholder={isZh ? '例如: GPT-4 Turbo' : 'e.g.: GPT-4 Turbo'}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${settings.theme === 'light' ? 'text-gray-700' : 'text-gray-200'
                  }`}>
                  {isZh ? '模型标识' : 'Model Identifier'}
                </label>
                <input
                  type="text"
                  value={editingModel.modelName}
                  onChange={(e) => setEditingModel({ ...editingModel, modelName: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${settings.theme === 'light'
                    ? 'bg-white border-gray-300 text-gray-900'
                    : 'bg-gray-900 border-gray-600 text-gray-100'
                    }`}
                  placeholder={isZh ? '例如: gpt-4-turbo' : 'e.g.: gpt-4-turbo'}
                />
              </div>
            </div>

            {/* 提供商选择 */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${settings.theme === 'light' ? 'text-gray-700' : 'text-gray-200'
                }`}>
                {isZh ? 'API 提供商' : 'API Provider'}
              </label>
              <select
                value={editingModel.provider}
                onChange={(e) => setEditingModel({ ...editingModel, provider: e.target.value as ApiProvider })}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${settings.theme === 'light'
                  ? 'bg-white border-gray-300 text-gray-900'
                  : 'bg-gray-900 border-gray-600 text-gray-100'
                  }`}
              >
                <option value={ApiProvider.OpenAI}>OpenAI</option>
                <option value={ApiProvider.Anthropic}>Anthropic Claude</option>
                <option value={ApiProvider.Custom}>{isZh ? '自定义API' : 'Custom API'}</option>
              </select>
            </div>

            {/* API配置 */}
            <div className="space-y-3">
              <div>
                <label className={`block text-sm font-medium mb-2 ${settings.theme === 'light' ? 'text-gray-700' : 'text-gray-200'
                  }`}>
                  <Key className="inline w-4 h-4 mr-1" />
                  {isZh ? 'API Key' : 'API Key'}
                </label>
                <input
                  type="password"
                  value={editingModel.apiKey || ''}
                  onChange={(e) => setEditingModel({ ...editingModel, apiKey: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${settings.theme === 'light'
                    ? 'bg-white border-gray-300 text-gray-900'
                    : 'bg-gray-900 border-gray-600 text-gray-100'
                    }`}
                  placeholder={isZh ? '可选，留空则使用全局设置' : 'Optional, uses global settings if empty'}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${settings.theme === 'light' ? 'text-gray-700' : 'text-gray-200'
                  }`}>
                  <Globe className="inline w-4 h-4 mr-1" />
                  {isZh ? 'Base URL' : 'Base URL'}
                </label>
                <input
                  type="url"
                  value={editingModel.baseUrl || ''}
                  onChange={(e) => setEditingModel({ ...editingModel, baseUrl: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${settings.theme === 'light'
                    ? 'bg-white border-gray-300 text-gray-900'
                    : 'bg-gray-900 border-gray-600 text-gray-100'
                    }`}
                  placeholder={isZh ? '可选，例如: https://api.openai.com' : 'Optional, e.g.: https://api.openai.com'}
                />
              </div>
            </div>

            {/* 描述和设置 */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${settings.theme === 'light' ? 'text-gray-700' : 'text-gray-200'
                }`}>
                {isZh ? '描述' : 'Description'}
              </label>
              <input
                type="text"
                value={editingModel.description || ''}
                onChange={(e) => setEditingModel({ ...editingModel, description: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${settings.theme === 'light'
                  ? 'bg-white border-gray-300 text-gray-900'
                  : 'bg-gray-900 border-gray-600 text-gray-100'
                  }`}
                placeholder={isZh ? '简短描述这个模型的用途' : 'Brief description of this model\'s purpose'}
              />
            </div>

            {/* 高级设置 */}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${settings.theme === 'light' ? 'text-gray-700' : 'text-gray-200'
                  }`}>
                  {isZh ? '最大Token数' : 'Max Tokens'}
                </label>
                <input
                  type="number"
                  value={editingModel.maxTokens || ''}
                  onChange={(e) => setEditingModel({ ...editingModel, maxTokens: parseInt(e.target.value) || undefined })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${settings.theme === 'light'
                    ? 'bg-white border-gray-300 text-gray-900'
                    : 'bg-gray-900 border-gray-600 text-gray-100'
                    }`}
                  placeholder="4096"
                />
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}