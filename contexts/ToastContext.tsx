import React, { createContext, useContext, useState, useCallback } from 'react';
import Toast, { ToastType } from '../components/Toast';

interface ToastContextType {
    showToast: (message: string, type: ToastType) => void;
    showSuccess: (message: string) => void;
    showError: (message: string) => void;
    showWarning: (message: string) => void;
    showInfo: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
}

interface ToastItem {
    id: string;
    message: string;
    type: ToastType;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const showToast = useCallback((message: string, type: ToastType) => {
        const id = Math.random().toString(36).substring(7);
        setToasts(prev => [...prev, { id, message, type }]);
    }, []);

    const showSuccess = useCallback((message: string) => showToast(message, 'success'), [showToast]);
    const showError = useCallback((message: string) => showToast(message, 'error'), [showToast]);
    const showWarning = useCallback((message: string) => showToast(message, 'warning'), [showToast]);
    const showInfo = useCallback((message: string) => showToast(message, 'info'), [showToast]);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast, showSuccess, showError, showWarning, showInfo }}>
            {children}
            <div>
                {toasts.map(toast => (
                    <Toast
                        key={toast.id}
                        type={toast.type}
                        message={toast.message}
                        onClose={() => removeToast(toast.id)}
                    />
                ))}
            </div>
        </ToastContext.Provider>
    );
}
