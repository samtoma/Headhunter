describe('Environment Sanity Check', () => {
    it('successfully reaches the application root', () => {
        cy.request('/').then((response) => {
            expect(response.status).to.eq(200);
        });
    });
});
