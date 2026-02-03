describe('Docs flow', () => {
  before(() => {
    cy.exec('rm -rf .cypress-data');
  });

  it('creates a folder in root and a document inside it', () => {
    cy.visit('/docs');

    cy.contains('button', 'New Folder').click();
    cy.get('input[placeholder="Enter folder name"]').type('Logs');
    cy.contains('button', 'Create').click();

    cy.contains('Logs').click();
    cy.contains('button', 'New Document').click();
    cy.get('input[placeholder="Document title"]').type('Ice Log');
    cy.contains('button', 'Create').click();

    cy.contains('Ice Log').should('exist');
    cy.contains('1 document').should('exist');
  });
});
