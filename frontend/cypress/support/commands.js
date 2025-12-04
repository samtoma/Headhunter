/**
 * Cypress Custom Commands for E2E Testing
 * 
 * These commands interact with REAL API endpoints (not mocked).
 * They help with authentication, data setup, and cleanup in E2E tests.
 */

/**
 * Login with real API call
 * @param {string} email - User email
 * @param {string} password - User password
 */
Cypress.Commands.add('loginViaAPI', (email, password) => {
    cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/api/auth/login`,
        form: true,
        body: {
            username: email,
            password: password
        }
    }).then((response) => {
        expect(response.status).to.eq(200);
        const { access_token, role, company_name } = response.body;

        // Store in localStorage
        window.localStorage.setItem('token', access_token);
        window.localStorage.setItem('role', role);
        window.localStorage.setItem('company_name', company_name);

        return response.body;
    });
});

/**
 * Sign up a new user with real API call
 * @param {object} userData - User data (email, password, full_name)
 */
Cypress.Commands.add('signupViaAPI', (userData) => {
    cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/api/auth/signup`,
        body: userData
    }).then((response) => {
        expect(response.status).to.eq(201);
        return response.body;
    });
});

/**
 * Get current user via authenticated API call
 */
Cypress.Commands.add('getCurrentUser', () => {
    const token = window.localStorage.getItem('token');

    cy.request({
        method: 'GET',
        url: `${Cypress.env('apiUrl')}/api/users/me`,
        headers: {
            'Authorization': `Bearer ${token}`
        }
    }).then((response) => {
        expect(response.status).to.eq(200);
        return response.body;
    });
});

/**
 * Seed test database with initial data
 * This runs the backend seeding script
 */
Cypress.Commands.add('seedDatabase', () => {
    cy.exec('docker compose -f docker-compose.e2e.yml exec backend-e2e python tests/seed_test_data.py', {
        timeout: 30000
    });
});

/**
 * Clean up test database
 * Truncates all tables except system tables
 */
Cypress.Commands.add('cleanDatabase', () => {
    const token = window.localStorage.getItem('token');

    cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/api/test/cleanup`,
        headers: {
            'Authorization': `Bearer ${token}`
        },
        failOnStatusCode: false
    });
});

/**
 * Create a job via API
 * @param {object} jobData - Job data
 */
Cypress.Commands.add('createJobViaAPI', (jobData) => {
    const token = window.localStorage.getItem('token');

    cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/api/jobs`,
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: jobData
    }).then((response) => {
        expect(response.status).to.be.oneOf([200, 201]);
        return response.body;
    });
});

/**
 * Upload CV file via API
 * @param {string} filePath - Path to CV file
 */
Cypress.Commands.add('uploadCVViaAPI', (filePath) => {
    const token = window.localStorage.getItem('token');

    cy.fixture(filePath, 'binary').then((fileContent) => {
        const blob = Cypress.Blob.binaryStringToBlob(fileContent, 'application/pdf');
        const formData = new FormData();
        formData.append('file', blob, 'test_resume.pdf');

        cy.request({
            method: 'POST',
            url: `${Cypress.env('apiUrl')}/api/cvs/upload`,
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        }).then((response) => {
            expect(response.status).to.be.oneOf([200, 201, 202]);
            return response.body;
        });
    });
});

/**
 * Wait for background job to complete (Celery task)
 * @param {string} taskId - Celery task ID
 * @param {number} timeout - Max wait time in ms
 */
Cypress.Commands.add('waitForBackgroundJob', (taskId, timeout = 30000) => {
    const token = window.localStorage.getItem('token');
    const startTime = Date.now();

    function checkStatus() {
        if (Date.now() - startTime > timeout) {
            throw new Error('Background job timed out');
        }

        cy.request({
            method: 'GET',
            url: `${Cypress.env('apiUrl')}/api/tasks/${taskId}`,
            headers: {
                'Authorization': `Bearer ${token}`
            }
        }).then((response) => {
            if (response.body.status === 'completed') {
                return response.body;
            } else if (response.body.status === 'failed') {
                throw new Error('Background job failed');
            } else {
                cy.wait(1000);
                checkStatus();
            }
        });
    }

    checkStatus();
});

/**
 * Login and set session programmatically before visiting page
 * @param {string} email - User email  
 * @param {string} password - User password
 */
Cypress.Commands.add('loginAndVisit', (email, password, path = '/') => {
    cy.loginViaAPI(email, password).then(() => {
        cy.visit(path);
    });
});
