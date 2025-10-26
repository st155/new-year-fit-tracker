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
          format: 'es',
          inlineDynamicImports: false,
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-query': ['@tanstack/react-query'],
            'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tabs'],
            'vendor-supabase': ['@supabase/supabase-js'],
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
