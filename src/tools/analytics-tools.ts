/**
 * Analytics & Observability MCP Tools
 * Tools for monitoring, metrics, and insights into AI operations
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const ANALYTICS_TOOLS: Tool[] = [
  {
    name: 'record_metric',
    description: '📊 Record a custom metric',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Metric name (e.g., "api.latency", "tokens.used")'
        },
        type: {
          type: 'string',
          enum: ['counter', 'gauge', 'histogram', 'summary'],
          description: 'Metric type'
        },
        value: {
          type: 'number',
          description: 'Metric value'
        },
        labels: {
          type: 'object',
          additionalProperties: { type: 'string' },
          description: 'Labels for the metric'
        },
        unit: {
          type: 'string',
          description: 'Unit of measurement'
        }
      },
      required: ['name', 'type', 'value']
    }
  },

  {
    name: 'record_event',
    description: '📝 Record an operational event',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          description: 'Event type (e.g., "deployment", "error", "milestone")'
        },
        severity: {
          type: 'string',
          enum: ['debug', 'info', 'warning', 'error', 'critical'],
          default: 'info'
        },
        source: {
          type: 'string',
          description: 'Event source'
        },
        message: {
          type: 'string',
          description: 'Event message'
        },
        metadata: {
          type: 'object',
          description: 'Additional event data'
        },
        correlation_id: {
          type: 'string',
          description: 'ID to correlate related events'
        }
      },
      required: ['type', 'source', 'message']
    }
  },

  {
    name: 'start_trace',
    description: '🔍 Start a distributed trace',
    inputSchema: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          description: 'Operation being traced'
        },
        service: {
          type: 'string',
          description: 'Service name'
        },
        parent_trace_id: {
          type: 'string',
          description: 'Parent trace ID for nested traces'
        },
        attributes: {
          type: 'object',
          description: 'Trace attributes'
        }
      },
      required: ['operation', 'service']
    }
  },

  {
    name: 'end_trace',
    description: '✅ End a distributed trace',
    inputSchema: {
      type: 'object',
      properties: {
        trace_id: {
          type: 'string',
          description: 'Trace to end'
        },
        status: {
          type: 'string',
          enum: ['completed', 'failed'],
          default: 'completed'
        },
        error: {
          type: 'string',
          description: 'Error message if failed'
        }
      },
      required: ['trace_id']
    }
  },

  {
    name: 'query_metrics',
    description: '🔎 Query metrics with filters',
    inputSchema: {
      type: 'object',
      properties: {
        metrics: {
          type: 'array',
          items: { type: 'string' },
          description: 'Metric names to query'
        },
        aggregation: {
          type: 'string',
          enum: ['sum', 'avg', 'min', 'max', 'count', 'p50', 'p95', 'p99'],
          description: 'Aggregation function'
        },
        group_by: {
          type: 'array',
          items: { type: 'string' },
          description: 'Labels to group by'
        },
        filters: {
          type: 'object',
          additionalProperties: { type: 'string' },
          description: 'Label filters'
        },
        time_range: {
          type: 'object',
          properties: {
            start: { type: 'string', format: 'date-time' },
            end: { type: 'string', format: 'date-time' },
            resolution: {
              type: 'string',
              enum: ['minute', 'hour', 'day', 'week', 'month']
            }
          },
          description: 'Time range for query'
        }
      },
      required: ['metrics']
    }
  },

  {
    name: 'get_dashboard',
    description: '📈 Get dashboard with current data',
    inputSchema: {
      type: 'object',
      properties: {
        dashboard_id: {
          type: 'string',
          description: 'Dashboard ID or name'
        },
        time_range: {
          type: 'object',
          properties: {
            start: { type: 'string', format: 'date-time' },
            end: { type: 'string', format: 'date-time' }
          },
          description: 'Override dashboard time range'
        }
      },
      required: ['dashboard_id']
    }
  },

  {
    name: 'create_dashboard',
    description: '🎨 Create a custom dashboard',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Dashboard name'
        },
        description: {
          type: 'string',
          description: 'Dashboard description'
        },
        widgets: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['line_chart', 'bar_chart', 'pie_chart', 'gauge', 'table', 'heatmap', 'stat']
              },
              title: { type: 'string' },
              metrics: {
                type: 'array',
                items: { type: 'string' }
              },
              aggregation: { type: 'string' },
              position: {
                type: 'object',
                properties: {
                  x: { type: 'number' },
                  y: { type: 'number' },
                  width: { type: 'number' },
                  height: { type: 'number' }
                }
              }
            },
            required: ['type', 'title', 'metrics']
          },
          description: 'Dashboard widgets'
        },
        refresh_interval: {
          type: 'number',
          description: 'Auto-refresh interval in seconds'
        }
      },
      required: ['name', 'widgets']
    }
  },

  {
    name: 'generate_report',
    description: '📄 Generate analytics report',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['performance', 'cost', 'quality', 'compliance', 'custom'],
          description: 'Report type'
        },
        period: {
          type: 'object',
          properties: {
            start: { type: 'string', format: 'date-time' },
            end: { type: 'string', format: 'date-time' }
          },
          required: ['start', 'end'],
          description: 'Report period'
        },
        format: {
          type: 'string',
          enum: ['json', 'markdown', 'html', 'pdf'],
          default: 'json',
          description: 'Output format'
        },
        sections: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['summary', 'metrics', 'charts', 'recommendations', 'trends']
          },
          description: 'Report sections to include'
        }
      },
      required: ['type', 'period']
    }
  },

  {
    name: 'create_alert',
    description: '🚨 Create monitoring alert',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Alert name'
        },
        condition: {
          type: 'object',
          properties: {
            metric: { type: 'string' },
            operator: {
              type: 'string',
              enum: ['>', '<', '>=', '<=', '==', '!=']
            },
            threshold: { type: 'number' },
            duration: {
              type: 'number',
              description: 'Duration in seconds before triggering'
            },
            aggregation: {
              type: 'string',
              enum: ['avg', 'sum', 'min', 'max']
            }
          },
          required: ['metric', 'operator', 'threshold'],
          description: 'Alert condition'
        },
        severity: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'critical'],
          default: 'medium'
        },
        notifications: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['webhook', 'email', 'slack', 'discord', 'log']
              },
              config: { type: 'object' }
            },
            required: ['type']
          },
          description: 'Notification channels'
        },
        cooldown: {
          type: 'number',
          default: 300,
          description: 'Cooldown period in seconds'
        }
      },
      required: ['name', 'condition']
    }
  },

  {
    name: 'get_agent_analytics',
    description: '🤖 Get detailed agent analytics',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: {
          type: 'string',
          description: 'Agent to analyze'
        },
        metrics: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['performance', 'utilization', 'errors', 'costs', 'specialization']
          },
          description: 'Metrics to include'
        },
        time_range: {
          type: 'object',
          properties: {
            start: { type: 'string', format: 'date-time' },
            end: { type: 'string', format: 'date-time' }
          },
          description: 'Analysis period'
        },
        compare_with: {
          type: 'array',
          items: { type: 'string' },
          description: 'Other agents to compare'
        }
      },
      required: ['agent_id']
    }
  },

  {
    name: 'get_workflow_analytics',
    description: '🔄 Get workflow execution analytics',
    inputSchema: {
      type: 'object',
      properties: {
        workflow_id: {
          type: 'string',
          description: 'Specific workflow or "all"'
        },
        metrics: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['duration', 'success_rate', 'bottlenecks', 'state_transitions', 'step_performance']
          },
          description: 'Metrics to analyze'
        },
        time_range: {
          type: 'object',
          properties: {
            start: { type: 'string', format: 'date-time' },
            end: { type: 'string', format: 'date-time' }
          },
          description: 'Analysis period'
        }
      }
    }
  },

  {
    name: 'get_system_health',
    description: '💚 Get system health status',
    inputSchema: {
      type: 'object',
      properties: {
        components: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['agents', 'workflows', 'context', 'storage', 'api']
          },
          description: 'Components to check'
        },
        include_diagnostics: {
          type: 'boolean',
          default: false,
          description: 'Include detailed diagnostics'
        }
      }
    }
  },

  {
    name: 'export_metrics',
    description: '📤 Export metrics data',
    inputSchema: {
      type: 'object',
      properties: {
        format: {
          type: 'string',
          enum: ['prometheus', 'json', 'csv'],
          default: 'json',
          description: 'Export format'
        },
        time_range: {
          type: 'object',
          properties: {
            start: { type: 'string', format: 'date-time' },
            end: { type: 'string', format: 'date-time' }
          },
          description: 'Export period'
        },
        metrics_filter: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific metrics to export'
        }
      },
      required: ['format']
    }
  },

  {
    name: 'get_cost_analysis',
    description: '💰 Analyze operational costs',
    inputSchema: {
      type: 'object',
      properties: {
        period: {
          type: 'object',
          properties: {
            start: { type: 'string', format: 'date-time' },
            end: { type: 'string', format: 'date-time' }
          },
          required: ['start', 'end'],
          description: 'Analysis period'
        },
        breakdown_by: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['agent', 'project', 'workflow', 'user', 'api']
          },
          description: 'Cost breakdown dimensions'
        },
        include_projections: {
          type: 'boolean',
          default: false,
          description: 'Include cost projections'
        }
      },
      required: ['period']
    }
  },

  {
    name: 'get_performance_insights',
    description: '💡 Get AI-generated performance insights',
    inputSchema: {
      type: 'object',
      properties: {
        scope: {
          type: 'string',
          enum: ['system', 'agents', 'workflows', 'specific'],
          default: 'system'
        },
        entity_id: {
          type: 'string',
          description: 'Specific entity to analyze (if scope is "specific")'
        },
        time_range: {
          type: 'object',
          properties: {
            start: { type: 'string', format: 'date-time' },
            end: { type: 'string', format: 'date-time' }
          },
          description: 'Analysis period'
        },
        depth: {
          type: 'string',
          enum: ['summary', 'detailed', 'comprehensive'],
          default: 'detailed'
        }
      }
    }
  },

  {
    name: 'list_dashboards',
    description: '📋 List available dashboards',
    inputSchema: {
      type: 'object',
      properties: {
        filter: {
          type: 'string',
          enum: ['system', 'custom', 'all'],
          default: 'all',
          description: 'Dashboard filter'
        }
      }
    }
  },

  {
    name: 'list_alerts',
    description: '🔔 List configured alerts',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['enabled', 'disabled', 'triggered', 'all'],
          default: 'all',
          description: 'Alert status filter'
        },
        severity: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'critical']
          },
          description: 'Severity filter'
        }
      }
    }
  },

  {
    name: 'get_recent_events',
    description: '📰 Get recent system events',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          default: 100,
          description: 'Number of events to retrieve'
        },
        severity_filter: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['debug', 'info', 'warning', 'error', 'critical']
          },
          description: 'Filter by severity'
        },
        source_filter: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by source'
        }
      }
    }
  },

  {
    name: 'cleanup_old_data',
    description: '🧹 Clean up old analytics data',
    inputSchema: {
      type: 'object',
      properties: {
        older_than_days: {
          type: 'number',
          default: 30,
          description: 'Delete data older than this many days'
        },
        data_types: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['metrics', 'events', 'traces', 'all']
          },
          default: ['all'],
          description: 'Types of data to clean'
        },
        dry_run: {
          type: 'boolean',
          default: true,
          description: 'Preview what would be deleted'
        }
      }
    }
  },

  {
    name: 'benchmark_performance',
    description: '⚡ Run performance benchmark',
    inputSchema: {
      type: 'object',
      properties: {
        test_type: {
          type: 'string',
          enum: ['agent_speed', 'workflow_throughput', 'context_retrieval', 'full_suite'],
          description: 'Type of benchmark'
        },
        iterations: {
          type: 'number',
          default: 10,
          description: 'Number of test iterations'
        },
        compare_with_baseline: {
          type: 'boolean',
          default: true,
          description: 'Compare with baseline metrics'
        }
      },
      required: ['test_type']
    }
  }
];