# Contributing to Business ERP System

Thank you for your interest in contributing to the Business ERP System! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Documentation](#documentation)

---

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inspiring community for all. Please be respectful and constructive in all interactions.

### Our Standards

- **Be Respectful**: Treat everyone with respect and kindness
- **Be Constructive**: Provide helpful feedback and suggestions
- **Be Professional**: Maintain professionalism in all communications
- **Be Inclusive**: Welcome contributors of all backgrounds and experience levels

---

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js**: 18+ (LTS recommended)
- **npm**: 9+ (comes with Node.js)
- **Git**: Latest version
- **Code Editor**: VS Code recommended

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/business-erp-system.git
   cd business-erp-system
   ```
3. Add upstream remote:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/business-erp-system.git
   ```

---

## Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 3. Database Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the database migrations:
   ```bash
   # Using Supabase CLI
   supabase db push
   
   # Or manually run the SQL files in supabase/migrations/
   ```

### 4. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

---

## Development Workflow

### 1. Create a Branch

Always create a new branch for your work:

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test additions or changes
- `chore/` - Maintenance tasks

### 2. Make Changes

- Write clean, readable code
- Follow the coding standards (see below)
- Add tests for new features
- Update documentation as needed

### 3. Test Your Changes

```bash
# Run linting
npm run lint

# Build the project
npm run build

# Run the production build
npm start
```

### 4. Commit Your Changes

Follow the commit guidelines (see below).

### 5. Push and Create Pull Request

```bash
git push origin your-branch-name
```

Then create a pull request on GitHub.

---

## Coding Standards

### TypeScript

- **Use TypeScript**: All new code should be TypeScript
- **Strict Mode**: Enable strict mode in tsconfig.json
- **Type Everything**: Avoid `any` types, use proper types
- **Interfaces**: Use interfaces for object shapes
- **Enums**: Use enums for fixed sets of values

Example:
```typescript
// Good
interface Product {
  id: string;
  name: string;
  price: number;
}

// Bad
const product: any = { ... };
```

### React Components

- **Functional Components**: Use functional components with hooks
- **TypeScript**: Type all props and state
- **Naming**: Use PascalCase for component names
- **File Structure**: One component per file
- **Exports**: Use named exports for components

Example:
```typescript
interface ProductFormProps {
  productId?: string;
  onSuccess?: () => void;
}

export function ProductForm({ productId, onSuccess }: ProductFormProps) {
  // Component logic
}
```

### File Organization

```
component-name/
├── component-name.tsx       # Component file
├── component-name.test.tsx  # Tests
└── index.ts                 # Re-export
```

### Naming Conventions

- **Components**: PascalCase (`ProductForm.tsx`)
- **Utilities**: camelCase (`formatCurrency.ts`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_ITEMS`)
- **Types/Interfaces**: PascalCase (`ProductFormProps`)
- **Hooks**: camelCase with `use` prefix (`useProducts`)

### Code Style

- **Indentation**: 2 spaces
- **Quotes**: Single quotes for strings
- **Semicolons**: Use semicolons
- **Line Length**: Max 100 characters
- **Trailing Commas**: Use trailing commas

### React Query Hooks

- **Location**: Place in `lib/queries/`
- **Naming**: `use[Entity][Action]` (e.g., `useProducts`, `useCreateProduct`)
- **Keys**: Use consistent query key patterns

Example:
```typescript
export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*');
      if (error) throw error;
      return data;
    },
  });
}
```

### Database Queries

- **Use Supabase Client**: Always use the Supabase client
- **Error Handling**: Always check for errors
- **Type Safety**: Use TypeScript types for database rows
- **RLS**: Ensure RLS policies are respected

---

## Commit Guidelines

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc.)
- **refactor**: Code refactoring
- **test**: Test additions or changes
- **chore**: Maintenance tasks

### Examples

```
feat(products): add barcode scanning to product form

- Implemented barcode scanner component
- Added barcode field to product schema
- Updated product form to include barcode input

Closes #123
```

```
fix(inventory): correct stock calculation in transfer

Fixed an issue where stock transfers were not updating
the available quantity correctly.

Fixes #456
```

### Rules

- Use present tense ("add feature" not "added feature")
- Use imperative mood ("move cursor to..." not "moves cursor to...")
- First line should be 50 characters or less
- Reference issues and pull requests in the footer

---

## Pull Request Process

### Before Submitting

1. **Update Documentation**: Update README.md and other docs if needed
2. **Add Tests**: Add tests for new features
3. **Run Tests**: Ensure all tests pass
4. **Lint Code**: Run `npm run lint` and fix any issues
5. **Build**: Ensure `npm run build` succeeds
6. **Self-Review**: Review your own code first

### PR Title

Use the same format as commit messages:
```
feat(products): add barcode scanning
```

### PR Description

Use the pull request template (auto-populated). Include:
- **Description**: What does this PR do?
- **Motivation**: Why is this change needed?
- **Testing**: How was this tested?
- **Screenshots**: If UI changes, include screenshots
- **Checklist**: Complete the checklist

### Review Process

1. **Automated Checks**: CI/CD will run automatically
2. **Code Review**: Maintainers will review your code
3. **Address Feedback**: Make requested changes
4. **Approval**: PR must be approved before merging
5. **Merge**: Maintainer will merge the PR

---

## Testing

### Unit Tests (Planned)

```bash
npm run test
```

### Integration Tests (Planned)

```bash
npm run test:integration
```

### E2E Tests (Planned)

```bash
npm run test:e2e
```

### Manual Testing

- Test your changes in the browser
- Test on different screen sizes (mobile, tablet, desktop)
- Test with different user roles and permissions
- Test edge cases and error scenarios

---

## Documentation

### Code Documentation

- **Comments**: Add comments for complex logic
- **JSDoc**: Use JSDoc for functions and components
- **README**: Update README.md for significant changes
- **Inline Docs**: Document non-obvious code

### Documentation Files

- **README.md**: Project overview and quick start
- **docs/FEATURES.md**: Feature documentation
- **docs/ARCHITECTURE.md**: Architecture documentation
- **docs/TECH_STACK.md**: Technology stack
- **docs/DEVELOPMENT_GUIDE.md**: Development guide

---

## Questions?

If you have questions, please:
1. Check existing documentation
2. Search existing issues
3. Open a new issue with the `question` label

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to the Business ERP System! 🎉
