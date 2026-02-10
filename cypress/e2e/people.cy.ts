describe('People flow', () => {
  before(() => {
    cy.exec('rm -rf .cypress-data');
  });

  it('creates a member with description', () => {
    const memberName = `Frank Worsley ${Date.now()}`;
    cy.visit('/people');

    cy.contains('button', 'Add Member').click();
    cy.contains('h2', 'Add Member')
      .parents('.fixed')
      .within(() => {
        cy.get('input[placeholder="Enter name"]').type(memberName);
        cy.get('input[placeholder="Developer, Designer, PM..."]').type('Navigator');
        cy.get('textarea[placeholder="Frontend, backend, iOS, devops..."]').type('Backend');
        cy.contains('button', 'Add Member').click();
      });

    cy.contains(memberName).should('exist');
    cy.contains('Backend').should('exist');
  });
});
