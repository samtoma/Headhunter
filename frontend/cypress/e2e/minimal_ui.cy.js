describe('Minimal UI Check', () => {
    it('renders the root element', () => {
        cy.visit('/');
        cy.get('#root').should('exist');
        cy.get('body').should('not.contain', 'Application Error');
    });
});
