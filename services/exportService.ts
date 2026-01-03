/**
 * Export Service
 * Handles exporting prompts in various formats and share link generation
 */

// Export as Markdown
export const exportAsMarkdown = (
    prompt: string,
    context?: string,
    title?: string
): string => {
    const date = new Date().toLocaleDateString();

    let md = `# ${title || 'Prompt'}\n\n`;
    md += `> Generated with PromptMaster AI on ${date}\n\n`;

    if (context) {
        md += `## Context\n\n${context}\n\n`;
    }

    md += `## Prompt\n\n\`\`\`\n${prompt}\n\`\`\`\n`;

    return md;
};

// Export as JSON
export const exportAsJSON = (
    prompt: string,
    context?: string,
    metadata?: Record<string, unknown>
): string => {
    const data = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        prompt,
        context: context || null,
        ...metadata
    };

    return JSON.stringify(data, null, 2);
};

// Generate shareable URL with encoded prompt
export const generateShareLink = (
    prompt: string,
    context?: string
): string => {
    const data = {
        p: prompt,
        c: context || ''
    };

    // Encode to base64 for URL safety
    const encoded = btoa(encodeURIComponent(JSON.stringify(data)));

    // Use current origin for the share link
    const baseUrl = typeof window !== 'undefined'
        ? window.location.origin
        : 'https://promptmaster.app';

    return `${baseUrl}?share=${encoded}`;
};

// Parse share link and extract prompt data
export const parseShareLink = (
    url: string
): { prompt: string; context?: string } | null => {
    try {
        const urlObj = new URL(url);
        const shareParam = urlObj.searchParams.get('share');

        if (!shareParam) return null;

        const decoded = decodeURIComponent(atob(shareParam));
        const data = JSON.parse(decoded);

        return {
            prompt: data.p || '',
            context: data.c || undefined
        };
    } catch (error) {
        console.error('Failed to parse share link:', error);
        return null;
    }
};

// Copy to clipboard with format
export const copyToClipboard = async (
    text: string,
    onSuccess?: () => void,
    onError?: (error: Error) => void
): Promise<boolean> => {
    try {
        await navigator.clipboard.writeText(text);
        onSuccess?.();
        return true;
    } catch (error) {
        const err = error instanceof Error ? error : new Error('Copy failed');
        onError?.(err);
        return false;
    }
};

// Download as file
export const downloadAsFile = (
    content: string,
    filename: string,
    mimeType: string = 'text/plain'
): void => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
