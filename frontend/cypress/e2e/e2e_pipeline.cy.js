/**
 * E2E Test: Pipeline Functionality
 * 
 * Tests basic pipeline page functionality
 */

describe('Pipeline Flow', () => {
    const testUser = {
        email: 'admin@techcorp.com',
        password: 'Admin123!'  // Must match seed_test_data.py
    };

    beforeEach(() => {
        // Login before each test
        cy.loginViaAPI(testUser.email, testUser.password);
    });

    it('should display pipeline page', () => {
        cy.visit('/pipeline');

        // Verify URL
        cy.url().should('include', '/pipeline');

        // Page should render
        cy.get('body').should('be.visible');
    });

    it('should show content after login', () => {
        cy.visit('/pipeline');

        // Wait for page to load
        cy.url().should('include', '/pipeline');

        // Should not be redirected to login
        cy.url().should('not.include', '/login');

        // Body should be visible
        cy.get('body').should('be.visible');
    });

    it('should maintain session on reload', () => {
        cy.visit('/pipeline');

        // Verify we're on pipeline
        cy.url().should('include', '/pipeline');

        // Reload page
        cy.reload();

        // Should still be on pipeline (not redirected to login)
        cy.url().should('include', '/pipeline');
    });

    it('should allow navigation to home', () => {
        cy.visit('/pipeline');
        cy.url().should('include', '/pipeline');

        // Navigate to home
        cy.visit('/');

        // Should be on home
        cy.url().should('not.include', '/pipeline');
    });

    it('should not crash with no data', () => {
        cy.visit('/pipeline');

        // Page should load without errors
        cy.get('body').should('be.visible');

        // No critical error messages
        cy.contains('Something went wrong').should('not.exist');
    });
});
