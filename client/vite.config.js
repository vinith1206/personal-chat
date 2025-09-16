import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
	plugins: [react()],
	build: {
		outDir: 'dist',
		assetsDir: 'assets',
		sourcemap: false,
		minify: 'esbuild',
		chunkSizeWarningLimit: 1000,
		rollupOptions: {
			output: {
				manualChunks: {
					vendor: ['react', 'react-dom'],
					router: ['react-router-dom'],
					socket: ['socket.io-client'],
					emoji: ['emoji-mart', '@emoji-mart/data'],
					http: ['axios']
				}
			}
		}
	},
	server: {
		port: 5173,
		host: true
	}
})
