import React, { useState, useMemo } from 'react';
import { PromptTemplate, TemplateCategory, TEMPLATE_CATEGORY_LABELS, Language } from '../types';
import { BUILT_IN_TEMPLATES, searchTemplates, getTemplatesByCategory } from '../data/templates';
import { getCustomTemplates } from '../services/templateService';
import { Code, Edit3, Search as SearchIcon, Microscope, Briefcase, Sparkles, FolderOpen, X, Check } from 'lucide-react';

interface TemplatePickerProps {
    language: Language;
    theme: 'light' | 'dark' | 'system';
    onSelect: (template: PromptTemplate) => void;
    onClose: () => void;
}

const categoryIcons: Record<TemplateCategory | 'all', React.ReactNode> = {
    all: <FolderOpen size={16} />,
    coding: <Code size={16} />,
    writing: <Edit3 size={16} />,
    research: <Microscope size={16} />,
    business: <Briefcase size={16} />,
    creative: <Sparkles size={16} />,
    custom: <FolderOpen size={16} />
};

export default function TemplatePicker({
    language,
    theme,
    onSelect,
    onClose
}: TemplatePickerProps) {
    const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);

    const effectiveTheme = theme === 'system' ? 'dark' : theme;
    const isZh = language === Language.Chinese;

    // Get all templates
    const allTemplates = useMemo(() => {
        const custom = getCustomTemplates();
        return [...BUILT_IN_TEMPLATES, ...custom];
    }, []);

    // Filter templates
    const filteredTemplates = useMemo(() => {
        let templates = allTemplates;

        // Filter by category
        if (selectedCategory !== 'all') {
            templates = getTemplatesByCategory(templates, selectedCategory);
        }

        // Filter by search
        if (searchQuery.trim()) {
            templates = searchTemplates(templates, searchQuery);
        }

        return templates;
    }, [allTemplates, selectedCategory, searchQuery]);

    const categories: (TemplateCategory | 'all')[] = ['all', 'coding', 'writing', 'research', 'business', 'creative', 'custom'];

    const getCategoryLabel = (cat: TemplateCategory | 'all'): string => {
        if (cat === 'all') return isZh ? '全部' : 'All';
        return isZh ? TEMPLATE_CATEGORY_LABELS[cat].zh : TEMPLATE_CATEGORY_LABELS[cat].en;
    };

    const handleUseTemplate = () => {
        if (selectedTemplate) {
            onSelect(selectedTemplate);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className={`rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden border ${effectiveTheme === 'light'
                    ? 'bg-white border-gray-200'
                    : 'bg-gray-900 border-gray-700'
                }`}>
                {/* Header */}
                <div className={`p-4 border-b flex items-center justify-between ${effectiveTheme === 'light' ? 'border-gray-200 bg-gray-50' : 'border-gray-700 bg-gray-800'
                    }`}>
                    <h2 className={`text-lg font-bold ${effectiveTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                        {isZh ? '📚 选择模板' : '📚 Choose Template'}
                    </h2>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-lg transition-colors ${effectiveTheme === 'light'
                                ? 'hover:bg-gray-200 text-gray-500'
                                : 'hover:bg-gray-700 text-gray-400'
                            }`}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Search & Categories */}
                <div className={`p-4 border-b ${effectiveTheme === 'light' ? 'border-gray-200' : 'border-gray-700'}`}>
                    {/* Search */}
                    <div className="relative mb-4">
                        <SearchIcon className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${effectiveTheme === 'light' ? 'text-gray-400' : 'text-gray-500'
                            }`} size={18} />
                        <input
                            type="text"
                            placeholder={isZh ? '搜索模板...' : 'Search templates...'}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${effectiveTheme === 'light'
                                    ? 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                                    : 'bg-gray-800 border-gray-600 text-white placeholder-gray-500'
                                }`}
                        />
                    </div>

                    {/* Category Tabs */}
                    <div className="flex flex-wrap gap-2">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${selectedCategory === cat
                                        ? 'bg-blue-600 text-white'
                                        : effectiveTheme === 'light'
                                            ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                    }`}
                            >
                                {categoryIcons[cat]}
                                {getCategoryLabel(cat)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Templates Grid */}
                <div className="flex-1 overflow-y-auto p-4">
                    {filteredTemplates.length === 0 ? (
                        <div className={`text-center py-12 ${effectiveTheme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                            {isZh ? '没有找到匹配的模板' : 'No templates found'}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {filteredTemplates.map((template) => (
                                <button
                                    key={template.id}
                                    onClick={() => setSelectedTemplate(template)}
                                    className={`text-left p-4 rounded-xl border-2 transition-all ${selectedTemplate?.id === template.id
                                            ? 'border-blue-500 ring-2 ring-blue-500/20'
                                            : effectiveTheme === 'light'
                                                ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                : 'border-gray-700 hover:border-gray-600 hover:bg-gray-800/50'
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <h3 className={`font-semibold ${effectiveTheme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                                            {template.name}
                                        </h3>
                                        {selectedTemplate?.id === template.id && (
                                            <Check size={18} className="text-blue-500 shrink-0" />
                                        )}
                                    </div>
                                    <p className={`text-sm line-clamp-2 ${effectiveTheme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                                        {template.description}
                                    </p>
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {template.tags.slice(0, 3).map((tag) => (
                                            <span
                                                key={tag}
                                                className={`text-xs px-2 py-0.5 rounded-full ${effectiveTheme === 'light'
                                                        ? 'bg-gray-100 text-gray-500'
                                                        : 'bg-gray-700 text-gray-400'
                                                    }`}
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className={`p-4 border-t flex justify-between items-center ${effectiveTheme === 'light' ? 'border-gray-200 bg-gray-50' : 'border-gray-700 bg-gray-800'
                    }`}>
                    <span className={`text-sm ${effectiveTheme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                        {filteredTemplates.length} {isZh ? '个模板' : 'templates'}
                    </span>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${effectiveTheme === 'light'
                                    ? 'text-gray-600 hover:bg-gray-200'
                                    : 'text-gray-400 hover:bg-gray-700'
                                }`}
                        >
                            {isZh ? '取消' : 'Cancel'}
                        </button>
                        <button
                            onClick={handleUseTemplate}
                            disabled={!selectedTemplate}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <Check size={16} />
                            {isZh ? '使用模板' : 'Use Template'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
