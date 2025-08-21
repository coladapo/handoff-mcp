/**
 * PM-Focused MCP Tools for AI Agent Project Management
 * 
 * These tools transform AI assistants into managed team members
 * with proper sprint planning, task tracking, and delivery metrics
 */

export const PM_TOOLS = [
  // ============================================================================
  // SPRINT MANAGEMENT
  // ============================================================================
  {
    name: 'start_sprint',
    description: '🚀 Start a new sprint with goals and team allocation',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        sprint_name: { type: 'string' },
        sprint_goal: { type: 'string' },
        duration_days: { type: 'number', default: 14 },
        team_members: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              member_id: { type: 'string' },
              capacity_hours: { type: 'number' },
              role: { type: 'string' }
            }
          }
        },
        selected_stories: {
          type: 'array',
          items: { type: 'string' },
          description: 'Story IDs to include in sprint'
        }
      },
      required: ['project_id', 'sprint_name', 'sprint_goal']
    }
  },

  {
    name: 'daily_standup',
    description: '📅 Record daily standup updates',
    inputSchema: {
      type: 'object',
      properties: {
        sprint_id: { type: 'string' },
        member_id: { type: 'string' },
        yesterday: {
          type: 'array',
          items: { type: 'string' },
          description: 'What was completed yesterday'
        },
        today: {
          type: 'array',
          items: { type: 'string' },
          description: 'What will be worked on today'
        },
        blockers: {
          type: 'array',
          items: { type: 'string' },
          description: 'Any impediments'
        }
      },
      required: ['sprint_id', 'member_id', 'yesterday', 'today']
    }
  },

  {
    name: 'sprint_review',
    description: '✅ Conduct sprint review and demo',
    inputSchema: {
      type: 'object',
      properties: {
        sprint_id: { type: 'string' },
        completed_stories: {
          type: 'array',
          items: { type: 'string' }
        },
        demo_notes: { type: 'string' },
        stakeholder_feedback: { type: 'string' },
        acceptance_status: {
          type: 'string',
          enum: ['accepted', 'partial', 'rejected']
        }
      },
      required: ['sprint_id', 'completed_stories']
    }
  },

  // ============================================================================
  // BACKLOG MANAGEMENT
  // ============================================================================
  {
    name: 'create_epic',
    description: '📚 Create an epic for large features',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        title: { type: 'string' },
        business_value: { type: 'string' },
        acceptance_criteria: {
          type: 'array',
          items: { type: 'string' }
        },
        estimated_sprints: { type: 'number' },
        priority: {
          type: 'string',
          enum: ['critical', 'high', 'medium', 'low']
        }
      },
      required: ['project_id', 'title', 'business_value']
    }
  },

  {
    name: 'create_story',
    description: '📝 Create a user story with acceptance criteria',
    inputSchema: {
      type: 'object',
      properties: {
        epic_id: { type: 'string' },
        user_story: {
          type: 'string',
          description: 'As a [user], I want [feature] so that [benefit]'
        },
        acceptance_criteria: {
          type: 'array',
          items: { type: 'string' }
        },
        story_points: { type: 'number' },
        technical_notes: { type: 'string' },
        dependencies: {
          type: 'array',
          items: { type: 'string' },
          description: 'IDs of blocking stories'
        }
      },
      required: ['user_story', 'acceptance_criteria']
    }
  },

  {
    name: 'refine_backlog',
    description: '🔍 Refine and prioritize backlog items',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        refinement_type: {
          type: 'string',
          enum: ['prioritize', 'estimate', 'split', 'merge']
        },
        story_ids: {
          type: 'array',
          items: { type: 'string' }
        },
        action_details: {
          type: 'object',
          description: 'Specific refinement actions'
        }
      },
      required: ['project_id', 'refinement_type']
    }
  },

  // ============================================================================
  // TASK EXECUTION
  // ============================================================================
  {
    name: 'pickup_task',
    description: '🎯 AI agent picks up a task from the sprint board',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: { type: 'string' },
        preferred_type: {
          type: 'string',
          enum: ['feature', 'bug', 'tech_debt', 'documentation'],
          description: 'Preferred task type to work on'
        },
        max_story_points: { type: 'number' },
        skills_match: {
          type: 'array',
          items: { type: 'string' },
          description: 'Required skills for the task'
        }
      },
      required: ['agent_id']
    }
  },

  {
    name: 'update_task_progress',
    description: '📊 Update task progress and status',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { type: 'string' },
        status: {
          type: 'string',
          enum: ['todo', 'in_progress', 'in_review', 'done', 'blocked']
        },
        progress_percentage: { type: 'number' },
        hours_spent: { type: 'number' },
        artifacts: {
          type: 'array',
          items: { type: 'string' },
          description: 'Files, commits, or PRs created'
        },
        notes: { type: 'string' }
      },
      required: ['task_id', 'status']
    }
  },

  {
    name: 'request_review',
    description: '👀 Request code/task review',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { type: 'string' },
        reviewer_id: { type: 'string' },
        review_type: {
          type: 'string',
          enum: ['code', 'design', 'functionality', 'performance']
        },
        pr_url: { type: 'string' },
        review_checklist: {
          type: 'array',
          items: { type: 'string' }
        }
      },
      required: ['task_id', 'reviewer_id']
    }
  },

  // ============================================================================
  // PLANNING & ESTIMATION
  // ============================================================================
  {
    name: 'estimate_story',
    description: '🎲 Estimate story points using planning poker',
    inputSchema: {
      type: 'object',
      properties: {
        story_id: { type: 'string' },
        estimator_id: { type: 'string' },
        estimate_points: { type: 'number' },
        confidence_level: {
          type: 'string',
          enum: ['high', 'medium', 'low']
        },
        assumptions: {
          type: 'array',
          items: { type: 'string' }
        },
        risks: {
          type: 'array',
          items: { type: 'string' }
        }
      },
      required: ['story_id', 'estimator_id', 'estimate_points']
    }
  },

  {
    name: 'capacity_planning',
    description: '📈 Plan team capacity for upcoming sprint',
    inputSchema: {
      type: 'object',
      properties: {
        sprint_id: { type: 'string' },
        team_capacity: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              member_id: { type: 'string' },
              available_hours: { type: 'number' },
              planned_pto: { type: 'number' },
              focus_factor: { type: 'number' }
            }
          }
        }
      },
      required: ['sprint_id', 'team_capacity']
    }
  },

  // ============================================================================
  // REPORTING & METRICS
  // ============================================================================
  {
    name: 'get_velocity_chart',
    description: '📉 Get team velocity over recent sprints',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        sprint_count: {
          type: 'number',
          default: 5,
          description: 'Number of recent sprints to analyze'
        }
      },
      required: ['project_id']
    }
  },

  {
    name: 'get_burndown_chart',
    description: '📊 Get sprint burndown chart data',
    inputSchema: {
      type: 'object',
      properties: {
        sprint_id: { type: 'string' },
        group_by: {
          type: 'string',
          enum: ['day', 'hour'],
          default: 'day'
        }
      },
      required: ['sprint_id']
    }
  },

  {
    name: 'project_health_check',
    description: '🏥 Get overall project health metrics',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        include_risks: { type: 'boolean', default: true },
        include_blockers: { type: 'boolean', default: true },
        include_team_metrics: { type: 'boolean', default: true }
      },
      required: ['project_id']
    }
  },

  {
    name: 'cycle_time_analysis',
    description: '⏱️ Analyze cycle time for completed stories',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        date_range: {
          type: 'object',
          properties: {
            start: { type: 'string' },
            end: { type: 'string' }
          }
        },
        group_by: {
          type: 'string',
          enum: ['story_type', 'assignee', 'epic']
        }
      },
      required: ['project_id']
    }
  },

  // ============================================================================
  // AI-SPECIFIC PM TOOLS
  // ============================================================================
  {
    name: 'create_ai_handoff',
    description: '🤖 Create a structured handoff to an AI agent',
    inputSchema: {
      type: 'object',
      properties: {
        story_id: { type: 'string' },
        ai_agent_id: { type: 'string' },
        context: {
          type: 'object',
          properties: {
            system_prompt: { type: 'string' },
            relevant_files: {
              type: 'array',
              items: { type: 'string' }
            },
            code_examples: {
              type: 'array',
              items: { type: 'string' }
            },
            constraints: {
              type: 'array',
              items: { type: 'string' }
            },
            test_requirements: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        },
        expected_deliverables: {
          type: 'array',
          items: { type: 'string' }
        },
        deadline: { type: 'string' }
      },
      required: ['story_id', 'ai_agent_id', 'context', 'expected_deliverables']
    }
  },

  {
    name: 'ai_performance_report',
    description: '📈 Get performance metrics for AI agents',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: { type: 'string' },
        sprint_id: { type: 'string' },
        metrics: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['velocity', 'accuracy', 'rework_rate', 'cycle_time']
          }
        }
      },
      required: ['agent_id']
    }
  },

  // ============================================================================
  // COLLABORATION
  // ============================================================================
  {
    name: 'add_comment',
    description: '💬 Add comment to story/task',
    inputSchema: {
      type: 'object',
      properties: {
        entity_type: {
          type: 'string',
          enum: ['epic', 'story', 'task']
        },
        entity_id: { type: 'string' },
        comment: { type: 'string' },
        mentions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Member IDs to mention'
        }
      },
      required: ['entity_type', 'entity_id', 'comment']
    }
  },

  {
    name: 'escalate_blocker',
    description: '🚨 Escalate a blocker to PM/Lead',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { type: 'string' },
        blocker_description: { type: 'string' },
        severity: {
          type: 'string',
          enum: ['critical', 'high', 'medium', 'low']
        },
        attempted_solutions: {
          type: 'array',
          items: { type: 'string' }
        },
        suggested_resolution: { type: 'string' }
      },
      required: ['task_id', 'blocker_description', 'severity']
    }
  }
];