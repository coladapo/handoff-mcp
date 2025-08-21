/**
 * Context-Aware MCP Tools
 * These tools solve the #1 pain point: AI agents losing context
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const CONTEXT_TOOLS: Tool[] = [
  {
    name: 'start_ai_session',
    description: '🧠 Start or resume an AI agent session with full context restoration',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project identifier'
        },
        agent_type: {
          type: 'string',
          enum: ['claude', 'gpt', 'copilot', 'cursor', 'generic'],
          description: 'Type of AI agent'
        },
        agent_id: {
          type: 'string',
          description: 'Optional specific agent identifier'
        },
        auto_inject_context: {
          type: 'boolean',
          default: true,
          description: 'Automatically inject previous context'
        }
      },
      required: ['project_id', 'agent_type']
    }
  },

  {
    name: 'save_conversation',
    description: '💾 Save current conversation to persistent context',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'Current session ID'
        },
        messages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              role: {
                type: 'string',
                enum: ['user', 'assistant', 'system']
              },
              content: {
                type: 'string'
              }
            }
          },
          description: 'Conversation messages to save'
        }
      },
      required: ['session_id', 'messages']
    }
  },

  {
    name: 'record_decision',
    description: '📝 Record an important decision or choice made during development',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'Current session ID'
        },
        decision: {
          type: 'string',
          description: 'What was decided'
        },
        rationale: {
          type: 'string',
          description: 'Why this decision was made'
        },
        impact: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          default: 'medium',
          description: 'Impact level of this decision'
        },
        related_files: {
          type: 'array',
          items: { type: 'string' },
          description: 'Files affected by this decision'
        }
      },
      required: ['session_id', 'decision', 'rationale']
    }
  },

  {
    name: 'track_artifact',
    description: '📁 Track files, code, or outputs created/modified in this session',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'Current session ID'
        },
        artifact_type: {
          type: 'string',
          enum: ['file', 'code', 'command', 'output'],
          description: 'Type of artifact'
        },
        path: {
          type: 'string',
          description: 'File path or identifier'
        },
        operation: {
          type: 'string',
          enum: ['created', 'modified', 'deleted', 'executed'],
          description: 'What happened to this artifact'
        },
        content_preview: {
          type: 'string',
          description: 'Preview or summary of the artifact'
        }
      },
      required: ['session_id', 'artifact_type', 'operation']
    }
  },

  {
    name: 'search_context',
    description: '🔍 Search for relevant context from previous sessions',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project to search within'
        },
        query: {
          type: 'string',
          description: 'What to search for'
        },
        search_type: {
          type: 'string',
          enum: ['semantic', 'keyword', 'both'],
          default: 'both',
          description: 'Type of search to perform'
        },
        limit: {
          type: 'number',
          default: 5,
          description: 'Maximum results to return'
        }
      },
      required: ['project_id', 'query']
    }
  },

  {
    name: 'get_session_summary',
    description: '📊 Get a summary of the current or previous session',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'Session to summarize (current if not specified)'
        },
        include_decisions: {
          type: 'boolean',
          default: true,
          description: 'Include key decisions made'
        },
        include_artifacts: {
          type: 'boolean',
          default: true,
          description: 'Include files/code created'
        },
        include_blockers: {
          type: 'boolean',
          default: true,
          description: 'Include any blockers encountered'
        }
      }
    }
  },

  {
    name: 'handoff_context',
    description: '🤝 Create a context handoff package for another agent or human',
    inputSchema: {
      type: 'object',
      properties: {
        from_session: {
          type: 'string',
          description: 'Source session ID'
        },
        to_agent_type: {
          type: 'string',
          enum: ['claude', 'gpt', 'copilot', 'cursor', 'human', 'generic'],
          description: 'Target agent type'
        },
        task_description: {
          type: 'string',
          description: 'What needs to be done next'
        },
        include_full_history: {
          type: 'boolean',
          default: false,
          description: 'Include complete conversation history'
        },
        key_points: {
          type: 'array',
          items: { type: 'string' },
          description: 'Important points to highlight'
        }
      },
      required: ['from_session', 'to_agent_type', 'task_description']
    }
  },

  {
    name: 'update_task_status',
    description: '✅ Update the status of current task in context',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'Current session ID'
        },
        task_id: {
          type: 'string',
          description: 'Task identifier'
        },
        status: {
          type: 'string',
          enum: ['in_progress', 'blocked', 'completed', 'failed'],
          description: 'New status'
        },
        progress: {
          type: 'number',
          minimum: 0,
          maximum: 100,
          description: 'Progress percentage'
        },
        blockers: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of blockers if status is blocked'
        },
        notes: {
          type: 'string',
          description: 'Additional notes about the status'
        }
      },
      required: ['session_id', 'task_id', 'status']
    }
  },

  {
    name: 'get_project_context',
    description: '🗂️ Get complete project context for AI agent initialization',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project identifier'
        },
        context_depth: {
          type: 'string',
          enum: ['minimal', 'recent', 'full'],
          default: 'recent',
          description: 'How much context to retrieve'
        },
        include_decisions: {
          type: 'boolean',
          default: true,
          description: 'Include past decisions'
        },
        include_code_structure: {
          type: 'boolean',
          default: true,
          description: 'Include project code structure'
        },
        max_sessions: {
          type: 'number',
          default: 3,
          description: 'Maximum previous sessions to include'
        }
      },
      required: ['project_id']
    }
  },

  {
    name: 'escalate_blocker',
    description: '🚨 Escalate a blocker with full context for human intervention',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'Current session ID'
        },
        blocker_description: {
          type: 'string',
          description: 'What is blocking progress'
        },
        attempted_solutions: {
          type: 'array',
          items: { type: 'string' },
          description: 'What has been tried'
        },
        severity: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'critical'],
          default: 'medium',
          description: 'Severity of the blocker'
        },
        context_dump: {
          type: 'boolean',
          default: true,
          description: 'Include full session context'
        },
        suggested_expert: {
          type: 'string',
          description: 'Suggested person or agent to help'
        }
      },
      required: ['session_id', 'blocker_description']
    }
  },

  {
    name: 'merge_contexts',
    description: '🔀 Merge contexts from multiple AI agents working on same project',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project identifier'
        },
        session_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Sessions to merge'
        },
        merge_strategy: {
          type: 'string',
          enum: ['chronological', 'by_agent', 'by_feature'],
          default: 'chronological',
          description: 'How to merge the contexts'
        },
        resolve_conflicts: {
          type: 'string',
          enum: ['latest_wins', 'manual', 'preserve_all'],
          default: 'latest_wins',
          description: 'How to handle conflicting information'
        }
      },
      required: ['project_id', 'session_ids']
    }
  },

  {
    name: 'context_analytics',
    description: '📈 Get analytics on context usage and AI agent performance',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project to analyze'
        },
        metrics: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['context_retention', 'decision_quality', 'task_completion', 'handoff_success', 'blocker_frequency']
          },
          description: 'Metrics to calculate'
        },
        time_range: {
          type: 'object',
          properties: {
            start: { type: 'string', format: 'date' },
            end: { type: 'string', format: 'date' }
          },
          description: 'Time range for analysis'
        }
      },
      required: ['project_id']
    }
  }
];