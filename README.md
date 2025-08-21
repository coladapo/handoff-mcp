# Handoff MCP Server

Strategic-to-tactical workflow orchestration for AI-assisted development. Bridge the gap between high-level planning and hands-on implementation.

[![MCP](https://img.shields.io/badge/MCP-1.0.0-blue)](https://modelcontextprotocol.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

Handoff MCP is a Model Context Protocol server that helps AI assistants manage complex development workflows by creating clear handoffs between strategic planning and tactical implementation. It provides project management, task tracking, and intelligent scaffolding capabilities.

### Key Features

- 🏗️ **Project Management** - Organize work into projects with tags and metadata
- 📋 **Handoff System** - Create structured handoffs from strategy to implementation
- 🚀 **Smart Scaffolding** - Generate project structures from templates
- 💾 **Local Storage** - SQLite database for fast, offline-first operation
- 🤖 **NLP Analysis** - Intelligent requirement parsing and classification
- 📊 **Analytics** - Track project progress and success metrics

## Installation

### Via npm (recommended)

```bash
npm install -g handoff-mcp
```

### From source

```bash
git clone https://github.com/coladapo/handoff-mcp.git
cd handoff-mcp
npm install
npm run build
```

## Configuration

Add to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

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

For local development:

```json
{
  "mcpServers": {
    "handoff": {
      "command": "node",
      "args": ["/absolute/path/to/handoff-mcp/dist/index.js"]
    }
  }
}
```

## Usage Examples

### Creating a Project

```typescript
// Using the MCP tool in Claude
await use_tool('create_project', {
  name: 'E-commerce Platform',
  description: 'Modern e-commerce site with React and Node.js',
  tags: ['web', 'fullstack', 'production'],
  default_project_info: {
    language: 'TypeScript',
    framework: 'React + Express',
    build_command: 'npm run build',
    test_command: 'npm test'
  }
});
```

### Creating a Handoff

```typescript
await use_tool('create_handoff', {
  project_id: 'proj_123',
  title: 'Implement user authentication',
  strategic_context: 'Need secure user authentication for the platform with JWT tokens and OAuth support',
  tactical_requirements: [
    'Create login/signup endpoints',
    'Implement JWT token generation',
    'Add OAuth2 providers (Google, GitHub)',
    'Create middleware for route protection'
  ],
  acceptance_criteria: [
    'Users can register with email/password',
    'JWT tokens expire after 24 hours',
    'OAuth login works with Google',
    'Protected routes return 401 when unauthorized'
  ],
  priority: 'high'
});
```

### Generating Scaffolding

```typescript
await use_tool('generate_scaffold', {
  template_name: 'express',
  project_name: 'auth-service',
  target_path: './services/auth',
  variables: {
    port: 3001,
    database: 'PostgreSQL',
    authentication: true
  }
});
```

## Available Tools

### Project Management

| Tool | Description |
|------|-------------|
| `create_project` | Create a new project with metadata |
| `list_projects` | List all projects with filtering |
| `get_project` | Get detailed project information |
| `archive_project` | Archive completed projects |
| `get_project_stats` | Get project analytics and metrics |

### Handoff Management

| Tool | Description |
|------|-------------|
| `create_handoff` | Create a strategic-to-tactical handoff |
| `get_handoff` | Retrieve handoff details |
| `list_handoffs` | List handoffs with filtering |
| `update_handoff_status` | Update handoff progress |
| `add_handoff_note` | Add notes to a handoff |
| `verify_handoff` | Verify completion criteria |
| `generate_implementation_brief` | Generate detailed implementation plan |

### Scaffolding

| Tool | Description |
|------|-------------|
| `list_templates` | List available project templates |
| `preview_scaffold` | Preview files before generation |
| `generate_scaffold` | Generate project structure |
| `analyze_requirements` | NLP analysis of requirements |

## Project Templates

Handoff MCP includes several built-in templates:

- **express** - Node.js Express API server
- **fastapi** - Python FastAPI backend
- **react** - React frontend application
- **mcp-server** - MCP server boilerplate

## Data Storage

Data is stored locally in SQLite:
- **Location**: `~/.puo-memo/cursor_handoffs.db`
- **Backup**: Automatic daily backups
- **Privacy**: All data stays on your machine

## Architecture

```
handoff-mcp/
├── src/
│   ├── index.ts           # MCP server entry point
│   ├── storage.ts          # SQLite database layer
│   ├── types.ts            # TypeScript interfaces
│   └── scaffolding/        # Template engine
│       └── ScaffoldingEngine.ts
├── templates/              # Project templates
│   ├── express/
│   ├── fastapi/
│   ├── react/
│   └── mcp-server/
└── tests/                  # Test suite
```

## Development

### Prerequisites

- Node.js 18+
- npm or yarn
- TypeScript 5.5+

### Setup

```bash
# Clone repository
git clone https://github.com/coladapo/handoff-mcp.git
cd handoff-mcp

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Development mode
npm run dev
```

### Testing

```bash
# Run all tests
npm test

# Run specific test suite
npm run test:storage
npm run test:scaffolding

# Test coverage
npm run test:coverage
```

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Areas for Contribution

- Additional project templates
- Enhanced NLP capabilities
- Cloud storage adapters
- Integration with more AI assistants
- Improved analytics and reporting

## Roadmap

- [ ] Cloud sync support (Supabase/PostgreSQL)
- [ ] Team collaboration features
- [ ] Web dashboard for project overview
- [ ] GitHub integration
- [ ] Custom template creation UI
- [ ] Real-time progress tracking
- [ ] Export/import functionality

## Support

- **Issues**: [GitHub Issues](https://github.com/coladapo/handoff-mcp/issues)
- **Discussions**: [GitHub Discussions](https://github.com/coladapo/handoff-mcp/discussions)
- **Documentation**: [Wiki](https://github.com/coladapo/handoff-mcp/wiki)

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

Built with the [Model Context Protocol SDK](https://github.com/modelcontextprotocol/sdk) by Anthropic.

---

**Made with ❤️ for the AI-assisted development community**