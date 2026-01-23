# Testing Patterns

**Analysis Date:** 2026-01-23

## Test Framework

**Runner:**
- Jest (via `react-scripts` 5.0.1)
- Config: Built into `react-scripts`, no `jest.config.js` file
- Testing libraries: `@testing-library/react@16.3.0`, `@testing-library/jest-dom@6.9.1`, `@testing-library/user-event@13.5.0`

**Assertion Library:**
- Jest's built-in assertions
- `jest-dom` custom matchers for DOM elements

**Run Commands:**
```bash
npm test                 # Run tests in watch mode (via react-scripts)
npm run test            # Same as above (alias in package.json)
# Coverage: Not configured with explicit command
# No coverage output detected in package.json scripts
```

## Test File Organization

**Location:**
- Co-located with source files
- Pattern: `[Component].test.js` in same directory as source

**Naming:**
- Convention: `*.test.js` suffix
- Example: `App.test.js` tests `App.js`

**Structure:**
```
frontend/frontend-app/src/
├── App.js
├── App.test.js          # Main component test
├── setupTests.js        # Test configuration
├── index.js
└── ...
```

## Test Structure

**Suite Organization:**
```javascript
// From App.test.js
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders learn react link', () => {
  render(<App />);
  const linkElement = screen.getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});
```

**Patterns:**
- Single `test()` block per test file (minimal testing detected)
- `render()` function from `@testing-library/react` to mount components
- `screen` object for querying DOM elements
- Regular expression patterns for flexible text matching: `/learn react/i` (case-insensitive)

**Setup:**
- `setupTests.js` imports `@testing-library/jest-dom` globally
- No custom setup hooks or test utilities detected
- No test data factories or fixtures

**Teardown:**
- None explicitly defined
- React Testing Library handles automatic cleanup between tests

**Assertion Patterns:**
- DOM matchers: `.toBeInTheDocument()` from jest-dom
- Standard Jest: `.toBe()`, `.toEqual()` (not observed in current tests)

## Mocking

**Framework:**
- Jest built-in mocking
- No mock data generators or factories detected

**Patterns:**
- Not extensively used in current test suite
- Manual mocking could be implemented via Jest's `jest.mock()` for modules

**What to Mock:**
- External API calls (Supabase, OpenAI)
- Environment variables via `process.env`
- Async operations (fetch, requests)

**What NOT to Mock:**
- React Testing Library encourages testing behavior, not implementation
- Internal component state should flow naturally through tests
- User events should be tested without mocking DOM methods

## Fixtures and Factories

**Test Data:**
- Not implemented
- No test data builders or factory functions detected
- Example of how to structure if needed:
  ```javascript
  const mockUser = {
    id: 'test-user-123',
    email: 'test@example.com',
    created_at: new Date().toISOString()
  };
  ```

**Location:**
- Would typically be in `__mocks__` or `fixtures` subdirectory (not yet created)
- Alternative: co-locate with test files (e.g., `App.test.js` and `App.fixtures.js`)

## Coverage

**Requirements:**
- Not enforced
- No coverage threshold configured in `package.json`
- No coverage scripts in test commands

**View Coverage:**
```bash
npm test -- --coverage
# Would generate coverage report if configured
# Currently shows: "No coverage configured"
```

## Test Types

**Unit Tests:**
- Minimal coverage: Only `App.test.js` exists
- Scope: Component-level rendering tests
- Approach: Render component and query DOM
- Current test is placeholder-quality (checks for "learn react" link, not app functionality)

**Integration Tests:**
- Not detected
- Would test component interactions with Supabase
- Would test form submissions and state updates

**E2E Tests:**
- Not implemented
- Could use Cypress or Playwright
- Would test full user workflows: login → voice conversation → profile update

## Common Patterns

**Async Testing:**
```javascript
// Example pattern for testing async operations:
test('loads user profile', async () => {
  render(<App />);
  // Use waitFor for async state updates
  const element = await screen.findByText(/user data/i);
  expect(element).toBeInTheDocument();
});
```
- Use `findByText()` or `waitFor()` for async queries
- Or use `screen.getByText()` after operations complete

**Error Testing:**
```javascript
// Example pattern for error scenarios:
test('displays error message on failure', () => {
  // Mock failed API call
  jest.mock('./supabaseClient');

  render(<App />);
  // Query for error message
  const errorElement = screen.queryByText(/error/i);
  expect(errorElement).toBeInTheDocument();
});
```
- Test error state rendering
- Verify error messages display to user
- Check error recovery paths

## Current Testing State

**Coverage Gaps:**
- No tests for main application logic (`TalkView`, `MainApp`, `AccountModal`)
- No tests for API integration (Supabase, OpenAI)
- No tests for state management and user interactions
- No tests for voice conversation flow
- No tests for authentication flow
- No tests for error handling

**Priority Areas to Test:**
1. **Authentication** (`App.js` lines 35-62): Login/signup flow with Supabase
2. **Voice Conversation** (`TalkView` component): Recording, WebRTC session, transcription
3. **User Profile** (`AccountModal` component): Profile updates, avatar upload, password change
4. **Admin Functions** (`AdminView` component): User management, tier updates
5. **Error Handling**: Network failures, missing credentials, timeout scenarios

**Testing Strategy for Frontend:**
```javascript
// Example integration test structure needed:
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';

describe('App Authentication', () => {
  test('redirects unauthenticated users to onboarding', () => {
    // Mock Supabase to return no session
    render(<App />);
    expect(screen.getByText(/Welcome to Bernardo/i)).toBeInTheDocument();
  });

  test('shows main app when user is logged in', async () => {
    // Mock authenticated session
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText(/Talk/i)).toBeInTheDocument();
    });
  });
});
```

**Testing Strategy for Backend:**
- No Python test file exists (would typically be `test_app.py` or `tests/test_*.py`)
- Could use `pytest` or `unittest`
- Should test:
  - Admin authorization checks
  - API error responses
  - Supabase integration
  - OpenAI Realtime API session creation

---

*Testing analysis: 2026-01-23*
