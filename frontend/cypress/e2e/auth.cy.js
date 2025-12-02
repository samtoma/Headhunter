describe('Authentication', () => {
    it('successfully logs in', () => {
        cy.intercept('POST', '/api/auth/login', {
            statusCode: 200,
            body: { access_token: 'fake-token', role: 'admin', company_name: 'Test Corp' }
        }).as('login');

        // Mock user profile fetch which happens after login/redirect
        cy.intercept('GET', '/api/users/me', {
            statusCode: 200,
            body: { email: 'admin@test.com', role: 'admin', company_id: 1 }
        }).as('getMe');

        // Mock Dashboard data to avoid errors on landing
        cy.intercept('GET', '/api/stats/dashboard', {
            statusCode: 200,
            body: { active_jobs: 5, total_candidates: 20, interviews_this_week: 3, hires_this_month: 1 }
        }).as('getStats');

        cy.visit('/login');
        cy.get('input[type="email"]').type('admin@test.com');
        cy.get('input[type="password"]').type('password');
        cy.get('button[type="submit"]').click();

        cy.wait('@login');
        cy.url().should('eq', 'http://localhost:5173/');
        cy.contains('Dashboard');
    });

    it('shows error on invalid credentials', () => {
        cy.intercept('POST', '/api/auth/login', {
            statusCode: 401,
            body: { detail: 'Incorrect email or password' }
        }).as('loginFail');

        cy.visit('/login');
        cy.get('input[type="email"]').type('wrong@test.com');
        cy.get('input[type="password"]').type('wrongpass');
        cy.get('button[type="submit"]').click();

        cy.wait('@loginFail');
        cy.contains('Invalid email or password');
    });
});
