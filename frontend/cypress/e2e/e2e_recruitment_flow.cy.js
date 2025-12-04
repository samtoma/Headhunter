/**
 * Complete Recruitment Flow E2E Test
 * 
 * This test validates the entire recruitment workflow from login to hire
 * using REAL API calls and database interactions (no mocks).
 * 
 * Prerequisites:
 * - docker-compose.e2e.yml stack must be running
 * - Database should be seeded with test data
 */

describe('Complete Recruitment Workflow - Real E2E', () => {
    before(() => {
        // Seed the database with test data
        cy.seedDatabase();
    });

    beforeEach(() => {
        cy.clearLocalStorage();
    });

    it('should complete full recruitment flow: login → create job → upload CV → assign → hire', () => {
        // ===== STEP 1: Login =====
        cy.visit('/login');

        // Use real credentials from seeded data
        cy.get('input[type="email"]').type('admin@techcorp.com');
        cy.get('input[type="password"]').type('Admin123!');
        cy.get('button[type="submit"]').click();

        // Wait for redirect to dashboard
        cy.url().should('eq', Cypress.config().baseUrl + '/');

        // Verify we're logged in with real data
        cy.contains('TechCorp').should('be.visible');  // Company name from seed data

        // ===== STEP 2: Navigate to Jobs =====
        cy.get('[href="/jobs"]').click();
        cy.url().should('include', '/jobs');

        // Verify seeded jobs are visible
        cy.contains('Senior Full-Stack Developer').should('be.visible');
        cy.contains('DevOps Engineer').should('be.visible');

        // ===== STEP 3: Create New Job =====
        cy.contains('Add').click();

        // Fill out job wizard
        cy.get('input[name="title"]').type('QA Automation Engineer');
        cy.get('select[name="department"]').select('Engineering');
        cy.get('textarea[name="description"]').type('We need an experienced QA engineer to build our testing infrastructure');

        // Optionally trigger AI generation (if implemented)
        // cy.get('button').contains('Generate with AI').click();
        // cy.wait(3000); // Wait for AI generation

        // Save job
        cy.get('button').contains('Save').click();

        // Verify job was created
        cy.contains('QA Automation Engineer').should('be.visible');

        // ===== STEP 4: Navigate to Candidates =====
        cy.get('[href="/candidates"]').click();
        cy.url().should('include', '/candidates');

        // Verify seeded candidates are visible
        cy.contains('Alice Johnson').should('be.visible');
        cy.contains('Bob Smith').should('be.visible');

        // ===== STEP 5: Upload New CV =====
        cy.contains('Upload').click();

        // Upload a test CV file
        // Note: You'll need to create a test PDF in cypress/fixtures/
        cy.fixture('test_resume.pdf', 'binary')
            .then(Cypress.Blob.binaryStringToBlob)
            .then(blob => {
                const file = new File([blob], 'test_resume.pdf', { type: 'application/pdf' });
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);

                cy.get('input[type="file"]').then(input => {
                    input[0].files = dataTransfer.files;
                    input[0].dispatchEvent(new Event('change', { bubbles: true }));
                });
            });

        // Wait for processing (if async with Celery)
        cy.contains('Processing', { timeout: 10000 }).should('not.exist');

        // ===== STEP 6: Assign Candidate to Job =====
        // Open candidate drawer
        cy.contains('Alice Johnson').click();

        // Verify candidate details loaded from real database
        cy.contains('7 years').should('be.visible');  // Years of experience from seed
        cy.contains('Python').should('be.visible');  // Skills from seed

        // Assign to job pipeline
        cy.contains('Assign to Job').click();
        cy.get('select[name="job"]').select('Senior Full-Stack Developer');
        cy.contains('Assign').click();

        // ===== STEP 7: Navigate to Pipeline =====
        cy.get('[href="/pipeline"]').click();
        cy.url().should('include', '/pipeline');

        // Select the job
        cy.contains('Senior Full-Stack Developer').click();

        // Verify Alice appears in "New" stage
        cy.get('[data-stage="new"]').within(() => {
            cy.contains('Alice Johnson').should('be.visible');
        });

        // ===== STEP 8: Move Through Pipeline Stages =====
        // Move to Screening
        cy.contains('Alice Johnson').drag('[data-stage="screening"]');

        // Verify move (real database update)
        cy.get('[data-stage="screening"]').within(() => {
            cy.contains('Alice Johnson').should('be.visible');
        });

        // Move to Interview
        cy.contains('Alice Johnson').drag('[data-stage="interview"]');

        // ===== STEP 9: Schedule Interview =====
        cy.contains('Alice Johnson').click();
        cy.contains('Schedule Interview').click();

        cy.get('select[name="interviewer"]').select('Emma Interviewer');
        cy.get('select[name="stage"]').select('Technical');
        cy.get('textarea[name="notes"]').type('Technical round - focus on React and Python');
        cy.contains('Save').click();

        // ===== STEP 10: Submit Interview Feedback =====
        // Switch to interviewer view (or login as interviewer)
        cy.clearLocalStorage();
        cy.loginAndVisit('interviewer@techcorp.com', 'Interview123!', '/interviews');

        // Find Alice's interview
        cy.contains('Alice Johnson').click();

        // Submit feedback
        cy.get('select[name="outcome"]').select('Passed');
        cy.get('input[name="rating"]').clear().type('9');
        cy.get('textarea[name="feedback"]').type('Excellent technical skills. Strong problem-solving ability.');
        cy.contains('Submit Feedback').click();

        // ===== STEP 11: Move to Offer and Hire =====
        // Switch back to admin
        cy.clearLocalStorage();
        cy.loginAndVisit('admin@techcorp.com', 'Admin123!', '/pipeline');

        cy.contains('Senior Full-Stack Developer').click();

        // Move to Offer
        cy.contains('Alice Johnson').drag('[data-stage="offer"]');

        // Move to Hired
        cy.contains('Alice Johnson').drag('[data-stage="hired"]');

        // Verify REAL database update
        cy.get('[data-stage="hired"]').within(() => {
            cy.contains('Alice Johnson').should('be.visible');
        });

        //===== STEP 12: Verify in Analytics =====
        cy.get('[href="/analytics"]').click();

        // Verify hire count increased (real data from database)
        cy.contains('Total Hires').parent().within(() => {
            cy.contains('1').should('be.visible');  // At least 1 hire
        });
    });

    it('should verify data persistence across page reloads', () => {
        // Login
        cy.loginAndVisit('admin@techcorp.com', 'Admin123!', '/pipeline');

        // Select job
        cy.contains('Senior Full-Stack Developer').click();

        // Verify Alice is still "Hired" from previous test
        // This validates REAL database persistence
        cy.get('[data-stage="hired"]').within(() => {
            cy.contains('Alice Johnson').should('be.visible');
        });

        // Reload page
        cy.reload();

        // Data should persist (from database, not mocks)
        cy.contains('Senior Full-Stack Developer').click();
        cy.get('[data-stage="hired"]').within(() => {
            cy.contains('Alice Johnson').should('be.visible');
        });
    });
});
