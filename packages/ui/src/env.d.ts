interface ImportMetaEnv {
  readonly BASE_URL: string;
  readonly VITE_DISABLE_MOCK_API?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
