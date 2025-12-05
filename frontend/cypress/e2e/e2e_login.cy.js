/**
 * E2E Login Flow Test
 * 
 * This is the foundational E2E test - validates that authentication works.
 * Uses REAL API calls and database - no mocks.
 * 
 * Prerequisites:
 * - E2E stack must be running (docker-compose.e2e.yml)
 * - Database must be seeded with test users
 */

describe('Login Flow', () => {
    beforeEach(() => {
        // Clear any existing session
        cy.clearLocalStorage();
    });

    it('should display login page correctly', () => {
        cy.visit('/login');

        // Verify login page elements
        cy.contains('Welcome Back').should('be.visible');
        cy.contains('Sign in to access your recruitment pipeline').should('be.visible');
        cy.get('input[type="email"]').should('be.visible');
        cy.get('input[type="password"]').should('be.visible');
        cy.get('button[type="submit"]').should('be.visible');
        cy.contains('Sign In').should('be.visible');
    });

    it('should login successfully with valid credentials', () => {
        cy.visit('/login');

        // Enter seeded test user credentials
        cy.get('input[type="email"]').type('admin@techcorp.com');
        cy.get('input[type="password"]').type('Admin123!');
        cy.get('button[type="submit"]').click();

        // Wait for redirect to dashboard (root)
        cy.url().should('eq', Cypress.config().baseUrl + '/');

        // Verify we're logged in - company name should be visible in sidebar
        cy.contains('TechCorp', { timeout: 10000 }).should('be.visible');

        // Verify sidebar loaded with navigation
        cy.contains('Headhunter').should('be.visible');
        cy.contains('Dashboard').should('be.visible');
    });

    it('should not redirect with invalid credentials', () => {
        cy.visit('/login');

        // Enter wrong password
        cy.get('input[type="email"]').type('admin@techcorp.com');
        cy.get('input[type="password"]').type('wrongpassword');
        cy.get('button[type="submit"]').click();

        // Wait a moment for potential redirect
        cy.wait(2000);

        // Should still be on login page (not redirected to dashboard)
        cy.url().should('include', '/login');
        cy.contains('Welcome Back').should('be.visible');
    });

    it('should redirect unauthenticated users to login', () => {
        // Try to access protected route without login
        cy.visit('/pipeline');

        // Should redirect to login
        cy.url().should('include', '/login');
    });

    it('should persist session after page reload', () => {
        // Login first
        cy.visit('/login');
        cy.get('input[type="email"]').type('admin@techcorp.com');
        cy.get('input[type="password"]').type('Admin123!');
        cy.get('button[type="submit"]').click();

        // Wait for dashboard
        cy.url().should('eq', Cypress.config().baseUrl + '/');
        cy.contains('TechCorp').should('be.visible');

        // Reload page
        cy.reload();

        // Should still be logged in
        cy.url().should('eq', Cypress.config().baseUrl + '/');
        cy.contains('TechCorp').should('be.visible');
    });

    it('should logout successfully', () => {
        // Login first
        cy.visit('/login');
        cy.get('input[type="email"]').type('admin@techcorp.com');
        cy.get('input[type="password"]').type('Admin123!');
        cy.get('button[type="submit"]').click();
        cy.contains('TechCorp').should('be.visible');

        // Click logout
        cy.contains('Sign Out').click();

        // Should redirect to login
        cy.url().should('include', '/login');
    });
});
