interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_DISABLE_MOCK_API?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
