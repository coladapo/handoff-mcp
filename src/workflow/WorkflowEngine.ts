/**
 * Workflow Engine - Orchestrating Complex AI Agent Tasks
 * 
 * Solves the #2 pain point: No structured workflow management
 * Provides state machine-based orchestration for multi-step AI tasks
 */

import { EventEmitter } from 'events';
import { ContextManager, SessionContext } from '../context/ContextManager.js';
import * as crypto from 'crypto';

export type WorkflowState = 
  | 'draft'
  | 'ready'
  | 'running'
  | 'paused'
  | 'blocked'
  | 'review'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  type: 'ai_task' | 'human_review' | 'automated' | 'decision' | 'parallel';
  assignee?: {
    type: 'ai' | 'human';
    id: string;
    agentType?: 'claude' | 'gpt' | 'copilot' | 'cursor' | 'generic';
  };
  dependencies?: string[]; // Step IDs that must complete first
  inputs?: Record<string, any>;
  outputs?: Record<string, any>;
  status: 'pending' | 'ready' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  retryCount?: number;
  maxRetries?: number;
}

export interface WorkflowTransition {
  from: WorkflowState;
  to: WorkflowState;
  trigger: 'start' | 'pause' | 'resume' | 'complete' | 'fail' | 'block' | 'unblock' | 'cancel' | 'review' | 'approve';
  condition?: (workflow: Workflow) => boolean;
  action?: (workflow: Workflow) => Promise<void>;
}

export interface Workflow {
  id: string;
  projectId: string;
  name: string;
  description: string;
  type: 'feature' | 'bugfix' | 'refactor' | 'research' | 'deployment' | 'custom';
  state: WorkflowState;
  steps: WorkflowStep[];
  currentStepId?: string;
  metadata: {
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    estimatedDuration?: number; // minutes
    actualDuration?: number;
    priority: 'low' | 'medium' | 'high' | 'critical';
    tags?: string[];
  };
  context?: {
    sessionId?: string;
    decisions?: Array<{ stepId: string; decision: string; rationale: string }>;
    artifacts?: Array<{ stepId: string; type: string; path: string }>;
  };
  metrics?: {
    stepsCompleted: number;
    stepsTotal: number;
    progressPercentage: number;
    averageStepDuration: number;
    blockerCount: number;
  };
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  type: Workflow['type'];
  steps: Omit<WorkflowStep, 'id' | 'status' | 'startedAt' | 'completedAt'>[];
  estimatedDuration: number;
  requiredInputs: string[];
  expectedOutputs: string[];
}

export class WorkflowEngine extends EventEmitter {
  private workflows: Map<string, Workflow> = new Map();
  private templates: Map<string, WorkflowTemplate> = new Map();
  private contextManager: ContextManager;
  private transitions: WorkflowTransition[] = [];
  
  constructor(contextManager: ContextManager) {
    super();
    this.contextManager = contextManager;
    this.initializeTransitions();
    this.loadDefaultTemplates();
  }

  /**
   * Initialize state machine transitions
   */
  private initializeTransitions() {
    this.transitions = [
      // Draft to Ready
      {
        from: 'draft',
        to: 'ready',
        trigger: 'start',
        condition: (w) => this.validateWorkflow(w),
        action: async (w) => {
          await this.prepareWorkflow(w);
          this.emit('workflow:ready', w);
        }
      },
      // Ready to Running
      {
        from: 'ready',
        to: 'running',
        trigger: 'start',
        action: async (w) => {
          await this.startNextStep(w);
          this.emit('workflow:started', w);
        }
      },
      // Ready can also be blocked
      {
        from: 'ready',
        to: 'blocked',
        trigger: 'block',
        action: async (w) => {
          await this.handleBlocker(w);
          this.emit('workflow:blocked', w);
        }
      },
      // Running to Paused
      {
        from: 'running',
        to: 'paused',
        trigger: 'pause',
        action: async (w) => {
          await this.pauseCurrentStep(w);
          this.emit('workflow:paused', w);
        }
      },
      // Paused to Running
      {
        from: 'paused',
        to: 'running',
        trigger: 'resume',
        action: async (w) => {
          await this.resumeCurrentStep(w);
          this.emit('workflow:resumed', w);
        }
      },
      // Running to Blocked
      {
        from: 'running',
        to: 'blocked',
        trigger: 'block',
        action: async (w) => {
          await this.handleBlocker(w);
          this.emit('workflow:blocked', w);
        }
      },
      // Blocked to Running
      {
        from: 'blocked',
        to: 'running',
        trigger: 'unblock',
        action: async (w) => {
          await this.resolveBlocker(w);
          this.emit('workflow:unblocked', w);
        }
      },
      // Running to Review
      {
        from: 'running',
        to: 'review',
        trigger: 'review',
        condition: (w) => this.allStepsComplete(w),
        action: async (w) => {
          await this.prepareReview(w);
          this.emit('workflow:review', w);
        }
      },
      // Review to Completed
      {
        from: 'review',
        to: 'completed',
        trigger: 'approve',
        action: async (w) => {
          await this.completeWorkflow(w);
          this.emit('workflow:completed', w);
        }
      },
      // Any to Failed
      {
        from: 'running',
        to: 'failed',
        trigger: 'fail',
        action: async (w) => {
          await this.handleFailure(w);
          this.emit('workflow:failed', w);
        }
      },
      // Any to Cancelled
      {
        from: 'draft',
        to: 'cancelled',
        trigger: 'cancel',
        action: async (w) => {
          this.emit('workflow:cancelled', w);
        }
      }
    ];
  }

  /**
   * Load default workflow templates
   */
  private loadDefaultTemplates() {
    // Feature Development Template
    this.templates.set('feature-development', {
      id: 'feature-development',
      name: 'Feature Development',
      description: 'Standard workflow for implementing new features',
      type: 'feature',
      steps: [
        {
          name: 'Requirements Analysis',
          description: 'Analyze and clarify feature requirements',
          type: 'ai_task',
          dependencies: []
        },
        {
          name: 'Technical Design',
          description: 'Create technical design and architecture',
          type: 'ai_task',
          dependencies: ['Requirements Analysis']
        },
        {
          name: 'Implementation',
          description: 'Implement the feature',
          type: 'ai_task',
          dependencies: ['Technical Design']
        },
        {
          name: 'Testing',
          description: 'Write and run tests',
          type: 'ai_task',
          dependencies: ['Implementation']
        },
        {
          name: 'Code Review',
          description: 'Review implementation',
          type: 'human_review',
          dependencies: ['Testing']
        },
        {
          name: 'Documentation',
          description: 'Update documentation',
          type: 'ai_task',
          dependencies: ['Code Review']
        }
      ],
      estimatedDuration: 240, // 4 hours
      requiredInputs: ['requirements', 'projectContext'],
      expectedOutputs: ['implementation', 'tests', 'documentation']
    });

    // Bug Fix Template
    this.templates.set('bug-fix', {
      id: 'bug-fix',
      name: 'Bug Fix',
      description: 'Workflow for fixing bugs',
      type: 'bugfix',
      steps: [
        {
          name: 'Reproduce Issue',
          description: 'Reproduce and understand the bug',
          type: 'ai_task',
          dependencies: []
        },
        {
          name: 'Root Cause Analysis',
          description: 'Identify root cause',
          type: 'ai_task',
          dependencies: ['Reproduce Issue']
        },
        {
          name: 'Fix Implementation',
          description: 'Implement the fix',
          type: 'ai_task',
          dependencies: ['Root Cause Analysis']
        },
        {
          name: 'Regression Testing',
          description: 'Test fix and check for regressions',
          type: 'ai_task',
          dependencies: ['Fix Implementation']
        },
        {
          name: 'Verification',
          description: 'Verify bug is fixed',
          type: 'human_review',
          dependencies: ['Regression Testing']
        }
      ],
      estimatedDuration: 120, // 2 hours
      requiredInputs: ['bugDescription', 'reproductionSteps'],
      expectedOutputs: ['fix', 'tests', 'verification']
    });

    // Research Template
    this.templates.set('research', {
      id: 'research',
      name: 'Research Task',
      description: 'Workflow for research and investigation',
      type: 'research',
      steps: [
        {
          name: 'Define Scope',
          description: 'Define research scope and objectives',
          type: 'ai_task',
          dependencies: []
        },
        {
          name: 'Information Gathering',
          description: 'Gather relevant information',
          type: 'ai_task',
          dependencies: ['Define Scope']
        },
        {
          name: 'Analysis',
          description: 'Analyze findings',
          type: 'ai_task',
          dependencies: ['Information Gathering']
        },
        {
          name: 'Recommendations',
          description: 'Formulate recommendations',
          type: 'ai_task',
          dependencies: ['Analysis']
        },
        {
          name: 'Report Generation',
          description: 'Generate research report',
          type: 'ai_task',
          dependencies: ['Recommendations']
        }
      ],
      estimatedDuration: 180, // 3 hours
      requiredInputs: ['researchQuestion', 'context'],
      expectedOutputs: ['report', 'recommendations', 'evidence']
    });
  }

  /**
   * Create a new workflow from template
   */
  async createWorkflow(params: {
    projectId: string;
    templateId?: string;
    name: string;
    description: string;
    type?: Workflow['type'];
    priority?: 'low' | 'medium' | 'high' | 'critical';
    customSteps?: WorkflowStep[];
  }): Promise<Workflow> {
    const workflowId = crypto.randomUUID();
    
    let steps: WorkflowStep[] = [];
    
    if (params.templateId && this.templates.has(params.templateId)) {
      const template = this.templates.get(params.templateId)!;
      steps = template.steps.map(step => ({
        ...step,
        id: crypto.randomUUID(),
        status: 'pending' as const
      }));
    } else if (params.customSteps) {
      steps = params.customSteps;
    }
    
    const workflow: Workflow = {
      id: workflowId,
      projectId: params.projectId,
      name: params.name,
      description: params.description,
      type: params.type || 'custom',
      state: 'draft',
      steps,
      metadata: {
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
        priority: params.priority || 'medium'
      },
      metrics: {
        stepsCompleted: 0,
        stepsTotal: steps.length,
        progressPercentage: 0,
        averageStepDuration: 0,
        blockerCount: 0
      }
    };
    
    this.workflows.set(workflowId, workflow);
    this.emit('workflow:created', workflow);
    
    return workflow;
  }

  /**
   * Execute a workflow transition
   */
  async transition(workflowId: string, trigger: WorkflowTransition['trigger']): Promise<Workflow> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }
    
    const validTransitions = this.transitions.filter(t => 
      t.from === workflow.state && t.trigger === trigger
    );
    
    if (validTransitions.length === 0) {
      throw new Error(`Invalid transition: ${workflow.state} -> ${trigger}`);
    }
    
    for (const transition of validTransitions) {
      if (!transition.condition || transition.condition(workflow)) {
        workflow.state = transition.to;
        workflow.metadata.updatedAt = new Date();
        
        if (transition.action) {
          await transition.action(workflow);
        }
        
        this.emit('workflow:transition', {
          workflowId,
          from: transition.from,
          to: transition.to,
          trigger
        });
        
        return workflow;
      }
    }
    
    throw new Error(`Transition conditions not met: ${workflow.state} -> ${trigger}`);
  }

  /**
   * Execute a workflow step
   */
  async executeStep(workflowId: string, stepId: string, sessionId?: string): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }
    
    const step = workflow.steps.find(s => s.id === stepId);
    if (!step) {
      throw new Error(`Step ${stepId} not found`);
    }
    
    // Check dependencies
    const dependenciesMet = this.checkDependencies(workflow, step);
    if (!dependenciesMet) {
      throw new Error(`Dependencies not met for step ${stepId}`);
    }
    
    step.status = 'running';
    step.startedAt = new Date();
    workflow.currentStepId = stepId;
    
    // Link to context if session provided
    if (sessionId) {
      workflow.context = workflow.context || {};
      workflow.context.sessionId = sessionId;
      
      // Track in context manager
      await this.contextManager.updateTaskContext(sessionId, {
        taskId: stepId,
        title: step.name,
        status: 'in_progress',
        startedAt: step.startedAt
      });
    }
    
    this.emit('step:started', { workflowId, step });
  }

  /**
   * Complete a workflow step
   */
  async completeStep(
    workflowId: string, 
    stepId: string, 
    outputs?: Record<string, any>,
    artifacts?: Array<{ type: string; path: string }>
  ): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }
    
    const step = workflow.steps.find(s => s.id === stepId);
    if (!step) {
      throw new Error(`Step ${stepId} not found`);
    }
    
    step.status = 'completed';
    step.completedAt = new Date();
    step.outputs = outputs;
    
    // Track artifacts
    if (artifacts && workflow.context?.sessionId) {
      for (const artifact of artifacts) {
        await this.contextManager.trackArtifact(workflow.context.sessionId, {
          type: artifact.type as any,
          path: artifact.path,
          content: '',
          timestamp: new Date(),
          operation: 'created'
        });
      }
    }
    
    // Update metrics
    workflow.metrics!.stepsCompleted++;
    workflow.metrics!.progressPercentage = Math.round(
      (workflow.metrics!.stepsCompleted / workflow.metrics!.stepsTotal) * 100
    );
    
    this.emit('step:completed', { workflowId, step });
    
    // Check if all steps complete
    if (this.allStepsComplete(workflow)) {
      await this.transition(workflowId, 'review');
    } else {
      // Start next available step
      await this.startNextStep(workflow);
    }
  }

  /**
   * Get workflow status and metrics
   */
  getWorkflowStatus(workflowId: string): {
    workflow: Workflow;
    readySteps: WorkflowStep[];
    blockedSteps: WorkflowStep[];
    completedSteps: WorkflowStep[];
  } {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }
    
    const readySteps = workflow.steps.filter(s => 
      s.status === 'pending' && this.checkDependencies(workflow, s)
    );
    
    const blockedSteps = workflow.steps.filter(s => 
      s.status === 'pending' && !this.checkDependencies(workflow, s)
    );
    
    const completedSteps = workflow.steps.filter(s => 
      s.status === 'completed'
    );
    
    return {
      workflow,
      readySteps,
      blockedSteps,
      completedSteps
    };
  }

  /**
   * Check if step dependencies are met
   */
  private checkDependencies(workflow: Workflow, step: WorkflowStep): boolean {
    if (!step.dependencies || step.dependencies.length === 0) {
      return true;
    }
    
    for (const depId of step.dependencies) {
      const depStep = workflow.steps.find(s => s.name === depId || s.id === depId);
      if (!depStep || depStep.status !== 'completed') {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Validate workflow is ready to start
   */
  private validateWorkflow(workflow: Workflow): boolean {
    return workflow.steps.length > 0 && 
           workflow.steps.every(s => s.name && s.type);
  }

  /**
   * Prepare workflow for execution
   */
  private async prepareWorkflow(workflow: Workflow): Promise<void> {
    // Mark first available steps as ready
    for (const step of workflow.steps) {
      if (this.checkDependencies(workflow, step) && step.status === 'pending') {
        step.status = 'ready';
      }
    }
    // Immediately transition to running if we have ready steps
    const hasReadySteps = workflow.steps.some(s => s.status === 'ready');
    if (hasReadySteps) {
      workflow.state = 'running';
      await this.startNextStep(workflow);
    }
  }

  /**
   * Start the next available step
   */
  private async startNextStep(workflow: Workflow): Promise<void> {
    const nextStep = workflow.steps.find(s => 
      s.status === 'ready' || 
      (s.status === 'pending' && this.checkDependencies(workflow, s))
    );
    
    if (nextStep) {
      nextStep.status = 'ready';
      this.emit('step:ready', { workflowId: workflow.id, step: nextStep });
    }
  }

  /**
   * Pause current step execution
   */
  private async pauseCurrentStep(workflow: Workflow): Promise<void> {
    if (workflow.currentStepId) {
      const step = workflow.steps.find(s => s.id === workflow.currentStepId);
      if (step && step.status === 'running') {
        // Save progress to context
        if (workflow.context?.sessionId) {
          await this.contextManager.updateTaskContext(workflow.context.sessionId, {
            taskId: step.id,
            title: step.name,
            status: 'blocked',
            startedAt: step.startedAt!,
            blockers: ['Workflow paused by user']
          });
        }
      }
    }
  }

  /**
   * Resume current step execution
   */
  private async resumeCurrentStep(workflow: Workflow): Promise<void> {
    if (workflow.currentStepId) {
      const step = workflow.steps.find(s => s.id === workflow.currentStepId);
      if (step) {
        step.status = 'running';
        if (workflow.context?.sessionId) {
          await this.contextManager.updateTaskContext(workflow.context.sessionId, {
            taskId: step.id,
            title: step.name,
            status: 'in_progress',
            startedAt: step.startedAt!
          });
        }
      }
    }
  }

  /**
   * Handle workflow blocker
   */
  private async handleBlocker(workflow: Workflow): Promise<void> {
    workflow.metrics!.blockerCount++;
    // Additional blocker handling logic
  }

  /**
   * Resolve workflow blocker
   */
  private async resolveBlocker(workflow: Workflow): Promise<void> {
    // Resume from blocked state
    await this.startNextStep(workflow);
  }

  /**
   * Check if all steps are complete
   */
  private allStepsComplete(workflow: Workflow): boolean {
    return workflow.steps.every(s => 
      s.status === 'completed' || s.status === 'skipped'
    );
  }

  /**
   * Prepare workflow for review
   */
  private async prepareReview(workflow: Workflow): Promise<void> {
    // Calculate final metrics
    if (workflow.metadata.estimatedDuration) {
      const actualDuration = (workflow.metadata.updatedAt.getTime() - 
                             workflow.metadata.createdAt.getTime()) / 60000;
      workflow.metadata.actualDuration = Math.round(actualDuration);
    }
  }

  /**
   * Complete the workflow
   */
  private async completeWorkflow(workflow: Workflow): Promise<void> {
    workflow.metadata.updatedAt = new Date();
    workflow.metrics!.progressPercentage = 100;
  }

  /**
   * Handle workflow failure
   */
  private async handleFailure(workflow: Workflow): Promise<void> {
    if (workflow.currentStepId) {
      const step = workflow.steps.find(s => s.id === workflow.currentStepId);
      if (step) {
        step.status = 'failed';
        step.completedAt = new Date();
      }
    }
  }

  /**
   * Get all workflows for a project
   */
  getProjectWorkflows(projectId: string): Workflow[] {
    return Array.from(this.workflows.values())
      .filter(w => w.projectId === projectId);
  }

  /**
   * Get workflow templates
   */
  getTemplates(): WorkflowTemplate[] {
    return Array.from(this.templates.values());
  }
}