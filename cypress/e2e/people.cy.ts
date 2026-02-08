describe('People flow', () => {
  before(() => {
    cy.exec('rm -rf .cypress-data');
  });

  it('creates a developer with description', () => {
    const developerName = `Frank Worsley ${Date.now()}`;
    cy.visit('/people');

    cy.contains('button', 'Add Person').click();
    cy.contains('h2', 'Add Person')
      .parents('.fixed')
      .within(() => {
        cy.get('input[placeholder="Enter name"]').type(developerName);
        cy.get('input[placeholder="Developer, Designer, PM..."]').type('Navigator');
        cy.get('textarea[placeholder="Frontend, backend, iOS, devops..."]').type('Backend');
        cy.contains('button', 'Add Person').click();
      });

    cy.contains(developerName).should('exist');
    cy.contains('Backend').should('exist');
  });
});
