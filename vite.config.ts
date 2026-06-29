import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev
export default defineConfig({
  // Hem GitHub Pages hem StackBlitz alt klasör yolları için bu şarttır:
  base: "./", 
  // Ağırlaştıran ve kilitlenmeye sebep olan singleFile eklentisini kaldırdık
  plugins: [react(), tailwindcss()], 
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
