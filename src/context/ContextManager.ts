/**
 * Context Manager - The Memory Layer for AI Agents
 * 
 * Solves the #1 pain point: AI agents losing context between sessions
 * This is the core innovation that makes AI agents reliable team members
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';
import { EventEmitter } from 'events';
import * as crypto from 'crypto';

export interface SessionContext {
  sessionId: string;
  projectId: string;
  agentType: 'claude' | 'gpt' | 'copilot' | 'cursor' | 'gemini' | 'llama' | 'generic';
  agentId: string;
  startedAt: Date;
  lastActiveAt: Date;
  conversationHistory: Message[];
  decisions: Decision[];
  artifacts: Artifact[];
  currentTask?: TaskContext;
  metadata: Record<string, any>;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  tokenCount?: number;
}

export interface Decision {
  id: string;
  description: string;
  rationale: string;
  timestamp: Date;
  impact: 'low' | 'medium' | 'high';
  relatedCode?: string[];
}

export interface Artifact {
  type: 'file' | 'code' | 'command' | 'output';
  path?: string;
  content: string;
  timestamp: Date;
  operation: 'created' | 'modified' | 'deleted' | 'executed';
}

export interface TaskContext {
  taskId: string;
  title: string;
  status: 'in_progress' | 'blocked' | 'completed';
  startedAt: Date;
  blockers?: string[];
  progress?: number;
}

export interface ContextSearchResult {
  content: string;
  relevance: number;
  source: 'session' | 'project' | 'global';
  timestamp: Date;
}

export class ContextManager extends EventEmitter {
  private supabase: SupabaseClient | null = null;
  private openai: OpenAI | null = null;
  private sessions: Map<string, SessionContext> = new Map();
  private localStoragePath: string;
  private useSupabase: boolean = false;

  constructor(config?: {
    supabaseUrl?: string;
    supabaseKey?: string;
    openaiKey?: string;
    localStoragePath?: string;
  }) {
    super();
    
    this.localStoragePath = config?.localStoragePath || './.handoff-context';
    
    // Initialize Supabase if credentials provided
    if (config?.supabaseUrl && config?.supabaseKey) {
      this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
      this.useSupabase = true;
    }
    
    // Initialize OpenAI for embeddings if key provided
    if (config?.openaiKey) {
      this.openai = new OpenAI({ apiKey: config.openaiKey });
    }
  }

  /**
   * Start or resume a session for an AI agent
   */
  async startSession(params: {
    projectId: string;
    agentType: SessionContext['agentType'];
    agentId?: string;
    metadata?: Record<string, any>;
  }): Promise<SessionContext> {
    const sessionId = this.generateSessionId(params.projectId, params.agentId);
    
    // Check if session exists
    let session = await this.loadSession(sessionId);
    
    if (session) {
      // Resume existing session
      session.lastActiveAt = new Date();
      this.emit('session:resumed', session);
    } else {
      // Create new session
      session = {
        sessionId,
        projectId: params.projectId,
        agentType: params.agentType,
        agentId: params.agentId || `${params.agentType}-${Date.now()}`,
        startedAt: new Date(),
        lastActiveAt: new Date(),
        conversationHistory: [],
        decisions: [],
        artifacts: [],
        metadata: params.metadata || {}
      };
      this.emit('session:created', session);
    }
    
    this.sessions.set(sessionId, session);
    await this.saveSession(session);
    
    return session;
  }

  /**
   * Add a message to the conversation history
   */
  async addMessage(sessionId: string, message: Message): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    
    session.conversationHistory.push(message);
    session.lastActiveAt = new Date();
    
    // Store embedding if OpenAI is configured
    if (this.openai && this.useSupabase) {
      await this.storeEmbedding(session.projectId, sessionId, message.content);
    }
    
    await this.saveSession(session);
    this.emit('message:added', { sessionId, message });
  }

  /**
   * Record a decision made during the session
   */
  async recordDecision(sessionId: string, decision: Omit<Decision, 'id' | 'timestamp'>): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    
    const fullDecision: Decision = {
      ...decision,
      id: crypto.randomUUID(),
      timestamp: new Date()
    };
    
    session.decisions.push(fullDecision);
    await this.saveSession(session);
    this.emit('decision:recorded', { sessionId, decision: fullDecision });
  }

  /**
   * Track an artifact (file, code, output) created/modified
   */
  async trackArtifact(sessionId: string, artifact: Artifact): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    
    session.artifacts.push(artifact);
    await this.saveSession(session);
    this.emit('artifact:tracked', { sessionId, artifact });
  }

  /**
   * Update current task context
   */
  async updateTaskContext(sessionId: string, task: TaskContext): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    
    session.currentTask = task;
    session.lastActiveAt = new Date();
    await this.saveSession(session);
    this.emit('task:updated', { sessionId, task });
  }

  /**
   * Search for relevant context across sessions
   */
  async searchContext(
    projectId: string,
    query: string,
    limit: number = 5
  ): Promise<ContextSearchResult[]> {
    const results: ContextSearchResult[] = [];
    
    if (this.useSupabase && this.openai) {
      // Use vector similarity search
      const embedding = await this.generateEmbedding(query);
      
      const { data, error } = await this.supabase!
        .rpc('match_handoff_context', {
          project_id: projectId,
          query_embedding: embedding,
          match_threshold: 0.7,
          match_count: limit
        });
      
      if (data) {
        results.push(...data.map((item: any) => ({
          content: item.content,
          relevance: item.similarity,
          source: 'project' as const,
          timestamp: new Date(item.created_at)
        })));
      }
    } else {
      // Fallback to keyword search in local sessions
      for (const session of this.sessions.values()) {
        if (session.projectId !== projectId) continue;
        
        for (const msg of session.conversationHistory) {
          if (msg.content.toLowerCase().includes(query.toLowerCase())) {
            results.push({
              content: msg.content,
              relevance: 0.5, // Basic keyword match
              source: 'session',
              timestamp: msg.timestamp
            });
          }
        }
      }
    }
    
    // Sort by relevance and limit
    return results
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit);
  }

  /**
   * Get context summary for injection into new session
   */
  async getContextSummary(projectId: string): Promise<string> {
    const summaryParts: string[] = [];
    
    // Get recent sessions
    const projectSessions = Array.from(this.sessions.values())
      .filter(s => s.projectId === projectId)
      .sort((a, b) => b.lastActiveAt.getTime() - a.lastActiveAt.getTime())
      .slice(0, 3);
    
    for (const session of projectSessions) {
      summaryParts.push(`\n## Previous Session (${session.agentType} - ${session.sessionId.slice(0, 8)})`);
      
      // Include recent decisions
      const recentDecisions = session.decisions.slice(-3);
      if (recentDecisions.length > 0) {
        summaryParts.push('\n### Key Decisions:');
        recentDecisions.forEach(d => {
          summaryParts.push(`- ${d.description}: ${d.rationale}`);
        });
      }
      
      // Include current task
      if (session.currentTask) {
        summaryParts.push(`\n### Current Task: ${session.currentTask.title} (${session.currentTask.status})`);
        if (session.currentTask.blockers?.length) {
          summaryParts.push(`Blockers: ${session.currentTask.blockers.join(', ')}`);
        }
      }
      
      // Include recent artifacts
      const recentArtifacts = session.artifacts.slice(-5);
      if (recentArtifacts.length > 0) {
        summaryParts.push('\n### Recent Changes:');
        recentArtifacts.forEach(a => {
          summaryParts.push(`- ${a.operation} ${a.type}: ${a.path || 'inline'}`);
        });
      }
    }
    
    return summaryParts.join('\n');
  }

  /**
   * Generate embedding for text using OpenAI
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    if (!this.openai) {
      throw new Error('OpenAI not configured for embeddings');
    }
    
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    
    return response.data[0].embedding;
  }

  /**
   * Store embedding in Supabase
   */
  private async storeEmbedding(
    projectId: string,
    sessionId: string,
    content: string
  ): Promise<void> {
    if (!this.supabase || !this.openai) return;
    
    const embedding = await this.generateEmbedding(content);
    
    await this.supabase
      .from('handoff_context')
      .upsert({
        project_id: projectId,
        session_id: sessionId,
        agent_type: this.sessions.get(sessionId)?.agentType,
        content: content.slice(0, 1000), // Limit content size
        embedding,
        metadata: {
          timestamp: new Date().toISOString(),
          tokenCount: this.estimateTokens(content)
        }
      });
  }

  /**
   * Save session to storage (local or Supabase)
   */
  private async saveSession(session: SessionContext): Promise<void> {
    if (this.useSupabase && this.supabase) {
      // Save to Supabase
      await this.supabase
        .from('handoff_sessions')
        .upsert({
          id: session.sessionId,
          project_id: session.projectId,
          agent_type: session.agentType,
          agent_id: session.agentId,
          started_at: session.startedAt,
          last_active_at: session.lastActiveAt,
          conversation_history: session.conversationHistory,
          decisions: session.decisions,
          artifacts: session.artifacts,
          current_task: session.currentTask,
          metadata: session.metadata
        });
    } else {
      // Save to local file
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const dir = path.join(this.localStoragePath, session.projectId);
      await fs.mkdir(dir, { recursive: true });
      
      const file = path.join(dir, `${session.sessionId}.json`);
      await fs.writeFile(file, JSON.stringify(session, null, 2));
    }
  }

  /**
   * Load session from storage
   */
  private async loadSession(sessionId: string): Promise<SessionContext | null> {
    // Check memory first
    if (this.sessions.has(sessionId)) {
      return this.sessions.get(sessionId)!;
    }
    
    if (this.useSupabase && this.supabase) {
      // Load from Supabase
      const { data, error } = await this.supabase
        .from('handoff_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
      
      if (data) {
        const session: SessionContext = {
          ...data,
          startedAt: new Date(data.started_at),
          lastActiveAt: new Date(data.last_active_at),
          conversationHistory: data.conversation_history || [],
          decisions: data.decisions || [],
          artifacts: data.artifacts || [],
        };
        this.sessions.set(sessionId, session);
        return session;
      }
    } else {
      // Load from local file
      const fs = await import('fs/promises');
      const path = await import('path');
      
      // Search in all project directories
      try {
        const projects = await fs.readdir(this.localStoragePath);
        for (const project of projects) {
          const file = path.join(this.localStoragePath, project, `${sessionId}.json`);
          try {
            const data = await fs.readFile(file, 'utf-8');
            const session = JSON.parse(data);
            // Convert date strings back to Date objects
            session.startedAt = new Date(session.startedAt);
            session.lastActiveAt = new Date(session.lastActiveAt);
            this.sessions.set(sessionId, session);
            return session;
          } catch {
            // File doesn't exist in this project
            continue;
          }
        }
      } catch {
        // Directory doesn't exist
      }
    }
    
    return null;
  }

  /**
   * Generate a deterministic session ID
   */
  private generateSessionId(projectId: string, agentId?: string): string {
    const baseId = `${projectId}-${agentId || 'default'}`;
    return crypto.createHash('sha256').update(baseId).digest('hex').slice(0, 16);
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Clean up old sessions to manage memory
   */
  async cleanupOldSessions(daysToKeep: number = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    let cleaned = 0;
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.lastActiveAt < cutoffDate) {
        this.sessions.delete(sessionId);
        cleaned++;
      }
    }
    
    this.emit('cleanup:completed', { sessionsRemoved: cleaned });
    return cleaned;
  }
}