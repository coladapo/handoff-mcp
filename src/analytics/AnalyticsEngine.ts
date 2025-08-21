/**
 * Analytics Engine - Observability and Insights for AI Operations
 * 
 * Solves the #4 pain point: No visibility into AI agent performance
 * Provides comprehensive metrics, telemetry, and insights
 */

import { EventEmitter } from 'events';
import { ContextManager } from '../context/ContextManager.js';
import { WorkflowEngine, Workflow, WorkflowStep } from '../workflow/WorkflowEngine.js';
import { AgentOrchestrator, Agent, TaskAssignment } from '../orchestration/AgentOrchestrator.js';
import * as crypto from 'crypto';

export interface Metric {
  id: string;
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  value: number;
  timestamp: Date;
  labels?: Record<string, string>;
  unit?: string;
}

export interface Event {
  id: string;
  type: string;
  severity: 'debug' | 'info' | 'warning' | 'error' | 'critical';
  source: string;
  message: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  correlation_id?: string;
}

export interface Trace {
  id: string;
  parent_id?: string;
  operation: string;
  service: string;
  start_time: Date;
  end_time?: Date;
  duration_ms?: number;
  status: 'started' | 'in_progress' | 'completed' | 'failed';
  attributes?: Record<string, any>;
  spans?: Trace[];
}

export interface Dashboard {
  id: string;
  name: string;
  description: string;
  widgets: Widget[];
  refresh_interval?: number; // seconds
  time_range?: TimeRange;
}

export interface Widget {
  id: string;
  type: 'line_chart' | 'bar_chart' | 'pie_chart' | 'gauge' | 'table' | 'heatmap' | 'stat';
  title: string;
  metric_query: MetricQuery;
  position: { x: number; y: number; width: number; height: number };
  options?: Record<string, any>;
}

export interface MetricQuery {
  metrics: string[];
  aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'p50' | 'p95' | 'p99';
  group_by?: string[];
  filters?: Record<string, any>;
  time_range?: TimeRange;
}

export interface TimeRange {
  start: Date;
  end: Date;
  resolution?: 'minute' | 'hour' | 'day' | 'week' | 'month';
}

export interface Report {
  id: string;
  name: string;
  type: 'performance' | 'cost' | 'quality' | 'compliance' | 'custom';
  period: TimeRange;
  sections: ReportSection[];
  generated_at: Date;
  format?: 'json' | 'markdown' | 'html' | 'pdf';
}

export interface ReportSection {
  title: string;
  type: 'summary' | 'metrics' | 'charts' | 'table' | 'recommendations';
  content: any;
}

export interface Alert {
  id: string;
  name: string;
  condition: AlertCondition;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  notifications: NotificationChannel[];
  cooldown?: number; // seconds
  last_triggered?: Date;
}

export interface AlertCondition {
  metric: string;
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  threshold: number;
  duration?: number; // seconds
  aggregation?: 'avg' | 'sum' | 'min' | 'max';
}

export interface NotificationChannel {
  type: 'webhook' | 'email' | 'slack' | 'discord' | 'log';
  config: Record<string, any>;
}

export class AnalyticsEngine extends EventEmitter {
  private metrics: Map<string, Metric[]> = new Map();
  private events: Event[] = [];
  private traces: Map<string, Trace> = new Map();
  private dashboards: Map<string, Dashboard> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private contextManager: ContextManager;
  private workflowEngine: WorkflowEngine;
  private agentOrchestrator: AgentOrchestrator;
  private metricsBuffer: Metric[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private retentionDays: number = 30;

  constructor(
    contextManager: ContextManager,
    workflowEngine: WorkflowEngine,
    agentOrchestrator: AgentOrchestrator,
    config?: {
      flushIntervalMs?: number;
      retentionDays?: number;
      enableAutoMetrics?: boolean;
    }
  ) {
    super();
    this.contextManager = contextManager;
    this.workflowEngine = workflowEngine;
    this.agentOrchestrator = agentOrchestrator;
    
    if (config?.retentionDays) {
      this.retentionDays = config.retentionDays;
    }
    
    // Setup automatic metrics collection
    if (config?.enableAutoMetrics !== false) {
      this.setupAutoMetrics();
    }
    
    // Setup metric flushing
    if (config?.flushIntervalMs) {
      this.flushInterval = setInterval(() => {
        this.flushMetrics();
      }, config.flushIntervalMs);
    }
    
    // Initialize default dashboards
    this.initializeDefaultDashboards();
  }

  /**
   * Setup automatic metrics collection from other components
   */
  private setupAutoMetrics() {
    // Context Manager metrics
    this.contextManager.on('session:created', (session) => {
      this.recordMetric({
        name: 'sessions.created',
        type: 'counter',
        value: 1,
        labels: { agent_type: session.agentType, project_id: session.projectId }
      });
    });
    
    this.contextManager.on('message:added', ({ sessionId, message }) => {
      this.recordMetric({
        name: 'messages.count',
        type: 'counter',
        value: 1,
        labels: { role: message.role, session_id: sessionId }
      });
    });
    
    this.contextManager.on('decision:recorded', ({ decision }) => {
      this.recordMetric({
        name: 'decisions.made',
        type: 'counter',
        value: 1,
        labels: { impact: decision.impact }
      });
    });
    
    // Workflow Engine metrics
    this.workflowEngine.on('workflow:created', (workflow) => {
      this.recordMetric({
        name: 'workflows.created',
        type: 'counter',
        value: 1,
        labels: { type: workflow.type, priority: workflow.metadata.priority }
      });
    });
    
    this.workflowEngine.on('workflow:transition', ({ from, to, trigger }) => {
      this.recordMetric({
        name: 'workflow.transitions',
        type: 'counter',
        value: 1,
        labels: { from_state: from, to_state: to, trigger }
      });
    });
    
    this.workflowEngine.on('step:completed', ({ step }) => {
      const duration = step.completedAt && step.startedAt
        ? (step.completedAt.getTime() - step.startedAt.getTime()) / 1000
        : 0;
      
      this.recordMetric({
        name: 'workflow.step.duration',
        type: 'histogram',
        value: duration,
        labels: { step_type: step.type },
        unit: 'seconds'
      });
    });
    
    // Agent Orchestrator metrics
    this.agentOrchestrator.on('task:assigned', ({ assignment, agent }) => {
      this.recordMetric({
        name: 'tasks.assigned',
        type: 'counter',
        value: 1,
        labels: { 
          agent_id: agent.id,
          agent_type: agent.type,
          priority: assignment.priority
        }
      });
      
      this.recordMetric({
        name: 'agent.load',
        type: 'gauge',
        value: agent.currentLoad,
        labels: { agent_id: agent.id }
      });
    });
    
    this.agentOrchestrator.on('task:completed', ({ taskId, agentId, output }) => {
      this.recordMetric({
        name: 'tasks.completed',
        type: 'counter',
        value: 1,
        labels: { agent_id: agentId, success: 'true' }
      });
    });
    
    this.agentOrchestrator.on('task:failed', ({ taskId, error }) => {
      this.recordMetric({
        name: 'tasks.failed',
        type: 'counter',
        value: 1,
        labels: { error_type: this.classifyError(error) }
      });
      
      this.recordEvent({
        type: 'task.failure',
        severity: 'error',
        source: 'orchestrator',
        message: `Task ${taskId} failed: ${error}`,
        metadata: { task_id: taskId, error }
      });
    });
    
    this.agentOrchestrator.on('collaboration:created', (collaboration) => {
      this.recordMetric({
        name: 'collaborations.created',
        type: 'counter',
        value: 1,
        labels: { agent_count: collaboration.agents.length.toString() }
      });
    });
  }

  /**
   * Initialize default dashboards
   */
  private initializeDefaultDashboards() {
    // System Overview Dashboard
    this.createDashboard({
      name: 'System Overview',
      description: 'High-level system metrics and health',
      widgets: [
        {
          id: 'active-sessions',
          type: 'stat',
          title: 'Active Sessions',
          metric_query: {
            metrics: ['sessions.active'],
            aggregation: 'sum'
          },
          position: { x: 0, y: 0, width: 3, height: 2 }
        },
        {
          id: 'task-throughput',
          type: 'line_chart',
          title: 'Task Throughput',
          metric_query: {
            metrics: ['tasks.completed', 'tasks.failed'],
            aggregation: 'sum',
            time_range: { 
              start: new Date(Date.now() - 3600000),
              end: new Date(),
              resolution: 'minute'
            }
          },
          position: { x: 3, y: 0, width: 6, height: 3 }
        },
        {
          id: 'agent-utilization',
          type: 'gauge',
          title: 'Agent Utilization',
          metric_query: {
            metrics: ['agent.load'],
            aggregation: 'avg'
          },
          position: { x: 9, y: 0, width: 3, height: 2 }
        },
        {
          id: 'workflow-states',
          type: 'pie_chart',
          title: 'Workflow States',
          metric_query: {
            metrics: ['workflow.state'],
            group_by: ['state']
          },
          position: { x: 0, y: 3, width: 4, height: 3 }
        },
        {
          id: 'error-rate',
          type: 'line_chart',
          title: 'Error Rate',
          metric_query: {
            metrics: ['tasks.failed'],
            aggregation: 'count',
            time_range: {
              start: new Date(Date.now() - 3600000),
              end: new Date(),
              resolution: 'minute'
            }
          },
          position: { x: 4, y: 3, width: 8, height: 3 }
        }
      ],
      refresh_interval: 30
    });
    
    // Agent Performance Dashboard
    this.createDashboard({
      name: 'Agent Performance',
      description: 'Detailed agent metrics and performance',
      widgets: [
        {
          id: 'agent-comparison',
          type: 'bar_chart',
          title: 'Agent Task Completion',
          metric_query: {
            metrics: ['tasks.completed'],
            group_by: ['agent_id'],
            aggregation: 'sum'
          },
          position: { x: 0, y: 0, width: 6, height: 3 }
        },
        {
          id: 'agent-response-time',
          type: 'heatmap',
          title: 'Agent Response Times',
          metric_query: {
            metrics: ['task.duration'],
            group_by: ['agent_id', 'hour']
          },
          position: { x: 6, y: 0, width: 6, height: 3 }
        },
        {
          id: 'agent-specialization',
          type: 'table',
          title: 'Agent Specializations',
          metric_query: {
            metrics: ['agent.specialty.score'],
            group_by: ['agent_id', 'skill']
          },
          position: { x: 0, y: 3, width: 12, height: 4 }
        }
      ]
    });
  }

  /**
   * Record a metric
   */
  recordMetric(params: {
    name: string;
    type: Metric['type'];
    value: number;
    labels?: Record<string, string>;
    unit?: string;
  }): void {
    const metric: Metric = {
      id: crypto.randomUUID(),
      name: params.name,
      type: params.type,
      value: params.value,
      timestamp: new Date(),
      labels: params.labels,
      unit: params.unit
    };
    
    // Add to buffer
    this.metricsBuffer.push(metric);
    
    // Store by name for quick access
    if (!this.metrics.has(params.name)) {
      this.metrics.set(params.name, []);
    }
    this.metrics.get(params.name)!.push(metric);
    
    // Check alerts
    this.checkAlerts(metric);
    
    this.emit('metric:recorded', metric);
  }

  /**
   * Record an event
   */
  recordEvent(params: {
    type: string;
    severity: Event['severity'];
    source: string;
    message: string;
    metadata?: Record<string, any>;
    correlation_id?: string;
  }): void {
    const event: Event = {
      id: crypto.randomUUID(),
      ...params,
      timestamp: new Date()
    };
    
    this.events.push(event);
    this.emit('event:recorded', event);
    
    // Log critical events
    if (event.severity === 'critical' || event.severity === 'error') {
      console.error(`[${event.severity.toUpperCase()}] ${event.source}: ${event.message}`);
    }
  }

  /**
   * Start a trace
   */
  startTrace(params: {
    operation: string;
    service: string;
    parent_id?: string;
    attributes?: Record<string, any>;
  }): Trace {
    const trace: Trace = {
      id: crypto.randomUUID(),
      parent_id: params.parent_id,
      operation: params.operation,
      service: params.service,
      start_time: new Date(),
      status: 'started',
      attributes: params.attributes,
      spans: []
    };
    
    this.traces.set(trace.id, trace);
    this.emit('trace:started', trace);
    
    return trace;
  }

  /**
   * End a trace
   */
  endTrace(traceId: string, status: 'completed' | 'failed' = 'completed'): void {
    const trace = this.traces.get(traceId);
    if (!trace) return;
    
    trace.end_time = new Date();
    trace.duration_ms = trace.end_time.getTime() - trace.start_time.getTime();
    trace.status = status;
    
    // Record duration metric
    this.recordMetric({
      name: `trace.duration.${trace.operation}`,
      type: 'histogram',
      value: trace.duration_ms,
      labels: { 
        service: trace.service,
        status
      },
      unit: 'milliseconds'
    });
    
    this.emit('trace:ended', trace);
  }

  /**
   * Query metrics
   */
  queryMetrics(query: MetricQuery): Metric[] {
    let results: Metric[] = [];
    
    // Collect metrics
    for (const metricName of query.metrics) {
      const metrics = this.metrics.get(metricName) || [];
      results.push(...metrics);
    }
    
    // Apply time range filter
    if (query.time_range) {
      results = results.filter(m => 
        m.timestamp >= query.time_range!.start &&
        m.timestamp <= query.time_range!.end
      );
    }
    
    // Apply filters
    if (query.filters) {
      results = results.filter(m => {
        if (!m.labels) return false;
        for (const [key, value] of Object.entries(query.filters!)) {
          if (m.labels[key] !== value) return false;
        }
        return true;
      });
    }
    
    // Group and aggregate if needed
    if (query.aggregation) {
      results = this.aggregateMetrics(results, query.aggregation, query.group_by);
    }
    
    return results;
  }

  /**
   * Aggregate metrics
   */
  private aggregateMetrics(
    metrics: Metric[],
    aggregation: NonNullable<MetricQuery['aggregation']>,
    groupBy?: string[]
  ): Metric[] {
    if (!groupBy || groupBy.length === 0) {
      // Simple aggregation
      const value = this.calculateAggregation(metrics.map(m => m.value), aggregation);
      return [{
        id: crypto.randomUUID(),
        name: metrics[0]?.name || 'aggregated',
        type: 'gauge',
        value,
        timestamp: new Date()
      }];
    }
    
    // Group by labels
    const groups = new Map<string, Metric[]>();
    
    for (const metric of metrics) {
      const key = groupBy.map(g => metric.labels?.[g] || 'unknown').join(':');
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(metric);
    }
    
    // Aggregate each group
    const results: Metric[] = [];
    for (const [key, groupMetrics] of groups.entries()) {
      const value = this.calculateAggregation(groupMetrics.map(m => m.value), aggregation);
      const labels: Record<string, string> = {};
      
      groupBy.forEach((g, i) => {
        labels[g] = key.split(':')[i];
      });
      
      results.push({
        id: crypto.randomUUID(),
        name: groupMetrics[0].name,
        type: 'gauge',
        value,
        timestamp: new Date(),
        labels
      });
    }
    
    return results;
  }

  /**
   * Calculate aggregation
   */
  private calculateAggregation(values: number[], type: string): number {
    if (values.length === 0) return 0;
    
    switch (type) {
      case 'sum':
        return values.reduce((a, b) => a + b, 0);
      case 'avg':
        return values.reduce((a, b) => a + b, 0) / values.length;
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
      case 'count':
        return values.length;
      case 'p50':
        return this.percentile(values, 0.5);
      case 'p95':
        return this.percentile(values, 0.95);
      case 'p99':
        return this.percentile(values, 0.99);
      default:
        return 0;
    }
  }

  /**
   * Calculate percentile
   */
  private percentile(values: number[], p: number): number {
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Create a dashboard
   */
  createDashboard(params: Omit<Dashboard, 'id'>): Dashboard {
    const dashboard: Dashboard = {
      id: crypto.randomUUID(),
      ...params
    };
    
    this.dashboards.set(dashboard.id, dashboard);
    this.emit('dashboard:created', dashboard);
    
    return dashboard;
  }

  /**
   * Get dashboard data
   */
  getDashboardData(dashboardId: string): {
    dashboard: Dashboard;
    data: Map<string, Metric[]>;
  } | null {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return null;
    
    const data = new Map<string, Metric[]>();
    
    for (const widget of dashboard.widgets) {
      const metrics = this.queryMetrics(widget.metric_query);
      data.set(widget.id, metrics);
    }
    
    return { dashboard, data };
  }

  /**
   * Generate report
   */
  async generateReport(params: {
    type: Report['type'];
    period: TimeRange;
    format?: Report['format'];
  }): Promise<Report> {
    const report: Report = {
      id: crypto.randomUUID(),
      name: `${params.type.charAt(0).toUpperCase() + params.type.slice(1)} Report`,
      type: params.type,
      period: params.period,
      sections: [],
      generated_at: new Date(),
      format: params.format || 'json'
    };
    
    switch (params.type) {
      case 'performance':
        report.sections = await this.generatePerformanceReport(params.period);
        break;
      case 'cost':
        report.sections = await this.generateCostReport(params.period);
        break;
      case 'quality':
        report.sections = await this.generateQualityReport(params.period);
        break;
      default:
        report.sections = await this.generateCustomReport(params.period);
    }
    
    this.emit('report:generated', report);
    return report;
  }

  /**
   * Generate performance report sections
   */
  private async generatePerformanceReport(period: TimeRange): Promise<ReportSection[]> {
    const sections: ReportSection[] = [];
    
    // Executive Summary
    const taskMetrics = this.queryMetrics({
      metrics: ['tasks.completed', 'tasks.failed'],
      time_range: period,
      aggregation: 'sum'
    });
    
    const avgDuration = this.queryMetrics({
      metrics: ['task.duration'],
      time_range: period,
      aggregation: 'avg'
    });
    
    sections.push({
      title: 'Executive Summary',
      type: 'summary',
      content: {
        total_tasks: taskMetrics.reduce((sum, m) => sum + m.value, 0),
        success_rate: this.calculateSuccessRate(period),
        average_duration: avgDuration[0]?.value || 0,
        period: `${period.start.toISOString()} to ${period.end.toISOString()}`
      }
    });
    
    // Agent Performance
    const agentMetrics = this.queryMetrics({
      metrics: ['tasks.completed'],
      time_range: period,
      group_by: ['agent_id'],
      aggregation: 'sum'
    });
    
    sections.push({
      title: 'Agent Performance',
      type: 'table',
      content: agentMetrics.map(m => ({
        agent: m.labels?.agent_id || 'unknown',
        tasks_completed: m.value,
        success_rate: this.getAgentSuccessRate(m.labels?.agent_id || '', period)
      }))
    });
    
    // Workflow Analytics
    const workflowMetrics = this.queryMetrics({
      metrics: ['workflows.created', 'workflow.transitions'],
      time_range: period,
      aggregation: 'count'
    });
    
    sections.push({
      title: 'Workflow Analytics',
      type: 'metrics',
      content: {
        workflows_created: workflowMetrics.find(m => m.name === 'workflows.created')?.value || 0,
        total_transitions: workflowMetrics.find(m => m.name === 'workflow.transitions')?.value || 0
      }
    });
    
    // Recommendations
    sections.push({
      title: 'Recommendations',
      type: 'recommendations',
      content: await this.generatePerformanceRecommendations(period)
    });
    
    return sections;
  }

  /**
   * Generate cost report sections
   */
  private async generateCostReport(period: TimeRange): Promise<ReportSection[]> {
    // Simplified cost calculation based on usage
    const tokenUsage = this.queryMetrics({
      metrics: ['tokens.used'],
      time_range: period,
      aggregation: 'sum',
      group_by: ['agent_type']
    });
    
    return [{
      title: 'Token Usage',
      type: 'table',
      content: tokenUsage.map(m => ({
        agent_type: m.labels?.agent_type || 'unknown',
        tokens: m.value,
        estimated_cost: m.value * 0.00002 // Example rate
      }))
    }];
  }

  /**
   * Generate quality report sections
   */
  private async generateQualityReport(period: TimeRange): Promise<ReportSection[]> {
    const errorRate = this.calculateErrorRate(period);
    const retryRate = this.calculateRetryRate(period);
    
    return [{
      title: 'Quality Metrics',
      type: 'metrics',
      content: {
        error_rate: errorRate,
        retry_rate: retryRate,
        success_rate: this.calculateSuccessRate(period)
      }
    }];
  }

  /**
   * Generate custom report sections
   */
  private async generateCustomReport(period: TimeRange): Promise<ReportSection[]> {
    return [{
      title: 'Custom Report',
      type: 'summary',
      content: {
        message: 'Custom report generation not yet implemented'
      }
    }];
  }

  /**
   * Generate performance recommendations
   */
  private async generatePerformanceRecommendations(period: TimeRange): Promise<string[]> {
    const recommendations: string[] = [];
    
    const errorRate = this.calculateErrorRate(period);
    if (errorRate > 0.1) {
      recommendations.push('High error rate detected. Consider reviewing agent configurations and task assignments.');
    }
    
    const avgLoad = this.queryMetrics({
      metrics: ['agent.load'],
      time_range: period,
      aggregation: 'avg'
    })[0]?.value || 0;
    
    if (avgLoad > 80) {
      recommendations.push('Agents are heavily loaded. Consider adding more agents or optimizing task distribution.');
    } else if (avgLoad < 30) {
      recommendations.push('Agents are underutilized. Consider consolidating agents or increasing task volume.');
    }
    
    return recommendations;
  }

  /**
   * Create an alert
   */
  createAlert(params: Omit<Alert, 'id'>): Alert {
    const alert: Alert = {
      id: crypto.randomUUID(),
      ...params
    };
    
    this.alerts.set(alert.id, alert);
    this.emit('alert:created', alert);
    
    return alert;
  }

  /**
   * Check alerts against a metric
   */
  private checkAlerts(metric: Metric): void {
    for (const alert of this.alerts.values()) {
      if (!alert.enabled) continue;
      if (alert.condition.metric !== metric.name) continue;
      
      // Check cooldown
      if (alert.last_triggered) {
        const cooldownMs = (alert.cooldown || 300) * 1000;
        if (Date.now() - alert.last_triggered.getTime() < cooldownMs) {
          continue;
        }
      }
      
      // Evaluate condition
      const triggered = this.evaluateAlertCondition(metric.value, alert.condition);
      
      if (triggered) {
        alert.last_triggered = new Date();
        this.triggerAlert(alert, metric);
      }
    }
  }

  /**
   * Evaluate alert condition
   */
  private evaluateAlertCondition(value: number, condition: AlertCondition): boolean {
    switch (condition.operator) {
      case '>': return value > condition.threshold;
      case '<': return value < condition.threshold;
      case '>=': return value >= condition.threshold;
      case '<=': return value <= condition.threshold;
      case '==': return value === condition.threshold;
      case '!=': return value !== condition.threshold;
      default: return false;
    }
  }

  /**
   * Trigger an alert
   */
  private triggerAlert(alert: Alert, metric: Metric): void {
    this.recordEvent({
      type: 'alert.triggered',
      severity: alert.severity === 'critical' ? 'critical' : 'warning',
      source: 'analytics',
      message: `Alert '${alert.name}' triggered: ${metric.name} = ${metric.value}`,
      metadata: { alert_id: alert.id, metric }
    });
    
    // Send notifications
    for (const channel of alert.notifications) {
      this.sendNotification(channel, alert, metric);
    }
    
    this.emit('alert:triggered', { alert, metric });
  }

  /**
   * Send notification
   */
  private sendNotification(
    channel: NotificationChannel,
    alert: Alert,
    metric: Metric
  ): void {
    switch (channel.type) {
      case 'log':
        console.log(`[ALERT] ${alert.name}: ${metric.name} = ${metric.value}`);
        break;
      case 'webhook':
        // Implement webhook notification
        break;
      case 'email':
        // Implement email notification
        break;
      case 'slack':
        // Implement Slack notification
        break;
      case 'discord':
        // Implement Discord notification
        break;
    }
  }

  /**
   * Calculate success rate
   */
  private calculateSuccessRate(period: TimeRange): number {
    const completed = this.queryMetrics({
      metrics: ['tasks.completed'],
      time_range: period,
      aggregation: 'sum'
    })[0]?.value || 0;
    
    const failed = this.queryMetrics({
      metrics: ['tasks.failed'],
      time_range: period,
      aggregation: 'sum'
    })[0]?.value || 0;
    
    const total = completed + failed;
    return total > 0 ? (completed / total) * 100 : 100;
  }

  /**
   * Calculate error rate
   */
  private calculateErrorRate(period: TimeRange): number {
    return 100 - this.calculateSuccessRate(period);
  }

  /**
   * Calculate retry rate
   */
  private calculateRetryRate(period: TimeRange): number {
    const retries = this.queryMetrics({
      metrics: ['tasks.retried'],
      time_range: period,
      aggregation: 'sum'
    })[0]?.value || 0;
    
    const total = this.queryMetrics({
      metrics: ['tasks.completed', 'tasks.failed'],
      time_range: period,
      aggregation: 'sum'
    }).reduce((sum, m) => sum + m.value, 0);
    
    return total > 0 ? (retries / total) * 100 : 0;
  }

  /**
   * Get agent success rate
   */
  private getAgentSuccessRate(agentId: string, period: TimeRange): number {
    const completed = this.queryMetrics({
      metrics: ['tasks.completed'],
      time_range: period,
      filters: { agent_id: agentId },
      aggregation: 'sum'
    })[0]?.value || 0;
    
    const failed = this.queryMetrics({
      metrics: ['tasks.failed'],
      time_range: period,
      filters: { agent_id: agentId },
      aggregation: 'sum'
    })[0]?.value || 0;
    
    const total = completed + failed;
    return total > 0 ? (completed / total) * 100 : 100;
  }

  /**
   * Classify error type
   */
  private classifyError(error: string): string {
    if (error.includes('timeout')) return 'timeout';
    if (error.includes('rate limit')) return 'rate_limit';
    if (error.includes('auth')) return 'authentication';
    if (error.includes('network')) return 'network';
    return 'unknown';
  }

  /**
   * Flush metrics buffer
   */
  private flushMetrics(): void {
    if (this.metricsBuffer.length === 0) return;
    
    // Here you would send metrics to external service
    this.emit('metrics:flushed', this.metricsBuffer.length);
    this.metricsBuffer = [];
  }

  /**
   * Clean up old data
   */
  cleanupOldData(): number {
    const cutoff = new Date(Date.now() - this.retentionDays * 24 * 60 * 60 * 1000);
    let cleaned = 0;
    
    // Clean metrics
    for (const [name, metrics] of this.metrics.entries()) {
      const filtered = metrics.filter(m => m.timestamp > cutoff);
      cleaned += metrics.length - filtered.length;
      this.metrics.set(name, filtered);
    }
    
    // Clean events
    const originalEventCount = this.events.length;
    this.events = this.events.filter(e => e.timestamp > cutoff);
    cleaned += originalEventCount - this.events.length;
    
    // Clean traces
    for (const [id, trace] of this.traces.entries()) {
      if (trace.start_time < cutoff) {
        this.traces.delete(id);
        cleaned++;
      }
    }
    
    this.emit('cleanup:completed', { items_removed: cleaned });
    return cleaned;
  }

  /**
   * Export metrics for external systems
   */
  exportMetrics(format: 'prometheus' | 'json' | 'csv'): string {
    const allMetrics: Metric[] = [];
    for (const metrics of this.metrics.values()) {
      allMetrics.push(...metrics);
    }
    
    switch (format) {
      case 'prometheus':
        return this.exportPrometheus(allMetrics);
      case 'csv':
        return this.exportCSV(allMetrics);
      case 'json':
      default:
        return JSON.stringify(allMetrics, null, 2);
    }
  }

  /**
   * Export in Prometheus format
   */
  private exportPrometheus(metrics: Metric[]): string {
    const lines: string[] = [];
    const grouped = new Map<string, Metric[]>();
    
    for (const metric of metrics) {
      if (!grouped.has(metric.name)) {
        grouped.set(metric.name, []);
      }
      grouped.get(metric.name)!.push(metric);
    }
    
    for (const [name, metricGroup] of grouped.entries()) {
      const type = metricGroup[0].type;
      lines.push(`# TYPE ${name} ${type}`);
      
      for (const metric of metricGroup) {
        const labels = metric.labels
          ? '{' + Object.entries(metric.labels).map(([k, v]) => `${k}="${v}"`).join(',') + '}'
          : '';
        lines.push(`${name}${labels} ${metric.value} ${metric.timestamp.getTime()}`);
      }
    }
    
    return lines.join('\n');
  }

  /**
   * Export in CSV format
   */
  private exportCSV(metrics: Metric[]): string {
    const headers = ['timestamp', 'name', 'type', 'value', 'labels', 'unit'];
    const rows = [headers.join(',')];
    
    for (const metric of metrics) {
      rows.push([
        metric.timestamp.toISOString(),
        metric.name,
        metric.type,
        metric.value.toString(),
        JSON.stringify(metric.labels || {}),
        metric.unit || ''
      ].join(','));
    }
    
    return rows.join('\n');
  }

  /**
   * Get all dashboards
   */
  getDashboards(): Dashboard[] {
    return Array.from(this.dashboards.values());
  }

  /**
   * Get all alerts
   */
  getAlerts(): Alert[] {
    return Array.from(this.alerts.values());
  }

  /**
   * Get recent events
   */
  getRecentEvents(limit: number = 100): Event[] {
    return this.events
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
}