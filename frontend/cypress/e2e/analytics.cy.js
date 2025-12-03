describe('Analytics', () => {
    beforeEach(() => {
        // Mock ALL API calls to prevent unmocked request failures
        cy.mockAllAPIs();

        cy.intercept('GET', '/api/users/me', {
            statusCode: 200,
            body: { email: 'admin@test.com', role: 'admin', company_id: 1 }
        }).as('getMe');

        cy.intercept('GET', '/api/stats/dashboard', {
            statusCode: 200,
            body: {
                total_candidates: 100,
                active_jobs: 5,
                total_hires: 10,
                interview_count: 20
            }
        }).as('getStats');

        cy.intercept('GET', '/api/analytics/dashboard*', {
            statusCode: 200,
            body: {
                pipeline: [{ name: 'New', value: 10 }, { name: 'Hired', value: 5 }],
                activity: [{ date: '2023-01-01', applications: 5 }],
                kpi: { total_hires: 5, active_jobs: 2, avg_time_to_hire: 10 }
            }
        }).as('getAnalytics');

        // Manually set token to bypass Login form
        cy.visit('/analytics', {
            onBeforeLoad: (win) => {
                win.localStorage.setItem('token', 'fake-token');
                win.localStorage.setItem('role', 'admin');
                win.localStorage.setItem('company_name', 'Test Corp');
            }
        });
    });

    it('loads analytics page and charts', () => {
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
