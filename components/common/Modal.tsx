import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    theme?: 'light' | 'dark' | 'system';
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    showCloseButton?: boolean;
    headerGradient?: boolean;
}

export default function Modal({
    isOpen,
    onClose,
    title,
    children,
    footer,
    theme = 'dark',
    maxWidth = 'lg',
    showCloseButton = true,
    headerGradient = false
}: ModalProps) {
    // Resolve 'system' to 'dark' as fallback (system theme should be resolved before reaching Modal)
    const effectiveTheme: 'light' | 'dark' = theme === 'system' ? 'dark' : theme;
    // Close on ESC key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            // Prevent body scroll when modal is open
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const maxWidthClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl'
    };

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div
                className={`rounded-xl shadow-2xl w-full ${maxWidthClasses[maxWidth]} border ${effectiveTheme === 'light'
                    ? 'bg-white border-gray-300'
                    : 'bg-gray-800 border-gray-700'
                    }`}
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
            >
                {/* Header */}
                {title && (
                    <div
                        className={`p-6 rounded-t-xl ${headerGradient
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                            : effectiveTheme === 'light'
                                ? 'border-b border-gray-300 bg-gray-50'
                                : 'border-b border-gray-700 bg-gray-900'
                            }`}
                    >
                        <div className="flex items-center justify-between">
                            <h2
                                className={`text-xl font-bold ${headerGradient
                                    ? 'text-white'
                                    : effectiveTheme === 'light'
                                        ? 'text-gray-900'
                                        : 'text-white'
                                    }`}
                            >
                                {title}
                            </h2>
                            {showCloseButton && (
                                <button
                                    onClick={onClose}
                                    className={`p-1 rounded-lg transition-colors ${headerGradient
                                        ? 'hover:bg-white/20 text-white'
                                        : effectiveTheme === 'light'
                                            ? 'hover:bg-gray-200 text-gray-600'
                                            : 'hover:bg-gray-700 text-gray-400'
                                        }`}
                                >
                                    <X size={20} />
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="p-6">{children}</div>

                {/* Footer */}
                {footer && (
                    <div
                        className={`border-t p-6 flex justify-end gap-3 ${effectiveTheme === 'light' ? 'border-gray-300' : 'border-gray-700'
                            }`}
                    >
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
