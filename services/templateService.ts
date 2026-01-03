import { PromptTemplate } from '../types';
import { BUILT_IN_TEMPLATES } from '../data/templates';

const STORAGE_KEY = 'promptmaster-custom-templates';

// Get custom templates from localStorage
export const getCustomTemplates = (): PromptTemplate[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.warn('Failed to load custom templates:', error);
        return [];
    }
};

// Save custom templates to localStorage
const saveCustomTemplates = (templates: PromptTemplate[]): void => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    } catch (error) {
        console.error('Failed to save custom templates:', error);
    }
};

// Get all templates (built-in + custom)
export const getAllTemplates = (): PromptTemplate[] => {
    return [...BUILT_IN_TEMPLATES, ...getCustomTemplates()];
};

// Create a new custom template
export const createCustomTemplate = (
    template: Omit<PromptTemplate, 'id' | 'isBuiltIn' | 'createdAt' | 'updatedAt'>
): PromptTemplate => {
    const newTemplate: PromptTemplate = {
        ...template,
        id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        isBuiltIn: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
    };

    const customTemplates = getCustomTemplates();
    customTemplates.push(newTemplate);
    saveCustomTemplates(customTemplates);

    return newTemplate;
};

// Update an existing custom template
export const updateCustomTemplate = (
    id: string,
    updates: Partial<Pick<PromptTemplate, 'name' | 'description' | 'category' | 'prompt' | 'context' | 'tags'>>
): PromptTemplate | null => {
    const customTemplates = getCustomTemplates();
    const existing = customTemplates.find(t => t.id === id);

    if (!existing) return null;

    const updatedTemplate: PromptTemplate = {
        id: existing.id,
        name: updates.name ?? existing.name,
        description: updates.description ?? existing.description,
        category: updates.category ?? existing.category,
        prompt: updates.prompt ?? existing.prompt,
        context: updates.context ?? existing.context,
        tags: updates.tags ?? existing.tags,
        isBuiltIn: existing.isBuiltIn,
        createdAt: existing.createdAt,
        updatedAt: Date.now()
    };

    const index = customTemplates.findIndex(t => t.id === id);
    customTemplates[index] = updatedTemplate;
    saveCustomTemplates(customTemplates);
    return updatedTemplate;
};

// Delete a custom template
export const deleteCustomTemplate = (id: string): boolean => {
    const customTemplates = getCustomTemplates();
    const filtered = customTemplates.filter(t => t.id !== id);

    if (filtered.length === customTemplates.length) return false;

    saveCustomTemplates(filtered);
    return true;
};

// Export templates to JSON
export const exportTemplates = (templates: PromptTemplate[]): string => {
    const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        templates: templates.map(t => ({
            ...t,
            isBuiltIn: false // Always mark as custom when exporting
        }))
    };
    return JSON.stringify(exportData, null, 2);
};

// Import templates from JSON
export const importTemplates = (jsonString: string): PromptTemplate[] => {
    try {
        const data = JSON.parse(jsonString);

        if (!data.templates || !Array.isArray(data.templates)) {
            throw new Error('Invalid template format');
        }

        const importedTemplates: PromptTemplate[] = data.templates.map((t: PromptTemplate) => ({
            ...t,
            id: `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            isBuiltIn: false,
            createdAt: Date.now(),
            updatedAt: Date.now()
        }));

        const customTemplates = getCustomTemplates();
        const mergedTemplates = [...customTemplates, ...importedTemplates];
        saveCustomTemplates(mergedTemplates);

        return importedTemplates;
    } catch (error) {
        console.error('Failed to import templates:', error);
        throw new Error('Invalid template file format');
    }
};

// Download templates as JSON file
export const downloadTemplatesAsFile = (templates: PromptTemplate[], filename: string = 'templates.json'): void => {
    const jsonContent = exportTemplates(templates);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
