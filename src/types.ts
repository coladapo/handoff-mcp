/**
 * Type definitions for Handoff MCP - Strategic/Tactical Workflow Bridge
 * Client-agnostic workflow orchestration for AI-assisted development
 */

export type HandoffStatus = 'pending' | 'in_progress' | 'completed' | 'failed';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface Project {
  id: string;
  name: string;
  description: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  archived: boolean;
  default_project_info?: ProjectInfo;
}

export interface ProjectFilter {
  include_archived?: boolean;
  tags?: string[];
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ProjectStats {
  project_id: string;
  total_handoffs: number;
  handoffs_by_status: Record<HandoffStatus, number>;
  handoffs_by_priority: Record<Priority, number>;
  avg_completion_time: number;
  success_rate: number;
  active_handoffs: number;
  last_activity: string;
}

export interface ProjectInfo {
  path?: string;
  language?: string;
  framework?: string;
  dependencies?: string[];
  build_command?: string;
  test_command?: string;
  dev_command?: string;
}

export interface HandoffNote {
  timestamp: string;
  content: string;
  author?: string;
}

export interface HandoffRequest {
  id: string;
  project_id: string;
  title: string;
  strategic_context: string;
  tactical_requirements: string[];
  project_info: ProjectInfo;
  acceptance_criteria: string[];
  priority: Priority;
  status: HandoffStatus;
  created_at: string;
  updated_at: string;
  notes?: HandoffNote[];
  completion_artifacts?: string[];
  estimated_hours?: number;
  actual_hours?: number;
}

export interface HandoffValidation {
  is_valid: boolean;
  issues: string[];
  score: number;
  recommendations?: string[];
}

export interface VerificationResult {
  handoff_id: string;
  verification_passed: boolean;
  issues_found: string[];
  artifacts_verified: string[];
  completion_score: number;
}

export interface HandoffFilter {
  project_id?: string;
  status?: HandoffStatus;
  priority?: Priority;
  limit?: number;
  offset?: number;
  created_after?: string;
  created_before?: string;
}

export interface HandoffSummary {
  total: number;
  by_status: Record<HandoffStatus, number>;
  by_priority: Record<Priority, number>;
  avg_completion_time?: number;
  success_rate?: number;
}

export interface SequentialThinkingContext {
  previous_steps: string[];
  current_step: string;
  next_steps: string[];
  decision_points: string[];
  assumptions: string[];
  risks: string[];
}

export interface ImplementationBrief {
  handoff_id: string;
  project_id: string;
  project_name: string;
  title: string;
  priority: Priority;
  project_context: ProjectInfo;
  strategic_context?: string;
  implementation_tasks: string[];
  acceptance_criteria: string[];
  sequential_thinking?: SequentialThinkingContext;
  status: HandoffStatus;
  created: string;
  last_updated: string;
}