import { GoogleGenAI, Chat, GenerateContentResponse, Type } from "@google/genai";
import { InterviewResponse, MentorFeedback, Language, Pillar, Suggestion, AppSettings, DEFAULT_APP_SETTINGS, FeatureType, ModelType, getModelById, getApiKeyForModel, getBaseUrlForModel, ApiProvider } from "../types";

// Configuration management
let currentSettings: AppSettings = DEFAULT_APP_SETTINGS;

// Load settings from localStorage or use environment variables as fallback
const loadSettings = (): AppSettings => {
  try {
    const saved = localStorage.getItem('promptmaster-settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_APP_SETTINGS,
        ...parsed,
        api: {
          ...DEFAULT_APP_SETTINGS.api,
          activeProvider: parsed.api?.activeProvider || DEFAULT_APP_SETTINGS.api.activeProvider,
          geminiApiKey: parsed.api?.geminiApiKey || '',
          deepseekApiKey: parsed.api?.deepseekApiKey || '', // Load DeepSeek key
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
  } catch (error) {
    console.warn('Failed to load settings from localStorage:', error);
  }

  // Fallback to environment variables
  return {
    ...DEFAULT_APP_SETTINGS,
    api: {
      ...DEFAULT_APP_SETTINGS.api,
      geminiApiKey: ''  // Users must set API key in Settings
    }
  };
};

// Initialize settings
currentSettings = loadSettings();

let aiClient: GoogleGenAI | null = null;

const getAiClient = (modelId?: string): GoogleGenAI => {
  // 对于Google Gemini模型，使用GoogleGenAI客户端
  if (modelId) {
    const model = getModelById(modelId, currentSettings.api.customModels);
    if (model && (model.provider === 'google-gemini' || model.modelName.startsWith('gemini-'))) {
      const apiKey = getApiKeyForModel(model, currentSettings);
      if (!apiKey) {
        throw new Error(`API key not configured for model: ${modelId}`);
      }

      // 复用现有客户端或创建新的
      if (!aiClient || currentSettings.api.geminiApiKey !== apiKey) {
        aiClient = new GoogleGenAI({ apiKey });
      }
      return aiClient;
    } else {
      // 对于非Gemini模型，暂时抛出错误（需要实现自定义API调用）
      throw new Error(`Only Google Gemini models are currently supported. Model: ${modelId}`);
    }
  }

  // 默认情况：使用Gemini客户端
  const apiKey = currentSettings.api.geminiApiKey || '';
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
};

// Configuration management functions
export const updateApiSettings = (settings: AppSettings) => {
  currentSettings = settings;
  // Reset AI client to use new API key
  aiClient = null;
};

export const getCurrentSettings = (): AppSettings => {
  return { ...currentSettings };
};

export const getModelForFeature = (feature: FeatureType): string => {
  return currentSettings.api.models[feature];
};

// 获取指定功能的模型配置
export const getModelConfigForFeature = (feature: FeatureType) => {
  const modelId = currentSettings.api.models[feature];
  return getModelById(modelId, currentSettings.api.customModels);
};

// Helper for exponential backoff
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function callWithRetry<T>(
  apiCall: () => Promise<T>,
  retries: number = 3,
  initialDelay: number = 2000
): Promise<T> {
  try {
    return await apiCall();
  } catch (error: any) {
    // Robust 429 detection supporting various error structures
    const isQuotaError =
      error.status === 429 ||
      error.code === 429 ||
      error.status === 'RESOURCE_EXHAUSTED' ||
      (error.error && (error.error.code === 429 || error.error.status === 'RESOURCE_EXHAUSTED')) ||
      (typeof error.message === 'string' && (error.message.includes('429') || error.message.includes('quota')));

    if (isQuotaError && retries > 0) {
      console.warn(`Quota exceeded (429). Retrying in ${initialDelay}ms... (${retries} attempts left)`);
      await wait(initialDelay);
      return callWithRetry(apiCall, retries - 1, initialDelay * 2);
    }
    throw error;
  }
}

// Helper for OpenAI-compatible API calls (DeepSeek)
async function callOpenAICompatible(
  modelConfig: any,
  messages: any[],
  apiKey: string,
  temperature: number = 0.7,
  jsonMode: boolean = false
): Promise<string> {
  let baseUrl = modelConfig.baseUrl || 'https://api.deepseek.com';
  // Ensure endpoint path
  if (!baseUrl.includes('chat/completions')) {
    baseUrl = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
  }

  const body: any = {
    model: modelConfig.modelName,
    messages,
    stream: false,
    temperature
  };

  if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Request Failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// --- Phase 1: Interview & Generation ---

let interviewChatSession: Chat | null = null;
let deepseekChatHistory: { role: string; content: string }[] = [];

export const startInterviewSession = (language: Language): void => {
  const modelId = getModelForFeature(FeatureType.Interview);
  const modelConfig = getModelConfigForFeature(FeatureType.Interview);

  if (!modelConfig) {
    throw new Error(`Model configuration not found for feature: ${FeatureType.Interview}`);
  }

  const langName = language === Language.Chinese ? "Simplified Chinese" : "English";
  const systemInstruction = `You are an expert Prompt Engineering Consultant (The Architect).

      CORE OBJECTIVE:
      Build a "Power Prompt" for the user by systematically gathering 4 Pillars:
      1. **Persona**
      2. **Task**
      3. **Context**
      4. **Format**

      BEHAVIOR GUIDELINES:
      1. **Think Before Speaking**: internally review conversation history.
      2. **One Thing at a Time**: Ask only ONE question at a time.
      3. **Stable Personality**: Be professional and concise.
      4. **Strict Pronouns**: You are "I" (The Consultant). The Prompt is for "The AI". The User is "You".

      LANGUAGE RULES:
      1. You MUST conduct the interview in ${langName}.
      2. CRITICAL: The final "generatedPrompt" MUST be written in ${langName}, unless the user specifically requests a different language for the target AI.
      
      RESPONSE FORMAT:
      You must respond in valid JSON with the following structure:
      {
        "question": "The question to ask the user",
        "options": ["Option A", "Option B", "Option C"], // Provide exactly 3 distinct choices
        "isFinalDraft": boolean, // Set to true only when you have collected all 4 pillars and are ready to generate the final prompt
        "generatedPrompt": "string" // The full prompt, only required if isFinalDraft is true
      }
      IMPORTANT: Keys must be exactly as shown (lowercase). Do not include markdown formatting.`;

  // DeepSeek / OpenAI Logic
  if (modelConfig.provider === ApiProvider.DeepSeek || modelConfig.provider === ApiProvider.OpenAI || modelConfig.provider === ApiProvider.Custom) {
    deepseekChatHistory = [
      { role: 'system', content: systemInstruction + `\n\nIMPORTANT: You must respond in valid JSON format.` }
    ];
    interviewChatSession = null;
    return;
  }

  // Gemini Logic
  const ai = getAiClient() as GoogleGenAI;

  interviewChatSession = ai.chats.create({
    model: modelConfig.modelName,
    config: {
      temperature: 0.6,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          options: { type: Type.ARRAY, items: { type: Type.STRING } },
          isFinalDraft: { type: Type.BOOLEAN },
          generatedPrompt: { type: Type.STRING }
        },
        required: ["question", "options", "isFinalDraft"]
      },
      systemInstruction,
    },
  });
};

export const sendInterviewMessage = async (message: string, language: Language): Promise<InterviewResponse> => {
  // Ensure session exists
  if (!interviewChatSession && deepseekChatHistory.length === 0) {
    startInterviewSession(language);
  }

  try {
    let responseText = "{}";

    // Dispatch based on active session type
    if (deepseekChatHistory.length > 0) {
      // DeepSeek Handling
      const modelConfig = getModelConfigForFeature(FeatureType.Interview);
      const apiKey = getApiKeyForModel(modelConfig!, currentSettings);

      // Add user message to history
      deepseekChatHistory.push({ role: 'user', content: message });

      // Call API
      responseText = await callOpenAICompatible(
        modelConfig,
        deepseekChatHistory,
        apiKey,
        0.6,
        true // Enable JSON mode
      );

      // Add assistant response to history
      deepseekChatHistory.push({ role: 'assistant', content: responseText });

    } else if (interviewChatSession) {
      // Gemini Handling
      const response: GenerateContentResponse = await callWithRetry(() =>
        interviewChatSession!.sendMessage({ message })
      );
      responseText = response.text || "{}";
    } else {
      throw new Error("Session initialized but no valid handler found.");
    }

    try {
      // Parse JSON safely
      // Some models might wrap JSON in Markdown code blocks
      const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
      const json = JSON.parse(cleanJson);
      return {
        question: json.question || json.Question || "...",
        options: Array.isArray(json.options) ? json.options.slice(0, 3) : [],
        isFinalDraft: !!json.isFinalDraft,
        generatedPrompt: json.generatedPrompt
      };
    } catch (parseError) {
      console.error("JSON Parse Error", responseText);
      // If parsing fails for DeepSeek, it might be due to thinking tokens or format
      if (deepseekChatHistory.length > 0) {
        // Auto-recovery: Inform model to fix JSON
        // This is complex, for now return error state
      }
      return { question: "System Error: Could not parse AI response. Please try again.", options: [], isFinalDraft: false };
    }
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
};

export const generateFinalDraft = async (language: Language): Promise<string> => {
  const msg = language === Language.Chinese
    ? "我们已经讨论够了。请生成最终的详细提示词。请务必将角色、任务、背景和格式这四个要素整合成一段完整、详细、可直接使用的指令。**重要：生成的提示词内容本身必须使用简体中文书写**（除非用户在对话中明确指定了生成其他语言的提示词）。"
    : "We have discussed enough. Please generate the final detailed prompt. Combine Persona, Task, Context, and Format into a single, comprehensive instruction block.";
  const response = await sendInterviewMessage(msg, language);
  return response.generatedPrompt || response.question;
};

export const reverseEngineerContext = async (prompt: string, language: Language): Promise<string> => {
  const modelId = getModelForFeature(FeatureType.ReverseEngineer);
  const modelConfig = getModelConfigForFeature(FeatureType.ReverseEngineer);

  if (!modelConfig) {
    throw new Error(`Model configuration not found for feature: ${FeatureType.ReverseEngineer}`);
  }

  const langName = language === Language.Chinese ? "Simplified Chinese" : "English";
  const contents = `Analyze the following prompt and reverse-engineer the "Context Pillars" to serve as a specification for an Editor AI.

        Original Prompt: "${prompt}"

        Task: Extract/Infer the following pillars:
        1. Intended Persona (Who is the AI?)
        2. Core Task (What must it do?)
        3. Background/Constraints (Context)
        4. Output Format

        Output a concise, structured summary in ${langName}.
        Start immediately with "User Context Analysis:". Do not add preamble.`;

  if (modelConfig.provider === ApiProvider.DeepSeek || modelConfig.provider === ApiProvider.OpenAI || modelConfig.provider === ApiProvider.Custom) {
    try {
      const apiKey = getApiKeyForModel(modelConfig, currentSettings);
      return await callOpenAICompatible(modelConfig, [{ role: 'user', content: contents }], apiKey, 0.3);
    } catch (e) {
      console.error("Context extraction failed (DeepSeek)", e);
      return "Context inferred from original prompt.";
    }
  }

  const ai = getAiClient(modelId);
  try {
    const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: modelConfig.modelName,
      config: { temperature: 0.3 }, // Fixed: low for consistent reconstruction
      contents
    }));
    return response.text ? response.text.trim() : "Context inferred from original prompt.";
  } catch (e) {
    console.error("Context extraction failed", e);
    return "User provided prompt directly. Focus on clarity and structure.";
  }
};

// --- Phase 2: Real-time Editor Mentor & Reconstruction ---

export const getMentorFeedback = async (
  currentPrompt: string,
  context: string,
  language: Language,
  ignoredFeedback: string[] = []
): Promise<string | null> => {
  const modelId = getModelForFeature(FeatureType.Mentor);
  const modelConfig = getModelConfigForFeature(FeatureType.Mentor);

  if (!modelConfig) {
    throw new Error(`Model configuration not found for feature: ${FeatureType.Mentor}`);
  }

  const langName = language === Language.Chinese ? "Simplified Chinese" : "English";

  const ignoreInstruction = ignoredFeedback.length > 0
    ? `CRITICAL: Do NOT repeat any of these previous suggestions: ${JSON.stringify(ignoredFeedback)}.`
    : "";

  const contents = `You are a strict Prompt Mentor.
        Context: ${context}
        Current Prompt: "${currentPrompt}"

        Task: Identify the WEAKEST pillar (Persona, Task, Context, Format) or specific phrasing issue.
        Provide ONE short, specific tip to improve it.
        Keep it under 15 words.
        ${ignoreInstruction}
        RESPONSE LANGUAGE: ${langName}.`;

  if (modelConfig.provider === ApiProvider.DeepSeek || modelConfig.provider === ApiProvider.OpenAI || modelConfig.provider === ApiProvider.Custom) {
    try {
      const apiKey = getApiKeyForModel(modelConfig, currentSettings);
      const result = await callOpenAICompatible(
        modelConfig,
        [{ role: 'user', content: contents }],
        apiKey,
        0.5
      );
      return result ? result.trim() : null;
    } catch (e) {
      console.warn("Mentor feedback failed (DeepSeek)", e);
      return null;
    }
  }

  const ai = getAiClient(modelId);
  try {
    const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: modelConfig.modelName,
      config: { temperature: 0.5 }, // Fixed: slightly higher for variety
      contents,
    }));
    return response.text ? response.text.trim() : null;
  } catch (e) {
    console.warn("Mentor feedback failed (likely quota):", e);
    return null;
  }
};

export const applySpecificFeedback = async (
  currentPrompt: string,
  context: string,
  feedback: string,
  lockedSegments: string[],
  language: Language
): Promise<string> => {
  const modelId = getModelForFeature(FeatureType.Feedback);
  const modelConfig = getModelConfigForFeature(FeatureType.Feedback);

  if (!modelConfig) {
    throw new Error(`Model configuration not found for feature: ${FeatureType.Feedback}`);
  }

  const isZh = language === Language.Chinese;

  const lockedInstruction = lockedSegments.length > 0
    ? `CRITICAL: The following parts MUST remain exactly as they are: ${lockedSegments.map(s => `"${s}"`).join(', ')}`
    : "";

  const contents = `You are a Surgical Text Editor.

    Current Prompt: "${currentPrompt}"
    User Context: ${context}

    Target Improvement: "${feedback}"

    Task: Modify the "Current Prompt" to incorporate the "Target Improvement".

    Guidelines:
    1. Make the MINIMUM necessary changes to satisfy the improvement.
    2. Preserve the original structure and tone as much as possible.
    3. ${lockedInstruction}

    Output:
    Return ONLY the modified prompt text. No explanations.
    OUTPUT LANGUAGE: ${isZh ? "Simplified Chinese" : "English"}.`;

  if (modelConfig.provider === ApiProvider.DeepSeek || modelConfig.provider === ApiProvider.OpenAI || modelConfig.provider === ApiProvider.Custom) {
    try {
      const apiKey = getApiKeyForModel(modelConfig, currentSettings);
      const result = await callOpenAICompatible(modelConfig, [{ role: 'user', content: contents }], apiKey, 0.2);
      return result ? result.trim() : currentPrompt;
    } catch (e) {
      console.error("Apply feedback failed (DeepSeek)", e);
      return currentPrompt;
    }
  }

  const ai = getAiClient(modelId);

  try {
    const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: modelConfig.modelName,
      config: { temperature: 0.2 }, // Fixed: low for consistent classification
      contents
    }));
    return response.text ? response.text.trim() : currentPrompt;
  } catch (e) {
    console.error("Apply feedback failed:", e);
    return currentPrompt;
  }
};

export const getDetailedCritique = async (currentPrompt: string, context: string, language: Language): Promise<Suggestion[]> => {
  const modelId = getModelForFeature(FeatureType.Critique);
  const modelConfig = getModelConfigForFeature(FeatureType.Critique);

  if (!modelConfig) {
    throw new Error(`Model configuration not found for feature: ${FeatureType.Critique}`);
  }

  const langName = language === Language.Chinese ? "Simplified Chinese" : "English";
  const contents = `You are a meticulous Copy Editor for AI Prompts.
            Analyze the "Current Prompt" and find specific sentences or phrases that are vague, weak, or confusing.

            Context: ${context}
            Current Prompt: "${currentPrompt}"

            Return a JSON array of suggestions.
            Format:
            [
                {
                    "originalText": "exact substring from the prompt",
                    "suggestedText": "improved version",
                    "reason": "short reason",
                    "type": "clarity"
                }
            ]

            Rules:
            1. "originalText" MUST match a substring in the prompt EXACTLY.
            2. Limit to 3-5 most important suggestions.
            3. "suggestedText" must only replace the "originalText".
            4. Language: ${langName}.`;

  if (modelConfig.provider === ApiProvider.DeepSeek || modelConfig.provider === ApiProvider.OpenAI || modelConfig.provider === ApiProvider.Custom) {
    try {
      const apiKey = getApiKeyForModel(modelConfig, currentSettings);
      // Use JSON mode
      const result = await callOpenAICompatible(modelConfig, [{ role: 'user', content: contents }], apiKey, 0.1, true);
      const json = JSON.parse(result);
      return Array.isArray(json) ? json.map((item: any) => ({
        ...item,
        id: Math.random().toString(36).substr(2, 9)
      })) : [];
    } catch (e) {
      console.warn("Critique failed (DeepSeek)", e);
      return [];
    }
  }

  const ai = getAiClient(modelId);

  try {
    const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: modelConfig.modelName,
      config: {
        responseMimeType: "application/json",
        temperature: 0.1 // Fixed: very low for consistent critiques
      },
      contents
    }));

    const text = response.text || "[]";
    const json = JSON.parse(text);

    return Array.isArray(json) ? json.map((item: any) => ({
      ...item,
      id: Math.random().toString(36).substr(2, 9)
    })) : [];

  } catch (e) {
    console.warn("Critique failed:", e);
    return [];
  }
};

export const classifyPromptSegment = async (segment: string, fullPrompt: string): Promise<Pillar> => {
  const modelId = getModelForFeature(FeatureType.Classify);
  const modelConfig = getModelConfigForFeature(FeatureType.Classify);

  if (!modelConfig) {
    throw new Error(`Model configuration not found for feature: ${FeatureType.Classify}`);
  }

  const contents = `Classify this prompt segment into: Persona, Task, Context, Format, or Other.
            Full Prompt: "${fullPrompt}"
            Target Segment: "${segment}"
            Return ONLY the word.`;

  if (modelConfig.provider === ApiProvider.DeepSeek || modelConfig.provider === ApiProvider.OpenAI || modelConfig.provider === ApiProvider.Custom) {
    try {
      const apiKey = getApiKeyForModel(modelConfig, currentSettings);
      const text = await callOpenAICompatible(modelConfig, [{ role: 'user', content: contents }], apiKey, 0.1);
      const normalized = text ? text.trim().toLowerCase() : '';
      if (normalized.includes('persona')) return Pillar.Persona;
      if (normalized.includes('task')) return Pillar.Task;
      if (normalized.includes('context')) return Pillar.Context;
      if (normalized.includes('format')) return Pillar.Format;
      return Pillar.Other;
    } catch (e) {
      return Pillar.Other;
    }
  }

  const ai = getAiClient(modelId);
  try {
    const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: modelConfig.modelName,
      config: { temperature: 0.1 }, // Fixed: very low for precision edits
      contents
    }));

    const text = response.text ? response.text.trim().toLowerCase() : '';

    if (text.includes('persona')) return Pillar.Persona;
    if (text.includes('task')) return Pillar.Task;
    if (text.includes('context')) return Pillar.Context;
    if (text.includes('format')) return Pillar.Format;

    return Pillar.Other;
  } catch (e) {
    return Pillar.Other;
  }
};

export const reconstructPrompt = async (
  currentPrompt: string,
  context: string,
  lockedSegments: string[],
  language: Language,
  focusSegment?: string
): Promise<string> => {
  const modelId = getModelForFeature(FeatureType.Rewrite);
  const modelConfig = getModelConfigForFeature(FeatureType.Rewrite);

  if (!modelConfig) {
    throw new Error(`Model configuration not found for feature: ${FeatureType.Rewrite}`);
  }

  const isZh = language === Language.Chinese;

  // Case 1: Partial Rewrite (Focus Segment provided)
  // We want ONLY the rewritten segment returned.
  if (focusSegment) {
    const contents = `You are a precise text editor.
     User Context: ${context}
     Full Text: "${currentPrompt}"

     Segment to Rewrite: "${focusSegment}"

     Task: Rewrite ONLY the "Segment to Rewrite" to be clearer, more professional, or more impactful within the context.

     IMPORTANT:
     1. Return ONLY the rewritten segment string.
     2. Do NOT include any other parts of the Full Text.
     3. Do NOT include conversational filler like "Here is the rewritten text".
     4. Language: ${isZh ? "Simplified Chinese" : "English"}.`;

    if (modelConfig.provider === ApiProvider.DeepSeek || modelConfig.provider === ApiProvider.OpenAI || modelConfig.provider === ApiProvider.Custom) {
      try {
        const apiKey = getApiKeyForModel(modelConfig, currentSettings);
        const result = await callOpenAICompatible(modelConfig, [{ role: 'user', content: contents }], apiKey, 0.3);
        return result ? result.trim() : focusSegment;
      } catch (e) {
        console.error("Partial rewrite failed (DeepSeek)", e);
        return focusSegment;
      }
    }

    const ai = getAiClient(modelId);
    try {
      const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: modelConfig.modelName,
        config: { temperature: 0.3 }, // Fixed: low for precision scanning
        contents
      }));
      return response.text ? response.text.trim() : focusSegment;
    } catch (e) {
      console.error("Partial rewrite failed:", e);
      return focusSegment;
    }
  }

  // Case 2: Full Rewrite (No focus segment)
  // We want the FULL prompt returned with locks respected.
  const promptText = isZh
    ? `任务：重写并优化整个提示词。`
    : `Rewrite and optimize the entire prompt to be a "Power Prompt".`;

  const lockedInstruction = lockedSegments.length > 0
    ? `CRITICAL: The following parts MUST remain exactly as they are: ${lockedSegments.map(s => `"${s}"`).join(', ')}`
    : "";

  const contents = `You are an expert Prompt Engineer.
      Context provided by user: ${context}
      Current Prompt Draft: "${currentPrompt}"
      
      ${promptText}
      
      CRITICAL INSTRUCTION:
      You must STRICTLY adhere to the "Context provided by user".
      The User Context contains the specific requirements (Persona, Task, etc.).
      Do not hallucinate new requirements. Only improve the phrasing and structure of the provided draft based on the Context.
      
      ${lockedInstruction}
      
      Requirement: Output ONLY the improved prompt text. Do not include explanations.
      OUTPUT LANGUAGE: ${isZh ? "Simplified Chinese (简体中文)" : "English"}. THIS IS CRITICAL.`;

  if (modelConfig.provider === ApiProvider.DeepSeek || modelConfig.provider === ApiProvider.OpenAI || modelConfig.provider === ApiProvider.Custom) {
    try {
      const apiKey = getApiKeyForModel(modelConfig, currentSettings);
      const result = await callOpenAICompatible(modelConfig, [{ role: 'user', content: contents }], apiKey, 0.7);
      return result ? result.trim() : currentPrompt;
    } catch (e) {
      console.warn("Full rewrite failed (DeepSeek)", e);
      return currentPrompt;
    }
  }

  const ai = getAiClient(modelId);

  const generate = (modelId: string) => {
    const modelConfig = getModelById(modelId, currentSettings.api.customModels);
    return ai.models.generateContent({
      model: modelConfig?.modelName || modelId,
      config: {
        temperature: 0.7 // Fixed: slightly creative for prompt generation
      },
      contents
    });
  };

  try {
    const response = await callWithRetry<GenerateContentResponse>(() => generate(getModelForFeature(FeatureType.Rewrite)));
    return response.text ? response.text.trim() : currentPrompt;
  } catch (e) {
    console.warn("Rewrite model quota exhausted, attempting fallback to Flash...", e);
    try {
      // Fallback to Gemini Flash if available
      const flashModel = currentSettings.api.customModels.find(m => m.modelName.includes('flash'));
      const response = await callWithRetry<GenerateContentResponse>(() =>
        generate(flashModel?.id || 'gemini-flash')
      );
      return response.text ? response.text.trim() : currentPrompt;
    } catch (e2) {
      console.error("Reconstruction completely failed:", e2);
      return currentPrompt;
    }
  }

};