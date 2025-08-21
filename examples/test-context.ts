#!/usr/bin/env node

/**
 * Test Context Persistence
 * Demonstrates how AI agents maintain context across sessions
 */

import { ContextManager } from '../src/context/ContextManager.js';

async function testContextPersistence() {
  console.log('🧪 Testing Handoff MCP Context Persistence\n');
  
  // Initialize context manager (will use local storage)
  const contextManager = new ContextManager({
    localStoragePath: './test-context-data'
  });
  
  // Simulate first AI session
  console.log('📝 Session 1: Claude working on authentication module');
  const session1 = await contextManager.startSession({
    projectId: 'auth-module',
    agentType: 'claude',
    agentId: 'claude-1'
  });
  
  // Add some conversation
  await contextManager.addMessage(session1.sessionId, {
    role: 'user',
    content: 'Implement JWT authentication with refresh tokens',
    timestamp: new Date()
  });
  
  await contextManager.addMessage(session1.sessionId, {
    role: 'assistant',
    content: 'I\'ll implement JWT authentication with refresh tokens. Starting with the token generation service...',
    timestamp: new Date()
  });
  
  // Record a decision
  await contextManager.recordDecision(session1.sessionId, {
    description: 'Use RS256 algorithm for JWT signing',
    rationale: 'RS256 provides better security for distributed systems as the public key can be shared',
    impact: 'high'
  });
  
  // Track artifacts created
  await contextManager.trackArtifact(session1.sessionId, {
    type: 'file',
    path: 'src/auth/jwt.service.ts',
    content: 'JWT service implementation',
    timestamp: new Date(),
    operation: 'created'
  });
  
  await contextManager.trackArtifact(session1.sessionId, {
    type: 'file',
    path: 'src/auth/refresh.service.ts',
    content: 'Refresh token service',
    timestamp: new Date(),
    operation: 'created'
  });
  
  // Update task status
  await contextManager.updateTaskContext(session1.sessionId, {
    taskId: 'auth-001',
    title: 'Implement JWT authentication',
    status: 'in_progress',
    startedAt: new Date(),
    progress: 60
  });
  
  console.log('✅ Session 1 context saved\n');
  
  // Simulate session ending and new session starting
  console.log('⏰ Simulating time passing... New session starting...\n');
  
  // Start new session - this would be a different conversation
  console.log('📝 Session 2: Resuming work on authentication module');
  const session2 = await contextManager.startSession({
    projectId: 'auth-module',
    agentType: 'claude',
    agentId: 'claude-2'
  });
  
  // Get previous context
  const previousContext = await contextManager.getContextSummary('auth-module');
  console.log('📚 Retrieved Previous Context:');
  console.log(previousContext);
  console.log('');
  
  // Search for specific information
  console.log('🔍 Searching for JWT decisions...');
  const searchResults = await contextManager.searchContext(
    'auth-module',
    'JWT algorithm',
    3
  );
  
  searchResults.forEach(result => {
    console.log(`  - ${result.content.slice(0, 100)}... (relevance: ${result.relevance.toFixed(2)})`);
  });
  console.log('');
  
  // Simulate handoff to another agent
  console.log('🤝 Creating handoff package for GPT agent...');
  
  // Add handoff note
  await contextManager.addMessage(session2.sessionId, {
    role: 'assistant',
    content: 'JWT service is 60% complete. Need to implement token refresh endpoint and add rate limiting.',
    timestamp: new Date()
  });
  
  // Update task with blocker
  await contextManager.updateTaskContext(session2.sessionId, {
    taskId: 'auth-001',
    title: 'Implement JWT authentication',
    status: 'blocked',
    startedAt: new Date(),
    progress: 60,
    blockers: ['Need to decide on rate limiting strategy', 'Refresh token storage method unclear']
  });
  
  console.log('✅ Context handoff prepared\n');
  
  // Show session summary
  console.log('📊 Session Summary:');
  console.log(`- Project: auth-module`);
  console.log(`- Sessions: 2`);
  console.log(`- Decisions made: 1`);
  console.log(`- Artifacts created: 2`);
  console.log(`- Current status: Blocked (60% complete)`);
  console.log(`- Blockers: Rate limiting strategy, Token storage method`);
  
  console.log('\n✨ Context persistence test complete!');
  console.log('💡 The next AI agent will have full context of all previous work!');
}

// Run the test
testContextPersistence().catch(console.error);