/**
 * Error handling utilities for type-safe error management
 */

export interface ApiError {
    message: string;
    code?: string;
    status?: number;
}

/**
 * Type guard to check if an unknown value is an Error instance
 */
export function isError(error: unknown): error is Error {
    return error instanceof Error;
}

/**
 * Safely extract error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
    if (isError(error)) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    if (error && typeof error === 'object' && 'message' in error) {
        return String(error.message);
    }
    return 'Unknown error occurred';
}

/**
 * Create a typed API error
 */
export function createApiError(message: string, code?: string, status?: number): ApiError {
    return { message, code, status };
}
