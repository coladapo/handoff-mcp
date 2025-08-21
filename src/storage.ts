/**
 * SQLite storage implementation for Handoff MCP
 * Project-based workflow orchestration with handoff management
 */

import Database from 'better-sqlite3';
import { join } from 'path';
import { homedir } from 'os';
import { mkdirSync, existsSync } from 'fs';
import { 
  HandoffRequest, 
  HandoffFilter, 
  HandoffSummary, 
  Project, 
  ProjectFilter, 
  ProjectStats 
} from './types.js';

export class HandoffStorage {
  private db: Database.Database | null = null;
  private dbPath: string;

  constructor() {
    // Use the same data directory as puo-memo for consistency
    const dataDir = join(homedir(), '.puo-memo');
    mkdirSync(dataDir, { recursive: true });
    this.dbPath = join(dataDir, 'cursor_handoffs.db');
  }

  async initialize(): Promise<void> {
    this.db = new Database(this.dbPath);
    
    // Enable WAL mode for better concurrency
    this.db.pragma('journal_mode = WAL');
    
    // Create projects table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        tags TEXT NOT NULL, -- JSON array
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        archived INTEGER NOT NULL DEFAULT 0,
        default_project_info TEXT -- JSON object
      );
    `);

    // Create handoffs table with project_id
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS handoffs (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        title TEXT NOT NULL,
        strategic_context TEXT NOT NULL,
        tactical_requirements TEXT NOT NULL, -- JSON array
        project_info TEXT NOT NULL, -- JSON object
        acceptance_criteria TEXT NOT NULL, -- JSON array
        priority TEXT NOT NULL DEFAULT 'medium',
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        notes TEXT, -- JSON array
        completion_artifacts TEXT, -- JSON array
        estimated_hours REAL,
        actual_hours REAL,
        sequential_thinking_context TEXT, -- JSON object
        FOREIGN KEY (project_id) REFERENCES projects(id)
      );
    `);

    // Create indexes for common queries
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_handoffs_status ON handoffs(status);
      CREATE INDEX IF NOT EXISTS idx_handoffs_priority ON handoffs(priority);
      CREATE INDEX IF NOT EXISTS idx_handoffs_project_id ON handoffs(project_id);
      CREATE INDEX IF NOT EXISTS idx_handoffs_created_at ON handoffs(created_at);
      CREATE INDEX IF NOT EXISTS idx_handoffs_updated_at ON handoffs(updated_at);
      CREATE INDEX IF NOT EXISTS idx_projects_archived ON projects(archived);
      CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);
    `);

    // Create handoff_history table for tracking changes
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS handoff_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        handoff_id TEXT NOT NULL,
        change_type TEXT NOT NULL, -- 'created', 'status_change', 'updated'
        old_value TEXT,
        new_value TEXT,
        changed_at TEXT NOT NULL,
        notes TEXT,
        FOREIGN KEY (handoff_id) REFERENCES handoffs(id)
      );
    `);

    // Check if we need to migrate existing data
    await this.migrateExistingHandoffs();
    
    console.error('✅ Handoff MCP storage initialized');
  }

  async saveHandoff(handoff: HandoffRequest): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const isUpdate = await this.getHandoff(handoff.id) !== null;
    
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO handoffs (
        id, project_id, title, strategic_context, tactical_requirements, project_info,
        acceptance_criteria, priority, status, created_at, updated_at,
        notes, completion_artifacts, estimated_hours, actual_hours,
        sequential_thinking_context
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      handoff.id,
      handoff.project_id,
      handoff.title,
      handoff.strategic_context,
      JSON.stringify(handoff.tactical_requirements),
      JSON.stringify(handoff.project_info),
      JSON.stringify(handoff.acceptance_criteria),
      handoff.priority,
      handoff.status,
      handoff.created_at,
      handoff.updated_at,
      handoff.notes ? JSON.stringify(handoff.notes) : null,
      handoff.completion_artifacts ? JSON.stringify(handoff.completion_artifacts) : null,
      handoff.estimated_hours || null,
      handoff.actual_hours || null,
      null // sequential_thinking_context - for future use
    );

    // Record the change in history
    const historyStmt = this.db.prepare(`
      INSERT INTO handoff_history (handoff_id, change_type, new_value, changed_at)
      VALUES (?, ?, ?, ?)
    `);

    historyStmt.run(
      handoff.id,
      isUpdate ? 'updated' : 'created',
      JSON.stringify({ status: handoff.status, title: handoff.title }),
      new Date().toISOString()
    );
  }

  async getHandoff(id: string): Promise<HandoffRequest | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const stmt = this.db.prepare('SELECT * FROM handoffs WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) {
      return null;
    }

    return this.rowToHandoff(row);
  }

  async getLatestHandoff(filter?: { status?: string; priority?: string }): Promise<HandoffRequest | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    let query = 'SELECT * FROM handoffs WHERE 1=1';
    const params: any[] = [];

    if (filter?.status) {
      query += ' AND status = ?';
      params.push(filter.status);
    }

    if (filter?.priority) {
      query += ' AND priority = ?';
      params.push(filter.priority);
    }

    query += ' ORDER BY created_at DESC LIMIT 1';

    const stmt = this.db.prepare(query);
    const row = stmt.get(...params) as any;

    if (!row) {
      return null;
    }

    return this.rowToHandoff(row);
  }

  async listHandoffs(filter?: HandoffFilter): Promise<HandoffRequest[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    let query = 'SELECT * FROM handoffs WHERE 1=1';
    const params: any[] = [];

    if (filter?.project_id) {
      query += ' AND project_id = ?';
      params.push(filter.project_id);
    }

    if (filter?.status) {
      query += ' AND status = ?';
      params.push(filter.status);
    }

    if (filter?.priority) {
      query += ' AND priority = ?';
      params.push(filter.priority);
    }

    if (filter?.created_after) {
      query += ' AND created_at > ?';
      params.push(filter.created_after);
    }

    if (filter?.created_before) {
      query += ' AND created_at < ?';
      params.push(filter.created_before);
    }

    query += ' ORDER BY updated_at DESC';

    if (filter?.limit) {
      query += ' LIMIT ?';
      params.push(filter.limit);
    }

    if (filter?.offset) {
      query += ' OFFSET ?';
      params.push(filter.offset);
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];

    return rows.map(row => this.rowToHandoff(row));
  }

  async getHandoffSummary(): Promise<HandoffSummary> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // Get total count
    const totalStmt = this.db.prepare('SELECT COUNT(*) as count FROM handoffs');
    const total = (totalStmt.get() as any).count;

    // Get counts by status
    const statusStmt = this.db.prepare(`
      SELECT status, COUNT(*) as count 
      FROM handoffs 
      GROUP BY status
    `);
    const statusRows = statusStmt.all() as any[];
    const by_status = statusRows.reduce((acc, row) => {
      acc[row.status] = row.count;
      return acc;
    }, {} as Record<string, number>);

    // Get counts by priority
    const priorityStmt = this.db.prepare(`
      SELECT priority, COUNT(*) as count 
      FROM handoffs 
      GROUP BY priority
    `);
    const priorityRows = priorityStmt.all() as any[];
    const by_priority = priorityRows.reduce((acc, row) => {
      acc[row.priority] = row.count;
      return acc;
    }, {} as Record<string, number>);

    // Calculate success rate
    const completed = by_status['completed'] || 0;
    const failed = by_status['failed'] || 0;
    const success_rate = (completed + failed) > 0 ? completed / (completed + failed) : 0;

    return {
      total,
      by_status: by_status as any,
      by_priority: by_priority as any,
      success_rate
    };
  }

  async deleteHandoff(id: string): Promise<boolean> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const stmt = this.db.prepare('DELETE FROM handoffs WHERE id = ?');
    const result = stmt.run(id);

    if (result.changes > 0) {
      // Record deletion in history
      const historyStmt = this.db.prepare(`
        INSERT INTO handoff_history (handoff_id, change_type, changed_at)
        VALUES (?, ?, ?)
      `);
      historyStmt.run(id, 'deleted', new Date().toISOString());
    }

    return result.changes > 0;
  }

  async getHandoffHistory(id: string): Promise<any[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const stmt = this.db.prepare(`
      SELECT * FROM handoff_history 
      WHERE handoff_id = ? 
      ORDER BY changed_at DESC
    `);
    
    return stmt.all(id) as any[];
  }

  private rowToHandoff(row: any): HandoffRequest {
    return {
      id: row.id,
      project_id: row.project_id,
      title: row.title,
      strategic_context: row.strategic_context,
      tactical_requirements: JSON.parse(row.tactical_requirements),
      project_info: JSON.parse(row.project_info),
      acceptance_criteria: JSON.parse(row.acceptance_criteria),
      priority: row.priority,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      notes: row.notes ? JSON.parse(row.notes) : undefined,
      completion_artifacts: row.completion_artifacts ? JSON.parse(row.completion_artifacts) : undefined,
      estimated_hours: row.estimated_hours || undefined,
      actual_hours: row.actual_hours || undefined
    };
  }

  // Project Management Methods
  
  async saveProject(project: Project): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO projects (
        id, name, description, tags, created_at, updated_at, archived, default_project_info
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      project.id,
      project.name,
      project.description,
      JSON.stringify(project.tags),
      project.created_at,
      project.updated_at,
      project.archived ? 1 : 0,
      project.default_project_info ? JSON.stringify(project.default_project_info) : null
    );
  }

  async getProject(id: string): Promise<Project | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const stmt = this.db.prepare('SELECT * FROM projects WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) {
      return null;
    }

    return this.rowToProject(row);
  }

  async listProjects(filter?: ProjectFilter): Promise<Project[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    let query = 'SELECT * FROM projects WHERE 1=1';
    const params: any[] = [];

    if (!filter?.include_archived) {
      query += ' AND archived = 0';
    }

    if (filter?.search) {
      query += ' AND (name LIKE ? OR description LIKE ?)';
      params.push(`%${filter.search}%`, `%${filter.search}%`);
    }

    query += ' ORDER BY created_at DESC';

    if (filter?.limit) {
      query += ' LIMIT ?';
      params.push(filter.limit);
    }

    if (filter?.offset) {
      query += ' OFFSET ?';
      params.push(filter.offset);
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];

    return rows.map(row => this.rowToProject(row));
  }

  async archiveProject(id: string): Promise<boolean> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const stmt = this.db.prepare(`
      UPDATE projects SET archived = 1, updated_at = ? WHERE id = ?
    `);
    
    const result = stmt.run(new Date().toISOString(), id);
    return result.changes > 0;
  }

  async getProjectStats(projectId: string): Promise<ProjectStats> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // Get total handoffs
    const totalStmt = this.db.prepare('SELECT COUNT(*) as count FROM handoffs WHERE project_id = ?');
    const total = (totalStmt.get(projectId) as any).count;

    // Get handoffs by status
    const statusStmt = this.db.prepare(`
      SELECT status, COUNT(*) as count 
      FROM handoffs 
      WHERE project_id = ?
      GROUP BY status
    `);
    const statusRows = statusStmt.all(projectId) as any[];
    const by_status = statusRows.reduce((acc, row) => {
      acc[row.status] = row.count;
      return acc;
    }, {} as Record<string, number>);

    // Get handoffs by priority
    const priorityStmt = this.db.prepare(`
      SELECT priority, COUNT(*) as count 
      FROM handoffs 
      WHERE project_id = ?
      GROUP BY priority
    `);
    const priorityRows = priorityStmt.all(projectId) as any[];
    const by_priority = priorityRows.reduce((acc, row) => {
      acc[row.priority] = row.count;
      return acc;
    }, {} as Record<string, number>);

    // Calculate avg completion time
    const completionStmt = this.db.prepare(`
      SELECT AVG(julianday(updated_at) - julianday(created_at)) * 24 as avg_hours
      FROM handoffs 
      WHERE project_id = ? AND status = 'completed'
    `);
    const avgResult = completionStmt.get(projectId) as any;
    const avg_completion_time = avgResult.avg_hours || 0;

    // Calculate success rate
    const completed = by_status['completed'] || 0;
    const failed = by_status['failed'] || 0;
    const success_rate = (completed + failed) > 0 ? completed / (completed + failed) : 0;

    // Count active handoffs
    const activeStmt = this.db.prepare(`
      SELECT COUNT(*) as count 
      FROM handoffs 
      WHERE project_id = ? AND status IN ('pending', 'in_progress')
    `);
    const active_handoffs = (activeStmt.get(projectId) as any).count;

    // Get last activity
    const lastActivityStmt = this.db.prepare(`
      SELECT MAX(updated_at) as last_activity 
      FROM handoffs 
      WHERE project_id = ?
    `);
    const lastActivity = (lastActivityStmt.get(projectId) as any).last_activity || new Date().toISOString();

    return {
      project_id: projectId,
      total_handoffs: total,
      handoffs_by_status: by_status as any,
      handoffs_by_priority: by_priority as any,
      avg_completion_time,
      success_rate,
      active_handoffs,
      last_activity: lastActivity
    };
  }

  private rowToProject(row: any): Project {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      tags: JSON.parse(row.tags),
      created_at: row.created_at,
      updated_at: row.updated_at,
      archived: row.archived === 1,
      default_project_info: row.default_project_info ? JSON.parse(row.default_project_info) : undefined
    };
  }

  private async migrateExistingHandoffs(): Promise<void> {
    if (!this.db) return;

    // Check if migration is needed
    const checkStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM sqlite_master 
      WHERE type='table' AND name='handoffs' 
      AND sql NOT LIKE '%project_id%'
    `);
    const needsMigration = (checkStmt.get() as any).count > 0;

    if (!needsMigration) return;

    console.error('🔄 Migrating existing handoffs to project-based structure...');

    // Create default project
    const defaultProjectId = 'project_default_' + Date.now();
    const defaultProject: Project = {
      id: defaultProjectId,
      name: 'Default Project',
      description: 'Auto-generated project for migrated handoffs',
      tags: ['migrated'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      archived: false
    };

    await this.saveProject(defaultProject);

    // Add project_id column to existing handoffs
    this.db.exec(`
      ALTER TABLE handoffs ADD COLUMN project_id TEXT;
      UPDATE handoffs SET project_id = '${defaultProjectId}' WHERE project_id IS NULL;
    `);

    console.error('✅ Migration completed. All existing handoffs moved to default project.');
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}