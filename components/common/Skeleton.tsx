import React from 'react';

export interface SkeletonProps {
    variant?: 'text' | 'paragraph' | 'card' | 'circle';
    width?: string;
    height?: string;
    lines?: number;
    theme?: 'light' | 'dark' | 'system';
    className?: string;
}

export default function Skeleton({
    variant = 'text',
    width,
    height,
    lines = 3,
    theme = 'dark',
    className = ''
}: SkeletonProps) {
    const baseColor = theme === 'light' ? 'bg-gray-200' : 'bg-gray-700';
    const shimmerColor = theme === 'light'
        ? 'from-gray-200 via-gray-100 to-gray-200'
        : 'from-gray-700 via-gray-600 to-gray-700';

    const baseClasses = `animate-shimmer bg-gradient-to-r ${shimmerColor} bg-[length:468px_100%]`;

    if (variant === 'circle') {
        return (
            <div
                className={`${baseClasses} rounded-full ${className}`}
                style={{
                    width: width || '40px',
                    height: height || '40px'
                }}
            />
        );
    }

    if (variant === 'card') {
        return (
            <div
                className={`${baseClasses} rounded-xl ${className}`}
                style={{
                    width: width || '100%',
                    height: height || '120px'
                }}
            />
        );
    }

    if (variant === 'paragraph') {
        return (
            <div className={`space-y-2 ${className}`} style={{ width: width || '100%' }}>
                {Array.from({ length: lines }).map((_, i) => (
                    <div
                        key={i}
                        className={`${baseClasses} rounded h-4`}
                        style={{
                            width: i === lines - 1 ? '75%' : '100%'
                        }}
                    />
                ))}
            </div>
        );
    }

    // Default: text (single line)
    return (
        <div
            className={`${baseClasses} rounded h-4 ${className}`}
            style={{
                width: width || '100%',
                height: height || '16px'
            }}
        />
    );
}

// Pre-built skeleton compositions
export function MessageSkeleton({ theme = 'dark' }: { theme?: 'light' | 'dark' | 'system' }) {
    const effectiveTheme = theme === 'system' ? 'dark' : theme;
    return (
        <div className="flex items-start gap-4 animate-in fade-in duration-300">
            <Skeleton variant="circle" theme={effectiveTheme} />
            <div className="flex-1 space-y-2">
                <Skeleton variant="text" width="60%" theme={effectiveTheme} />
                <Skeleton variant="text" width="85%" theme={effectiveTheme} />
                <Skeleton variant="text" width="40%" theme={effectiveTheme} />
            </div>
        </div>
    );
}

export function TypingIndicator({ theme = 'dark' }: { theme?: 'light' | 'dark' | 'system' }) {
    const effectiveTheme = theme === 'system' ? 'dark' : theme;
    const dotColor = effectiveTheme === 'light' ? 'bg-gray-400' : 'bg-gray-500';

    return (
        <div className="flex items-center gap-1 px-3 py-2">
            <div className={`w-2 h-2 rounded-full ${dotColor} animate-typing-dot`} style={{ animationDelay: '0ms' }} />
            <div className={`w-2 h-2 rounded-full ${dotColor} animate-typing-dot`} style={{ animationDelay: '150ms' }} />
            <div className={`w-2 h-2 rounded-full ${dotColor} animate-typing-dot`} style={{ animationDelay: '300ms' }} />
        </div>
    );
}
