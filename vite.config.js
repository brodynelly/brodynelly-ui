import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

const launch = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
	? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
	: undefined;

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.js',
				test: {
					name: 'client',
					environment: 'browser',
					browser: {
						enabled: true,
						provider: 'playwright',
						headless: true,
						instances: [{ browser: 'chromium', ...(launch ? { launch } : {}) }],
						screenshotDirectory: '.checks/screenshots'
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**'],
					setupFiles: ['./vitest-setup-client.js']
				}
			},
			{
				extends: './vite.config.js',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}', 'tests/pointer/**/*.spec.js'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
