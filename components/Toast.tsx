import React from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
    type: ToastType;
    message: string;
    onClose: () => void;
    theme?: 'light' | 'dark';
}

export default function Toast({ type, message, onClose, theme = 'dark' }: ToastProps) {
    const config = {
        success: {
            icon: CheckCircle,
            bgLight: 'bg-green-50 border-green-500',
            bgDark: 'bg-green-900/20 border-green-500',
            textLight: 'text-green-800',
            textDark: 'text-green-300',
            iconColor: 'text-green-500'
        },
        error: {
            icon: XCircle,
            bgLight: 'bg-red-50 border-red-500',
            bgDark: 'bg-red-900/20 border-red-500',
            textLight: 'text-red-800',
            textDark: 'text-red-300',
            iconColor: 'text-red-500'
        },
        warning: {
            icon: AlertCircle,
            bgLight: 'bg-yellow-50 border-yellow-500',
            bgDark: 'bg-yellow-900/20 border-yellow-500',
            textLight: 'text-yellow-800',
            textDark: 'text-yellow-300',
            iconColor: 'text-yellow-500'
        },
        info: {
            icon: Info,
            bgLight: 'bg-blue-50 border-blue-500',
            bgDark: 'bg-blue-900/20 border-blue-500',
            textLight: 'text-blue-800',
            textDark: 'text-blue-300',
            iconColor: 'text-blue-500'
        }
    };

    const currentConfig = config[type];
    const Icon = currentConfig.icon;

    // 自动关闭
    React.useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 5000);

        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
            <div className={`flex items-start gap-3 p-4 rounded-lg border-l-4 shadow-lg backdrop-blur-sm min-w-[300px] max-w-[500px] ${theme === 'light'
                    ? `${currentConfig.bgLight} ${currentConfig.textLight}`
                    : `${currentConfig.bgDark} ${currentConfig.textDark}`
                }`}>
                <Icon className={`w-5 h-5 ${currentConfig.iconColor} flex-shrink-0 mt-0.5`} />
                <p className="flex-1 text-sm font-medium">
                    {message}
                </p>
                <button
                    onClick={onClose}
                    className={`transition-colors flex-shrink-0 ${theme === 'light'
                            ? 'text-gray-600 hover:text-gray-800'
                            : 'text-gray-400 hover:text-gray-200'
                        }`}
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
