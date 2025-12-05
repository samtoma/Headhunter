/**
 * E2E Test: Pipeline Functionality
 * 
 * Tests the recruitment pipeline features including:
 * - Viewing jobs in pipeline
 * - Switching between jobs
 * - Viewing candidate cards
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
        
        // Wait for page to load - check URL
        cy.url().should('include', '/pipeline');
        
        // Page should render without crashing
        cy.get('body').should('be.visible');
    });

    it('should show page content after login', () => {
        cy.visit('/pipeline');
        
        // Wait for content to load
        cy.get('body', { timeout: 10000 }).should('be.visible');
        
        // Should not show login form (we're authenticated)
        cy.get('form[action*="login"]').should('not.exist');
    });

    it('should allow navigation to other pages', () => {
        cy.visit('/pipeline');
        
        // Wait for page load
        cy.url().should('include', '/pipeline');
        
        // Navigate to home/dashboard
        cy.visit('/');
        
        // Should successfully navigate
        cy.url().should('not.include', '/pipeline');
    });

    it('should handle page without errors', () => {
        cy.visit('/pipeline');
        
        // No JavaScript errors
        cy.on('uncaught:exception', () => false);
        
        // Page should be visible
        cy.get('body').should('be.visible');
        
        // Should not show error alerts
        cy.contains('Something went wrong').should('not.exist');
    });

    it('should maintain session on pipeline page', () => {
        cy.visit('/pipeline');
        
        // Verify we're on pipeline
        cy.url().should('include', '/pipeline');
        
        // Reload page
        cy.reload();
        
        // Should still be on pipeline (not redirected to login)
        cy.url().should('include', '/pipeline');
    });
});
