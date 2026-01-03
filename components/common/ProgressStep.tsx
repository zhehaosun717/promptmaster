import React from 'react';
import { Check } from 'lucide-react';

export interface ProgressStepProps {
    number: string;
    label: string;
    icon?: React.ElementType;
    isActive: boolean;
    isCompleted: boolean;
    theme?: 'light' | 'dark';
}

export default function ProgressStep({
    number,
    label,
    icon: Icon,
    isActive,
    isCompleted,
    theme = 'dark'
}: ProgressStepProps) {
    return (
        <div
            className={`flex items-center gap-2 ${isActive ? 'opacity-100' : 'opacity-50'
                } transition-opacity duration-300`}
        >
            <div
                className={`
          w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all
          ${isActive || isCompleted
                        ? 'bg-blue-600 border-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]'
                        : 'bg-transparent border-gray-600 text-gray-400'
                    }
        `}
            >
                {isCompleted ? (
                    <Check size={16} />
                ) : Icon ? (
                    <Icon size={16} />
                ) : (
                    number
                )}
            </div>
            <div className="hidden md:block">
                <div
                    className={`text-xs font-bold ${isActive || isCompleted
                            ? theme === 'light'
                                ? 'text-gray-900'
                                : 'text-white'
                            : 'text-gray-400'
                        }`}
                >
                    {label}
                </div>
            </div>
        </div>
    );
}
