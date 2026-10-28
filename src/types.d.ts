/// <reference types="vite/client" />
declare module 'html-minifier-terser/dist/htmlminifier.esm.bundle' {
  export { minify } from 'html-minifier-terser';
}
declare module 'javascript-obfuscator/dist/index.browser.js' {
  import JavaScriptObfuscator from 'javascript-obfuscator';
  export default JavaScriptObfuscator;
}
