/**
 * Workflow MCP Tools
 * Tools for managing AI agent workflows with state machine orchestration
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const WORKFLOW_TOOLS: Tool[] = [
  {
    name: 'create_workflow',
    description: '🔄 Create a new workflow for orchestrating AI tasks',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project identifier'
        },
        name: {
          type: 'string',
          description: 'Workflow name'
        },
        description: {
          type: 'string',
          description: 'What this workflow accomplishes'
        },
        template_id: {
          type: 'string',
          enum: ['feature-development', 'bug-fix', 'research', 'refactor', 'deployment'],
          description: 'Use a predefined template'
        },
        custom_steps: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              type: {
                type: 'string',
                enum: ['ai_task', 'human_review', 'automated', 'decision', 'parallel']
              },
              dependencies: {
                type: 'array',
                items: { type: 'string' },
                description: 'Names of steps that must complete first'
              },
              assignee_type: {
                type: 'string',
                enum: ['claude', 'gpt', 'human', 'auto']
              }
            },
            required: ['name', 'type']
          },
          description: 'Custom workflow steps (if not using template)'
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'critical'],
          default: 'medium'
        }
      },
      required: ['project_id', 'name', 'description']
    }
  },

  {
    name: 'start_workflow',
    description: '▶️ Start or resume a workflow',
    inputSchema: {
      type: 'object',
      properties: {
        workflow_id: {
          type: 'string',
          description: 'Workflow to start'
        },
        session_id: {
          type: 'string',
          description: 'Link to current AI session for context'
        },
        initial_inputs: {
          type: 'object',
          description: 'Initial inputs for the workflow'
        }
      },
      required: ['workflow_id']
    }
  },

  {
    name: 'execute_workflow_step',
    description: '⚡ Execute a specific workflow step',
    inputSchema: {
      type: 'object',
      properties: {
        workflow_id: {
          type: 'string',
          description: 'Workflow identifier'
        },
        step_id: {
          type: 'string',
          description: 'Step to execute'
        },
        session_id: {
          type: 'string',
          description: 'AI session handling this step'
        },
        inputs: {
          type: 'object',
          description: 'Inputs for the step'
        }
      },
      required: ['workflow_id', 'step_id']
    }
  },

  {
    name: 'complete_workflow_step',
    description: '✅ Mark a workflow step as complete',
    inputSchema: {
      type: 'object',
      properties: {
        workflow_id: {
          type: 'string',
          description: 'Workflow identifier'
        },
        step_id: {
          type: 'string',
          description: 'Step that was completed'
        },
        outputs: {
          type: 'object',
          description: 'Outputs from the step'
        },
        artifacts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              path: { type: 'string' },
              description: { type: 'string' }
            }
          },
          description: 'Artifacts created during step'
        },
        notes: {
          type: 'string',
          description: 'Completion notes'
        }
      },
      required: ['workflow_id', 'step_id']
    }
  },

  {
    name: 'pause_workflow',
    description: '⏸️ Pause workflow execution',
    inputSchema: {
      type: 'object',
      properties: {
        workflow_id: {
          type: 'string',
          description: 'Workflow to pause'
        },
        reason: {
          type: 'string',
          description: 'Reason for pausing'
        },
        save_progress: {
          type: 'boolean',
          default: true,
          description: 'Save current progress to context'
        }
      },
      required: ['workflow_id']
    }
  },

  {
    name: 'block_workflow',
    description: '🚫 Mark workflow as blocked',
    inputSchema: {
      type: 'object',
      properties: {
        workflow_id: {
          type: 'string',
          description: 'Workflow identifier'
        },
        blocker_description: {
          type: 'string',
          description: 'What is blocking progress'
        },
        blocking_step_id: {
          type: 'string',
          description: 'Which step is blocked'
        },
        requires_human: {
          type: 'boolean',
          default: false,
          description: 'Whether human intervention is needed'
        },
        suggested_resolution: {
          type: 'string',
          description: 'How to resolve the blocker'
        }
      },
      required: ['workflow_id', 'blocker_description']
    }
  },

  {
    name: 'unblock_workflow',
    description: '🔓 Resolve workflow blocker and resume',
    inputSchema: {
      type: 'object',
      properties: {
        workflow_id: {
          type: 'string',
          description: 'Workflow to unblock'
        },
        resolution: {
          type: 'string',
          description: 'How the blocker was resolved'
        },
        skip_blocked_step: {
          type: 'boolean',
          default: false,
          description: 'Skip the blocked step instead of retrying'
        }
      },
      required: ['workflow_id', 'resolution']
    }
  },

  {
    name: 'get_workflow_status',
    description: '📊 Get detailed workflow status and metrics',
    inputSchema: {
      type: 'object',
      properties: {
        workflow_id: {
          type: 'string',
          description: 'Workflow to check'
        },
        include_step_details: {
          type: 'boolean',
          default: true,
          description: 'Include details for each step'
        },
        include_artifacts: {
          type: 'boolean',
          default: false,
          description: 'Include created artifacts'
        }
      },
      required: ['workflow_id']
    }
  },

  {
    name: 'list_project_workflows',
    description: '📋 List all workflows for a project',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project identifier'
        },
        state_filter: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['draft', 'ready', 'running', 'paused', 'blocked', 'review', 'completed', 'failed', 'cancelled']
          },
          description: 'Filter by workflow states'
        },
        type_filter: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['feature', 'bugfix', 'refactor', 'research', 'deployment', 'custom']
          },
          description: 'Filter by workflow types'
        }
      },
      required: ['project_id']
    }
  },

  {
    name: 'get_ready_steps',
    description: '🎯 Get workflow steps ready for execution',
    inputSchema: {
      type: 'object',
      properties: {
        workflow_id: {
          type: 'string',
          description: 'Workflow identifier'
        },
        agent_type: {
          type: 'string',
          enum: ['claude', 'gpt', 'any'],
          description: 'Filter by agent type'
        }
      },
      required: ['workflow_id']
    }
  },

  {
    name: 'retry_failed_step',
    description: '🔄 Retry a failed workflow step',
    inputSchema: {
      type: 'object',
      properties: {
        workflow_id: {
          type: 'string',
          description: 'Workflow identifier'
        },
        step_id: {
          type: 'string',
          description: 'Failed step to retry'
        },
        modified_inputs: {
          type: 'object',
          description: 'Modified inputs for retry'
        },
        max_retries: {
          type: 'number',
          default: 3,
          description: 'Maximum retry attempts'
        }
      },
      required: ['workflow_id', 'step_id']
    }
  },

  {
    name: 'review_workflow',
    description: '👁️ Submit workflow for review',
    inputSchema: {
      type: 'object',
      properties: {
        workflow_id: {
          type: 'string',
          description: 'Workflow to review'
        },
        review_summary: {
          type: 'string',
          description: 'Summary of work completed'
        },
        metrics: {
          type: 'object',
          properties: {
            lines_added: { type: 'number' },
            lines_removed: { type: 'number' },
            tests_passed: { type: 'number' },
            tests_failed: { type: 'number' },
            coverage: { type: 'number' }
          },
          description: 'Metrics to include in review'
        },
        reviewer: {
          type: 'string',
          description: 'Who should review (human ID or "auto")'
        }
      },
      required: ['workflow_id']
    }
  },

  {
    name: 'approve_workflow',
    description: '✔️ Approve and complete a workflow',
    inputSchema: {
      type: 'object',
      properties: {
        workflow_id: {
          type: 'string',
          description: 'Workflow to approve'
        },
        approval_notes: {
          type: 'string',
          description: 'Approval comments'
        },
        merge_to_main: {
          type: 'boolean',
          default: false,
          description: 'Merge changes to main branch'
        },
        deploy: {
          type: 'boolean',
          default: false,
          description: 'Deploy after approval'
        }
      },
      required: ['workflow_id']
    }
  },

  {
    name: 'cancel_workflow',
    description: '❌ Cancel a workflow',
    inputSchema: {
      type: 'object',
      properties: {
        workflow_id: {
          type: 'string',
          description: 'Workflow to cancel'
        },
        reason: {
          type: 'string',
          description: 'Cancellation reason'
        },
        save_progress: {
          type: 'boolean',
          default: true,
          description: 'Save progress before cancelling'
        }
      },
      required: ['workflow_id', 'reason']
    }
  },

  {
    name: 'get_workflow_templates',
    description: '📚 Get available workflow templates',
    inputSchema: {
      type: 'object',
      properties: {
        type_filter: {
          type: 'string',
          enum: ['feature', 'bugfix', 'refactor', 'research', 'deployment', 'all'],
          default: 'all',
          description: 'Filter templates by type'
        }
      }
    }
  },

  {
    name: 'create_parallel_workflow',
    description: '⚡ Create workflow with parallel execution paths',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project identifier'
        },
        name: {
          type: 'string',
          description: 'Workflow name'
        },
        parallel_tracks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              track_name: { type: 'string' },
              steps: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    type: { type: 'string' },
                    assignee_type: { type: 'string' }
                  }
                }
              }
            }
          },
          description: 'Parallel execution tracks'
        },
        convergence_point: {
          type: 'string',
          description: 'Step name where parallel tracks converge'
        }
      },
      required: ['project_id', 'name', 'parallel_tracks']
    }
  },

  {
    name: 'workflow_analytics',
    description: '📈 Get workflow performance analytics',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project to analyze'
        },
        time_range: {
          type: 'object',
          properties: {
            start: { type: 'string', format: 'date' },
            end: { type: 'string', format: 'date' }
          },
          description: 'Time range for analysis'
        },
        metrics: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['completion_rate', 'average_duration', 'blocker_frequency', 'retry_rate', 'step_efficiency']
          },
          description: 'Metrics to calculate'
        }
      },
      required: ['project_id']
    }
  }
];