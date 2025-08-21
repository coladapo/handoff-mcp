# Contributing to Handoff MCP

Thank you for your interest in contributing to Handoff MCP! This document provides guidelines and instructions for contributing.

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please be respectful and constructive in all interactions.

## How to Contribute

### Reporting Issues

- Check existing issues first to avoid duplicates
- Use clear, descriptive titles
- Include reproduction steps for bugs
- Provide system information (OS, Node version, etc.)

### Suggesting Features

- Open a discussion first for major features
- Explain the use case and benefits
- Consider implementation complexity

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass (`npm test`)
6. Commit with descriptive messages
7. Push to your fork
8. Open a Pull Request

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/handoff-mcp.git
cd handoff-mcp

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Start development mode
npm run dev
```

## Coding Standards

### TypeScript

- Use TypeScript strict mode
- Define interfaces for all data structures
- Avoid `any` type unless absolutely necessary
- Use async/await over promises
- Document complex functions with JSDoc

### Code Style

- 2 spaces for indentation
- Single quotes for strings
- No semicolons (use Prettier)
- Maximum line length: 100 characters
- Use meaningful variable names

### Testing

- Write tests for all new features
- Maintain test coverage above 80%
- Use descriptive test names
- Test edge cases and error conditions

### Commit Messages

Follow the Conventional Commits specification:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Test additions or fixes
- `chore:` Maintenance tasks

Example: `feat: add PostgreSQL storage adapter`

## Project Structure

```
handoff-mcp/
├── src/              # Source code
│   ├── index.ts      # Entry point
│   ├── storage.ts    # Database layer
│   ├── types.ts      # TypeScript types
│   └── scaffolding/  # Template engine
├── templates/        # Project templates
├── tests/            # Test suite
├── docs/             # Documentation
└── examples/         # Usage examples
```

## Adding Templates

To add a new project template:

1. Create a directory in `templates/`
2. Add `template.yaml` configuration
3. Create Handlebars templates (`.hbs` files)
4. Add tests in `tests/templates/`
5. Update documentation

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- storage.test.ts

# Watch mode
npm run test:watch
```

## Documentation

- Update README.md for user-facing changes
- Add JSDoc comments for public APIs
- Include examples for new features
- Update CHANGELOG.md

## Release Process

1. Update version in `package.json`
2. Update CHANGELOG.md
3. Create a git tag
4. Push to main branch
5. GitHub Actions will publish to npm

## Getting Help

- Open an issue for bugs
- Start a discussion for questions
- Join our Discord server (coming soon)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.