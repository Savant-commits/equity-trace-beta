import { defineConfig } from 'vite';
import { resolve, relative } from 'path';
import { readdirSync, statSync } from 'fs';

function getHtmlEntries(dir) {
  const entries = {};

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = resolve(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'public') {
        continue;
      }
      Object.assign(entries, getHtmlEntries(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.html')) {
      const relativePath = relative(__dirname, fullPath).replace(/\\/g, '/');
      const key = relativePath.replace(/\.html$/, '').replace(/\//g, '-');
      entries[key] = fullPath;
    }
  }

  return entries;
}

export default defineConfig({
  build: {
    rollupOptions: {
      input: getHtmlEntries(__dirname),
    },
  },
});
