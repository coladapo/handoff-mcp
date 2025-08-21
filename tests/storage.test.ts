import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { HandoffStorage } from '../src/storage';
import { HandoffRequest, Project } from '../src/types';
import { rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('HandoffStorage', () => {
  let storage: HandoffStorage;
  const testDbPath = join(tmpdir(), 'test-handoffs.db');

  beforeEach(async () => {
    storage = new HandoffStorage(testDbPath);
    await storage.initialize();
  });

  afterEach(() => {
    storage.close();
    rmSync(testDbPath, { force: true });
  });

  describe('Projects', () => {
    it('should create a new project', async () => {
      const project = await storage.createProject({
        name: 'Test Project',
        description: 'A test project',
        tags: ['test', 'demo']
      });

      expect(project).toBeDefined();
      expect(project.id).toBeTruthy();
      expect(project.name).toBe('Test Project');
      expect(project.tags).toEqual(['test', 'demo']);
    });

    it('should list projects', async () => {
      await storage.createProject({
        name: 'Project 1',
        description: 'First project',
        tags: ['web']
      });

      await storage.createProject({
        name: 'Project 2',
        description: 'Second project',
        tags: ['api']
      });

      const projects = await storage.listProjects({});
      expect(projects).toHaveLength(2);
    });

    it('should filter projects by tags', async () => {
      await storage.createProject({
        name: 'Web Project',
        description: 'Web app',
        tags: ['web', 'frontend']
      });

      await storage.createProject({
        name: 'API Project',
        description: 'API server',
        tags: ['api', 'backend']
      });

      const webProjects = await storage.listProjects({ tags: ['web'] });
      expect(webProjects).toHaveLength(1);
      expect(webProjects[0].name).toBe('Web Project');
    });

    it('should archive a project', async () => {
      const project = await storage.createProject({
        name: 'To Archive',
        description: 'Will be archived',
        tags: []
      });

      await storage.archiveProject(project.id);
      
      const activeProjects = await storage.listProjects({ include_archived: false });
      expect(activeProjects).toHaveLength(0);

      const allProjects = await storage.listProjects({ include_archived: true });
      expect(allProjects).toHaveLength(1);
      expect(allProjects[0].archived).toBe(true);
    });

    it('should get project statistics', async () => {
      const project = await storage.createProject({
        name: 'Stats Project',
        description: 'For statistics',
        tags: []
      });

      await storage.createHandoff({
        project_id: project.id,
        title: 'Task 1',
        strategic_context: 'Strategy',
        tactical_requirements: ['Req 1'],
        project_info: {},
        acceptance_criteria: ['Done'],
        priority: 'high'
      });

      const stats = await storage.getProjectStats(project.id);
      expect(stats.total_handoffs).toBe(1);
      expect(stats.handoffs_by_status.pending).toBe(1);
    });
  });

  describe('Handoffs', () => {
    let projectId: string;

    beforeEach(async () => {
      const project = await storage.createProject({
        name: 'Test Project',
        description: 'For handoff tests',
        tags: []
      });
      projectId = project.id;
    });

    it('should create a handoff', async () => {
      const handoff = await storage.createHandoff({
        project_id: projectId,
        title: 'Test Handoff',
        strategic_context: 'High-level strategy',
        tactical_requirements: ['Requirement 1', 'Requirement 2'],
        project_info: {
          language: 'TypeScript',
          framework: 'Express'
        },
        acceptance_criteria: ['Tests pass', 'Code reviewed'],
        priority: 'medium'
      });

      expect(handoff).toBeDefined();
      expect(handoff.id).toBeTruthy();
      expect(handoff.project_id).toBe(projectId);
      expect(handoff.status).toBe('pending');
    });

    it('should update handoff status', async () => {
      const handoff = await storage.createHandoff({
        project_id: projectId,
        title: 'Status Test',
        strategic_context: 'Context',
        tactical_requirements: ['Req'],
        project_info: {},
        acceptance_criteria: ['Done'],
        priority: 'low'
      });

      const updated = await storage.updateHandoffStatus(handoff.id, 'in_progress');
      expect(updated.status).toBe('in_progress');
    });

    it('should add notes to handoff', async () => {
      const handoff = await storage.createHandoff({
        project_id: projectId,
        title: 'Notes Test',
        strategic_context: 'Context',
        tactical_requirements: ['Req'],
        project_info: {},
        acceptance_criteria: ['Done'],
        priority: 'medium'
      });

      const withNote = await storage.addHandoffNote(handoff.id, 'This is a test note');
      expect(withNote.notes).toHaveLength(1);
      expect(withNote.notes![0].content).toBe('This is a test note');
    });

    it('should list handoffs with filters', async () => {
      await storage.createHandoff({
        project_id: projectId,
        title: 'High Priority',
        strategic_context: 'Context',
        tactical_requirements: ['Req'],
        project_info: {},
        acceptance_criteria: ['Done'],
        priority: 'high'
      });

      await storage.createHandoff({
        project_id: projectId,
        title: 'Low Priority',
        strategic_context: 'Context',
        tactical_requirements: ['Req'],
        project_info: {},
        acceptance_criteria: ['Done'],
        priority: 'low'
      });

      const highPriority = await storage.listHandoffs({ priority: 'high' });
      expect(highPriority).toHaveLength(1);
      expect(highPriority[0].title).toBe('High Priority');
    });

    it('should verify handoff completion', async () => {
      const handoff = await storage.createHandoff({
        project_id: projectId,
        title: 'Verify Test',
        strategic_context: 'Context',
        tactical_requirements: ['Build feature'],
        project_info: {},
        acceptance_criteria: ['Feature works', 'Tests pass'],
        priority: 'medium'
      });

      await storage.updateHandoffStatus(handoff.id, 'completed');
      handoff.completion_artifacts = ['feature.ts', 'feature.test.ts'];
      
      const verification = await storage.verifyHandoff(handoff.id);
      expect(verification.verification_passed).toBe(true);
      expect(verification.completion_score).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid project ID', async () => {
      await expect(storage.getProject('invalid-id')).rejects.toThrow();
    });

    it('should handle duplicate project names gracefully', async () => {
      await storage.createProject({
        name: 'Duplicate Name',
        description: 'First',
        tags: []
      });

      const second = await storage.createProject({
        name: 'Duplicate Name',
        description: 'Second',
        tags: []
      });

      expect(second).toBeDefined();
      expect(second.description).toBe('Second');
    });

    it('should validate handoff priority', async () => {
      const project = await storage.createProject({
        name: 'Priority Test',
        description: 'Test',
        tags: []
      });

      await expect(storage.createHandoff({
        project_id: project.id,
        title: 'Invalid Priority',
        strategic_context: 'Context',
        tactical_requirements: ['Req'],
        project_info: {},
        acceptance_criteria: ['Done'],
        priority: 'invalid' as any
      })).rejects.toThrow();
    });
  });
});