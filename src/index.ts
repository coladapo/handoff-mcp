#!/usr/bin/env node

/**
 * Handoff MCP Server - Strategic/Tactical Workflow Orchestration
 * 
 * Client-agnostic tools for managing handoffs in AI-assisted development
 * Supports any development environment: VS Code, Cursor, Zed, Windsurf, etc.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { HandoffStorage } from './storage.js';
import { ScaffoldingEngine } from './scaffolding/ScaffoldingEngine.js';
import { 
  HandoffRequest, 
  HandoffStatus, 
  HandoffValidation,
  ProjectInfo,
  VerificationResult,
  Project,
  ProjectFilter,
  ProjectStats,
  ImplementationBrief
} from './types.js';

class HandoffMCP {
  private server: Server;
  private storage: HandoffStorage;
  private scaffolding: ScaffoldingEngine;

  constructor() {
    this.server = new Server(
      {
        name: 'handoff-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.storage = new HandoffStorage();
    this.scaffolding = new ScaffoldingEngine();
    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          // Project Management Tools
          {
            name: 'create_project',
            description: '🏗️ Create a new project for organizing handoffs',
            inputSchema: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Project name'
                },
                description: {
                  type: 'string',
                  description: 'Project description'
                },
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Tags for categorization'
                },
                default_project_info: {
                  type: 'object',
                  properties: {
                    path: { type: 'string' },
                    language: { type: 'string' },
                    framework: { type: 'string' },
                    dependencies: { type: 'array', items: { type: 'string' } },
                    build_command: { type: 'string' },
                    test_command: { type: 'string' },
                    dev_command: { type: 'string' }
                  },
                  description: 'Default project context for handoffs'
                }
              },
              required: ['name', 'description']
            }
          },
          {
            name: 'list_projects',
            description: '📂 List all projects',
            inputSchema: {
              type: 'object',
              properties: {
                include_archived: {
                  type: 'boolean',
                  description: 'Include archived projects',
                  default: false
                },
                search: {
                  type: 'string',
                  description: 'Search by name or description'
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of results',
                  default: 20
                }
              }
            }
          },
          {
            name: 'get_project',
            description: '📁 Get project details',
            inputSchema: {
              type: 'object',
              properties: {
                project_id: {
                  type: 'string',
                  description: 'Project ID'
                }
              },
              required: ['project_id']
            }
          },
          {
            name: 'archive_project',
            description: '📦 Archive a project',
            inputSchema: {
              type: 'object',
              properties: {
                project_id: {
                  type: 'string',
                  description: 'Project ID to archive'
                }
              },
              required: ['project_id']
            }
          },
          {
            name: 'get_project_stats',
            description: '📊 Get project statistics and analytics',
            inputSchema: {
              type: 'object',
              properties: {
                project_id: {
                  type: 'string',
                  description: 'Project ID'
                }
              },
              required: ['project_id']
            }
          },
          // Handoff Management Tools
          {
            name: 'create_handoff',
            description: '📋 Create a strategic-to-tactical handoff for implementation',
            inputSchema: {
              type: 'object',
              properties: {
                project_id: {
                  type: 'string',
                  description: 'Project ID this handoff belongs to'
                },
                title: {
                  type: 'string',
                  description: 'Brief title for the handoff'
                },
                strategic_context: {
                  type: 'string',
                  description: 'High-level strategic context and goals'
                },
                tactical_requirements: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Specific technical requirements for implementation'
                },
                project_info: {
                  type: 'object',
                  properties: {
                    path: { type: 'string' },
                    language: { type: 'string' },
                    framework: { type: 'string' },
                    dependencies: { type: 'array', items: { type: 'string' } }
                  },
                  description: 'Implementation context (language, framework, etc.)'
                },
                acceptance_criteria: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Clear criteria for completion'
                },
                priority: {
                  type: 'string',
                  enum: ['low', 'medium', 'high', 'urgent'],
                  description: 'Priority level',
                  default: 'medium'
                }
              },
              required: ['project_id', 'title', 'strategic_context', 'tactical_requirements']
            }
          },
          {
            name: 'get_handoff',
            description: '📖 Retrieve a handoff by ID or get the latest handoff if no ID provided',
            inputSchema: {
              type: 'object',
              properties: {
                handoff_id: {
                  type: 'string',
                  description: 'ID of the handoff to retrieve (optional - returns latest if not provided)'
                },
                status: {
                  type: 'string',
                  enum: ['pending', 'in_progress', 'completed', 'failed'],
                  description: 'Filter latest by status (only used when handoff_id is not provided)'
                },
                priority: {
                  type: 'string',
                  enum: ['low', 'medium', 'high', 'urgent'],
                  description: 'Filter latest by priority (only used when handoff_id is not provided)'
                }
              },
              required: []
            }
          },
          {
            name: 'list_handoffs',
            description: '📋 List handoffs with optional filtering',
            inputSchema: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  enum: ['pending', 'in_progress', 'completed', 'failed'],
                  description: 'Filter by status'
                },
                priority: {
                  type: 'string',
                  enum: ['low', 'medium', 'high', 'urgent'],
                  description: 'Filter by priority'
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of results',
                  default: 10
                }
              }
            }
          },
          {
            name: 'update_handoff_status',
            description: '🔄 Update the status of a handoff',
            inputSchema: {
              type: 'object',
              properties: {
                handoff_id: {
                  type: 'string',
                  description: 'ID of the handoff to update'
                },
                status: {
                  type: 'string',
                  enum: ['pending', 'in_progress', 'completed', 'failed'],
                  description: 'New status'
                },
                notes: {
                  type: 'string',
                  description: 'Optional notes about the status change'
                },
                completion_artifacts: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Paths to completed files/artifacts (for completed status)'
                }
              },
              required: ['handoff_id', 'status']
            }
          },
          {
            name: 'validate_handoff',
            description: '✅ Validate that a handoff has all required information',
            inputSchema: {
              type: 'object',
              properties: {
                handoff_id: {
                  type: 'string',
                  description: 'ID of the handoff to validate'
                }
              },
              required: ['handoff_id']
            }
          },
          {
            name: 'generate_implementation_brief',
            description: '📝 Generate a focused implementation brief for developers',
            inputSchema: {
              type: 'object',
              properties: {
                handoff_id: {
                  type: 'string',
                  description: 'ID of the handoff to generate brief for'
                },
                include_context: {
                  type: 'boolean',
                  description: 'Include strategic context in the brief',
                  default: true
                }
              },
              required: ['handoff_id']
            }
          },
          // Code Scaffolding Tools
          {
            name: 'generate_scaffold',
            description: '🏗️ Generate a complete project scaffold from a handoff',
            inputSchema: {
              type: 'object',
              properties: {
                handoff_id: {
                  type: 'string',
                  description: 'ID of the handoff to scaffold from'
                },
                template_name: {
                  type: 'string',
                  description: 'Name of the template to use (mcp-server, fastapi, react, express)'
                },
                project_name: {
                  type: 'string',
                  description: 'Name for the generated project'
                },
                target_path: {
                  type: 'string',
                  description: 'Target directory path for the project'
                },
                variables: {
                  type: 'object',
                  description: 'Additional template variables'
                }
              },
              required: ['handoff_id', 'template_name', 'project_name', 'target_path']
            }
          },
          {
            name: 'preview_scaffold',
            description: '👁️ Preview what files would be generated for a scaffold',
            inputSchema: {
              type: 'object',
              properties: {
                handoff_id: {
                  type: 'string',
                  description: 'ID of the handoff to scaffold from'
                },
                template_name: {
                  type: 'string',
                  description: 'Name of the template to use'
                },
                project_name: {
                  type: 'string',
                  description: 'Name for the generated project'
                },
                variables: {
                  type: 'object',
                  description: 'Additional template variables'
                }
              },
              required: ['handoff_id', 'template_name', 'project_name']
            }
          },
          {
            name: 'list_templates',
            description: '📋 List available scaffolding templates',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          }
        ] as Tool[]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          // Project Management
          case 'create_project':
            return await this.createProject(args);
          case 'list_projects':
            return await this.listProjects(args);
          case 'get_project':
            return await this.getProject(args);
          case 'archive_project':
            return await this.archiveProject(args);
          case 'get_project_stats':
            return await this.getProjectStats(args);
          // Handoff Management
          case 'create_handoff':
            return await this.createHandoff(args);
          case 'get_handoff':
            return await this.getHandoff(args);
          case 'list_handoffs':
            return await this.listHandoffs(args);
          case 'update_handoff_status':
            return await this.updateHandoffStatus(args);
          case 'validate_handoff':
            return await this.validateHandoff(args);
          case 'generate_implementation_brief':
            return await this.generateImplementationBrief(args);
          // Code Scaffolding
          case 'generate_scaffold':
            return await this.generateScaffold(args);
          case 'preview_scaffold':
            return await this.previewScaffold(args);
          case 'list_templates':
            return await this.listTemplates(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    });
  }

  private async createHandoff(args: any) {
    // Verify project exists
    const project = await this.storage.getProject(args.project_id);
    if (!project) {
      throw new Error(`Project not found: ${args.project_id}`);
    }

    const handoff: HandoffRequest = {
      id: this.generateId(),
      project_id: args.project_id,
      title: args.title,
      strategic_context: args.strategic_context,
      tactical_requirements: args.tactical_requirements,
      project_info: args.project_info || project.default_project_info || {},
      acceptance_criteria: args.acceptance_criteria || [],
      priority: args.priority || 'medium',
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await this.storage.saveHandoff(handoff);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            handoff_id: handoff.id,
            message: `Handoff created: ${handoff.title}`,
            handoff
          }, null, 2)
        }
      ]
    };
  }

  private async getHandoff(args: any) {
    let handoff: HandoffRequest | null;
    
    if (args.handoff_id) {
      // Backward compatibility: if handoff_id is provided, use it
      handoff = await this.storage.getHandoff(args.handoff_id);
      
      if (!handoff) {
        throw new Error(`Handoff not found: ${args.handoff_id}`);
      }
    } else {
      // New functionality: get latest handoff with optional filters
      const filter = {
        status: args.status,
        priority: args.priority
      };
      
      handoff = await this.storage.getLatestHandoff(filter);
      
      if (!handoff) {
        const filterMsg = filter.status || filter.priority 
          ? ` with filters: ${JSON.stringify(filter)}` 
          : '';
        throw new Error(`No handoffs found${filterMsg}`);
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(handoff, null, 2)
        }
      ]
    };
  }

  private async listHandoffs(args: any) {
    const handoffs = await this.storage.listHandoffs({
      status: args.status,
      priority: args.priority,
      limit: args.limit || 10
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            count: handoffs.length,
            handoffs
          }, null, 2)
        }
      ]
    };
  }

  private async updateHandoffStatus(args: any) {
    const handoff = await this.storage.getHandoff(args.handoff_id);
    
    if (!handoff) {
      throw new Error(`Handoff not found: ${args.handoff_id}`);
    }

    handoff.status = args.status;
    handoff.updated_at = new Date().toISOString();
    
    if (args.notes) {
      handoff.notes = (handoff.notes || []);
      handoff.notes.push({
        timestamp: new Date().toISOString(),
        content: args.notes
      });
    }

    if (args.completion_artifacts) {
      handoff.completion_artifacts = args.completion_artifacts;
    }

    await this.storage.saveHandoff(handoff);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: `Handoff status updated to: ${args.status}`,
            handoff
          }, null, 2)
        }
      ]
    };
  }

  private async validateHandoff(args: any) {
    const handoff = await this.storage.getHandoff(args.handoff_id);
    
    if (!handoff) {
      throw new Error(`Handoff not found: ${args.handoff_id}`);
    }

    const validation: HandoffValidation = {
      is_valid: true,
      issues: [],
      score: 100
    };

    // Check required fields
    if (!handoff.title || handoff.title.trim().length === 0) {
      validation.issues.push('Missing or empty title');
      validation.score -= 20;
    }

    if (!handoff.strategic_context || handoff.strategic_context.trim().length < 50) {
      validation.issues.push('Strategic context too brief (should be at least 50 characters)');
      validation.score -= 25;
    }

    if (!handoff.tactical_requirements || handoff.tactical_requirements.length === 0) {
      validation.issues.push('No tactical requirements specified');
      validation.score -= 30;
    }

    if (!handoff.acceptance_criteria || handoff.acceptance_criteria.length === 0) {
      validation.issues.push('No acceptance criteria specified');
      validation.score -= 15;
    }

    // Check project info completeness
    if (!handoff.project_info || Object.keys(handoff.project_info).length === 0) {
      validation.issues.push('Missing project information');
      validation.score -= 10;
    }

    validation.is_valid = validation.issues.length === 0;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            handoff_id: args.handoff_id,
            validation
          }, null, 2)
        }
      ]
    };
  }

  private async generateImplementationBrief(args: any) {
    const handoff = await this.storage.getHandoff(args.handoff_id);
    
    if (!handoff) {
      throw new Error(`Handoff not found: ${args.handoff_id}`);
    }

    // Get project details
    const project = await this.storage.getProject(handoff.project_id);
    if (!project) {
      throw new Error(`Project not found: ${handoff.project_id}`);
    }

    const includeContext = args.include_context !== false;
    
    const brief: ImplementationBrief = {
      handoff_id: handoff.id,
      project_id: handoff.project_id,
      project_name: project.name,
      title: handoff.title,
      priority: handoff.priority,
      project_context: handoff.project_info,
      ...(includeContext && { strategic_context: handoff.strategic_context }),
      implementation_tasks: handoff.tactical_requirements,
      acceptance_criteria: handoff.acceptance_criteria,
      status: handoff.status,
      created: handoff.created_at,
      last_updated: handoff.updated_at
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            handoff_id: args.handoff_id,
            project: {
              id: project.id,
              name: project.name,
              description: project.description
            },
            brief
          }, null, 2)
        }
      ]
    };
  }

  // Project Management Methods

  private async createProject(args: any) {
    const project: Project = {
      id: `project_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      name: args.name,
      description: args.description,
      tags: args.tags || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      archived: false,
      default_project_info: args.default_project_info
    };

    await this.storage.saveProject(project);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            project_id: project.id,
            message: `Project created: ${project.name}`,
            project
          }, null, 2)
        }
      ]
    };
  }

  private async listProjects(args: any) {
    const filter: ProjectFilter = {
      include_archived: args.include_archived || false,
      search: args.search,
      limit: args.limit || 20
    };

    const projects = await this.storage.listProjects(filter);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            count: projects.length,
            projects
          }, null, 2)
        }
      ]
    };
  }

  private async getProject(args: any) {
    const project = await this.storage.getProject(args.project_id);
    
    if (!project) {
      throw new Error(`Project not found: ${args.project_id}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(project, null, 2)
        }
      ]
    };
  }

  private async archiveProject(args: any) {
    const success = await this.storage.archiveProject(args.project_id);
    
    if (!success) {
      throw new Error(`Failed to archive project: ${args.project_id}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: `Project archived: ${args.project_id}`
          }, null, 2)
        }
      ]
    };
  }

  private async getProjectStats(args: any) {
    const stats = await this.storage.getProjectStats(args.project_id);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            project_id: args.project_id,
            stats
          }, null, 2)
        }
      ]
    };
  }

  private generateId(): string {
    return `handoff_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  // Code Scaffolding Methods

  private async generateScaffold(args: any) {
    const handoff = await this.storage.getHandoff(args.handoff_id);
    
    if (!handoff) {
      throw new Error(`Handoff not found: ${args.handoff_id}`);
    }

    const result = await this.scaffolding.generateScaffold({
      projectName: args.project_name,
      targetPath: args.target_path,
      templateName: args.template_name,
      variables: args.variables || {},
      requirements: handoff.tactical_requirements
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            handoff_id: args.handoff_id,
            scaffold_result: result,
            message: result.success 
              ? `Scaffold generated successfully in ${result.duration}ms`
              : 'Scaffold generation failed'
          }, null, 2)
        }
      ]
    };
  }

  private async previewScaffold(args: any) {
    const handoff = await this.storage.getHandoff(args.handoff_id);
    
    if (!handoff) {
      throw new Error(`Handoff not found: ${args.handoff_id}`);
    }

    const preview = await this.scaffolding.previewScaffold({
      projectName: args.project_name,
      templateName: args.template_name,
      variables: args.variables || {},
      requirements: handoff.tactical_requirements
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            handoff_id: args.handoff_id,
            preview,
            summary: {
              file_count: preview.files.length,
              total_size: `${Math.round(preview.totalSize / 1024)}KB`,
              estimated_time: `${preview.estimatedTime}ms`
            }
          }, null, 2)
        }
      ]
    };
  }

  private async listTemplates(args: any) {
    const templates = await this.scaffolding.listTemplates();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            templates,
            count: templates.length
          }, null, 2)
        }
      ]
    };
  }

  async run() {
    await this.storage.initialize();
    
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.error('🚀 Handoff MCP Server started');
    console.error('🏗️  Project tools: create_project, list_projects, get_project, archive_project, get_project_stats');
    console.error('📋 Handoff tools: create_handoff, get_handoff, list_handoffs, update_handoff_status, validate_handoff, generate_implementation_brief');
    console.error('🔨 Scaffolding tools: generate_scaffold, preview_scaffold, list_templates');
  }
}

const server = new HandoffMCP();
server.run().catch(console.error);