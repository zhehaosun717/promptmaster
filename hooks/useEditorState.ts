import { useState, useEffect, useRef, useCallback } from 'react';
import { Language, Pillar, Suggestion, LockedSegment } from '../types';
import {
    getMentorFeedback,
    reconstructPrompt,
    classifyPromptSegment,
    getDetailedCritique,
    applySpecificFeedback
} from '../services/geminiService';

export interface EditorStateProps {
    initialPrompt: string;
    context: string;
    language: Language;
}

export function useEditorState({ initialPrompt, context, language }: EditorStateProps) {
    // Core Prompt State
    const [prompt, setPrompt] = useState(initialPrompt);

    // Suggestions & Feedback
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [activeSuggestionId, setActiveSuggestionId] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<string>(
        language === Language.Chinese ? "正在分析提示词结构..." : "Analyzing prompt structure..."
    );

    // Processing Status
    const [isTyping, setIsTyping] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingType, setProcessingType] = useState<'scan' | 'reconstruct' | 'applyFeedback' | null>(null);
    const [processingSelection, setProcessingSelection] = useState<{ start: number, end: number } | null>(null);

    // History & Undo
    const [ignoredFeedbackHistory, setIgnoredFeedbackHistory] = useState<string[]>([]);
    const [lastPromptBeforeApply, setLastPromptBeforeApply] = useState<string | null>(null);
    const [showUndo, setShowUndo] = useState(false);

    // Locking
    const [lockedSegments, setLockedSegments] = useState<LockedSegment[]>([]);

    // Internal Refs for Logic interaction
    const promptRef = useRef(prompt);
    useEffect(() => { promptRef.current = prompt; }, [prompt]);
    const [lastFeedbackPrompt, setLastFeedbackPrompt] = useState('');

    // --- Actions ---

    const updatePrompt = useCallback((newPrompt: string) => {
        setPrompt(newPrompt);
        // If user types manually, clear undo capability for the AI action
        if (showUndo) {
            setShowUndo(false);
            setLastPromptBeforeApply(null);
        }
    }, [showUndo]);

    const handleDeepScan = useCallback(async () => {
        if (isProcessing) return;
        setIsProcessing(true);
        setProcessingType('scan');
        setSuggestions([]);
        setShowUndo(false);

        try {
            const s = await getDetailedCritique(prompt, context, language);
            const validSuggestions = s.filter(sugg => promptRef.current.includes(sugg.originalText));
            setSuggestions(validSuggestions);
        } catch (e) {
            console.error(e);
        } finally {
            setIsProcessing(false);
            setProcessingType(null);
        }
    }, [prompt, context, language, isProcessing]);

    const applySuggestion = useCallback((suggestion: Suggestion) => {
        const newPrompt = prompt.replace(suggestion.originalText, suggestion.suggestedText);
        setPrompt(newPrompt);
        setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
        setActiveSuggestionId(null);
    }, [prompt]);

    const dismissSuggestion = useCallback((id: string) => {
        setSuggestions(prev => prev.filter(s => s.id !== id));
        setActiveSuggestionId(null);
    }, []);

    const handleApplyFeedback = useCallback(async () => {
        if (!feedback || isProcessing) return;

        setLastPromptBeforeApply(prompt);
        setIsProcessing(true);
        setProcessingType('applyFeedback');

        try {
            const newPrompt = await applySpecificFeedback(
                prompt,
                context,
                feedback,
                lockedSegments.map(s => s.text),
                language
            );
            setPrompt(newPrompt);
            setSuggestions([]);
            setShowUndo(true);
        } finally {
            setIsProcessing(false);
            setProcessingType(null);
        }
    }, [prompt, context, feedback, lockedSegments, language, isProcessing]);

    const handleUndo = useCallback(() => {
        if (lastPromptBeforeApply) {
            setPrompt(lastPromptBeforeApply);
            setShowUndo(false);
            setLastPromptBeforeApply(null);
        }
    }, [lastPromptBeforeApply]);

    const handleDismissFeedback = useCallback(async () => {
        if (!feedback) return;

        const newHistory = [...ignoredFeedbackHistory, feedback];
        setIgnoredFeedbackHistory(newHistory);
        setShowUndo(false);
        setIsTyping(true);

        try {
            const newFeedback = await getMentorFeedback(prompt, context, language, newHistory);
            if (newFeedback) {
                setFeedback(newFeedback);
            } else {
                setFeedback(language === Language.Chinese ? "暂无更多建议" : "No further suggestions");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsTyping(false);
        }
    }, [feedback, ignoredFeedbackHistory, prompt, context, language]);

    const handleGlobalReconstruct = useCallback(async () => {
        setIsProcessing(true);
        setProcessingType('reconstruct');
        setProcessingSelection(null);
        setShowUndo(false);
        try {
            const result = await reconstructPrompt(prompt, context, lockedSegments.map(s => s.text), language);
            setPrompt(result);
            setSuggestions([]);
        } finally {
            setIsProcessing(false);
            setProcessingType(null);
        }
    }, [prompt, context, lockedSegments, language]);

    const handlePartialReconstruct = useCallback(async (selection: { text: string, start: number, end: number }) => {
        const { start, end, text } = selection;

        setProcessingSelection({ start, end });
        setIsProcessing(true);
        setProcessingType('reconstruct');
        setShowUndo(false);

        try {
            const rewrittenSegment = await reconstructPrompt(prompt, context, lockedSegments.map(s => s.text), language, text);
            const newPrompt = prompt.substring(0, start) + rewrittenSegment + prompt.substring(end);
            setPrompt(newPrompt);
        } finally {
            setIsProcessing(false);
            setProcessingType(null);
            setProcessingSelection(null);
        }
    }, [prompt, context, lockedSegments, language]);

    // Locking Logic
    const addLock = useCallback((text: string) => {
        if (!lockedSegments.some(s => s.text === text)) {
            const newId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
            setLockedSegments(prev => [
                ...prev,
                { id: newId, text: text, pillar: 'pending' }
            ]);
        }
    }, [lockedSegments]);

    const removeLock = useCallback((id: string) => {
        setLockedSegments(prev => prev.filter(s => s.id !== id));
    }, []);

    // --- Effects ---

    // Mentor Feedback Loop
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (prompt !== lastFeedbackPrompt && prompt.length > 10 && !isProcessing) {
                setIsTyping(true);
                setIgnoredFeedbackHistory([]);

                getMentorFeedback(prompt, context, language, []).then(f => {
                    if (f) {
                        setFeedback(f);
                    }
                    setIsTyping(false);
                });

                setLastFeedbackPrompt(prompt);
            }
        }, 2500);

        return () => clearTimeout(timer);
    }, [prompt, lastFeedbackPrompt, context, language, isProcessing]);

    // Lock Classification Loop
    useEffect(() => {
        const pending = lockedSegments.find(s => s.pillar === 'pending');
        if (pending) {
            let isMounted = true;
            classifyPromptSegment(pending.text, promptRef.current)
                .then(pillar => {
                    if (isMounted) {
                        setLockedSegments(prev => prev.map(s => s.id === pending.id ? { ...s, pillar } : s));
                    }
                })
                .catch(() => {
                    if (isMounted) {
                        setLockedSegments(prev => prev.map(s => s.id === pending.id ? { ...s, pillar: Pillar.Other } : s));
                    }
                });
            return () => { isMounted = false; };
        }
        return undefined;
    }, [lockedSegments]);

    return {
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
            setPrompt, // Included specifically for direct overwrite if needed
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
    };
}
