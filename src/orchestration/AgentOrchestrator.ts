/**
 * Agent Orchestrator - Multi-Agent Coordination System
 * 
 * Solves the #3 pain point: No multi-agent collaboration
 * Enables intelligent routing, load balancing, and coordination between AI agents
 */

import { EventEmitter } from 'events';
import { ContextManager, SessionContext } from '../context/ContextManager.js';
import { WorkflowEngine, Workflow, WorkflowStep } from '../workflow/WorkflowEngine.js';
import * as crypto from 'crypto';

export type AgentType = 'claude' | 'gpt' | 'copilot' | 'cursor' | 'gemini' | 'llama' | 'generic';

export type AgentStatus = 'available' | 'busy' | 'offline' | 'error' | 'maintenance';

export interface AgentCapability {
  category: 'coding' | 'analysis' | 'writing' | 'research' | 'review' | 'testing' | 'deployment';
  skill: string;
  proficiency: 1 | 2 | 3 | 4 | 5; // 1=basic, 5=expert
  languages?: string[]; // Programming languages
  frameworks?: string[]; // Frameworks/libraries
  tools?: string[]; // Tools they can use
}

export interface Agent {
  id: string;
  type: AgentType;
  name: string;
  status: AgentStatus;
  capabilities: AgentCapability[];
  currentLoad: number; // 0-100 percentage
  maxConcurrentTasks: number;
  activeTasks: string[]; // Task IDs
  performance: {
    tasksCompleted: number;
    averageCompletionTime: number; // minutes
    successRate: number; // percentage
    specialties: Map<string, number>; // skill -> success rate
  };
  availability: {
    schedule?: { start: string; end: string }; // Time range
    timezone?: string;
    preferredTaskTypes?: string[];
  };
  metadata: {
    version?: string;
    endpoint?: string; // API endpoint if remote
    apiKey?: string; // Encrypted
    rateLimit?: { requests: number; per: 'minute' | 'hour' };
  };
}

export interface TaskAssignment {
  taskId: string;
  agentId: string;
  workflowId?: string;
  stepId?: string;
  assignedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  status: 'assigned' | 'in_progress' | 'completed' | 'failed' | 'reassigned';
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedDuration?: number; // minutes
  actualDuration?: number;
  retryCount: number;
  output?: any;
  error?: string;
}

export interface CollaborationSession {
  id: string;
  agents: string[]; // Agent IDs
  leadAgent?: string;
  purpose: string;
  sharedContext: Record<string, any>;
  messages: Array<{
    from: string;
    to: string | 'all';
    content: string;
    timestamp: Date;
    type: 'request' | 'response' | 'broadcast' | 'handoff';
  }>;
  status: 'active' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
}

export interface LoadBalancingStrategy {
  type: 'round_robin' | 'least_loaded' | 'capability_based' | 'performance_based' | 'hybrid';
  weights?: Map<string, number>; // Agent ID -> weight
  rules?: Array<{
    condition: (task: any, agent: Agent) => boolean;
    priority: number;
  }>;
}

export class AgentOrchestrator extends EventEmitter {
  private agents: Map<string, Agent> = new Map();
  private assignments: Map<string, TaskAssignment> = new Map();
  private collaborations: Map<string, CollaborationSession> = new Map();
  private contextManager: ContextManager;
  private workflowEngine: WorkflowEngine;
  private loadBalancingStrategy: LoadBalancingStrategy;
  private agentQueue: string[] = []; // Round-robin queue

  constructor(
    contextManager: ContextManager,
    workflowEngine: WorkflowEngine,
    strategy: LoadBalancingStrategy = { type: 'capability_based' }
  ) {
    super();
    this.contextManager = contextManager;
    this.workflowEngine = workflowEngine;
    this.loadBalancingStrategy = strategy;
    this.initializeDefaultAgents();
  }

  /**
   * Initialize default agent profiles
   */
  private initializeDefaultAgents() {
    // Claude - Expert at analysis and architecture
    this.registerAgent({
      id: 'claude-3-opus',
      type: 'claude',
      name: 'Claude (Opus)',
      status: 'available',
      capabilities: [
        { category: 'analysis', skill: 'system_design', proficiency: 5 },
        { category: 'coding', skill: 'architecture', proficiency: 5 },
        { category: 'writing', skill: 'documentation', proficiency: 5 },
        { category: 'review', skill: 'code_review', proficiency: 4 },
        { 
          category: 'coding', 
          skill: 'implementation', 
          proficiency: 4,
          languages: ['typescript', 'python', 'rust', 'go'],
          frameworks: ['react', 'node', 'django', 'fastapi']
        }
      ],
      currentLoad: 0,
      maxConcurrentTasks: 3,
      activeTasks: [],
      performance: {
        tasksCompleted: 0,
        averageCompletionTime: 30,
        successRate: 95,
        specialties: new Map([
          ['system_design', 98],
          ['documentation', 96],
          ['code_review', 94]
        ])
      },
      availability: {
        preferredTaskTypes: ['architecture', 'design', 'review']
      },
      metadata: {}
    });

    // GPT-4 - Versatile problem solver
    this.registerAgent({
      id: 'gpt-4-turbo',
      type: 'gpt',
      name: 'GPT-4 Turbo',
      status: 'available',
      capabilities: [
        { category: 'coding', skill: 'implementation', proficiency: 4 },
        { category: 'research', skill: 'web_search', proficiency: 5 },
        { category: 'analysis', skill: 'data_analysis', proficiency: 4 },
        { category: 'testing', skill: 'test_generation', proficiency: 4 },
        {
          category: 'coding',
          skill: 'debugging',
          proficiency: 4,
          languages: ['javascript', 'python', 'java', 'c++'],
          frameworks: ['express', 'flask', 'spring', 'tensorflow']
        }
      ],
      currentLoad: 0,
      maxConcurrentTasks: 5,
      activeTasks: [],
      performance: {
        tasksCompleted: 0,
        averageCompletionTime: 25,
        successRate: 92,
        specialties: new Map([
          ['implementation', 93],
          ['debugging', 91],
          ['test_generation', 90]
        ])
      },
      availability: {
        preferredTaskTypes: ['implementation', 'debugging', 'testing']
      },
      metadata: {}
    });

    // Gemini - Fast and efficient
    this.registerAgent({
      id: 'gemini-pro',
      type: 'gemini',
      name: 'Gemini Pro',
      status: 'available',
      capabilities: [
        { category: 'coding', skill: 'refactoring', proficiency: 4 },
        { category: 'analysis', skill: 'performance_optimization', proficiency: 4 },
        { category: 'research', skill: 'quick_answers', proficiency: 5 },
        {
          category: 'coding',
          skill: 'script_automation',
          proficiency: 4,
          languages: ['python', 'bash', 'javascript'],
          tools: ['git', 'docker', 'kubernetes']
        }
      ],
      currentLoad: 0,
      maxConcurrentTasks: 10, // Can handle more parallel tasks
      activeTasks: [],
      performance: {
        tasksCompleted: 0,
        averageCompletionTime: 15, // Faster
        successRate: 90,
        specialties: new Map([
          ['refactoring', 92],
          ['performance_optimization', 89],
          ['script_automation', 91]
        ])
      },
      availability: {
        preferredTaskTypes: ['refactoring', 'optimization', 'automation']
      },
      metadata: {}
    });
  }

  /**
   * Register a new agent
   */
  registerAgent(agent: Agent): void {
    this.agents.set(agent.id, agent);
    this.agentQueue.push(agent.id); // Add to round-robin queue
    this.emit('agent:registered', agent);
  }

  /**
   * Update agent status
   */
  updateAgentStatus(agentId: string, status: AgentStatus): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.status = status;
      this.emit('agent:status_changed', { agentId, status });
      
      // Reassign tasks if agent goes offline
      if (status === 'offline' || status === 'error') {
        this.reassignAgentTasks(agentId);
      }
    }
  }

  /**
   * Assign a task to the best available agent
   */
  async assignTask(params: {
    taskId: string;
    description: string;
    requiredCapabilities?: Partial<AgentCapability>[];
    priority?: TaskAssignment['priority'];
    workflowId?: string;
    stepId?: string;
    preferredAgent?: string;
    estimatedDuration?: number;
  }): Promise<TaskAssignment> {
    // Find best agent based on strategy
    const agent = await this.selectAgent(
      params.requiredCapabilities,
      params.preferredAgent
    );
    
    if (!agent) {
      throw new Error('No suitable agent available for task');
    }
    
    const assignment: TaskAssignment = {
      taskId: params.taskId,
      agentId: agent.id,
      workflowId: params.workflowId,
      stepId: params.stepId,
      assignedAt: new Date(),
      status: 'assigned',
      priority: params.priority || 'medium',
      estimatedDuration: params.estimatedDuration,
      retryCount: 0
    };
    
    // Update agent load
    agent.activeTasks.push(params.taskId);
    agent.currentLoad = (agent.activeTasks.length / agent.maxConcurrentTasks) * 100;
    
    this.assignments.set(params.taskId, assignment);
    this.emit('task:assigned', { assignment, agent });
    
    return assignment;
  }

  /**
   * Select best agent based on strategy
   */
  private async selectAgent(
    requiredCapabilities?: Partial<AgentCapability>[],
    preferredAgent?: string
  ): Promise<Agent | null> {
    // Check preferred agent first
    if (preferredAgent) {
      const agent = this.agents.get(preferredAgent);
      if (agent && agent.status === 'available' && agent.currentLoad < 100) {
        return agent;
      }
    }
    
    const availableAgents = Array.from(this.agents.values()).filter(
      a => a.status === 'available' && a.currentLoad < 100
    );
    
    if (availableAgents.length === 0) {
      return null;
    }
    
    switch (this.loadBalancingStrategy.type) {
      case 'round_robin':
        return this.selectRoundRobin(availableAgents);
      
      case 'least_loaded':
        return this.selectLeastLoaded(availableAgents);
      
      case 'capability_based':
        return this.selectByCapability(availableAgents, requiredCapabilities);
      
      case 'performance_based':
        return this.selectByPerformance(availableAgents, requiredCapabilities);
      
      case 'hybrid':
        return this.selectHybrid(availableAgents, requiredCapabilities);
      
      default:
        return availableAgents[0];
    }
  }

  /**
   * Round-robin selection
   */
  private selectRoundRobin(agents: Agent[]): Agent {
    let selectedAgent: Agent | undefined;
    
    while (!selectedAgent && this.agentQueue.length > 0) {
      const agentId = this.agentQueue.shift()!;
      this.agentQueue.push(agentId); // Move to back of queue
      
      selectedAgent = agents.find(a => a.id === agentId);
    }
    
    return selectedAgent || agents[0];
  }

  /**
   * Select least loaded agent
   */
  private selectLeastLoaded(agents: Agent[]): Agent {
    return agents.reduce((least, agent) => 
      agent.currentLoad < least.currentLoad ? agent : least
    );
  }

  /**
   * Select by capability match
   */
  private selectByCapability(
    agents: Agent[],
    requiredCapabilities?: Partial<AgentCapability>[]
  ): Agent {
    if (!requiredCapabilities || requiredCapabilities.length === 0) {
      return this.selectLeastLoaded(agents);
    }
    
    // Score agents based on capability match
    const scores = agents.map(agent => {
      let score = 0;
      
      for (const required of requiredCapabilities) {
        const matching = agent.capabilities.find(cap => {
          let match = true;
          if (required.category && cap.category !== required.category) match = false;
          if (required.skill && cap.skill !== required.skill) match = false;
          if (required.languages) {
            const hasLang = required.languages.some(l => 
              cap.languages?.includes(l)
            );
            if (!hasLang) match = false;
          }
          return match;
        });
        
        if (matching) {
          score += matching.proficiency;
        }
      }
      
      // Factor in current load
      score = score * (1 - agent.currentLoad / 100);
      
      return { agent, score };
    });
    
    // Return highest scoring agent
    scores.sort((a, b) => b.score - a.score);
    return scores[0].agent;
  }

  /**
   * Select by performance history
   */
  private selectByPerformance(
    agents: Agent[],
    requiredCapabilities?: Partial<AgentCapability>[]
  ): Agent {
    const scores = agents.map(agent => {
      let score = agent.performance.successRate;
      
      // Boost score for specialists
      if (requiredCapabilities) {
        for (const req of requiredCapabilities) {
          if (req.skill && agent.performance.specialties.has(req.skill)) {
            score += agent.performance.specialties.get(req.skill)! / 10;
          }
        }
      }
      
      // Factor in speed
      score += (100 - agent.performance.averageCompletionTime) / 10;
      
      // Factor in current load
      score = score * (1 - agent.currentLoad / 100);
      
      return { agent, score };
    });
    
    scores.sort((a, b) => b.score - a.score);
    return scores[0].agent;
  }

  /**
   * Hybrid selection strategy
   */
  private selectHybrid(
    agents: Agent[],
    requiredCapabilities?: Partial<AgentCapability>[]
  ): Agent {
    // Combine capability and performance scoring
    const capabilityAgent = this.selectByCapability(agents, requiredCapabilities);
    const performanceAgent = this.selectByPerformance(agents, requiredCapabilities);
    
    // If same agent wins both, return it
    if (capabilityAgent.id === performanceAgent.id) {
      return capabilityAgent;
    }
    
    // Otherwise pick the less loaded one
    return capabilityAgent.currentLoad < performanceAgent.currentLoad 
      ? capabilityAgent 
      : performanceAgent;
  }

  /**
   * Start task execution
   */
  async startTask(taskId: string, sessionId?: string): Promise<void> {
    const assignment = this.assignments.get(taskId);
    if (!assignment) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    assignment.status = 'in_progress';
    assignment.startedAt = new Date();
    
    // Link to context session if provided
    if (sessionId) {
      await this.contextManager.updateTaskContext(sessionId, {
        taskId,
        title: `Task ${taskId}`,
        status: 'in_progress',
        startedAt: assignment.startedAt
      });
    }
    
    this.emit('task:started', { taskId, agentId: assignment.agentId });
  }

  /**
   * Complete task execution
   */
  async completeTask(
    taskId: string,
    output?: any,
    sessionId?: string
  ): Promise<void> {
    const assignment = this.assignments.get(taskId);
    if (!assignment) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    const agent = this.agents.get(assignment.agentId);
    if (!agent) {
      throw new Error(`Agent ${assignment.agentId} not found`);
    }
    
    // Update assignment
    assignment.status = 'completed';
    assignment.completedAt = new Date();
    assignment.output = output;
    
    if (assignment.startedAt) {
      assignment.actualDuration = 
        (assignment.completedAt.getTime() - assignment.startedAt.getTime()) / 60000;
    }
    
    // Update agent metrics
    agent.activeTasks = agent.activeTasks.filter(t => t !== taskId);
    agent.currentLoad = (agent.activeTasks.length / agent.maxConcurrentTasks) * 100;
    agent.performance.tasksCompleted++;
    
    if (assignment.actualDuration) {
      const prevAvg = agent.performance.averageCompletionTime;
      const count = agent.performance.tasksCompleted;
      agent.performance.averageCompletionTime = 
        (prevAvg * (count - 1) + assignment.actualDuration) / count;
    }
    
    // Update workflow if linked
    if (assignment.workflowId && assignment.stepId) {
      await this.workflowEngine.completeStep(
        assignment.workflowId,
        assignment.stepId,
        output
      );
    }
    
    // Update context if linked
    if (sessionId) {
      await this.contextManager.updateTaskContext(sessionId, {
        taskId,
        title: `Task ${taskId}`,
        status: 'completed',
        startedAt: assignment.startedAt!
      });
    }
    
    this.emit('task:completed', { taskId, agentId: assignment.agentId, output });
  }

  /**
   * Handle task failure
   */
  async failTask(
    taskId: string,
    error: string,
    retry: boolean = true
  ): Promise<void> {
    const assignment = this.assignments.get(taskId);
    if (!assignment) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    const agent = this.agents.get(assignment.agentId);
    if (agent) {
      // Update agent metrics
      agent.performance.successRate = 
        (agent.performance.successRate * agent.performance.tasksCompleted) / 
        (agent.performance.tasksCompleted + 1);
      
      // Remove from active tasks
      agent.activeTasks = agent.activeTasks.filter(t => t !== taskId);
      agent.currentLoad = (agent.activeTasks.length / agent.maxConcurrentTasks) * 100;
    }
    
    assignment.error = error;
    assignment.retryCount++;
    
    if (retry && assignment.retryCount < 3) {
      // Reassign to different agent
      await this.reassignTask(taskId);
    } else {
      assignment.status = 'failed';
      assignment.completedAt = new Date();
      this.emit('task:failed', { taskId, error, finalAttempt: true });
    }
  }

  /**
   * Reassign task to different agent
   */
  private async reassignTask(taskId: string): Promise<void> {
    const assignment = this.assignments.get(taskId);
    if (!assignment) return;
    
    const previousAgentId = assignment.agentId;
    
    // Find new agent (excluding previous one)
    const availableAgents = Array.from(this.agents.values()).filter(
      a => a.id !== previousAgentId && 
           a.status === 'available' && 
           a.currentLoad < 100
    );
    
    if (availableAgents.length === 0) {
      assignment.status = 'failed';
      this.emit('task:failed', { taskId, reason: 'No agents available' });
      return;
    }
    
    const newAgent = this.selectLeastLoaded(availableAgents);
    assignment.agentId = newAgent.id;
    assignment.status = 'reassigned';
    
    newAgent.activeTasks.push(taskId);
    newAgent.currentLoad = (newAgent.activeTasks.length / newAgent.maxConcurrentTasks) * 100;
    
    this.emit('task:reassigned', { 
      taskId, 
      from: previousAgentId, 
      to: newAgent.id 
    });
  }

  /**
   * Reassign all tasks from an agent
   */
  private async reassignAgentTasks(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) return;
    
    const tasks = [...agent.activeTasks];
    for (const taskId of tasks) {
      await this.reassignTask(taskId);
    }
    
    agent.activeTasks = [];
    agent.currentLoad = 0;
  }

  /**
   * Create collaboration session between agents
   */
  async createCollaboration(params: {
    agents: string[];
    purpose: string;
    leadAgent?: string;
    sharedContext?: Record<string, any>;
  }): Promise<CollaborationSession> {
    const sessionId = crypto.randomUUID();
    
    const collaboration: CollaborationSession = {
      id: sessionId,
      agents: params.agents,
      leadAgent: params.leadAgent || params.agents[0],
      purpose: params.purpose,
      sharedContext: params.sharedContext || {},
      messages: [],
      status: 'active',
      createdAt: new Date()
    };
    
    this.collaborations.set(sessionId, collaboration);
    this.emit('collaboration:created', collaboration);
    
    return collaboration;
  }

  /**
   * Send message in collaboration
   */
  async sendCollaborationMessage(
    sessionId: string,
    from: string,
    to: string | 'all',
    content: string,
    type: CollaborationSession['messages'][0]['type'] = 'request'
  ): Promise<void> {
    const collaboration = this.collaborations.get(sessionId);
    if (!collaboration) {
      throw new Error(`Collaboration ${sessionId} not found`);
    }
    
    const message = {
      from,
      to,
      content,
      timestamp: new Date(),
      type
    };
    
    collaboration.messages.push(message);
    
    this.emit('collaboration:message', { sessionId, message });
    
    // Handle handoff type
    if (type === 'handoff' && to !== 'all') {
      await this.handleHandoff(sessionId, from, to, content);
    }
  }

  /**
   * Handle agent handoff
   */
  private async handleHandoff(
    sessionId: string,
    from: string,
    to: string,
    context: string
  ): Promise<void> {
    // Create context handoff
    const session = await this.contextManager.startSession({
      projectId: sessionId,
      agentType: this.agents.get(to)?.type || 'generic',
      agentId: to,
      metadata: { handoffFrom: from, handoffContext: context }
    });
    
    // Add handoff message to new session
    await this.contextManager.addMessage(session.sessionId, {
      role: 'system',
      content: `Handoff from ${from}: ${context}`,
      timestamp: new Date()
    });
    
    this.emit('handoff:completed', { from, to, sessionId });
  }

  /**
   * Get agent workload summary
   */
  getWorkloadSummary(): {
    totalAgents: number;
    availableAgents: number;
    totalTasks: number;
    averageLoad: number;
    agentLoads: Array<{ agentId: string; name: string; load: number; tasks: number }>;
  } {
    const agents = Array.from(this.agents.values());
    const available = agents.filter(a => a.status === 'available');
    const totalTasks = agents.reduce((sum, a) => sum + a.activeTasks.length, 0);
    const averageLoad = agents.reduce((sum, a) => sum + a.currentLoad, 0) / agents.length;
    
    return {
      totalAgents: agents.length,
      availableAgents: available.length,
      totalTasks,
      averageLoad: Math.round(averageLoad),
      agentLoads: agents.map(a => ({
        agentId: a.id,
        name: a.name,
        load: Math.round(a.currentLoad),
        tasks: a.activeTasks.length
      }))
    };
  }

  /**
   * Get agent performance metrics
   */
  getAgentMetrics(agentId: string): Agent['performance'] | null {
    const agent = this.agents.get(agentId);
    return agent ? agent.performance : null;
  }

  /**
   * Get best agent for a skill
   */
  getBestAgentForSkill(skill: string): Agent | null {
    const agents = Array.from(this.agents.values()).filter(
      a => a.status === 'available'
    );
    
    let bestAgent: Agent | null = null;
    let bestScore = 0;
    
    for (const agent of agents) {
      const capability = agent.capabilities.find(c => c.skill === skill);
      if (capability) {
        const score = capability.proficiency * 
          (agent.performance.specialties.get(skill) || agent.performance.successRate) / 100;
        
        if (score > bestScore) {
          bestScore = score;
          bestAgent = agent;
        }
      }
    }
    
    return bestAgent;
  }
}