#!/usr/bin/env node

/**
 * Test Workflow Engine
 * Demonstrates state machine-based workflow orchestration for AI agents
 */

import { WorkflowEngine } from '../src/workflow/WorkflowEngine.js';
import { ContextManager } from '../src/context/ContextManager.js';

async function testWorkflowOrchestration() {
  console.log('🚀 Testing Handoff MCP Workflow Engine\n');
  
  // Initialize managers
  const contextManager = new ContextManager({
    localStoragePath: './test-workflow-data'
  });
  
  const workflowEngine = new WorkflowEngine(contextManager);
  
  // Create a feature development workflow
  console.log('📋 Creating Feature Development Workflow...');
  const workflow = await workflowEngine.createWorkflow({
    projectId: 'auth-module',
    templateId: 'feature-development',
    name: 'Implement OAuth2 Integration',
    description: 'Add OAuth2 authentication support with Google and GitHub providers',
    priority: 'high'
  });
  
  console.log(`✅ Workflow created: ${workflow.id}`);
  console.log(`   - State: ${workflow.state}`);
  console.log(`   - Steps: ${workflow.steps.length}`);
  console.log(`   - Priority: ${workflow.metadata.priority}\n`);
  
  // Start the workflow
  console.log('▶️ Starting workflow...');
  await workflowEngine.transition(workflow.id, 'start');
  
  // Get workflow status
  const status = workflowEngine.getWorkflowStatus(workflow.id);
  console.log('📊 Workflow Status:');
  console.log(`   - State: ${status.workflow.state}`);
  console.log(`   - Ready steps: ${status.readySteps.length}`);
  console.log(`   - Blocked steps: ${status.blockedSteps.length}`);
  console.log(`   - Completed steps: ${status.completedSteps.length}\n`);
  
  // Show ready steps
  console.log('🎯 Steps ready for execution:');
  status.readySteps.forEach(step => {
    console.log(`   - ${step.name} (${step.type})`);
  });
  console.log('');
  
  // Simulate AI agent executing first step
  const firstStep = status.readySteps[0];
  if (firstStep) {
    console.log(`🤖 AI Agent executing: ${firstStep.name}`);
    
    // Start a context session for this step
    const session = await contextManager.startSession({
      projectId: 'auth-module',
      agentType: 'claude',
      agentId: 'claude-oauth'
    });
    
    // Execute the step
    await workflowEngine.executeStep(workflow.id, firstStep.id, session.sessionId);
    
    // Simulate work being done
    await contextManager.addMessage(session.sessionId, {
      role: 'assistant',
      content: 'Analyzing OAuth2 requirements for Google and GitHub providers...',
      timestamp: new Date()
    });
    
    // Record a decision
    await contextManager.recordDecision(session.sessionId, {
      description: 'Use PKCE flow for OAuth2',
      rationale: 'PKCE provides better security for public clients',
      impact: 'high'
    });
    
    // Complete the step
    await workflowEngine.completeStep(
      workflow.id,
      firstStep.id,
      {
        requirements: {
          providers: ['google', 'github'],
          flow: 'PKCE',
          scopes: ['email', 'profile']
        }
      },
      [
        { type: 'document', path: 'docs/oauth-requirements.md' }
      ]
    );
    
    console.log(`✅ Step completed: ${firstStep.name}\n`);
  }
  
  // Check updated status
  const updatedStatus = workflowEngine.getWorkflowStatus(workflow.id);
  console.log('📊 Updated Workflow Metrics:');
  console.log(`   - Progress: ${updatedStatus.workflow.metrics?.progressPercentage}%`);
  console.log(`   - Steps completed: ${updatedStatus.workflow.metrics?.stepsCompleted}/${updatedStatus.workflow.metrics?.stepsTotal}`);
  console.log(`   - Ready for next: ${updatedStatus.readySteps.map(s => s.name).join(', ')}\n`);
  
  // Simulate blocking condition
  console.log('🚫 Simulating blocker...');
  await workflowEngine.transition(workflow.id, 'block');
  console.log(`   - Workflow state: ${workflow.state}`);
  
  // Resolve blocker
  console.log('🔓 Resolving blocker...');
  await workflowEngine.transition(workflow.id, 'unblock');
  console.log(`   - Workflow state: ${workflow.state}\n`);
  
  // Test parallel workflow creation
  console.log('⚡ Creating Parallel Research Workflow...');
  const parallelWorkflow = await workflowEngine.createWorkflow({
    projectId: 'auth-module',
    name: 'Security Research',
    description: 'Research security best practices',
    type: 'research',
    customSteps: [
      {
        id: 'track1-step1',
        name: 'Research OAuth2 Security',
        description: 'Research OAuth2 security best practices',
        type: 'ai_task',
        status: 'pending'
      },
      {
        id: 'track2-step1',
        name: 'Research JWT Security',
        description: 'Research JWT security best practices',
        type: 'ai_task',
        status: 'pending'
      },
      {
        id: 'merge-step',
        name: 'Compile Security Report',
        description: 'Merge research findings',
        type: 'ai_task',
        dependencies: ['Research OAuth2 Security', 'Research JWT Security'],
        status: 'pending'
      }
    ]
  });
  
  console.log(`✅ Parallel workflow created with ${parallelWorkflow.steps.length} steps`);
  
  // Get all project workflows
  console.log('\n📋 All Project Workflows:');
  const projectWorkflows = workflowEngine.getProjectWorkflows('auth-module');
  projectWorkflows.forEach(w => {
    console.log(`   - ${w.name} (${w.state}) - ${w.metrics?.progressPercentage}% complete`);
  });
  
  // Show available templates
  console.log('\n📚 Available Workflow Templates:');
  const templates = workflowEngine.getTemplates();
  templates.forEach(t => {
    console.log(`   - ${t.name}: ${t.description}`);
    console.log(`     Steps: ${t.steps.length}, Est. Duration: ${t.estimatedDuration} min`);
  });
  
  console.log('\n✨ Workflow orchestration test complete!');
  console.log('💡 AI agents can now work within structured, stateful workflows!');
}

// Run the test
testWorkflowOrchestration().catch(console.error);