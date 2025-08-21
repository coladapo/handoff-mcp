/**
 * Multi-Agent Orchestration MCP Tools
 * Tools for coordinating multiple AI agents working together
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const ORCHESTRATION_TOOLS: Tool[] = [
  {
    name: 'register_agent',
    description: '🤖 Register a new AI agent with capabilities',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: {
          type: 'string',
          description: 'Unique identifier for the agent'
        },
        agent_type: {
          type: 'string',
          enum: ['claude', 'gpt', 'copilot', 'cursor', 'gemini', 'llama', 'generic'],
          description: 'Type of AI agent'
        },
        name: {
          type: 'string',
          description: 'Display name for the agent'
        },
        capabilities: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              category: {
                type: 'string',
                enum: ['coding', 'analysis', 'writing', 'research', 'review', 'testing', 'deployment']
              },
              skill: { type: 'string' },
              proficiency: { 
                type: 'number',
                minimum: 1,
                maximum: 5,
                description: '1=basic, 5=expert'
              },
              languages: {
                type: 'array',
                items: { type: 'string' },
                description: 'Programming languages'
              },
              frameworks: {
                type: 'array',
                items: { type: 'string' },
                description: 'Frameworks/libraries'
              }
            },
            required: ['category', 'skill', 'proficiency']
          },
          description: 'Agent capabilities and skills'
        },
        max_concurrent_tasks: {
          type: 'number',
          default: 3,
          description: 'Maximum parallel tasks'
        },
        metadata: {
          type: 'object',
          properties: {
            endpoint: { type: 'string' },
            api_key: { type: 'string' },
            rate_limit: {
              type: 'object',
              properties: {
                requests: { type: 'number' },
                per: { type: 'string', enum: ['minute', 'hour'] }
              }
            }
          },
          description: 'Agent configuration'
        }
      },
      required: ['agent_id', 'agent_type', 'name', 'capabilities']
    }
  },

  {
    name: 'update_agent_status',
    description: '📊 Update an agent\'s availability status',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: {
          type: 'string',
          description: 'Agent identifier'
        },
        status: {
          type: 'string',
          enum: ['available', 'busy', 'offline', 'error', 'maintenance'],
          description: 'New status'
        },
        reason: {
          type: 'string',
          description: 'Reason for status change'
        }
      },
      required: ['agent_id', 'status']
    }
  },

  {
    name: 'assign_task_to_agent',
    description: '📋 Assign a task to the best available agent',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: {
          type: 'string',
          description: 'Unique task identifier'
        },
        description: {
          type: 'string',
          description: 'Task description'
        },
        required_capabilities: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              category: { type: 'string' },
              skill: { type: 'string' },
              min_proficiency: { type: 'number' },
              languages: {
                type: 'array',
                items: { type: 'string' }
              }
            }
          },
          description: 'Required skills for the task'
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'critical'],
          default: 'medium'
        },
        preferred_agent: {
          type: 'string',
          description: 'Preferred agent ID (optional)'
        },
        estimated_duration: {
          type: 'number',
          description: 'Estimated minutes to complete'
        },
        workflow_context: {
          type: 'object',
          properties: {
            workflow_id: { type: 'string' },
            step_id: { type: 'string' }
          },
          description: 'Link to workflow if applicable'
        }
      },
      required: ['task_id', 'description']
    }
  },

  {
    name: 'start_agent_task',
    description: '▶️ Start execution of an assigned task',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: {
          type: 'string',
          description: 'Task to start'
        },
        session_id: {
          type: 'string',
          description: 'Context session for tracking'
        }
      },
      required: ['task_id']
    }
  },

  {
    name: 'complete_agent_task',
    description: '✅ Mark an agent task as complete',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: {
          type: 'string',
          description: 'Completed task ID'
        },
        output: {
          type: 'object',
          description: 'Task output/results'
        },
        session_id: {
          type: 'string',
          description: 'Context session'
        },
        performance_metrics: {
          type: 'object',
          properties: {
            tokens_used: { type: 'number' },
            time_taken: { type: 'number' },
            quality_score: { type: 'number' }
          },
          description: 'Performance data'
        }
      },
      required: ['task_id']
    }
  },

  {
    name: 'fail_agent_task',
    description: '❌ Report task failure and optionally retry',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: {
          type: 'string',
          description: 'Failed task ID'
        },
        error: {
          type: 'string',
          description: 'Error description'
        },
        retry: {
          type: 'boolean',
          default: true,
          description: 'Attempt retry with different agent'
        },
        retry_with_modifications: {
          type: 'object',
          description: 'Modified parameters for retry'
        }
      },
      required: ['task_id', 'error']
    }
  },

  {
    name: 'create_collaboration',
    description: '🤝 Create collaboration session between agents',
    inputSchema: {
      type: 'object',
      properties: {
        agents: {
          type: 'array',
          items: { type: 'string' },
          minItems: 2,
          description: 'Agent IDs to collaborate'
        },
        purpose: {
          type: 'string',
          description: 'Collaboration purpose'
        },
        lead_agent: {
          type: 'string',
          description: 'Lead coordinator agent'
        },
        shared_context: {
          type: 'object',
          description: 'Initial shared context'
        },
        collaboration_type: {
          type: 'string',
          enum: ['peer_review', 'pair_programming', 'brainstorming', 'divide_conquer', 'consensus'],
          description: 'Type of collaboration'
        }
      },
      required: ['agents', 'purpose']
    }
  },

  {
    name: 'send_agent_message',
    description: '💬 Send message between collaborating agents',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'Collaboration session ID'
        },
        from_agent: {
          type: 'string',
          description: 'Sending agent ID'
        },
        to_agent: {
          type: 'string',
          description: 'Receiving agent ID or "all"'
        },
        content: {
          type: 'string',
          description: 'Message content'
        },
        message_type: {
          type: 'string',
          enum: ['request', 'response', 'broadcast', 'handoff'],
          default: 'request',
          description: 'Type of message'
        },
        attachments: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              content: { type: 'string' }
            }
          },
          description: 'Attached data'
        }
      },
      required: ['session_id', 'from_agent', 'to_agent', 'content']
    }
  },

  {
    name: 'handoff_to_agent',
    description: '🔄 Handoff work from one agent to another',
    inputSchema: {
      type: 'object',
      properties: {
        from_agent: {
          type: 'string',
          description: 'Current agent ID'
        },
        to_agent: {
          type: 'string',
          description: 'Target agent ID'
        },
        task_id: {
          type: 'string',
          description: 'Task being handed off'
        },
        handoff_context: {
          type: 'string',
          description: 'Context for the receiving agent'
        },
        work_completed: {
          type: 'object',
          description: 'Summary of completed work'
        },
        remaining_work: {
          type: 'object',
          description: 'What needs to be done'
        },
        session_id: {
          type: 'string',
          description: 'Current session for context transfer'
        }
      },
      required: ['from_agent', 'to_agent', 'handoff_context']
    }
  },

  {
    name: 'get_agent_workload',
    description: '📊 Get current workload across all agents',
    inputSchema: {
      type: 'object',
      properties: {
        include_metrics: {
          type: 'boolean',
          default: true,
          description: 'Include performance metrics'
        },
        filter_by_status: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['available', 'busy', 'offline', 'error', 'maintenance']
          },
          description: 'Filter agents by status'
        }
      }
    }
  },

  {
    name: 'get_agent_performance',
    description: '📈 Get performance metrics for an agent',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: {
          type: 'string',
          description: 'Agent to analyze'
        },
        time_range: {
          type: 'object',
          properties: {
            start: { type: 'string', format: 'date' },
            end: { type: 'string', format: 'date' }
          },
          description: 'Time range for metrics'
        },
        metrics: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['success_rate', 'average_time', 'tasks_completed', 'specialties', 'error_rate']
          },
          description: 'Specific metrics to retrieve'
        }
      },
      required: ['agent_id']
    }
  },

  {
    name: 'find_best_agent',
    description: '🎯 Find the best agent for a specific skill',
    inputSchema: {
      type: 'object',
      properties: {
        skill: {
          type: 'string',
          description: 'Required skill'
        },
        category: {
          type: 'string',
          enum: ['coding', 'analysis', 'writing', 'research', 'review', 'testing', 'deployment'],
          description: 'Skill category'
        },
        min_proficiency: {
          type: 'number',
          minimum: 1,
          maximum: 5,
          default: 3,
          description: 'Minimum proficiency required'
        },
        language_requirements: {
          type: 'array',
          items: { type: 'string' },
          description: 'Required programming languages'
        },
        availability_required: {
          type: 'boolean',
          default: true,
          description: 'Only consider available agents'
        }
      },
      required: ['skill']
    }
  },

  {
    name: 'configure_load_balancing',
    description: '⚖️ Configure agent load balancing strategy',
    inputSchema: {
      type: 'object',
      properties: {
        strategy: {
          type: 'string',
          enum: ['round_robin', 'least_loaded', 'capability_based', 'performance_based', 'hybrid'],
          description: 'Load balancing strategy'
        },
        weights: {
          type: 'object',
          additionalProperties: { type: 'number' },
          description: 'Agent weights for weighted strategies'
        },
        rules: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              condition: { type: 'string' },
              priority: { type: 'number' },
              preferred_agents: {
                type: 'array',
                items: { type: 'string' }
              }
            }
          },
          description: 'Custom routing rules'
        }
      },
      required: ['strategy']
    }
  },

  {
    name: 'simulate_agent_failure',
    description: '🔧 Simulate agent failure for testing',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: {
          type: 'string',
          description: 'Agent to simulate failure'
        },
        failure_type: {
          type: 'string',
          enum: ['offline', 'error', 'timeout', 'overload'],
          description: 'Type of failure'
        },
        duration: {
          type: 'number',
          description: 'Failure duration in seconds'
        },
        auto_recover: {
          type: 'boolean',
          default: true,
          description: 'Automatically recover after duration'
        }
      },
      required: ['agent_id', 'failure_type']
    }
  },

  {
    name: 'list_available_agents',
    description: '📋 List all registered agents and capabilities',
    inputSchema: {
      type: 'object',
      properties: {
        filter_by_capability: {
          type: 'object',
          properties: {
            category: { type: 'string' },
            skill: { type: 'string' },
            min_proficiency: { type: 'number' }
          },
          description: 'Filter by specific capabilities'
        },
        include_performance: {
          type: 'boolean',
          default: false,
          description: 'Include performance metrics'
        },
        sort_by: {
          type: 'string',
          enum: ['name', 'load', 'performance', 'availability'],
          default: 'name',
          description: 'Sort order'
        }
      }
    }
  },

  {
    name: 'create_agent_team',
    description: '👥 Create a team of agents for complex tasks',
    inputSchema: {
      type: 'object',
      properties: {
        team_name: {
          type: 'string',
          description: 'Name for the agent team'
        },
        team_members: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              agent_id: { type: 'string' },
              role: {
                type: 'string',
                enum: ['lead', 'architect', 'developer', 'reviewer', 'tester', 'specialist']
              },
              responsibilities: {
                type: 'array',
                items: { type: 'string' }
              }
            },
            required: ['agent_id', 'role']
          },
          description: 'Team composition'
        },
        team_objective: {
          type: 'string',
          description: 'Team\'s primary objective'
        },
        coordination_style: {
          type: 'string',
          enum: ['hierarchical', 'flat', 'matrix', 'agile'],
          default: 'flat',
          description: 'Team coordination style'
        }
      },
      required: ['team_name', 'team_members', 'team_objective']
    }
  },

  {
    name: 'orchestrate_parallel_tasks',
    description: '⚡ Orchestrate parallel task execution across agents',
    inputSchema: {
      type: 'object',
      properties: {
        tasks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              task_id: { type: 'string' },
              description: { type: 'string' },
              required_skills: {
                type: 'array',
                items: { type: 'string' }
              },
              dependencies: {
                type: 'array',
                items: { type: 'string' },
                description: 'Task IDs this depends on'
              }
            },
            required: ['task_id', 'description']
          },
          description: 'Tasks to execute in parallel'
        },
        optimization_goal: {
          type: 'string',
          enum: ['speed', 'quality', 'balanced'],
          default: 'balanced',
          description: 'Optimization priority'
        },
        max_parallel: {
          type: 'number',
          description: 'Maximum parallel executions'
        }
      },
      required: ['tasks']
    }
  },

  {
    name: 'monitor_collaboration',
    description: '👁️ Monitor active collaboration sessions',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'Specific session to monitor'
        },
        include_messages: {
          type: 'boolean',
          default: true,
          description: 'Include message history'
        },
        metrics_only: {
          type: 'boolean',
          default: false,
          description: 'Return only metrics'
        }
      }
    }
  }
];