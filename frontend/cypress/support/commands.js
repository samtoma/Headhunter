// Custom command to mock ALL API endpoints comprehensively
Cypress.Commands.add('mockAllAPIs', () => {
    // Standard User Data
    const mockUser = {
        id: 1,
        email: 'admin@test.com',
        role: 'admin',
        company_id: 1,
        company_name: 'Test Corp'
    };

    // --- Core Auth & User ---
    cy.intercept('POST', '/api/auth/login', {
        statusCode: 200,
        body: {
            access_token: 'mock-token-123',
            role: 'admin',
            company_name: 'Test Corp'
        }
    }).as('loginRequest');

    cy.intercept('GET', '/api/users/me', {
        statusCode: 200,
        body: mockUser
    }).as('getMe');

    cy.intercept('GET', '/api/users*', { statusCode: 200, body: [mockUser] }).as('getUsers');

    // --- Dashboard Data ---
    // Used by useHeadhunterData
    cy.intercept('GET', '/api/profiles/stats/overview', {
        statusCode: 200,
        body: {
            totalCandidates: 100,
            activeJobs: 5,
            hired: 10,
            silver: 20
        }
    }).as('getStats');

    // Used by DashboardView
    cy.intercept('GET', '/api/stats/departments', {
        statusCode: 200,
        body: [
            { department: 'Engineering', active_jobs: 2, on_hold_jobs: 0, total_candidates: 50, hired_candidates: 5 },
            { department: 'Sales', active_jobs: 3, on_hold_jobs: 1, total_candidates: 30, hired_candidates: 2 }
        ]
    }).as('getDeptStats');

    cy.intercept('GET', '/api/analytics/dashboard*', {
        statusCode: 200,
        body: {
            pipeline: [{ name: 'New', value: 10 }, { name: 'Hired', value: 5 }],
            activity: [{ date: '2023-01-01', applications: 5 }],
            kpi: { total_hires: 5, active_jobs: 2, avg_time_to_hire: 10 }
        }
    }).as('getAnalytics');

    // --- Resources ---
    cy.intercept('GET', '/api/jobs*', { statusCode: 200, body: [] }).as('getJobs');
    cy.intercept('POST', '/api/jobs*', { statusCode: 201, body: {} }).as('createJob');
    cy.intercept('GET', '/api/applications*', { statusCode: 200, body: [] }).as('getApplications');

    // Used by useHeadhunterData
    cy.intercept('GET', '/api/profiles*', {
        statusCode: 200,
        body: { items: [], total: 0, pages: 0 }
    }).as('getProfiles');

    cy.intercept('GET', '/api/interviews*', { statusCode: 200, body: [] }).as('getInterviews');
    cy.intercept('GET', '/api/companies*', { statusCode: 200, body: {} }).as('getCompanies');

    // --- System ---
    cy.intercept('GET', '/api/version*', { statusCode: 200, body: { version: '1.0.0' } }).as('getVersion');

    // Catch-all to prevent 404s on unmocked GETs
    cy.intercept('GET', '/api/**', { statusCode: 200, body: {} }).as('genericGet');
});

// Custom command to login programmatically (for session restoration tests)
Cypress.Commands.add('loginProgrammatically', (role = 'admin') => {
    const token = 'mock-token-' + role;
    const companyName = 'Test Corp';

    // Mock APIs first
    cy.mockAllAPIs();

    // Set localStorage via onBeforeLoad in cy.visit, NOT here.
    // This command just prepares the data or could be used if we weren't using onBeforeLoad.
    // For this strategy, we'll rely on onBeforeLoad in the test itself, 
    // but we can provide a helper to get the mock data.
    return { token, role, companyName };
});
