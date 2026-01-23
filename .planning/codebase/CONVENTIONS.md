# Coding Conventions

**Analysis Date:** 2026-01-23

## Naming Patterns

**Files:**
- React components: PascalCase function names within single `.js` files (e.g., `App.js` contains `SeniorFirstEnglishAssistant`, `MainApp`, `AccountModal`)
- Configuration files: camelCase or kebab-case (e.g., `craco.config.js`, `tailwind.config.js`)
- Python modules: snake_case (e.g., `app.py`)

**Functions:**
- React: camelCase for event handlers and utility functions (e.g., `handleLogout`, `loadUserInfo`, `startListening`, `saveProfile`)
- Python: snake_case for functions and routes (e.g., `verify_admin`, `admin_list_users`, `admin_update_tier`)
- Async functions: prefix with `async` keyword, no special naming convention

**Variables:**
- State variables: camelCase (e.g., `isLoggedIn`, `selectedTopic`, `avatarUrl`, `englishLevel`)
- Constants: UPPER_SNAKE_CASE for top-level configs (e.g., `TIER_LIMITS`, `API_BASE_URL`, `OPENAI_API_KEY`)
- Private/internal refs: camelCase with underscore prefix avoided (e.g., `conversationRef`, `sessionStartTime`)

**Types/Classes:**
- React component functions: PascalCase (e.g., `MainApp`, `AccountModal`, `TalkView`, `OnboardingScreen`)
- Configuration objects: camelCase (e.g., `fontSizes`, `theme`, `cardTheme`)

## Code Style

**Formatting:**
- No explicit formatter detected (no `.prettierrc` or Prettier config)
- Code appears hand-formatted with inconsistent spacing in some areas
- Indentation: 2 spaces (React/JavaScript), standard Python indentation (4 spaces)
- Line length: No clear limit, some lines exceed 100 characters

**Linting:**
- ESLint config extends `react-app` and `react-app/jest` in `package.json`
- ESLint rules use `// eslint-disable-next-line` comments for known violations:
  - `no-unused-vars`: disabled for intentionally unused variables (e.g., `const { data, error }`)
  - Variables disabled at `App.js` lines 102, 154, 207, 477, 509, 511, 531, 566
- No strict null/undefined checking enforced
- Python linting: No linter config detected (no `flake8`, `pylint`, or `ruff` config)

**Import Organization:**
- React imports at top: `import React, { hooks }` before other imports
- Third-party imports: Supabase client, then utility modules
- Order: React imports → External SDKs → Relative imports
- Example from `App.js`:
  ```javascript
  import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
  import { supabase } from "./supabaseClient";
  const API_BASE_URL = process.env.REACT_APP_FLASK_API_URL || 'http://127.0.0.1:5000';
  ```
- Python imports at top: standard library → third-party → local
  ```python
  import os
  import json
  import requests
  from flask import Flask, request, jsonify, render_template, session
  from dotenv import load_dotenv
  import openai
  from flask_cors import CORS
  ```

**Path Aliases:**
- Not used. All imports are relative or absolute module paths
- Environment variables used for configuration: `process.env.REACT_APP_*` for frontend, `os.getenv()` for backend

## Error Handling

**Frontend (React):**
- Console logging for errors: `console.error('Error message:', error)`
- Conditional error display via state: `error ? <div>{error}</div> : null`
- Try-catch blocks in async functions with error logging:
  ```javascript
  try {
    const response = await fetch(...);
    if (!response.ok) {
      console.error('Failed to...:', response.statusText);
      return;
    }
  } catch (error) {
    console.error('Error:', error);
  }
  ```
- User-facing error messages stored in state (e.g., `setSaveMessage('Error: ' + error.message)`)
- No global error boundary detected

**Backend (Python/Flask):**
- HTTP error handling: specific exception types before general `Exception`
  ```python
  except requests.exceptions.HTTPError as http_err:
    print(f"HTTP error occurred: {http_err}")
    return jsonify({"error": f"..."}), 500
  except Exception as e:
    print(f"Error: {e}")
    return jsonify({"error": str(e)}), 500
  ```
- Status codes returned with error responses: 401 (Unauthorized), 403 (Forbidden), 400 (Bad Request), 500 (Server Error)
- Print statements for server-side logging

## Logging

**Framework:** Native `console.*` in React, built-in `print()` in Python

**Patterns:**
- Frontend: Extensive `console.log()` calls for debugging
  - Session tracking: `console.log('Starting session with topic:', topic?.title)`
  - State changes: `console.log('avatarUrl state updated:', avatarUrl)`
  - API calls: `console.log('Session started successfully! Session ID:', sessionLogId)`
- Backend: `print()` statements for important operations
  - Token validation: `print(f"Checking admin status for user: {user_id}")`
  - API responses: `print(f"OpenAI Realtime API session_json response: {session_json}")`
  - Error tracking: `print(f"Error in admin_list_users: {e}")`
- No structured logging or log levels (DEBUG/INFO/WARN) observed
- Comments indicate TODO/FIXME work at `App.js:283` ("Replace with a nicer modal/toast notification")

## Comments

**When to Comment:**
- Function headers: Docstrings in Python with triple quotes describing purpose
  ```python
  def verify_admin(user_token):
      """Verify user is admin using Supabase REST API"""
  ```
- Inline comments for non-obvious logic: Used sparingly
  ```javascript
  // Capture and clear immediately to prevent race condition with duplicate calls
  const capturedSessionLogId = sessionLogId;
  ```
- Disabled code blocks: Large sections commented out with explanation
  ```javascript
  // DISABLED: Old template route removed for security
  // The React app on Vercel is the main frontend
  // @app.route("/")
  ```
- Section headers: Markdown-style separators in Python
  ```python
  # ============================================================================
  # Can-Do Checklist API Endpoints
  # ============================================================================
  ```

**JSDoc/TSDoc:**
- Not used. No TypeScript in frontend
- Python docstrings used for route handlers
- Parameter documentation minimal

## Function Design

**Size:**
- Small to medium functions preferred for single responsibility
- Large component functions common: `App.js` main components 200-1000+ lines
- Utility functions: 10-50 lines typical

**Parameters:**
- React: Props passed as objects with destructuring
  ```javascript
  function TalkView({ subtleText, cardTheme, fontSizes, onSaveTranscription, selectedTopic })
  ```
- Python: Standard positional arguments with optional keyword args
  ```python
  def admin_update_tier(user_id):
      data = request.json
  ```
- Async handlers: `async (event)` or `async ()` pattern

**Return Values:**
- React: JSX elements or null
- Python: `jsonify()` for API responses with HTTP status codes
- Async functions: Promises in React, coroutines in Python
- Error handling: Return early with error responses in Python, conditional rendering in React

## Module Design

**Exports:**
- React: `export default function ComponentName()`
- Single export per file: One component per `.js` file
- No named exports detected in frontend

**Barrel Files:**
- Not used. No `index.js` files aggregating exports

**Organization:**
- Frontend: Monolithic `App.js` contains all components and logic (4535 lines)
- Backend: Single `app.py` file with all routes (1000 lines)
- No separation of concerns by module/folder
- All authentication, routing, and business logic in single entry points

---

*Convention analysis: 2026-01-23*
