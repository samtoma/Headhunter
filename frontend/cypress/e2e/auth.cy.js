describe('Authentication Flow', () => {
    beforeEach(() => {
        cy.clearLocalStorage();
    });

    describe('1. Login Flow (Starting Logged Out)', () => {
        it('displays the login form correctly', () => {
            cy.visit('/login');
            cy.get('form').should('be.visible');
            cy.get('input[type="email"]').should('be.visible');
            cy.get('input[type="password"]').should('be.visible');
            cy.contains('Sign In').should('be.visible');
        });

        it('handles failed login attempts', () => {
            cy.visit('/login');

            // Mock failure
            cy.intercept('POST', '/api/auth/login', {
                statusCode: 401,
                body: { detail: 'Invalid credentials' }
            }).as('loginFail');

            cy.get('input[type="email"]').type('wrong@test.com');
            cy.get('input[type="password"]').type('wrongpass');
            cy.get('button[type="submit"]').click();

            cy.wait('@loginFail');

            // Check for error message - relaxed assertion
            cy.get('.bg-red-50', { timeout: 10000 }).should('be.visible');
        });

        it('successfully logs in as admin', () => {
            cy.mockAllAPIs();
            cy.visit('/login');

            cy.get('input[type="email"]').type('admin@test.com');
            cy.get('input[type="password"]').type('password123');
            cy.get('button[type="submit"]').click();

            // 1. Wait for login POST
            cy.wait('@loginRequest', { timeout: 10000 });

            // 2. Wait for subsequent data fetches triggered by dashboard load
            // The app fetches jobs and stats on load
            cy.wait(['@getJobs', '@getStats'], { timeout: 10000 });

            // 3. Verify URL
            cy.url().should('eq', Cypress.config().baseUrl + '/');

            // 4. Verify LocalStorage
            cy.window().its('localStorage.token').should('eq', 'mock-token-123');
        });
    });

    describe('2. Session Restoration (Starting Logged In)', () => {
        it('restores session and allows access to protected routes', () => {
            // Setup mocks
            cy.mockAllAPIs();

            // Inject session BEFORE app loads
            cy.visit('/', {
                onBeforeLoad: (win) => {
                    win.localStorage.setItem('token', 'mock-token-123');
                    win.localStorage.setItem('role', 'admin');
                    win.localStorage.setItem('company_name', 'Test Corp');
                }
            });

            // App should immediately try to fetch data
            cy.wait(['@getJobs', '@getStats'], { timeout: 10000 });

            // Should stay on dashboard, NOT redirect to login
            cy.url().should('eq', Cypress.config().baseUrl + '/');
            cy.get('h1').should('exist'); // Dashboard header
        });

        it('redirects to login if token is missing', () => {
            cy.visit('/');
            cy.url().should('include', '/login');
        });
    });
});
