/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY: string;
  readonly GEMINI_API_KEY: string;
  readonly VITE_DEFAULT_API_KEY: string;
  readonly VITE_DEFAULT_BASE_URL: string;
  readonly VITE_MODEL_MAPPING: string;
  readonly VITE_APP_LANGUAGE: string;
  readonly VITE_APP_THEME: string;
  readonly VITE_API_KEY?: string;
  readonly API_KEY?: string;
  readonly [key: string]: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}