import { useState, useEffect } from 'react';
import { AppSettings } from '../types';

type Theme = 'light' | 'dark';
type ThemeSetting = 'light' | 'dark' | 'system';

export function useTheme(settings: AppSettings) {
    const [effectiveTheme, setEffectiveTheme] = useState<Theme>('light');

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const resolveTheme = () => {
            if (settings.theme === 'system') {
                return mediaQuery.matches ? 'dark' : 'light';
            }
            return settings.theme;
        };

        setEffectiveTheme(resolveTheme());

        const handleChange = () => {
            if (settings.theme === 'system') {
                setEffectiveTheme(mediaQuery.matches ? 'dark' : 'light');
            }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [settings.theme]);

    // Apply theme class to document body for global transitions
    useEffect(() => {
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(effectiveTheme);

        // Optional: Add transition class initially
        document.documentElement.style.setProperty('color-scheme', effectiveTheme);
    }, [effectiveTheme]);

    return effectiveTheme;
}
