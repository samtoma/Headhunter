import { defineConfig } from "cypress";

export default defineConfig({
    e2e: {
        // Point to E2E test stack (docker-compose.e2e.yml)
        baseUrl: process.env.CYPRESS_BASE_URL || 'http://localhost:30014',

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

        // NO RETRIES - Tests should be reliable with real backend
        retries: {
            runMode: 0,  // No retries in CI
            openMode: 0  // No retries in interactive mode
        },

        // Increase timeouts for real API calls
        defaultCommandTimeout: 10000,
        requestTimeout: 10000,
        responseTimeout: 10000,
        pageLoadTimeout: 60000,

        // Test isolation
        testIsolation: true,

        // Video and screenshot settings
        video: true,
        screenshotOnRunFailure: true,
        // Screenshots are also taken via afterEach hook in support file

        env: {
            apiUrl: process.env.CYPRESS_API_URL || 'http://localhost:30011'
        }
    },
});
