
describe('CV Upload and Status Update', () => {

    const testUser = {
        email: 'admin@techcorp.com',
        password: 'Admin123!'
    };
    const fileName = 'test_resume_stub.pdf';


    it('should update CV status automatically after processing', () => {
        cy.loginViaAPI(testUser.email, testUser.password);
        cy.visit('/pipeline');

        // Check if no CVs initially or ignore
        // cy.contains('No candidates found').should('be.visible');

        // Prepare file upload
        // Verify Upload New CVs button or input exists

        // Simulating file upload to the hidden input
        // Ensure we handle the case where "Upload New CVs" is inside a label that wraps the input
        cy.get('input[type="file"]').first().selectFile({
            contents: Cypress.Buffer.from('dummy pdf content'),
            fileName: 'test_cv_update.pdf',
            mimeType: 'application/pdf'
        }, { force: true });

        // Wait for upload to complete
        // The toast or status message might appear
        cy.get('.animate-spin', { timeout: 10000 }).should('exist');

        // Verify CV appears in list (initially unparsed/processing)
        // It might take a moment for the list to refresh after upload success
        cy.contains('test_cv_update').should('be.visible');

        // NOW: Wait for automatic update WITHOUT reload
        // The backend processes quickly.
        // We expect the spinner to disappear.
        cy.get('.animate-spin', { timeout: 120000 }).should('not.exist');

        // Verify visual update
        cy.contains('test_cv_update').should('be.visible');
    });
});
