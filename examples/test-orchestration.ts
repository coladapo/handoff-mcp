#!/usr/bin/env node

/**
 * Test Multi-Agent Orchestration
 * Demonstrates intelligent coordination between multiple AI agents
 */

import { AgentOrchestrator } from '../src/orchestration/AgentOrchestrator.js';
import { ContextManager } from '../src/context/ContextManager.js';
import { WorkflowEngine } from '../src/workflow/WorkflowEngine.js';

async function testMultiAgentOrchestration() {
  console.log('🚀 Testing Handoff MCP Multi-Agent Orchestration\n');
  
  // Initialize components
  const contextManager = new ContextManager({
    localStoragePath: './test-orchestration-data'
  });
  
  const workflowEngine = new WorkflowEngine(contextManager);
  const orchestrator = new AgentOrchestrator(
    contextManager,
    workflowEngine,
    { type: 'capability_based' }
  );
  
  // Show registered agents
  console.log('🤖 Registered AI Agents:');
  const workload = orchestrator.getWorkloadSummary();
  console.log(`   Total agents: ${workload.totalAgents}`);
  console.log(`   Available: ${workload.availableAgents}`);
  workload.agentLoads.forEach(agent => {
    console.log(`   - ${agent.name}: ${agent.load}% load (${agent.tasks} tasks)`);
  });
  console.log('');
  
  // Test 1: Single task assignment
  console.log('📋 Test 1: Capability-based task assignment');
  const designTask = await orchestrator.assignTask({
    taskId: 'task-001',
    description: 'Design OAuth2 authentication architecture',
    requiredCapabilities: [
      { category: 'analysis', skill: 'system_design', proficiency: 4 }
    ],
    priority: 'high',
    estimatedDuration: 45
  });
  
  console.log(`   ✅ Assigned to: ${designTask.agentId}`);
  console.log(`   Priority: ${designTask.priority}`);
  console.log(`   Status: ${designTask.status}\n`);
  
  // Start the task
  const session = await contextManager.startSession({
    projectId: 'oauth-project',
    agentType: 'claude',
    agentId: designTask.agentId
  });
  
  await orchestrator.startTask(designTask.taskId, session.sessionId);
  
  // Simulate work
  await contextManager.addMessage(session.sessionId, {
    role: 'assistant',
    content: 'Designing OAuth2 architecture with PKCE flow...',
    timestamp: new Date()
  });
  
  // Complete task
  await orchestrator.completeTask(
    designTask.taskId,
    { architecture: 'OAuth2 with PKCE', providers: ['Google', 'GitHub'] },
    session.sessionId
  );
  
  console.log(`   ✅ Task completed\n`);
  
  // Test 2: Load balancing multiple tasks
  console.log('⚖️ Test 2: Load balancing across agents');
  
  const tasks = [
    { id: 'impl-001', desc: 'Implement JWT service', skill: 'implementation' },
    { id: 'test-001', desc: 'Write unit tests', skill: 'test_generation' },
    { id: 'doc-001', desc: 'Write API documentation', skill: 'documentation' },
    { id: 'opt-001', desc: 'Optimize performance', skill: 'performance_optimization' }
  ];
  
  for (const task of tasks) {
    const assignment = await orchestrator.assignTask({
      taskId: task.id,
      description: task.desc,
      requiredCapabilities: [
        { category: 'coding', skill: task.skill }
      ]
    });
    console.log(`   ${task.desc} -> ${assignment.agentId}`);
  }
  
  // Show updated workload
  const updatedWorkload = orchestrator.getWorkloadSummary();
  console.log(`\n   Average load: ${updatedWorkload.averageLoad}%`);
  console.log(`   Total active tasks: ${updatedWorkload.totalTasks}\n`);
  
  // Test 3: Agent collaboration
  console.log('🤝 Test 3: Agent collaboration session');
  
  const collaboration = await orchestrator.createCollaboration({
    agents: ['claude-3-opus', 'gpt-4-turbo'],
    purpose: 'Code review and optimization',
    leadAgent: 'claude-3-opus',
    sharedContext: {
      file: 'auth.service.ts',
      concerns: ['security', 'performance']
    }
  });
  
  console.log(`   Collaboration ID: ${collaboration.id}`);
  console.log(`   Participants: ${collaboration.agents.join(', ')}`);
  console.log(`   Lead: ${collaboration.leadAgent}\n`);
  
  // Send messages between agents
  await orchestrator.sendCollaborationMessage(
    collaboration.id,
    'claude-3-opus',
    'gpt-4-turbo',
    'Please review the JWT token generation logic for security issues',
    'request'
  );
  
  await orchestrator.sendCollaborationMessage(
    collaboration.id,
    'gpt-4-turbo',
    'claude-3-opus',
    'Found potential timing attack vulnerability in token comparison',
    'response'
  );
  
  console.log(`   Messages exchanged: ${collaboration.messages.length}\n`);
  
  // Test 4: Finding best agent for skill
  console.log('🎯 Test 4: Finding best agent for specific skills');
  
  const skills = ['system_design', 'debugging', 'refactoring'];
  for (const skill of skills) {
    const bestAgent = orchestrator.getBestAgentForSkill(skill);
    if (bestAgent) {
      console.log(`   Best for ${skill}: ${bestAgent.name}`);
    }
  }
  console.log('');
  
  // Test 5: Simulating agent failure and recovery
  console.log('🔧 Test 5: Agent failure handling');
  
  // Assign critical task
  const criticalTask = await orchestrator.assignTask({
    taskId: 'critical-001',
    description: 'Fix production bug',
    priority: 'critical',
    requiredCapabilities: [
      { category: 'coding', skill: 'debugging' }
    ]
  });
  
  console.log(`   Critical task assigned to: ${criticalTask.agentId}`);
  
  // Simulate agent failure
  orchestrator.updateAgentStatus(criticalTask.agentId, 'error');
  console.log(`   ❌ Agent ${criticalTask.agentId} failed`);
  console.log(`   🔄 Tasks being reassigned...\n`);
  
  // Test 6: Performance metrics
  console.log('📈 Test 6: Agent performance metrics');
  
  const agentMetrics = orchestrator.getAgentMetrics('claude-3-opus');
  if (agentMetrics) {
    console.log(`   Claude-3-Opus Performance:`);
    console.log(`   - Tasks completed: ${agentMetrics.tasksCompleted}`);
    console.log(`   - Success rate: ${agentMetrics.successRate}%`);
    console.log(`   - Avg completion time: ${agentMetrics.averageCompletionTime} min`);
    
    if (agentMetrics.specialties.size > 0) {
      console.log(`   - Specialties:`);
      agentMetrics.specialties.forEach((rate, skill) => {
        console.log(`     • ${skill}: ${rate}% success`);
      });
    }
  }
  
  console.log('\n📊 Final Orchestration Summary:');
  const finalWorkload = orchestrator.getWorkloadSummary();
  console.log(`   - Agents: ${finalWorkload.totalAgents} total, ${finalWorkload.availableAgents} available`);
  console.log(`   - Tasks: ${finalWorkload.totalTasks} active`);
  console.log(`   - Load: ${finalWorkload.averageLoad}% average`);
  
  console.log('\n✨ Multi-agent orchestration test complete!');
  console.log('💡 AI agents can now collaborate intelligently on complex tasks!');
}

// Run the test
testMultiAgentOrchestration().catch(console.error);