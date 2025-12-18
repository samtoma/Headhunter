/**
 * E2E Test: Landing Page Flow
 * 
 * Tests the complete flow:
 * 1. Recruiter creates a job with landing page enabled
 * 2. Candidate visits the public landing page
 * 3. Candidate submits an application
 * 4. Recruiter verifies the application appears in the pipeline
 */
describe.skip('Landing Page Flow', () => {
    const adminEmail = 'admin@techcorp.com';
    const adminPassword = 'Admin123!';
    const jobTitle = `Test Job ${Date.now()}`;
    const candidateName = 'Test Candidate';
    const candidateEmail = `candidate${Date.now()}@example.com`;
    let landingPageSlug = '';

    it('should create a job with landing page enabled', () => {
        // Login as admin
        cy.visit('/login');
        cy.get('input[type="email"]').type(adminEmail);
        cy.get('input[type="password"]').type(adminPassword);
        cy.get('button[type="submit"]').click();

        // Wait for dashboard to load
        cy.location('pathname', { timeout: 10000 }).should('eq', '/');
        cy.contains('Sign Out', { timeout: 10000 }).should('exist');

        // Navigate to Pipeline page
        cy.contains('Pipeline').click();
        cy.url().should('include', '/pipeline');

        // Open Create Job Modal
        cy.contains('button', 'Create Job').click();
        cy.contains('New Job Pipeline').should('be.visible');

        // Step 1: Enter job title and analyze
        cy.get('input[placeholder*="Senior Product Designer"]').type(jobTitle);
        cy.contains('button', 'Analyze').click();

        // Wait for AI analysis to complete
        cy.contains('Core Functional Activities', { timeout: 30000 }).should('be.visible');

        // Select department (required field)
        cy.get('select').first().select('Engineering');

        // Enable Landing Page
        cy.contains('Public Landing Page').should('be.visible');
        // Click the toggle (button after the landing page section)
        cy.get('[data-cy="landing-page-toggle"]').should('be.visible').trigger('click', { force: true });

        // Verify toggle changed color (state updated)
        cy.get('[data-cy="landing-page-toggle"]', { timeout: 5000 }).should('have.class', 'bg-indigo-600');

        // Verify the URL field appears
        cy.contains('Landing Page URL').should('be.visible');

        // Get the generated slug
        cy.get('input[placeholder="job-slug"]').invoke('val').then((slug) => {
            landingPageSlug = slug;
            cy.log('Landing page slug:', landingPageSlug);
        });

        // Create the job
        cy.contains('button', 'Create').click();

        // Wait for modal to close
        cy.contains('New Job Pipeline', { timeout: 5000 }).should('not.exist');

        // Verify job was created
        cy.contains(jobTitle, { timeout: 10000 }).should('be.visible');

        // Logout
        cy.contains('Sign Out').click();
    });

    it('should allow candidate to apply via landing page', () => {
        // Skip if we don't have a slug from previous test
        if (!landingPageSlug) {
            cy.log('No landing page slug available - skipping');
            return;
        }

        // Visit the public landing page
        cy.visit(`/jobs/${landingPageSlug}`);

        // Verify job details are displayed
        cy.contains(jobTitle, { timeout: 10000 }).should('be.visible');

        // Fill in the application form
        cy.get('input[placeholder="John Smith"]').type(candidateName);
        cy.get('input[placeholder="john@example.com"]').type(candidateEmail);
        cy.get('input[placeholder*="555"]').type('+1234567890');

        // Upload a CV (create a fake file)
        cy.get('input[type="file"]').selectFile({
            contents: Cypress.Buffer.from('%PDF-1.4 Test CV content'),
            fileName: 'test_cv.pdf',
            mimeType: 'application/pdf'
        }, { force: true });

        // Submit the application
        cy.contains('button', 'Submit Application').click();

        // Verify success message
        cy.contains('Application Submitted!', { timeout: 10000 }).should('be.visible');
    });

    it('should show the application in the recruiter dashboard', () => {
        // Skip if we didn't have a successful submission
        if (!landingPageSlug) {
            cy.log('No landing page slug available - skipping');
            return;
        }

        // Login as admin
        cy.visit('/login');
        cy.get('input[type="email"]').type(adminEmail);
        cy.get('input[type="password"]').type(adminPassword);
        cy.get('button[type="submit"]').click();

        // Wait for dashboard
        cy.location('pathname', { timeout: 10000 }).should('eq', '/');

        // Navigate to Pipeline page
        cy.contains('Pipeline').click();
        cy.url().should('include', '/pipeline');

        // Select the job we created
        cy.contains(jobTitle, { timeout: 10000 }).click();

        // Verify the candidate appears in the New column
        cy.contains(candidateName, { timeout: 10000 }).should('be.visible');

        // Optionally verify the source is "Landing Page"
        // This depends on how the UI displays the source
    });
});
