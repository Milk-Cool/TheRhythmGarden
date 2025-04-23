import { defineConfig } from 'vite'
import { ViteMinifyPlugin } from 'vite-plugin-minify'
import { resolve } from 'path' 

export default defineConfig({
    plugins: [
        ViteMinifyPlugin({}),
    ],
    build: {
        rollupOptions: {
            input: {
                main: resolve(import.meta.dirname, "index.html"),
                editor: resolve(import.meta.dirname, "editor.html")
            }
        }
    }
})