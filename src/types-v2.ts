/**
 * Handoff MCP v2 - Project Management System for AI-Assisted Development
 * 
 * Core philosophy: AI agents need the same PM structure as human developers
 * This is a full Agile/Scrum/Kanban implementation for AI workflows
 */

// ============================================================================
// CORE PM ENTITIES
// ============================================================================

export type TeamMember = {
  id: string;
  name: string;
  type: 'human' | 'ai_agent';
  role: 'product_owner' | 'scrum_master' | 'developer' | 'qa' | 'designer';
  capabilities?: string[];
  availability?: 'available' | 'busy' | 'offline';
};

export type Sprint = {
  id: string;
  project_id: string;
  sprint_number: number;
  name: string;
  goal: string;
  start_date: string;
  end_date: string;
  status: 'planning' | 'active' | 'review' | 'retrospective' | 'completed';
  velocity_target: number;
  velocity_actual?: number;
  team_members: TeamMember[];
  created_at: string;
  updated_at: string;
};

export type Epic = {
  id: string;
  project_id: string;
  title: string;
  description: string;
  business_value: string;
  acceptance_criteria: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'backlog' | 'in_progress' | 'completed' | 'cancelled';
  estimated_story_points?: number;
  actual_story_points?: number;
  target_sprint?: string;
  created_at: string;
  updated_at: string;
};

export type Story = {
  id: string;
  epic_id?: string;
  sprint_id?: string;
  title: string;
  user_story: string; // "As a... I want... So that..."
  acceptance_criteria: string[];
  story_points: number;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  status: 'backlog' | 'ready' | 'in_progress' | 'in_review' | 'done' | 'blocked';
  assigned_to?: string; // TeamMember ID
  blocked_by?: string[]; // Story IDs
  dependencies?: string[]; // Story IDs
  tags: string[];
  created_at: string;
  updated_at: string;
  completed_at?: string;
};

export type Task = {
  id: string;
  story_id: string;
  title: string;
  description: string;
  technical_details?: string;
  estimated_hours: number;
  actual_hours?: number;
  status: 'todo' | 'in_progress' | 'in_review' | 'done' | 'blocked';
  assigned_to?: string; // TeamMember ID
  task_type: 'feature' | 'bug' | 'tech_debt' | 'research' | 'documentation';
  verification_steps?: string[];
  artifacts?: string[]; // Files, commits, PRs
  created_at: string;
  updated_at: string;
  completed_at?: string;
};

// ============================================================================
// WORKFLOW MANAGEMENT
// ============================================================================

export type KanbanColumn = {
  id: string;
  name: string;
  wip_limit?: number; // Work in Progress limit
  color?: string;
  order: number;
};

export type Workflow = {
  id: string;
  name: string;
  type: 'scrum' | 'kanban' | 'custom';
  columns: KanbanColumn[];
  transitions: WorkflowTransition[];
};

export type WorkflowTransition = {
  from_status: string;
  to_status: string;
  allowed_roles: string[];
  requires_verification?: boolean;
  auto_assign?: boolean;
};

// ============================================================================
// PROGRESS TRACKING
// ============================================================================

export type Velocity = {
  sprint_id: string;
  planned_points: number;
  completed_points: number;
  carried_over_points: number;
  added_points: number;
  team_capacity: number; // Total available hours
  focus_factor: number; // Percentage of time on planned work
};

export type Burndown = {
  sprint_id: string;
  date: string;
  ideal_points_remaining: number;
  actual_points_remaining: number;
  tasks_remaining: number;
  blockers_count: number;
};

export type CycleTime = {
  story_id: string;
  created_to_started: number; // hours
  started_to_review: number;
  review_to_done: number;
  total_cycle_time: number;
};

// ============================================================================
// COLLABORATION
// ============================================================================

export type Comment = {
  id: string;
  entity_type: 'epic' | 'story' | 'task';
  entity_id: string;
  author_id: string;
  content: string;
  mentions?: string[]; // TeamMember IDs
  attachments?: string[];
  created_at: string;
  edited_at?: string;
};

export type Review = {
  id: string;
  task_id: string;
  reviewer_id: string;
  status: 'pending' | 'approved' | 'needs_changes' | 'rejected';
  comments: string;
  checklist?: ReviewChecklistItem[];
  created_at: string;
  completed_at?: string;
};

export type ReviewChecklistItem = {
  item: string;
  checked: boolean;
  notes?: string;
};

// ============================================================================
// PLANNING & ESTIMATION
// ============================================================================

export type PlanningPoker = {
  session_id: string;
  story_id: string;
  participants: string[]; // TeamMember IDs
  estimates: Record<string, number>; // TeamMember ID -> points
  final_estimate?: number;
  consensus_reached: boolean;
  notes?: string;
};

export type Milestone = {
  id: string;
  project_id: string;
  name: string;
  description: string;
  target_date: string;
  status: 'on_track' | 'at_risk' | 'delayed' | 'completed';
  deliverables: string[];
  success_criteria: string[];
  dependencies?: string[]; // Other milestone IDs
};

// ============================================================================
// REPORTING
// ============================================================================

export type ProjectHealth = {
  project_id: string;
  sprint_id?: string;
  date: string;
  velocity_trend: 'improving' | 'stable' | 'declining';
  sprint_health: 'green' | 'yellow' | 'red';
  blockers_count: number;
  tech_debt_ratio: number;
  test_coverage?: number;
  team_morale?: 'high' | 'medium' | 'low';
  risks: Risk[];
};

export type Risk = {
  id: string;
  description: string;
  probability: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  mitigation: string;
  owner_id: string;
  status: 'identified' | 'mitigating' | 'resolved';
};

export type DailyStandup = {
  id: string;
  sprint_id: string;
  date: string;
  attendees: string[]; // TeamMember IDs
  updates: StandupUpdate[];
  blockers: string[];
  action_items: string[];
};

export type StandupUpdate = {
  member_id: string;
  yesterday: string[];
  today: string[];
  blockers: string[];
};

// ============================================================================
// AI-SPECIFIC FEATURES
// ============================================================================

export type AIContext = {
  id: string;
  story_id: string;
  system_prompt?: string;
  relevant_files: string[];
  code_examples: string[];
  constraints: string[];
  test_requirements: string[];
  performance_criteria?: Record<string, any>;
  security_requirements?: string[];
};

export type AIHandoff = {
  id: string;
  from_member: string; // Human PM
  to_member: string; // AI Agent
  story_id: string;
  context: AIContext;
  expected_deliverables: string[];
  success_metrics: Record<string, any>;
  deadline?: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'failed';
  created_at: string;
  accepted_at?: string;
  completed_at?: string;
};

export type AIPerformance = {
  agent_id: string;
  sprint_id: string;
  stories_completed: number;
  story_points_delivered: number;
  average_cycle_time: number;
  rework_rate: number; // Percentage of tasks that needed revision
  accuracy_score: number; // 0-100
  context_retention: number; // How well the AI maintains context
};

// ============================================================================
// INTEGRATION POINTS
// ============================================================================

export type Integration = {
  type: 'github' | 'jira' | 'slack' | 'linear' | 'notion';
  config: Record<string, any>;
  sync_direction: 'import' | 'export' | 'bidirectional';
  sync_frequency?: 'realtime' | 'hourly' | 'daily';
  field_mappings: Record<string, string>;
};

export type Notification = {
  id: string;
  recipient_id: string;
  type: 'mention' | 'assignment' | 'status_change' | 'blocker' | 'review_request';
  entity_type: string;
  entity_id: string;
  message: string;
  read: boolean;
  created_at: string;
};

// ============================================================================
// TEMPLATES & AUTOMATION
// ============================================================================

export type ProjectTemplate = {
  id: string;
  name: string;
  description: string;
  default_workflow: Workflow;
  default_sprints: Partial<Sprint>[];
  default_epics: Partial<Epic>[];
  team_structure: TeamMember[];
  automation_rules: AutomationRule[];
};

export type AutomationRule = {
  id: string;
  name: string;
  trigger: {
    event: string;
    conditions: Record<string, any>;
  };
  actions: {
    type: string;
    params: Record<string, any>;
  }[];
  enabled: boolean;
};