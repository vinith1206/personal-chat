/** @type {import('tailwindcss').Config} */
export default {
	content: [
		'./index.html',
		'./src/**/*.{js,ts,jsx,tsx}'
	],
	darkMode: 'class',
	theme: {
		extend: {
			fontFamily: {
				sans: ['Inter', 'system-ui', 'Arial', 'sans-serif']
			},
			boxShadow: {
				soft: '0 2px 8px rgba(0,0,0,0.06)'
			}
		},
	},
	plugins: [],
}
