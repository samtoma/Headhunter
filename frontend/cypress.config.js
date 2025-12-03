import { defineConfig } from "cypress";

export default defineConfig({
    e2e: {
        baseUrl: 'http://localhost:5173',
        setupNodeEvents(on, config) {
            on('task', {
                log(message) {
                    console.log(message)
                    return null
                },
            })
        },
        // Enable support file for custom commands
        supportFile: 'cypress/support/commands.js',
        // Add retry configuration for flaky tests
        retries: {
            runMode: 2,  // Retry failed tests up to 2 times in CI
            openMode: 0  // No retries in interactive mode
        },
        // Increase default timeouts
        defaultCommandTimeout: 8000,
        pageLoadTimeout: 60000
    },
});
