// Vite's `?worker&url` import: a worker bundled with its own imports, handed to the browser by URL.
declare module "*?worker&url" {
  const url: string;
  export default url;
}
