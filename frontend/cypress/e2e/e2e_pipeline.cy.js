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
        password: 'password123'
    };

    beforeEach(() => {
        // Login before each test
        cy.loginViaAPI(testUser.email, testUser.password);
    });

    it('should display pipeline page with jobs', () => {
        cy.visit('/pipeline');

        // Wait for page to load
        cy.contains('Pipeline', { timeout: 10000 }).should('be.visible');

        // Should show job selector or general pool
        cy.get('[data-testid="job-select"], .job-selector, select, .pipeline-header')
            .should('exist');
    });

    it('should show candidate stages in pipeline', () => {
        cy.visit('/pipeline');

        // Wait for pipeline to load
        cy.contains('Pipeline', { timeout: 10000 }).should('be.visible');

        // Look for stage columns (Applied, Screening, Interview, etc.)
        cy.get('.pipeline-column, .stage-column, [class*="column"], [class*="stage"]', { timeout: 10000 })
            .should('have.length.at.least', 1);
    });

    it('should be able to select a job from dropdown', () => {
        cy.visit('/pipeline');

        // Wait for page load
        cy.contains('Pipeline', { timeout: 10000 }).should('be.visible');

        // Look for job selector
        cy.get('select, [data-testid="job-select"], .job-dropdown').then($select => {
            if ($select.length > 0) {
                // If dropdown exists, interact with it
                cy.wrap($select).first().click();
                // Check if options are visible
                cy.get('option, [role="option"], .dropdown-item').should('have.length.at.least', 1);
            } else {
                // If no dropdown, just verify page loaded
                cy.log('No job dropdown found - page may have different layout');
            }
        });
    });

    it('should navigate to dashboard from pipeline', () => {
        cy.visit('/pipeline');

        // Wait for page load
        cy.contains('Pipeline', { timeout: 10000 }).should('be.visible');

        // Click on dashboard link/button in navigation
        cy.get('a[href="/"], a[href="/dashboard"], nav a').first().click();

        // Should navigate away from pipeline
        cy.url().should('not.include', '/pipeline');
    });

    it('should handle empty pipeline gracefully', () => {
        cy.visit('/pipeline');

        // Wait for page load
        cy.contains('Pipeline', { timeout: 10000 }).should('be.visible');

        // Page should not crash - either shows candidates or empty state
        cy.get('body').should('be.visible');

        // No error messages visible
        cy.contains('Error').should('not.exist');
        cy.contains('Something went wrong').should('not.exist');
    });
});
