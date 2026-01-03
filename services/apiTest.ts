import { GoogleGenAI } from '@google/genai';
import { getErrorMessage } from '../types/errors';

interface TestConnectionResult {
    success: boolean;
    message: string;
    error?: string;
}

/**
 * 测试 Gemini API 连接
 */
export async function testGeminiConnection(apiKey: string): Promise<TestConnectionResult> {
    if (!apiKey || apiKey.trim() === '') {
        return {
            success: false,
            message: 'API Key is empty',
            error: 'Please provide a valid API Key'
        };
    }

    try {
        const genAI = new GoogleGenAI({ apiKey });

        // 发送一个简单的测试请求
        // 使用 models.generateContent 替代 getGenerativeModel
        const result = await genAI.models.generateContent({
            model: 'gemini-pro',
            contents: 'Hello'
        });

        if (result.text && result.text.length > 0) {
            return {
                success: true,
                message: 'Connection successful! API Key is valid.'
            };
        } else {
            return {
                success: false,
                message: 'Connection failed',
                error: 'No response received from API'
            };
        }
    } catch (error: unknown) {
        // 解析错误类型
        const errorMessage = getErrorMessage(error);
        let userFriendlyMessage = 'Unknown error occurred';

        if (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('Invalid API key')) {
            userFriendlyMessage = 'Invalid API Key. Please check your key and try again.';
        } else if (errorMessage.includes('PERMISSION_DENIED')) {
            userFriendlyMessage = 'Permission denied. Please check your API key permissions.';
        } else if (errorMessage.includes('QUOTA_EXCEEDED')) {
            userFriendlyMessage = 'API quota exceeded. Please check your usage limits.';
        } else if (errorMessage.includes('NETWORK')) {
            userFriendlyMessage = 'Network error. Please check your internet connection.';
        } else {
            userFriendlyMessage = errorMessage;
        }

        return {
            success: false,
            message: 'Connection failed',
            error: userFriendlyMessage
        };
    }
}
