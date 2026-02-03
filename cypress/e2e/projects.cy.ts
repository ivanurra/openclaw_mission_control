describe('Projects flow', () => {
  before(() => {
    cy.exec('rm -rf .cypress-data');
  });

  it('creates a project and a task', () => {
    cy.visit('/projects');

    cy.contains('No projects yet').should('exist');
    cy.contains('button', 'New Project').click();

    cy.get('input[placeholder="Enter project name"]').type('Endurance');
    cy.get('textarea[placeholder="Optional project description"]').type('Shackleton expedition');
    cy.contains('button', 'Create Project').click();

    cy.contains('Endurance').click();
    cy.contains('button', 'New Task').click();
    cy.get('input[placeholder="Task title"]').type('Prepare supplies');
    cy.contains('button', 'Create Task').click();

    cy.contains('Prepare supplies').should('exist');
  });
});
