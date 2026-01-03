import React, { useState, useEffect, lazy, Suspense } from 'react';
import { AppStage, Language, AppSettings, DEFAULT_APP_SETTINGS, PromptTemplate } from './types';
import InterviewStage from './components/InterviewStage';
import EditorStage from './components/EditorStage';
import { reverseEngineerContext, updateApiSettings } from './services/geminiService';
import { mergeWithEnvSettings, hasValidEnvConfig } from './utils/envLoader';
import { MessageSquare, Edit, Sparkles, ArrowRight, Wand2, Loader2, ArrowLeft, Settings, BookOpen } from 'lucide-react';
import { useToast } from './contexts/ToastContext';
import { useTheme } from './hooks/useTheme';

// Lazy load modal components for code splitting
const SettingsComponent = lazy(() => import('./components/Settings'));
const TemplatePicker = lazy(() => import('./components/TemplatePicker'));

const App: React.FC = () => {
  const [stage, setStage] = useState<AppStage>(AppStage.Home);
  const [language, setLanguage] = useState<Language>(Language.Chinese);
  const [initialPrompt, setInitialPrompt] = useState<string>('');
  const [context, setContext] = useState<string>('');

  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);

  // Resolve effective theme (light/dark) from settings (light/dark/system)
  const effectiveTheme = useTheme(settings);

  // Create a settings object with the resolved theme for child components that expect 'light' | 'dark'
  const effectiveSettings: AppSettings = {
    ...settings,
    theme: effectiveTheme
  };

  // State for Direct Editor Flow
  const [tempPrompt, setTempPrompt] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Template Picker State
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);

  // Load settings from localStorage on mount and merge with environment variables
  useEffect(() => {
    try {
      let userSettings = DEFAULT_APP_SETTINGS;

      // Load settings from localStorage first
      const savedSettings = localStorage.getItem('promptmaster-settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        userSettings = {
          ...DEFAULT_APP_SETTINGS,
          ...parsed,
          api: {
            ...DEFAULT_APP_SETTINGS.api,
            geminiApiKey: parsed.api?.geminiApiKey || parsed.api?.apiKey || '',
            defaultBaseUrl: parsed.api?.defaultBaseUrl || '',
            defaultApiKey: parsed.api?.defaultApiKey || '',
            models: {
              ...DEFAULT_APP_SETTINGS.api.models,
              ...parsed.api?.models
            },
            customModels: parsed.api?.customModels || []
          }
        };
      }

      // Merge with environment variables (env vars have higher priority)
      const finalSettings = mergeWithEnvSettings(userSettings);

      setSettings(finalSettings);
      setLanguage(finalSettings.language);
      updateApiSettings(finalSettings);

      // Log if environment config is detected
      if (hasValidEnvConfig()) {
        console.log('✅ Environment variables configuration loaded');
      }
    } catch (error) {
      console.warn('Failed to load settings:', error);
      // Fallback to default settings
      const fallbackSettings = mergeWithEnvSettings(DEFAULT_APP_SETTINGS);
      setSettings(fallbackSettings);
      setLanguage(fallbackSettings.language);
      updateApiSettings(fallbackSettings);
    }
  }, []);

  const handleSettingsChange = (newSettings: AppSettings) => {
    setSettings(newSettings);
    setLanguage(newSettings.language);
    updateApiSettings(newSettings);
  };

  const handleInterviewComplete = (generatedPrompt: string, contextSummary: string) => {
    setInitialPrompt(generatedPrompt);
    setContext(contextSummary);
    setStage(AppStage.Editor);
  };

  const handleDirectStart = async () => {
    if (!tempPrompt.trim()) return;
    setIsAnalyzing(true);
    try {
      // Reverse engineer the context so the editor tools work correctly
      const inferredContext = await reverseEngineerContext(tempPrompt, language);
      setInitialPrompt(tempPrompt);
      setContext(inferredContext);
      setStage(AppStage.Editor);
    } catch (e) {
      console.error(e);
      // Fallback
      setInitialPrompt(tempPrompt);
      setContext("User provided prompt directly.");
      setStage(AppStage.Editor);
    } finally {
      setIsAnalyzing(false);
      setIsImporting(false);
    }
  };

  // Handle template selection
  const handleTemplateSelect = async (template: PromptTemplate) => {
    setInitialPrompt(template.prompt);
    setContext(template.context || `Template: ${template.name}`);
    setStage(AppStage.Editor);
  };

  interface StepProps {
    stepStage: AppStage;
    currentStage: AppStage;
    number: string;
    label: string;
    icon: React.ElementType;
  }

  // Helper to render step
  const Step = ({ stepStage, currentStage, number, label, icon: Icon }: StepProps) => {
    const isActive = currentStage === stepStage;
    const isCompleted = currentStage === AppStage.Editor && stepStage === AppStage.Interview;

    return (
      <div className={`flex items-center gap-2 ${isActive ? 'opacity-100' : 'opacity-50'} transition-opacity duration-300`}>
        <div className={`
            w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all
            ${isActive || isCompleted
            ? 'bg-blue-600 border-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]'
            : 'bg-transparent border-gray-600 text-gray-400'}
         `}>
          {isCompleted ? <CheckIcon /> : number}
        </div>
        <div className="hidden md:block">
          <div className={`text-xs font-bold ${isActive || isCompleted
            ? (effectiveSettings.theme === 'light' ? 'text-gray-900' : 'text-white')
            : 'text-gray-400'
            }`}>
            {label}
          </div>
        </div>
      </div>
    );
  };

  const CheckIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
    </svg>
  );

  const t = {
    title: 'PromptMaster',
    homeTitle: language === Language.Chinese ? '您想如何开始？' : 'How would you like to start?',
    newProject: language === Language.Chinese ? '创建新提示词' : 'Create New Prompt',
    newDesc: language === Language.Chinese ? '通过 AI 访谈引导，从零开始打造高质量提示词。' : 'Build a power prompt from scratch with AI interview guidance.',
    existingProject: language === Language.Chinese ? '优化现有提示词' : 'Optimize Existing',
    existingDesc: language === Language.Chinese ? '粘贴已有提示词，使用智能编辑器进行完善。' : 'Paste your prompt and refine it with the smart editor.',
    pasteLabel: language === Language.Chinese ? '在此粘贴您的提示词...' : 'Paste your prompt here...',
    cancel: language === Language.Chinese ? '取消' : 'Cancel',
    analyzeAndStart: language === Language.Chinese ? '分析并开始' : 'Analyze & Start',
    analyzing: language === Language.Chinese ? '正在逆向分析上下文...' : 'Reverse engineering context...',
    interview: language === Language.Chinese ? '需求访谈' : 'Interview',
    editor: language === Language.Chinese ? '智能编辑器' : 'Smart Editor',
    settings: language === Language.Chinese ? '设置' : 'Settings',
  };

  return (
    <div className={`min-h-screen font-sans selection:bg-blue-500 selection:text-white relative ${effectiveSettings.theme === 'light'
      ? 'bg-white text-gray-900'
      : 'bg-gray-900 text-gray-100'
      }`}>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsComponent
          settings={settings}
          onSettingsChange={handleSettingsChange}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {/* Skip Navigation Link for Keyboard Users */}
      <a href="#main-content" className="skip-link">
        {language === Language.Chinese ? '跳转到主内容' : 'Skip to main content'}
      </a>

      <header
        className={`border-b sticky top-0 z-10 ${effectiveSettings.theme === 'light'
          ? 'bg-white/90 border-gray-200 backdrop-blur-sm'
          : 'bg-gray-950/50 border-gray-800 backdrop-blur-sm'
          }`}
        role="banner"
      >
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            onClick={() => setStage(AppStage.Home)}
            aria-label={language === Language.Chinese ? '返回首页' : 'Go to home'}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-900/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className={`text-xl font-bold tracking-tight ${effectiveSettings.theme === 'light'
              ? 'text-gray-900'
              : 'bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400'
              }`}>
              {t.title}
            </h1>
          </button>

          {/* Progress Bar - Hide on Home */}
          {stage !== AppStage.Home && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-4">
              <Step
                stepStage={AppStage.Interview}
                currentStage={stage}
                number="1"
                label={t.interview}
                icon={MessageSquare}
              />
              <div className={`w-12 h-0.5 rounded-full transition-colors duration-300 ${stage === AppStage.Editor ? 'bg-blue-600' : (effectiveSettings.theme === 'light' ? 'bg-gray-300' : 'bg-gray-700')
                }`} />
              <Step
                stepStage={AppStage.Editor}
                currentStage={stage}
                number="2"
                label={t.editor}
                icon={Edit}
              />
            </div>
          )}

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className={`p-2 rounded-xl border transition-all group ${effectiveSettings.theme === 'light'
                ? 'bg-gray-100 border-gray-300 hover:bg-gray-200 hover:border-gray-400 text-gray-600 hover:text-blue-600'
                : 'bg-gray-800/50 border-gray-700 hover:bg-gray-750 hover:border-gray-600 text-gray-400 hover:text-blue-400'
                }`}
              aria-label={t.settings}
            >
              <Settings size={20} className="group-hover:rotate-45 transition-transform duration-300" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* API Key Missing Warning Banner */}
        {stage === AppStage.Home && !settings.api.geminiApiKey && !isImporting && (
          <div className={`max-w-4xl mx-auto mb-8 p-4 rounded-2xl border flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 ${effectiveSettings.theme === 'light'
              ? 'bg-amber-50 border-amber-200 shadow-sm'
              : 'bg-amber-900/10 border-amber-500/30'
            }`}>
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${effectiveSettings.theme === 'light'
                  ? 'bg-amber-100 text-amber-600'
                  : 'bg-amber-500/20 text-amber-500'
                }`}>
                <Settings size={20} />
              </div>
              <div>
                <h4 className={`font-bold ${effectiveSettings.theme === 'light' ? 'text-amber-800' : 'text-amber-500'
                  }`}>
                  {language === Language.Chinese ? '需要配置 API Key' : 'API Key Required'}
                </h4>
                <p className={`text-sm ${effectiveSettings.theme === 'light' ? 'text-amber-700' : 'text-amber-200/80'
                  }`}>
                  {language === Language.Chinese
                    ? '请先配置您的 Google Gemini API Key 以使用 AI 功能'
                    : 'Please configure your Google Gemini API Key to use AI features'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm transition-colors shadow-lg shadow-amber-900/20 whitespace-nowrap"
            >
              {language === Language.Chinese ? '去配置' : 'Configure'}
            </button>
          </div>
        )}

        {stage === AppStage.Home && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in slide-in-from-bottom-4 duration-500">
            {isImporting ? (
              <div className={`w-full max-w-2xl rounded-2xl p-8 border shadow-2xl relative overflow-hidden ${effectiveSettings.theme === 'light'
                ? 'bg-white border-gray-300'
                : 'bg-gray-800 border-gray-700'
                }`}>
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                    <p className="text-blue-300 font-medium animate-pulse">{t.analyzing}</p>
                  </div>
                )}
                <div className="flex items-center gap-3 mb-6">
                  <button
                    onClick={() => setIsImporting(false)}
                    className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <h2 className={`text-xl font-bold ${settings.theme === 'light' ? 'text-gray-900' : 'text-white'
                    }`}>{t.existingProject}</h2>
                </div>
                <textarea
                  value={tempPrompt}
                  onChange={(e) => setTempPrompt(e.target.value)}
                  placeholder={t.pasteLabel}
                  className={`w-full h-64 border rounded-xl p-4 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none resize-none font-mono text-sm leading-relaxed mb-6 ${effectiveSettings.theme === 'light'
                    ? 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                    : 'bg-gray-900 border-gray-700 text-gray-200 placeholder-gray-500'
                    }`}
                  autoFocus
                />
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setIsImporting(false)}
                    className="px-5 py-2.5 rounded-xl border border-gray-700 text-gray-300 hover:bg-gray-700 transition-colors font-medium text-sm"
                  >
                    {t.cancel}
                  </button>
                  <button
                    onClick={handleDirectStart}
                    disabled={!tempPrompt.trim() || isAnalyzing}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Wand2 size={16} />
                    {t.analyzeAndStart}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h2 className={`text-3xl font-bold mb-12 text-center ${effectiveSettings.theme === 'light' ? 'text-gray-900' : 'text-white'
                  }`}>{t.homeTitle}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
                  <button
                    onClick={() => setStage(AppStage.Interview)}
                    className={`group relative p-8 rounded-3xl transition-all duration-300 text-left shadow-xl border hover:-translate-y-1 ${effectiveSettings.theme === 'light'
                      ? 'bg-white border-gray-300 hover:bg-gray-50 hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/10'
                      : 'bg-gray-800 hover:bg-gray-800/80 border-gray-700 hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-900/10'
                      }`}
                  >
                    <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                      <MessageSquare size={28} className="text-blue-500" />
                    </div>
                    <h3 className={`text-xl font-bold mb-2 flex items-center gap-2 ${effectiveSettings.theme === 'light' ? 'text-gray-900' : 'text-white'
                      }`}>
                      {t.newProject}
                      <ArrowRight size={18} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-blue-500" />
                    </h3>
                    <p className={`leading-relaxed text-sm ${effectiveSettings.theme === 'light' ? 'text-gray-600' : 'text-gray-400'
                      }`}>
                      {t.newDesc}
                    </p>
                  </button>

                  <button
                    onClick={() => setIsImporting(true)}
                    className={`group relative p-8 rounded-3xl transition-all duration-300 text-left shadow-xl border hover:-translate-y-1 ${effectiveSettings.theme === 'light'
                      ? 'bg-white border-gray-300 hover:bg-gray-50 hover:border-emerald-500/50 hover:shadow-2xl hover:shadow-emerald-500/10'
                      : 'bg-gray-800 hover:bg-gray-800/80 border-gray-700 hover:border-emerald-500/50 hover:shadow-2xl hover:shadow-emerald-900/10'
                      }`}
                  >
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                      <Edit size={28} className="text-emerald-500" />
                    </div>
                    <h3 className={`text-xl font-bold mb-2 flex items-center gap-2 ${effectiveSettings.theme === 'light' ? 'text-gray-900' : 'text-white'
                      }`}>
                      {t.existingProject}
                      <ArrowRight size={18} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-emerald-500" />
                    </h3>
                    <p className={`leading-relaxed text-sm ${effectiveSettings.theme === 'light' ? 'text-gray-600' : 'text-gray-400'
                      }`}>
                      {t.existingDesc}
                    </p>
                  </button>

                  <button
                    onClick={() => setIsTemplatePickerOpen(true)}
                    className={`group relative p-8 rounded-3xl transition-all duration-300 text-left shadow-xl border hover:-translate-y-1 md:col-span-2 ${effectiveSettings.theme === 'light'
                      ? 'bg-white border-gray-300 hover:bg-gray-50 hover:border-purple-500/50 hover:shadow-2xl hover:shadow-purple-500/10'
                      : 'bg-gray-800 hover:bg-gray-800/80 border-gray-700 hover:border-purple-500/50 hover:shadow-2xl hover:shadow-purple-900/10'
                      }`}
                  >
                    <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                      <BookOpen size={28} className="text-purple-500" />
                    </div>
                    <h3 className={`text-xl font-bold mb-2 flex items-center gap-2 ${effectiveSettings.theme === 'light' ? 'text-gray-900' : 'text-white'
                      }`}>
                      {language === Language.Chinese ? '📚 模板库' : '📚 Template Library'}
                      <ArrowRight size={18} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-purple-500" />
                    </h3>
                    <p className={`leading-relaxed text-sm ${effectiveSettings.theme === 'light' ? 'text-gray-600' : 'text-gray-400'
                      }`}>
                      {language === Language.Chinese
                        ? '从预设模板快速开始，包含编程、写作、研究等多个领域'
                        : 'Quick start from templates: coding, writing, research, and more'
                      }
                    </p>
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Template Picker Modal */}
        {isTemplatePickerOpen && (
          <TemplatePicker
            language={language}
            theme={settings.theme}
            onSelect={handleTemplateSelect}
            onClose={() => setIsTemplatePickerOpen(false)}
          />
        )}

        {stage === AppStage.Interview && (
          <InterviewStage language={language} settings={effectiveSettings} onComplete={handleInterviewComplete} />
        )}

        {stage === AppStage.Editor && (
          <EditorStage initialPrompt={initialPrompt} context={context} language={language} settings={effectiveSettings} />
        )}
      </main>
    </div>
  );
};

export default App;