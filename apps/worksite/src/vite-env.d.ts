/// <reference types="vite/client" />
interface ImportMetaEnv {
  /** 기본 테넌트 slug(crata-demo | tr-technology). 없으면 tr-technology */
  readonly VITE_DEFAULT_TENANT?: string;
}
interface ImportMeta { readonly env: ImportMetaEnv }
