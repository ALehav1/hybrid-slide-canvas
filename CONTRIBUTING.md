# Contributing to Hybrid Slide Canvas

Thank you for considering contributing to Hybrid Slide Canvas! This document provides guidelines for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR-USERNAME/hybrid-slide-canvas.git`
3. Install dependencies: `pnpm install`
4. Start the development server: `pnpm dev`

## Testing

### Folder Placement
- **Unit / component tests** live next to their source file.
- **Cross-cutting integration or migration tests** live in `src/__tests__/` (aliased as `@tests`).

CI enforces this via `vitest/no-moved-tests`.

### Running Tests

- Run all tests: `pnpm test`
- Run tests in watch mode: `pnpm test:watch`
- Run tests with coverage: `pnpm test:coverage`
- Run tests with UI: `pnpm test:ui`

## Code Style

Code style is enforced using ESLint and TypeScript. Run `pnpm lint` to check for linting issues.

## Submitting Changes

1. Create a new branch: `git checkout -b my-feature-branch`
2. Make your changes
3. Run tests: `pnpm test`
4. Commit your changes: `git commit -am 'Add new feature'`
5. Push to your fork: `git push origin my-feature-branch`
6. Submit a Pull Request

## License

By contributing, you agree that your contributions will be licensed under the project's license.
