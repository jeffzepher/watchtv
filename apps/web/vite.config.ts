import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
export default defineConfig({root:path.resolve('apps/web'),plugins:[react()],build:{outDir:path.resolve('dist/web'),emptyOutDir:true}});
