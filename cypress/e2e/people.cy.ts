describe('People flow', () => {
  before(() => {
    cy.exec('rm -rf .cypress-data');
  });

  it('creates a developer with description', () => {
    cy.visit('/people');

    cy.contains('button', 'Add Developer').click();
    cy.get('input[placeholder="Enter name"]').type('Frank Worsley');
    cy.get('input[placeholder="Developer, Designer, PM..."]').type('Navigator');
    cy.get('textarea[placeholder="Frontend, backend, iOS, devops..."]').type('Backend');
    cy.contains('button', 'Add Developer').click();

    cy.contains('Frank Worsley').should('exist');
    cy.contains('Backend').should('exist');
  });
});
