/** Workspace-wide Jest entry so editors/CI at the repo root
 *  discover both unit and e2e projects with the right transforms. */
module.exports = {
  projects: ['<rootDir>/backend', '<rootDir>/backend/test/jest-e2e.json'],
};
