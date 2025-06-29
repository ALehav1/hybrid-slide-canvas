# Windsurf Rules for Hybrid Canvas Refactor

## Code Generation Rules

1. **Always include comprehensive error handling**
   - Wrap async operations in try-catch blocks
   - Log errors with full context using the logger utility
   - Provide user-friendly error messages

2. **Heavy code documentation**
   - Document all dependencies at the top of each file
   - Add detailed JSDoc comments for functions
   - Include inline comments for complex logic
   - Add TODO comments for future improvements

3. **Type safety is mandatory**
   - No `any` types unless absolutely necessary (and document why)
   - Define interfaces for all data structures
   - Use strict TypeScript settings

4. **Testing alongside implementation**
   - Create test files immediately after implementing features
   - Include both success and error test cases
   - Mock external dependencies properly

5. **Consistent file organization**
   - Group related functionality together
   - Use index.ts files for clean exports
   - Follow the established directory structure

## Refactor-Specific Rules

1. **Preserve functionality**
   - Test each component after extraction
   - Maintain all existing features
   - Document any behavioral changes

2. **Incremental changes**
   - Make small, testable commits
   - Never break the build
   - Keep the app runnable at each step

3. **Performance monitoring**
   - Add render tracking for components
   - Log performance metrics in debug mode
   - Identify and fix render loops immediately

4. **Documentation updates**
   - Update README.md after each major change
   - Include architecture diagrams
   - Document new file purposes
   - Keep the file structure section current

## AI Integration Rules

1. **Strict validation**
   - Validate all AI responses against schemas
   - Handle malformed responses gracefully
   - Log parsing failures with full context

2. **Prompt engineering**
   - Keep system prompts in centralized location
   - Version control prompt changes
   - Test prompt modifications thoroughly

3. **Error recovery**
   - Implement retry logic for transient failures
   - Provide fallback behaviors
   - Never crash on AI errors
