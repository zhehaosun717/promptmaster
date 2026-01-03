import React, { useState, useEffect, useRef } from 'react';
import { Copy, Check, MessageSquareMore, Wand2, AlertCircle, Lock, Unlock, RefreshCw, Loader2, Sparkles, X, CheckCheck, ScanSearch, Zap, RotateCcw, Download, Share2, FileText, ChevronDown } from 'lucide-react';
import { getMentorFeedback, reconstructPrompt, classifyPromptSegment, getDetailedCritique, applySpecificFeedback } from '../services/geminiService';
import { exportAsMarkdown, exportAsJSON, generateShareLink, downloadAsFile, copyToClipboard } from '../services/exportService';
import { Language, Pillar, Suggestion, AppSettings } from '../types';
import { useToast } from '../contexts/ToastContext';

interface EditorStageProps {
  initialPrompt: string;
  context: string;
  language: Language;
  settings: AppSettings;
}

interface SelectionRange {
  text: string;
  start: number;
  end: number;
  top: number;
  left: number;
}

interface LockedSegment {
  id: string;
  text: string;
  pillar: Pillar | 'pending';
}

interface PopupState {
  id: string;
  top: number;
  left: number;
}

import { useEditorState } from '../hooks/useEditorState'; // Import the hook

const EditorStage: React.FC<EditorStageProps> = ({ initialPrompt, context, language, settings }) => {
  // Use the custom hook for all business logic and state
  const {
    state: {
      prompt,
      suggestions,
      activeSuggestionId,
      feedback,
      isTyping,
      isProcessing,
      processingType,
      processingSelection,
      showUndo,
      lockedSegments
    },
    actions: {
      setPrompt, // Available but recommend using updatePrompt for consistency
      updatePrompt,
      setActiveSuggestionId,
      handleDeepScan,
      applySuggestion,
      dismissSuggestion,
      handleApplyFeedback,
      handleDismissFeedback,
      handleUndo,
      handleGlobalReconstruct,
      handlePartialReconstruct,
      addLock,
      removeLock
    }
  } = useEditorState({ initialPrompt, context, language });

  // UI-Specific State (Positioning, Copied status)
  const [popupState, setPopupState] = useState<PopupState | null>(null);
  const [copied, setCopied] = useState(false);
  const [selection, setSelection] = useState<SelectionRange | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const { showToast } = useToast();

  // Refs for DOM manipulation
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightOverlayRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);

  // --- Handlers ---

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updatePrompt(e.target.value);
  };

  const handleCopy = async () => {
    await copyToClipboard(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportMarkdown = () => {
    const md = exportAsMarkdown(prompt, context, language === Language.Chinese ? '提示词' : 'Prompt');
    downloadAsFile(md, 'prompt.md', 'text/markdown');
    setShowExportMenu(false);
    showToast(language === Language.Chinese ? '已下载 Markdown 文件' : 'Downloaded Markdown file', 'success');
  };

  const handleExportJSON = () => {
    const json = exportAsJSON(prompt, context);
    downloadAsFile(json, 'prompt.json', 'application/json');
    setShowExportMenu(false);
    showToast(language === Language.Chinese ? '已下载 JSON 文件' : 'Downloaded JSON file', 'success');
  };

  const handleShareLink = async () => {
    const link = generateShareLink(prompt, context);
    await copyToClipboard(link);
    setShowExportMenu(false);
    showToast(language === Language.Chinese ? '分享链接已复制' : 'Share link copied', 'success');
  };

  const handleSyncScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (highlightOverlayRef.current) {
      highlightOverlayRef.current.scrollTop = e.currentTarget.scrollTop;
    }
    setSelection(null);
    setActiveSuggestionId(null);
    setPopupState(null);
  };

  const handleTextSelection = () => {
    const el = textareaRef.current;
    if (!el || !measureRef.current) return;

    if (activeSuggestionId) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = prompt.substring(start, end).trim();

    if (text.length > 0) {
      // Create mirror content to measure position
      const before = prompt.substring(0, start);
      const selected = prompt.substring(start, end);
      const after = prompt.substring(end);

      measureRef.current.innerHTML = '';
      const span = document.createElement('span');
      span.textContent = selected;

      measureRef.current.appendChild(document.createTextNode(before));
      measureRef.current.appendChild(span);
      measureRef.current.appendChild(document.createTextNode(after));

      // Calculate position
      const spanRect = span.getBoundingClientRect();

      const offsetTop = span.offsetTop;
      const offsetLeft = span.offsetLeft;
      const offsetWidth = span.offsetWidth;
      const height = span.offsetHeight;

      const containerRect = el.getBoundingClientRect();
      const scrollTop = el.scrollTop;

      let top = containerRect.top + (offsetTop - scrollTop);
      let left = containerRect.left + offsetLeft + (offsetWidth / 2);

      const menuHeight = 50;
      top = top - menuHeight - 8; // 8px buffer

      if (top < 80) {
        top = containerRect.top + (offsetTop - scrollTop) + height + 8;
      }

      setSelection({
        text,
        start,
        end,
        top,
        left
      });
    } else {
      setSelection(null);
    }
  };

  const handleSuggestionClick = (e: React.MouseEvent<HTMLSpanElement>, id: string) => {
    e.stopPropagation();

    if (activeSuggestionId === id) {
      setActiveSuggestionId(null);
      setPopupState(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      setActiveSuggestionId(id);
      setSelection(null);

      setPopupState({
        id,
        top: rect.bottom + 8,
        left: Math.max(16, Math.min(rect.left, window.innerWidth - 340))
      });
    }
  };

  const onPartialReconstruct = () => {
    if (selection) {
      handlePartialReconstruct(selection);
      setSelection(null);
    }
  };

  const onLockSelection = () => {
    if (selection && !lockedSegments.some(s => s.text === selection.text)) {
      addLock(selection.text);
      setSelection(null);
    }
  };

  // --- Rendering Helpers ---

  const getPillarPriority = (p: Pillar | 'pending') => {
    switch (p) {
      case Pillar.Persona: return 1;
      case Pillar.Task: return 2;
      case Pillar.Context: return 3;
      case Pillar.Format: return 4;
      default: return 6;
    }
  };
  const sortedLockedSegments = [...lockedSegments].sort((a, b) => getPillarPriority(a.pillar) - getPillarPriority(b.pillar));
  const getPillarColor = (p: Pillar | 'pending') => {
    switch (p) {
      case Pillar.Persona: return 'text-purple-400 border-purple-500/30 bg-purple-500/10';
      case Pillar.Task: return 'text-blue-400 border-blue-500/30 bg-blue-500/10';
      case Pillar.Context: return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
      case Pillar.Format: return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
      default: return 'text-gray-400 border-gray-600 bg-gray-800';
    }
  };

  const renderHighlights = () => {
    // 1. Partial Rewrite Mode: Blur everything EXCEPT the processing segment
    if (processingSelection) {
      return (
        <>
          <span className="opacity-30 blur-[1px] transition-all duration-300">
            {prompt.substring(0, processingSelection.start)}
          </span>
          <span className="bg-blue-500/20 text-blue-200 border-b-2 border-blue-500 animate-pulse transition-all duration-300 shadow-[0_0_10px_rgba(59,130,246,0.5)]">
            {prompt.substring(processingSelection.start, processingSelection.end)}
          </span>
          <span className="opacity-30 blur-[1px] transition-all duration-300">
            {prompt.substring(processingSelection.end)}
          </span>
        </>
      );
    }

    // 2. Normal Mode: Suggestions
    if (suggestions.length === 0) return <span>{prompt}</span>;

    let lastIndex = 0;
    const fragments = [];

    const sortedSuggestions = [...suggestions]
      .map(s => ({ ...s, index: prompt.indexOf(s.originalText) }))
      .filter(s => s.index !== -1)
      .sort((a, b) => a.index - b.index);

    sortedSuggestions.forEach((sugg) => {
      if (sugg.index > lastIndex) {
        fragments.push(
          <span key={`text-${lastIndex}`}>{prompt.substring(lastIndex, sugg.index)}</span>
        );
      }

      const isActive = activeSuggestionId === sugg.id;
      fragments.push(
        <span
          key={sugg.id}
          className={`relative cursor-pointer pointer-events-auto transition-all duration-200 border-b-2 
                    ${isActive ? 'bg-red-500/20 border-red-400' : 'border-red-500/50 hover:bg-red-500/10'}`}
          onClick={(e) => handleSuggestionClick(e, sugg.id)}
        >
          {sugg.originalText}
        </span>
      );

      lastIndex = sugg.index + sugg.originalText.length;
    });

    if (lastIndex < prompt.length) {
      fragments.push(<span key="last">{prompt.substring(lastIndex)}</span>);
    }

    return fragments;
  };

  const renderActivePopup = () => {
    if (!activeSuggestionId || !popupState) return null;
    const sugg = suggestions.find(s => s.id === activeSuggestionId);
    if (!sugg) return null;

    const isNearBottom = popupState.top + 200 > window.innerHeight;
    const finalTop = isNearBottom ? popupState.top - 220 : popupState.top;

    return (
      <div
        className="fixed z-50 w-80 bg-gray-850 rounded-xl shadow-2xl border border-gray-700 p-4 animate-in fade-in zoom-in-95 duration-200 cursor-default"
        style={{
          top: finalTop,
          left: popupState.left,
          WebkitTextFillColor: '#e2e8f0'
        }}
      >
        <div className="flex items-start gap-3 mb-3">
          <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
          <div className="text-xs text-gray-300">
            <span className="font-bold text-gray-200 block mb-1">
              {sugg.type.toUpperCase()}
            </span>
            {sugg.reason}
          </div>
        </div>
        <div className="bg-black/30 rounded p-2 mb-3 text-sm text-green-400 font-mono border border-green-900/30 whitespace-pre-wrap">
          {sugg.suggestedText}
        </div>
        <div className="flex gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); applySuggestion(sugg); }}
            className="flex-1 bg-green-600 hover:bg-green-500 text-white text-xs font-bold py-1.5 rounded-lg flex items-center justify-center gap-1 transition-colors"
          >
            <CheckCheck size={14} /> Accept
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); dismissSuggestion(sugg.id); }}
            className="px-3 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-bold py-1.5 rounded-lg transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  };

  const t = {
    title: language === Language.Chinese ? '智能编辑器' : 'Smart Editor',
    copy: language === Language.Chinese ? '复制代码' : 'Copy Code',
    copied: language === Language.Chinese ? '已复制！' : 'Copied!',
    mentor: language === Language.Chinese ? 'AI 导师' : 'AI Mentor',
    mentorSub: language === Language.Chinese ? '实时优化与重构' : 'Real-time optimization',
    analyzing: language === Language.Chinese ? '正在分析...' : 'Analyzing...',
    reconstructAll: language === Language.Chinese ? '重构全文' : 'Reconstruct All',
    lockedTitle: language === Language.Chinese ? '已锁定部分' : 'Locked Segments',
    lockDesc: language === Language.Chinese ? 'AI 重构时将保持这些内容不变' : 'AI will preserve these during reconstruction',
    floatingLock: language === Language.Chinese ? '锁定选择' : 'Lock',
    floatingRewrite: language === Language.Chinese ? '重写选中部分' : 'Rewrite',
    processing: language === Language.Chinese ? 'AI 正在努力重构...' : 'AI is reconstructing...',
    scanning: language === Language.Chinese ? '正在深度扫描...' : 'Deep scanning...',
    applyFeedback: language === Language.Chinese ? '采纳建议' : 'Apply',
    applying: language === Language.Chinese ? '正在优化...' : 'Optimizing...',
    ignore: language === Language.Chinese ? '忽略' : 'Ignore',
    waiting: language === Language.Chinese ? '等待更改...' : 'Waiting for changes...',
    undo: language === Language.Chinese ? '撤回修改' : 'Undo',
    applied: language === Language.Chinese ? '已采纳建议' : 'Suggestion Applied',
  };

  const isPartialProcessing = isProcessing && processingSelection !== null;
  const isGlobalProcessing = isProcessing && processingSelection === null;
  const isApplyingFeedback = processingType === 'applyFeedback';

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-4 gap-4 md:gap-6 h-[calc(100vh-140px)] relative">
      {renderActivePopup()}

      {selection && (
        <div
          className="fixed z-50 bg-gray-850 border border-gray-700 rounded-xl shadow-2xl p-1 flex items-center gap-1 animate-in fade-in zoom-in-95 duration-200 transform -translate-x-1/2"
          style={{ top: selection.top, left: selection.left }}
        >
          <div className="px-3 py-1 text-xs text-blue-400 font-medium border-r border-gray-700 mr-1 max-w-[150px] truncate">
            "{selection.text}"
          </div>
          <button
            onClick={onLockSelection}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Lock size={14} className="text-amber-500" /> {t.floatingLock}
          </button>
          <button
            onClick={onPartialReconstruct}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
          >
            <Sparkles size={14} /> {t.floatingRewrite}
          </button>
          <button
            onClick={() => setSelection(null)}
            className="p-2 text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Main Editor Section */}
      <div className="flex-1 lg:col-span-3 flex flex-col gap-4 relative min-h-0">
        <div className={`rounded-t-2xl p-4 border-b flex justify-between items-center shadow-sm ${settings.theme === 'light'
          ? 'bg-gray-100 border-gray-300'
          : 'bg-gray-800 border-gray-700'
          }`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Wand2 className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className={`text-lg font-bold ${settings.theme === 'light' ? 'text-gray-900' : 'text-white'
              }`}>{t.title}</h2>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleDeepScan}
              disabled={isProcessing}
              className="flex items-center gap-2 text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 transition-all px-3 py-2 md:py-1.5 rounded-lg font-bold touch-target"
            >
              <ScanSearch size={14} className={isProcessing ? 'animate-pulse' : ''} />
              {language === Language.Chinese ? '深度扫描' : 'Deep Scan'}
            </button>
            <button
              onClick={handleCopy}
              className={`flex items-center gap-2 text-sm transition-colors px-4 py-2 md:py-2 rounded-xl touch-target ${settings.theme === 'light'
                ? 'text-gray-700 hover:text-gray-900 bg-gray-200 hover:bg-gray-300'
                : 'text-gray-400 hover:text-white bg-gray-700/50 hover:bg-gray-700'
                }`}
            >
              {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
              {copied ? t.copied : t.copy}
            </button>

            {/* Export Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className={`flex items-center gap-2 text-sm transition-colors px-3 py-2 md:py-2 rounded-xl touch-target ${settings.theme === 'light'
                  ? 'text-gray-700 hover:text-gray-900 bg-gray-200 hover:bg-gray-300'
                  : 'text-gray-400 hover:text-white bg-gray-700/50 hover:bg-gray-700'
                  }`}
              >
                <Download size={16} />
                <ChevronDown size={14} className={`transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
              </button>

              {showExportMenu && (
                <div className={`absolute right-0 top-full mt-2 w-48 rounded-xl shadow-xl border z-50 overflow-hidden ${settings.theme === 'light'
                  ? 'bg-white border-gray-200'
                  : 'bg-gray-800 border-gray-700'
                  }`}>
                  <button
                    onClick={handleExportMarkdown}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors ${settings.theme === 'light'
                      ? 'hover:bg-gray-100 text-gray-700'
                      : 'hover:bg-gray-700 text-gray-300'
                      }`}
                  >
                    <FileText size={16} className="text-blue-500" />
                    {language === Language.Chinese ? '下载 Markdown' : 'Download Markdown'}
                  </button>
                  <button
                    onClick={handleExportJSON}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors ${settings.theme === 'light'
                      ? 'hover:bg-gray-100 text-gray-700'
                      : 'hover:bg-gray-700 text-gray-300'
                      }`}
                  >
                    <Download size={16} className="text-emerald-500" />
                    {language === Language.Chinese ? '下载 JSON' : 'Download JSON'}
                  </button>
                  <div className={`border-t ${settings.theme === 'light' ? 'border-gray-200' : 'border-gray-700'}`} />
                  <button
                    onClick={handleShareLink}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors ${settings.theme === 'light'
                      ? 'hover:bg-gray-100 text-gray-700'
                      : 'hover:bg-gray-700 text-gray-300'
                      }`}
                  >
                    <Share2 size={16} className="text-purple-500" />
                    {language === Language.Chinese ? '复制分享链接' : 'Copy Share Link'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={`flex-1 relative rounded-b-2xl border shadow-inner overflow-hidden group ${settings.theme === 'light'
          ? 'bg-white border-gray-300'
          : 'bg-gray-900 border-gray-700'
          }`}>
          {isGlobalProcessing && (
            <div className="absolute inset-0 bg-gray-950/60 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-4 text-white">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
              <p className="font-medium animate-pulse">
                {processingType === 'scan'
                  ? t.scanning
                  : processingType === 'applyFeedback'
                    ? t.applying
                    : t.processing}
              </p>
            </div>
          )}

          {/* Mirror Div for measurement */}
          <div
            ref={measureRef}
            className="absolute inset-0 w-full p-8 font-mono text-base leading-relaxed whitespace-pre-wrap break-words invisible pointer-events-none -z-50"
            aria-hidden="true"
            style={{ fontFamily: 'monospace' }}
          />

          <div
            ref={highlightOverlayRef}
            className="absolute inset-0 p-8 font-mono text-base leading-relaxed whitespace-pre-wrap break-words z-20 pointer-events-none overflow-hidden"
            style={{
              fontFamily: 'monospace',
              WebkitTextFillColor: isPartialProcessing ? 'unset' : 'transparent',
              color: isPartialProcessing ? '#e2e8f0' : 'transparent',
            }}
          >
            {renderHighlights()}
          </div>

          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={handlePromptChange}
            onSelect={handleTextSelection}
            onScroll={handleSyncScroll}
            className={`absolute inset-0 w-full h-full bg-transparent p-8 font-mono text-base leading-relaxed focus:outline-none resize-none selection:bg-blue-500/30 z-10 transition-colors duration-200 ${isPartialProcessing ? 'text-transparent selection:bg-transparent' : (settings.theme === 'light' ? 'text-gray-900' : 'text-gray-200')
              }`}
            placeholder="..."
            spellCheck={false}
            readOnly={isProcessing}
            style={{ fontFamily: 'monospace' }}
          />
        </div>

        {suggestions.length > 0 && !isProcessing && (
          <div className="absolute bottom-4 right-6 z-20 pointer-events-none">
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-lg backdrop-blur-md animate-bounce-slow">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              {suggestions.length} issues found
            </div>
          </div>
        )}
      </div>

      <div className="lg:col-span-1 flex flex-col gap-4 md:gap-6">
        <div className={`rounded-2xl p-6 border shadow-lg flex flex-col ${settings.theme === 'light'
          ? 'bg-white border-gray-300'
          : 'bg-gray-800 border-gray-700'
          }`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
              <MessageSquareMore className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className={`font-bold text-sm ${settings.theme === 'light' ? 'text-gray-900' : 'text-white'
                }`}>{t.mentor}</h3>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">{t.mentorSub}</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* UNDO BANNER */}
            {showUndo && (
              <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-3 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                    <CheckCheck size={14} />
                    {t.applied}
                  </div>
                  <button
                    onClick={handleUndo}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-bold border border-gray-600 transition-colors shadow-sm"
                  >
                    <RotateCcw size={12} /> {t.undo}
                  </button>
                </div>
              </div>
            )}

            {isTyping ? (
              <div className="flex items-center gap-2 text-gray-500 italic text-sm py-4">
                <Loader2 size={14} className="animate-spin text-blue-500" />
                {t.analyzing}
              </div>
            ) : (
              <div className={`border rounded-xl p-4 shadow-inner ${settings.theme === 'light'
                ? 'bg-gray-50 border-gray-300'
                : 'bg-gray-900/80 border-gray-700'
                }`}>
                <div className="flex gap-3 mb-3">
                  <AlertCircle className={`w-5 h-5 shrink-0 mt-0.5 ${feedback ? 'text-blue-400' : 'text-gray-600'}`} />
                  <p className={`text-sm leading-relaxed ${feedback
                    ? (settings.theme === 'light' ? 'text-gray-700 italic' : 'text-gray-300 italic')
                    : (settings.theme === 'light' ? 'text-gray-500 not-italic' : 'text-gray-500 not-italic')
                    }`}>
                    {feedback ? `"${feedback}"` : t.waiting}
                  </p>
                </div>

                {feedback && !feedback.includes("Analyzing") && !feedback.includes("正在分析") && !feedback.includes("Scanning") && (
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={handleApplyFeedback}
                      disabled={isProcessing}
                      className="flex-1 py-2 md:py-1.5 px-3 bg-gray-700/50 hover:bg-blue-600/30 border border-gray-600 hover:border-blue-500/50 rounded-lg text-xs font-semibold text-blue-300 flex items-center justify-center gap-2 transition-all group touch-target"
                    >
                      {isApplyingFeedback ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} className="group-hover:text-yellow-400 transition-colors" />}
                      {isApplyingFeedback ? t.applying : t.applyFeedback}
                    </button>
                    <button
                      onClick={handleDismissFeedback}
                      disabled={isProcessing}
                      className="px-3 py-1.5 bg-gray-700/30 hover:bg-gray-600/50 border border-gray-600/50 hover:border-gray-500 rounded-lg text-xs font-semibold text-gray-400 hover:text-gray-200 transition-all flex items-center justify-center"
                      title={t.ignore}
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleGlobalReconstruct}
              disabled={isProcessing}
              className="w-full py-3 md:py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 touch-target"
            >
              <RefreshCw size={16} className={isProcessing ? 'animate-spin' : ''} />
              {t.reconstructAll}
            </button>
          </div>
        </div>

        <div className={`rounded-2xl p-6 border shadow-lg flex-1 overflow-hidden flex flex-col ${settings.theme === 'light'
          ? 'bg-white border-gray-300'
          : 'bg-gray-800 border-gray-700'
          }`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-sm font-bold flex items-center gap-2 ${settings.theme === 'light' ? 'text-gray-900' : 'text-white'
              }`}>
              <Lock size={14} className="text-amber-500" />
              {t.lockedTitle}
            </h3>
            <span className="text-[10px] bg-gray-700 px-2 py-0.5 rounded-full text-gray-400">
              {lockedSegments.length}
            </span>
          </div>
          <p className="text-xs text-gray-500 mb-4">{t.lockDesc}</p>

          <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
            {sortedLockedSegments.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 border border-dashed border-gray-700 rounded-xl opacity-50">
                <Unlock size={24} className="text-gray-600 mb-2" />
                <p className="text-[10px] text-gray-600">
                  {language === Language.Chinese ? '选择文本并锁定以保护其免受 AI 修改' : 'Select text to lock it'}
                </p>
              </div>
            ) : (
              sortedLockedSegments.map((seg) => (
                <div key={seg.id} className="group relative mb-2">
                  <div className="flex items-center justify-between mb-1 px-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider font-bold border ${getPillarColor(seg.pillar)} flex items-center gap-1`}>
                      {seg.pillar === 'pending' && <Loader2 size={8} className="animate-spin" />}
                      {seg.pillar}
                    </span>
                  </div>
                  <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-[11px] text-gray-400 leading-tight hover:border-amber-500/50 transition-colors">
                    {seg.text}
                    <button
                      onClick={() => removeLock(seg.id)}
                      className="absolute top-8 right-1 p-1 rounded-md bg-gray-800 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div >
  );
};

export default EditorStage;