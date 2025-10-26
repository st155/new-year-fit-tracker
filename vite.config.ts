import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const disableFastRefresh = process.env.VITE_DISABLE_REACT_REFRESH === 'true';
  
  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react(),
      // mode === 'development' && componentTagger(), // Disabled - causes import failures
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "react": path.resolve(__dirname, "node_modules/react"),
        "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
        "react/jsx-runtime": path.resolve(__dirname, "node_modules/react/jsx-runtime"),
      },
      dedupe: ["react", "react-dom"],
    },
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    build: {
      target: 'es2020',
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Vendor chunks
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
                return 'vendor-react';
              }
              if (id.includes('@tanstack/react-query')) {
                return 'vendor-query';
              }
              if (id.includes('@radix-ui')) {
                return 'vendor-ui';
              }
              if (id.includes('three') || id.includes('@react-three')) {
                return 'three';
              }
              if (id.includes('recharts')) {
                return 'charts';
              }
              if (id.includes('pdfjs-dist') || id.includes('pdf-lib')) {
                return 'pdf';
              }
              if (id.includes('framer-motion')) {
                return 'animations';
              }
              if (id.includes('date-fns') || id.includes('clsx') || id.includes('tailwind-merge') || id.includes('zod')) {
                return 'utils';
              }
              return 'vendor';
            }

            // Route-based code splitting
            if (id.includes('/src/pages/')) {
              const page = id.split('/pages/')[1].split('.')[0];
              return `page-${page.toLowerCase()}`;
            }

            // Component-based splitting for heavy components
            if (id.includes('/src/components/body-composition/')) {
              return 'body-composition';
            }
            if (id.includes('/src/components/trainer/')) {
              return 'trainer';
            }
          },
        },
      },
      minify: 'esbuild',
      esbuildOptions: {
        drop: mode === 'production' ? ['console', 'debugger'] : [],
        treeShaking: true,
      },
      sourcemap: mode === 'production' ? 'hidden' : true,
      chunkSizeWarningLimit: 500,
      cssCodeSplit: true,
    },
  };
});
