// Reexport the native module. On web, it will be resolved to MyRustModule.web.ts
// and on native platforms to MyRustModule.ts
export { default } from './src/MyRustModule';
export * from './src/MyRustModule.types';
export { default as MyRustModuleView } from './src/MyRustModuleView';

