# MCP Registry Submission Template

## Server Information

**Name:** handoff-mcp  
**Category:** Development Tools  
**Description:** Strategic-to-tactical workflow orchestration for AI-assisted development  
**Author:** coladapo  
**Repository:** https://github.com/coladapo/handoff-mcp  
**npm Package:** handoff-mcp  

## Installation

```bash
npm install -g handoff-mcp
```

## Configuration

```json
{
  "mcpServers": {
    "handoff": {
      "command": "npx",
      "args": ["handoff-mcp"]
    }
  }
}
```

## Features

- Project management with tags and metadata
- Strategic-to-tactical handoff system
- Intelligent scaffolding with templates
- NLP-powered requirement analysis
- SQLite local storage
- Progress tracking and analytics

## Tools Provided

### Project Management
- `create_project` - Create a new project
- `list_projects` - List all projects
- `get_project` - Get project details
- `archive_project` - Archive a project
- `get_project_stats` - Get project statistics

### Handoff Management
- `create_handoff` - Create a handoff
- `get_handoff` - Get handoff details
- `list_handoffs` - List handoffs
- `update_handoff_status` - Update status
- `verify_handoff` - Verify completion
- `generate_implementation_brief` - Generate implementation plan

### Scaffolding
- `list_templates` - List available templates
- `preview_scaffold` - Preview generated files
- `generate_scaffold` - Generate project structure

## Use Cases

1. **AI Development Workflows** - Manage complex multi-step development tasks
2. **Project Scaffolding** - Quickly bootstrap new projects with templates
3. **Task Tracking** - Track implementation progress and completion
4. **Team Handoffs** - Clear communication between planning and implementation

## Requirements

- Node.js 18+
- npm or yarn

## License

MIT

## Support

- Issues: https://github.com/coladapo/handoff-mcp/issues
- Documentation: https://github.com/coladapo/handoff-mcp/wiki

---

## PR Checklist for MCP Registry

- [x] Server implements MCP protocol correctly
- [x] Clear installation instructions provided
- [x] All tools documented with descriptions
- [x] Configuration example included
- [x] Repository is public and accessible
- [x] License specified (MIT)
- [x] npm package published
- [x] Tests included and passing
- [x] No hardcoded credentials or secrets
- [x] Error handling implemented