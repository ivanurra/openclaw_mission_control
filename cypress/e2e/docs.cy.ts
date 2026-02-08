describe('Docs flow', () => {
  before(() => {
    cy.exec('rm -rf .cypress-data');
  });

  it('creates a folder in root and a document inside it', () => {
    cy.intercept('POST', '/api/documents').as('createDocument');
    cy.visit('/docs');

    cy.contains('button', 'Create Folder').click();
    cy.contains('h2', 'Create Folder')
      .parents('.fixed')
      .within(() => {
        cy.get('input[placeholder="Enter folder name"]').type('Logs');
        cy.contains('button', 'Create').click();
      });

    cy.contains('Logs').click();
    cy.contains('button', 'New Document').click();
    cy.wait('@createDocument')
      .its('response.body.title')
      .then((title: string) => {
        expect(title).to.match(/^Untitled/);
        cy.get('input.text-xl').should('have.value', title);
      });
  });
});
