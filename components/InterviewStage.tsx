import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User as UserIcon, Loader2, Sparkles, Plus, Edit3, RefreshCw } from 'lucide-react';
import { ChatMessage, Sender, Language, AppSettings } from '../types';
import { sendInterviewMessage, startInterviewSession, generateFinalDraft } from '../services/geminiService';
import { MessageSkeleton, TypingIndicator } from './common/Skeleton';

interface InterviewStageProps {
  language: Language;
  settings: AppSettings;
  onComplete: (generatedPrompt: string, contextSummary: string) => void;
}

const InterviewStage: React.FC<InterviewStageProps> = ({ language, settings, onComplete }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const currentLanguage = useRef(language);

  // Re-start session if language changes
  useEffect(() => {
    startInterviewSession(language);
    setMessages([]);
    initiateInterview();
    currentLanguage.current = language;
  }, [language]);

  const initiateInterview = async () => {
    setIsLoading(true);
    try {
      const startMsg = language === Language.Chinese
        ? "开始面试。问我第一个关于我想创建的内容的问题。"
        : "Start the interview. Ask me the first question about what I want to create.";

      const response = await sendInterviewMessage(startMsg, language);
      const aiMsg: ChatMessage = {
        id: Date.now().toString(),
        sender: Sender.AI,
        text: response.question,
        options: response.options,
        timestamp: Date.now()
      };
      setMessages([aiMsg]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getFullContext = () => {
    // Return full conversation history so the Reconstructor knows the QUESTIONS associated with the answers
    return messages
      .map(m => `[${m.sender === Sender.AI ? 'AI Consultant' : 'User'}]: ${m.text}`)
      .join("\n\n");
  };

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;

    // Strip markdown for the input value sent to API, but keep it for display if needed (though user input is usually plain)
    const cleanText = text.replace(/\*\*/g, '');

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: Sender.User,
      text: cleanText,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await sendInterviewMessage(cleanText, language);

      if (response.isFinalDraft && response.generatedPrompt) {
        const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: Sender.AI,
          text: language === Language.Chinese ? "我已根据我们的对话起草了提示词。正在进入编辑器..." : "I've drafted your prompt based on our conversation. Moving to the editor...",
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, aiMsg]);

        setTimeout(() => {
          // Use the new getFullContext helper
          onComplete(response.generatedPrompt!, getFullContext());
        }, 1500);
        return;
      }

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: Sender.AI,
        text: response.question,
        options: response.options,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, aiMsg]);

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender: Sender.System,
        text: language === Language.Chinese ? "与 AI 通信出错。" : "Error communicating with AI.",
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReroll = () => {
    const text = language === Language.Chinese
      ? "我不喜欢这些选项，请提供另外三个不同的选项。"
      : "I don't like these options. Please provide 3 different ones.";
    handleSend(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const draft = await generateFinalDraft(language);
      onComplete(draft, getFullContext());
    } catch (error) {
      console.error("Failed to generate draft", error);
      setIsGenerating(false);
    }
  };

  const focusInput = () => {
    inputRef.current?.focus();
  };

  // Simple Markdown renderer for Bold text
  const renderText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="text-white font-bold">{part.slice(2, -2)}</strong>;
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className={`flex flex-col h-[calc(100vh-140px)] rounded-2xl overflow-hidden border shadow-2xl ${settings.theme === 'light'
      ? 'bg-white border-gray-300'
      : 'bg-gray-900 border-gray-800'
      }`}>
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6">
        {messages.map((msg, index) => {
          const isLatestAi = index === messages.length - 1 && msg.sender === Sender.AI;

          return (
            <div key={msg.id} className="space-y-4">
              <div className={`flex items-start gap-4 ${msg.sender === Sender.User ? 'flex-row-reverse' : ''}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${msg.sender === Sender.AI ? 'bg-indigo-600' : 'bg-gray-700'
                  }`}>
                  {msg.sender === Sender.AI ? <Bot size={20} /> : <UserIcon size={20} />}
                </div>
                <div className={`max-w-[80%] rounded-2xl px-5 py-3.5 leading-relaxed text-sm shadow-sm ${msg.sender === Sender.AI
                  ? (settings.theme === 'light' ? 'bg-gray-100 border border-gray-300 text-gray-900' : 'bg-gray-800 border border-gray-700 text-gray-100')
                  : 'bg-blue-600 text-white'
                  }`}>
                  {renderText(msg.text)}
                </div>
              </div>

              {msg.sender === Sender.AI && msg.options && msg.options.length > 0 && (
                <div className={`ml-14 max-w-[80%] space-y-2 ${!isLatestAi ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                  <div className="flex items-center justify-end px-1">
                    <button
                      onClick={handleReroll}
                      disabled={isLoading || !isLatestAi}
                      className="flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50 hover:bg-gray-800/50 px-2 py-1 rounded-md"
                    >
                      <RefreshCw size={12} />
                      {language === Language.Chinese ? '换一批' : 'Reroll'}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {msg.options.map((option, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(option.replace(/\*\*/g, ''))} // Send clean text
                        disabled={isLoading || !isLatestAi}
                        className={`text-left px-4 py-4 md:py-3 border rounded-xl text-sm transition-all duration-200 flex items-center gap-2 group min-h-[48px] touch-target ${settings.theme === 'light'
                          ? 'bg-gray-50 hover:bg-gray-100 border-gray-300 hover:border-blue-500/50 text-gray-700 hover:text-gray-900'
                          : 'bg-gray-800/50 hover:bg-gray-750 border-gray-700 hover:border-blue-500/50 text-gray-300 hover:text-white'
                          }`}
                      >
                        <span className="w-6 h-6 rounded-full bg-gray-700 text-xs flex items-center justify-center text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span>{renderText(option)}</span>
                      </button>
                    ))}
                    <button
                      onClick={focusInput}
                      disabled={isLoading || !isLatestAi}
                      className={`text-left px-4 py-4 md:py-3 border rounded-xl text-sm transition-all duration-200 flex items-center gap-2 group border-dashed min-h-[48px] touch-target ${settings.theme === 'light'
                        ? 'bg-gray-50 hover:bg-gray-100 border-gray-300 hover:border-emerald-500/50 text-gray-700 hover:text-gray-900'
                        : 'bg-gray-800/50 hover:bg-gray-750 border-gray-700 hover:border-emerald-500/50 text-gray-300 hover:text-white'
                        }`}
                    >
                      <span className="w-6 h-6 rounded-full bg-gray-700 text-xs flex items-center justify-center text-gray-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
                        <Edit3 size={12} />
                      </span>
                      {language === Language.Chinese ? '自定义 / 其他...' : 'Custom / Other...'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-start gap-4 animate-fade-in-up">
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
              <Bot size={20} className="text-white" />
            </div>
            <div className={`max-w-[80%] rounded-2xl px-5 py-3.5 shadow-sm ${settings.theme === 'light' ? 'bg-gray-100 border border-gray-300' : 'bg-gray-800 border border-gray-700'}`}>
              <TypingIndicator theme={settings.theme} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className={`p-4 border-t ${settings.theme === 'light'
        ? 'bg-gray-50 border-gray-300'
        : 'bg-gray-950 border-gray-800'
        }`}>
        <div className="max-w-4xl mx-auto flex flex-col gap-3">
          {messages.length > 1 && (
            <button
              onClick={handleGenerate}
              disabled={isGenerating || isLoading}
              className="self-center bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white px-6 py-3 md:py-2 rounded-full text-sm font-semibold flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/20 mb-2 disabled:opacity-50 disabled:cursor-not-allowed touch-target"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {isGenerating
                ? (language === Language.Chinese ? '正在生成...' : 'Generating...')
                : (language === Language.Chinese ? '完成并创建提示词' : 'Finish & Create Prompt')}
            </button>
          )}

          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={language === Language.Chinese ? "在此输入自定义回答..." : "Type your own answer here..."}
              className={`w-full border rounded-xl pl-4 pr-12 py-3 md:py-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-inner ${settings.theme === 'light'
                ? 'bg-white text-gray-900 placeholder-gray-400 border-gray-300'
                : 'bg-gray-900 text-white placeholder-gray-500 border-gray-700'
                }`}
              disabled={isLoading || isGenerating}
            />
            <button
              onClick={() => handleSend(input)}
              disabled={!input.trim() || isLoading || isGenerating}
              className="absolute right-2 top-2 p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div >
  );
};

export default InterviewStage;