describe('Analytics', () => {
    beforeEach(() => {
        // Login flow
        cy.intercept('POST', '/api/auth/login', {
            statusCode: 200,
            body: { access_token: 'fake-token', role: 'admin', company_name: 'Test Corp' }
        }).as('login');

        cy.intercept('GET', '/api/users/me', {
            statusCode: 200,
            body: { email: 'admin@test.com', role: 'admin', company_id: 1 }
        }).as('getMe');

        // Mock Dashboard data
        cy.intercept('GET', '/api/stats/dashboard', { body: {} });

        // Mock Analytics data
        cy.intercept('GET', '/api/analytics/dashboard*', {
            statusCode: 200,
            body: {
                pipeline: [{ name: 'New', value: 10 }, { name: 'Hired', value: 5 }],
                activity: [{ date: '2023-01-01', applications: 5 }],
                kpi: { total_hires: 5, active_jobs: 2, avg_time_to_hire: 10 }
            }
        }).as('getAnalytics');

        cy.visit('/login');
        cy.get('input[type="email"]').type('admin@test.com');
        cy.get('input[type="password"]').type('password');
        cy.get('button[type="submit"]').click();
        cy.wait('@login');
    });

    it('loads analytics page and charts', () => {
        cy.visit('/analytics');
        cy.wait('@getAnalytics');

        cy.contains('Analytics');
        cy.contains('Total Hires');
        cy.contains('5'); // KPI value
        cy.contains('Active Jobs');
        cy.contains('2'); // KPI value

        // Check for charts (Recharts renders SVGs)
        cy.get('.recharts-surface').should('have.length.at.least', 2);
    });
});
