import React from 'react';

export interface CardProps {
    children: React.ReactNode;
    theme?: 'light' | 'dark';
    padding?: 'none' | 'sm' | 'md' | 'lg';
    shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    border?: boolean;
    className?: string;
}

export default function Card({
    children,
    theme = 'dark',
    padding = 'md',
    shadow = 'lg',
    rounded = '2xl',
    border = true,
    className = ''
}: CardProps) {
    const paddingClasses = {
        none: '',
        sm: 'p-3',
        md: 'p-6',
        lg: 'p-8'
    };

    const shadowClasses = {
        none: '',
        sm: 'shadow-sm',
        md: 'shadow-md',
        lg: 'shadow-lg',
        xl: 'shadow-xl',
        '2xl': 'shadow-2xl'
    };

    const roundedClasses = {
        none: '',
        sm: 'rounded-sm',
        md: 'rounded-md',
        lg: 'rounded-lg',
        xl: 'rounded-xl',
        '2xl': 'rounded-2xl'
    };

    const baseClasses = theme === 'light'
        ? `bg-white ${border ? 'border border-gray-300' : ''}`
        : `bg-gray-800 ${border ? 'border border-gray-700' : ''}`;

    return (
        <div
            className={`
        ${baseClasses}
        ${paddingClasses[padding]}
        ${shadowClasses[shadow]}
        ${roundedClasses[rounded]}
        ${className}
      `.trim()}
        >
            {children}
        </div>
    );
}
