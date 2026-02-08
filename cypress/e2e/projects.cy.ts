describe('Projects flow', () => {
  before(() => {
    cy.exec('rm -rf .cypress-data');
  });

  it('creates a project and a task', () => {
    const projectName = `Endurance ${Date.now()}`;
    const taskName = `Prepare supplies ${Date.now()}`;
    cy.visit('/projects');

    cy.contains('button', 'New Project').click();

    cy.contains('h2', 'Create Project')
      .parents('.fixed')
      .within(() => {
        cy.get('input[placeholder="Enter project name"]').type(projectName);
        cy.get('textarea[placeholder="Optional project description"]').type('Shackleton expedition');
        cy.contains('button', 'Create Project').click();
      });

    cy.contains(projectName).click();
    cy.contains('button', 'New Task').click();
    cy.contains('h2', 'Create Task')
      .parents('.fixed')
      .within(() => {
        cy.get('input[placeholder="Task title"]').type(taskName);
        cy.contains('button', 'Create Task').click();
      });

    cy.contains(taskName).should('exist');
  });
});
