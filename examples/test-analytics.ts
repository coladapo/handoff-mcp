#!/usr/bin/env node

/**
 * Test Analytics & Observability Engine
 * Demonstrates comprehensive monitoring and insights for AI operations
 */

import { AnalyticsEngine } from '../src/analytics/AnalyticsEngine.js';
import { ContextManager } from '../src/context/ContextManager.js';
import { WorkflowEngine } from '../src/workflow/WorkflowEngine.js';
import { AgentOrchestrator } from '../src/orchestration/AgentOrchestrator.js';

async function testAnalyticsSystem() {
  console.log('📊 Testing Handoff MCP Analytics & Observability\n');
  
  // Initialize components
  const contextManager = new ContextManager({
    localStoragePath: './test-analytics-data'
  });
  
  const workflowEngine = new WorkflowEngine(contextManager);
  const agentOrchestrator = new AgentOrchestrator(
    contextManager,
    workflowEngine,
    { type: 'capability_based' }
  );
  
  const analyticsEngine = new AnalyticsEngine(
    contextManager,
    workflowEngine,
    agentOrchestrator,
    {
      flushIntervalMs: 5000,
      retentionDays: 30,
      enableAutoMetrics: true
    }
  );
  
  console.log('✅ Analytics Engine initialized with auto-metrics\n');
  
  // Test 1: Record custom metrics
  console.log('📈 Test 1: Recording custom metrics');
  
  analyticsEngine.recordMetric({
    name: 'api.latency',
    type: 'histogram',
    value: 125,
    labels: { endpoint: '/api/generate', method: 'POST' },
    unit: 'milliseconds'
  });
  
  analyticsEngine.recordMetric({
    name: 'tokens.used',
    type: 'counter',
    value: 1500,
    labels: { model: 'claude-3-opus', operation: 'analysis' }
  });
  
  analyticsEngine.recordMetric({
    name: 'memory.usage',
    type: 'gauge',
    value: 75.5,
    labels: { component: 'context_manager' },
    unit: 'percent'
  });
  
  console.log('   ✅ Metrics recorded\n');
  
  // Test 2: Record events
  console.log('📝 Test 2: Recording operational events');
  
  analyticsEngine.recordEvent({
    type: 'deployment',
    severity: 'info',
    source: 'ci/cd',
    message: 'Deployed version 1.4.0 to production',
    metadata: { version: '1.4.0', environment: 'production' }
  });
  
  analyticsEngine.recordEvent({
    type: 'error',
    severity: 'error',
    source: 'agent_orchestrator',
    message: 'Agent timeout during task execution',
    metadata: { agent_id: 'gpt-4-turbo', task_id: 'task-123' }
  });
  
  console.log('   ✅ Events recorded\n');
  
  // Test 3: Distributed tracing
  console.log('🔍 Test 3: Distributed tracing');
  
  const mainTrace = analyticsEngine.startTrace({
    operation: 'workflow.execute',
    service: 'workflow_engine',
    attributes: { workflow_id: 'wf-001', type: 'feature_development' }
  });
  
  // Simulate nested trace
  const subTrace = analyticsEngine.startTrace({
    operation: 'task.assign',
    service: 'orchestrator',
    parent_id: mainTrace.id,
    attributes: { task_id: 'task-001' }
  });
  
  // Simulate some work
  await new Promise(resolve => setTimeout(resolve, 100));
  
  analyticsEngine.endTrace(subTrace.id, 'completed');
  analyticsEngine.endTrace(mainTrace.id, 'completed');
  
  console.log(`   ✅ Traces completed: ${mainTrace.id.slice(0, 8)}...\n`);
  
  // Test 4: Query metrics
  console.log('🔎 Test 4: Querying metrics');
  
  const latencyMetrics = analyticsEngine.queryMetrics({
    metrics: ['api.latency'],
    time_range: {
      start: new Date(Date.now() - 3600000),
      end: new Date()
    }
  });
  
  console.log(`   Found ${latencyMetrics.length} latency metrics`);
  
  const aggregatedTokens = analyticsEngine.queryMetrics({
    metrics: ['tokens.used'],
    aggregation: 'sum',
    group_by: ['model']
  });
  
  console.log(`   Token usage aggregated: ${aggregatedTokens[0]?.value || 0} tokens\n`);
  
  // Test 5: Get dashboard data
  console.log('📊 Test 5: Dashboard data');
  
  const dashboards = analyticsEngine.getDashboards();
  console.log(`   Available dashboards: ${dashboards.length}`);
  
  if (dashboards.length > 0) {
    const dashboardData = analyticsEngine.getDashboardData(dashboards[0].id);
    if (dashboardData) {
      console.log(`   Dashboard: ${dashboardData.dashboard.name}`);
      console.log(`   Widgets: ${dashboardData.dashboard.widgets.length}`);
      console.log(`   Data points collected: ${dashboardData.data.size} widget datasets`);
    }
  }
  console.log('');
  
  // Test 6: Generate report
  console.log('📄 Test 6: Generating performance report');
  
  const report = await analyticsEngine.generateReport({
    type: 'performance',
    period: {
      start: new Date(Date.now() - 86400000), // 24 hours ago
      end: new Date()
    },
    format: 'json'
  });
  
  console.log(`   Report generated: ${report.name}`);
  console.log(`   Sections: ${report.sections.length}`);
  report.sections.forEach(section => {
    console.log(`   - ${section.title} (${section.type})`);
  });
  console.log('');
  
  // Test 7: Create alert
  console.log('🚨 Test 7: Creating monitoring alert');
  
  const alert = analyticsEngine.createAlert({
    name: 'High Error Rate',
    condition: {
      metric: 'tasks.failed',
      operator: '>',
      threshold: 10,
      duration: 60,
      aggregation: 'sum'
    },
    severity: 'high',
    enabled: true,
    notifications: [
      { type: 'log', config: {} }
    ],
    cooldown: 300
  });
  
  console.log(`   Alert created: ${alert.name}`);
  console.log(`   Condition: ${alert.condition.metric} ${alert.condition.operator} ${alert.condition.threshold}`);
  console.log(`   Severity: ${alert.severity}\n`);
  
  // Test 8: Simulate workflow with automatic metrics
  console.log('🔄 Test 8: Automatic metrics from workflow');
  
  const workflow = await workflowEngine.createWorkflow({
    projectId: 'analytics-test',
    templateId: 'feature-development',
    name: 'Test Feature',
    description: 'Testing automatic metrics collection'
  });
  
  await workflowEngine.transition(workflow.id, 'start');
  console.log('   Workflow started - metrics auto-collected');
  
  // Simulate task assignment
  const task = await agentOrchestrator.assignTask({
    taskId: 'test-task-001',
    description: 'Test task for metrics',
    priority: 'medium'
  });
  
  console.log('   Task assigned - metrics auto-collected\n');
  
  // Test 9: System health check
  console.log('💚 Test 9: System health status');
  
  const recentEvents = analyticsEngine.getRecentEvents(5);
  console.log(`   Recent events: ${recentEvents.length}`);
  recentEvents.forEach(event => {
    console.log(`   - [${event.severity}] ${event.type}: ${event.message.slice(0, 50)}...`);
  });
  console.log('');
  
  // Test 10: Export metrics
  console.log('📤 Test 10: Exporting metrics');
  
  const prometheusExport = analyticsEngine.exportMetrics('prometheus');
  console.log(`   Prometheus format: ${prometheusExport.split('\n').length} lines`);
  
  const jsonExport = analyticsEngine.exportMetrics('json');
  const metrics = JSON.parse(jsonExport);
  console.log(`   JSON format: ${metrics.length} metrics exported`);
  
  const csvExport = analyticsEngine.exportMetrics('csv');
  console.log(`   CSV format: ${csvExport.split('\n').length} rows\n`);
  
  // Summary
  console.log('📊 Analytics Summary:');
  const allMetrics = analyticsEngine.queryMetrics({
    metrics: ['api.latency', 'tokens.used', 'memory.usage', 'tasks.assigned', 'workflows.created'],
    time_range: {
      start: new Date(Date.now() - 3600000),
      end: new Date()
    }
  });
  
  console.log(`   Total metrics collected: ${allMetrics.length}`);
  console.log(`   Dashboards available: ${dashboards.length}`);
  console.log(`   Alerts configured: ${analyticsEngine.getAlerts().length}`);
  console.log(`   Recent events: ${recentEvents.length}`);
  
  // Cleanup test
  console.log('\n🧹 Test 11: Data cleanup');
  const cleaned = analyticsEngine.cleanupOldData();
  console.log(`   Cleaned ${cleaned} old data items`);
  
  console.log('\n✨ Analytics & Observability test complete!');
  console.log('💡 Full visibility into AI agent operations achieved!');
}

// Run the test
testAnalyticsSystem().catch(console.error);