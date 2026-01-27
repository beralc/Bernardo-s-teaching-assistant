# Codebase Concerns

**Analysis Date:** 2026-01-23

## Tech Debt

**~~Monolithic Backend Architecture:~~ RESOLVED (2026-01-26)**
- ~~Issue: Single 1230-line Flask file handles all concerns~~
- **Resolution:** Refactored into Flask Blueprints:
  - `app/app.py` (49 lines) - thin entry point with create_app() factory
  - `app/config.py` (13 lines) - OpenAI client, Supabase config
  - `app/utils.py` (58 lines) - verify_admin(), load_prompt()
  - `app/routes/chat.py` (50 lines) - /clear_context, /chat_text
  - `app/routes/voice.py` (113 lines) - /webrtc_session
  - `app/routes/admin.py` (242 lines) - /admin/users CRUD
  - `app/routes/cando.py` (451 lines) - Can-Do endpoints + GPT analysis
  - `app/routes/feedback.py` (230 lines) - Feedback analysis + GPT

**Hardcoded Configuration Values:**
- Issue: CORS origins hardcoded in app.py rather than environment-driven
- Files: `app/app.py` (lines 15-26)
- Impact: Cannot safely adjust CORS for testing/staging without code changes. Domain-specific URLs cannot be changed at runtime
- Fix approach: Move CORS configuration to environment variables (CORS_ORIGINS env var as JSON or comma-separated list)

**Global Session State in Frontend:**
- Issue: Session tracking uses module-level variables (sessionStartTime, sessionLogId, sessionConversation) rather than state management
- Files: `frontend/frontend-app/src/App.js` (lines 100-103)
- Impact: Race conditions when multiple sessions run concurrently. Difficult to debug and maintain state consistency
- Fix approach: Use React Context API or state management library to centralize session state. Ensure proper cleanup on component unmount

**~~Deprecated OpenAI Library:~~ RESOLVED (2026-01-25)**
- ~~Issue: Using openai==0.27.0 which is deprecated~~
- **Resolution:** Upgraded to openai>=1.0.0, refactored to use new client library format (`openai_client.chat.completions.create()`)
- **Model optimization:** Switched to cost-effective models:
  - Text analysis (Can-Do, Feedback): gpt-4o-mini (~94% cheaper than gpt-4o)
  - Real-time voice: gpt-4o-mini-realtime-preview (~75% cheaper on audio)

## Known Bugs

**~~Can-Do Analysis Feature Partially Disabled:~~ RESOLVED (2026-01-24)**
- ~~Symptoms: Frontend code had analysis disabled~~
- **Resolution:** Re-enabled Can-Do achievement detection after voice session ends
- Frontend calls /analyze_session automatically at end of voice sessions
- Admin can re-analyze past sessions via "Re-analyze" button in Can-Do tab

**Session Timeout Handling Missing:**
- Symptoms: No mechanism to timeout hanging WebRTC sessions or detect stale session references
- Files: `frontend/frontend-app/src/App.js` (lines 1788-1806 refs, WebSocket cleanup at lines 2290-2303)
- Trigger: Long disconnect without user closing app, network interruption, browser crash
- Impact: Orphaned sessions in database, inaccurate duration metrics

**CSV Export Function May Fail on Large Datasets:**
- Symptoms: Admin export endpoints likely not memory-buffered for large user bases
- Files: `app/app.py` (admin endpoints, no explicit file streaming)
- Trigger: Attempting to export 10,000+ transcriptions at once
- Workaround: Export data in smaller date ranges or use Supabase dashboard directly

## Security Considerations

**Hardcoded Flask Secret Key:**
- Risk: Default/insecure secret key "your_secure_secret_key" used in production (line 13, app.py)
- Files: `app/app.py` (line 13)
- Current mitigation: No session-based CSRF attacks exploited if only using token auth, but weak key compromises any future session data
- Recommendations:
  - Move to environment variable: `app.secret_key = os.getenv('FLASK_SECRET_KEY')`
  - Generate 32+ char random string for production
  - Ensure secret is NOT in version control

**Admin Authentication Not Rate Limited:**
- Risk: No rate limiting on /admin/* endpoints. Attackers can brute force admin status checks
- Files: `app/app.py` (verify_admin function line 206, all admin endpoints 241-486, 899-994)
- Current mitigation: Only admin users can modify data, but auth check can be hammered to enumerate valid admin IDs
- Recommendations:
  - Add rate limiting (Flask-Limiter) on verify_admin function
  - Implement exponential backoff or IP-based throttling
  - Log failed admin verification attempts for alerting

**Service Role Key Exposed in Client Requests:**
- Risk: SUPABASE_SERVICE_KEY used in client-side fetch headers for voice preference retrieval
- Files: `app/app.py` (lines 118-126 - Supabase headers passed to requests library)
- Current mitigation: Key not exposed to frontend browser context (server-side only)
- Recommendations:
  - Create dedicated non-admin service account for profile reads
  - Consider wrapper endpoint if service key must be used
  - Audit all requests.get/post calls for service key usage

**No Input Validation on Admin Password Reset:**
- Risk: Only 6-char minimum password requirement (line 419, app.py). No complexity validation
- Files: `app/app.py` (line 419)
- Current mitigation: Supabase enforces password policy on auth endpoint
- Recommendations:
  - Add client-side validation for password complexity
  - Document Supabase password policy requirements
  - Consider enforcing 12+ chars with special characters

**CORS Allows Credentials with Wildcard Patterns:**
- Risk: `supports_credentials: True` with explicit origins. Not a direct vulnerability but tight coupling to hardcoded domains
- Files: `app/app.py` (line 24)
- Current mitigation: Origins are explicit (not wildcard), so credentials are limited to known domains
- Recommendations:
  - Move credentials=true to environment flag: only enabled in non-local environments
  - Document why credentials needed (likely for JWT in Authorization header)

**No API Key Validation for OpenAI:**
- Risk: No check that OPENAI_API_KEY is set before startup (line 28)
- Files: `app/app.py` (line 28-29)
- Current mitigation: Will fail at runtime when /webrtc_session or /chat_text called
- Recommendations:
  - Validate all env vars on startup and fail fast
  - Check: OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY exist and non-empty
  - Add startup check before app.run()

## Performance Bottlenecks

**Inefficient Can-Do Statement Fetching:**
- Problem: Every /analyze_session call fetches ALL Can-Do statements then filters in Python
- Files: `app/app.py` (lines 694-703)
- Cause: Should use Supabase query filter to return only relevant level statements
- Improvement path:
  ```python
  # Current: fetch all ~3500 statements, filter in Python
  # Better: filter at database
  level_query = ','.join(relevant_levels)  # line 694 does this but query still inefficient
  ```
  - Add database index on `cando_statements.level`
  - Consider denormalizing recently-used statements

**Large JSON Stringification for OpenAI:**
- Problem: Entire prompt.json converted to string via json.dumps() (lines 63-67, 135-136)
- Files: `app/app.py` (lines 62-67, 135-136)
- Cause: System prompt embedded in every request. If prompt.json grows, token usage increases
- Improvement path:
  - Cache parsed prompt.json at module level, not per-request
  - Consider storing prompt version in database, fetch once at startup
  - Estimate current token waste: ~5-10 tokens per request × thousands of calls = significant cost

**Frontend Re-renders Session State:**
- Problem: sessionConversation array stored as module-level variable, no memoization
- Files: `frontend/frontend-app/src/App.js` (line 103, 113, 145)
- Cause: On every state change, entire component tree re-renders. sessionConversation not part of component state
- Improvement path:
  - Move to React state or Context
  - Use useCallback to memoize event handlers
  - Profile with React DevTools to confirm re-render frequency

**No Database Connection Pooling:**
- Problem: Each Flask request makes new HTTP calls to Supabase REST API
- Files: `app/app.py` (all endpoints making requests.get/post to Supabase)
- Cause: requests library doesn't pool connections, creates new TCP session per endpoint call
- Improvement path:
  - Use `requests.Session()` pooled across endpoint handler lifecycle
  - Or switch to supabase-py SDK which handles connection pooling
  - Current impact: 50-100ms overhead per database operation

## Fragile Areas

**WebRTC Session Lifecycle Management:**
- Files: `frontend/frontend-app/src/App.js` (lines 2129-2310 WebSocket connection management)
- Why fragile: Complex state machine with multiple refs (mediaStreamRef, webSocketRef, audioContextRef, scriptProcessorRef). Cleanup logic scattered across useEffect, closeConnection(), and error handlers. Race condition if user closes connection while audio is processing
- Safe modification:
  - Create dedicated useWebRTC custom hook to encapsulate lifecycle
  - Use AbortController for cancellation
  - Add unit tests for connection close → cleanup sequence
- Test coverage: Likely untested. No test files visible for App.js

**Admin User Management Without Audit Trail:**
- Files: `app/app.py` (admin endpoints 241-486)
- Why fragile: No logging of who deleted which user, when password was reset, tier changes. Audit trail crucial for GDPR/compliance. If admin account compromised, cannot determine what was changed
- Safe modification:
  - Add audit_logs table: (admin_id, action, target_user_id, timestamp, metadata)
  - Log all admin operations before returning success
  - Add admin audit dashboard to retrieve logs
- Test coverage: No test files in codebase

**Can-Do Statement Confidence Scoring (AI-driven):**
- Files: `app/app.py` (analyze_transcript_with_gpt lines 779-897)
- Why fragile: GPT-4 output parsing regex-based (lines 860-871). If OpenAI changes response format, breaks. Confidence scores (0.6-1.0) are advisory only, no validation. No feedback loop if AI confidence is wrong
- Safe modification:
  - Add structured output parsing: use OpenAI functions/tools to force JSON schema
  - Store raw GPT response for debugging
  - Track accuracy of AI detections vs admin-approved achievements
  - Add low-confidence flagging: confidence < 0.7 requires admin review before unlocking achievement
- Test coverage: No test file. Can-Do feature partially disabled

**Session Duration Tracking Precision:**
- Files: `frontend/frontend-app/src/App.js` (lines 150-152, duration calculation)
- Why fragile: Calculated from client-side timestamps (endTime - startTime). If clock skewed, user closes browser before endSession() called, or network latency, duration inaccurate. Used for billing (tier limits)
- Safe modification:
  - Use server-side session timestamps (created_at, ended_at in database)
  - Client tracks local duration for UI feedback only
  - Server validates against database duration on next session start
  - Flag sessions with > 30min gap for admin review
- Test coverage: No explicit test

## Scaling Limits

**Database Query Performance on Large User Base:**
- Current capacity: ~1000 concurrent users before Supabase REST API rate limiting kicks in (assuming 3 requests/session)
- Limit:
  - Supabase free tier: 50,000 API calls/month (breaks at ~1.6 calls/sec)
  - Transcriptions table: No pagination in /admin/users endpoint. Loading 10,000 users + profiles = multiple large queries
- Scaling path:
  - Migrate to Supabase GraphQL or Postgres native connections
  - Implement pagination: GET /admin/users?page=1&limit=50
  - Add database indexes on user_id, session_id, created_at
  - Cache user list in Redis if admin panel heavily used

**OpenAI API Token Costs:** (Optimized 2026-01-25)
- Current capacity: Significantly improved with model optimizations
- Cost structure (after optimization):
  - gpt-4o-mini for text analysis: $0.15/1M input, $0.60/1M output (~94% cheaper than gpt-4o)
  - gpt-4o-mini-realtime-preview for voice: ~75% cheaper on audio tokens
  - 100 sessions/day × 750 tokens avg = 75,000 tokens/day = ~$0.05/day (down from ~$1.12)
- Scaling path (partially implemented):
  - [x] Using gpt-4o-mini for Can-Do and Feedback analysis
  - [x] Using gpt-4o-mini-realtime-preview for voice
  - [ ] Implement token counting before sending to OpenAI
  - [ ] Cache Can-Do statement definitions
  - [ ] Set max_tokens ceiling to prevent runaway costs

**Frontend Bundle Size:**
- Current: React 19.2 + Tailwind + Supabase SDK in create-react-app (likely 150-200KB gzipped)
- Limit: Load time > 3sec on 4G mobile (target audience is seniors)
- Scaling path:
  - Add code splitting for admin routes
  - Lazy load Can-Do UI components
  - Use Tailwind's purge to remove unused styles
  - Consider Next.js or Vite for faster builds

## Dependencies at Risk

**~~Deprecated OpenAI Python SDK (openai==0.27.0):~~ RESOLVED (2026-01-25)**
- ~~Risk: Library discontinued. No security patches~~
- **Resolution:** Upgraded to openai>=1.0.0, migrated to new client library format
- Models optimized for cost: gpt-4o-mini for text analysis, gpt-4o-mini-realtime-preview for voice

**Flask 2.3.2 (EOL January 2025):**
- Risk: Flask 2.3 reaches end-of-life soon. Security vulnerability fixes won't be backported
- Impact: Production system will be running unsupported version
- Migration plan:
  - Upgrade to Flask 2.4.x or 3.0.x when stable
  - Run flask --version to confirm current in production
  - Test all endpoints after upgrade

**Supabase JS Client (^2.77.0) - Wildcard Version:**
- Risk: Pinned to major version only. Major version bump could have breaking changes
- Impact: npm install on fresh environment may pull incompatible version
- Migration plan:
  - Pin to exact version: `"@supabase/supabase-js": "2.77.0"`
  - Or regularly test ^2.x changes before deploying

## Missing Critical Features

**No Offline Support:**
- Problem: App requires constant internet. If connection drops mid-session, transcript lost
- Blocks: Can't use during patchy WiFi (common in senior homes, rural areas)
- Workaround: None. User must restart conversation

**No Session Recovery:**
- Problem: If browser crashes or user closes tab mid-voice session, no way to resume
- Blocks: User loses context and progress
- Solution approach:
  - Store in-progress conversation to local storage
  - On app load, detect orphaned session, offer resume
  - Send "session_interrupt" event to backend to mark incomplete

**No Explicit Error Messages for Users:**
- Problem: API errors returned as-is: "Failed to reset password" without details
- Blocks: Users can't troubleshoot. Admins can't diagnose
- Solution approach:
  - Define error codes: ERR_INVALID_EMAIL, ERR_WEAK_PASSWORD, ERR_SUPABASE_TIMEOUT
  - Pass error codes to frontend for localized messages
  - Log full error server-side for debugging

**No Data Export for Compliance:**
- Problem: GDPR requires "right to data portability". No bulk export feature
- Blocks: Cannot comply with GDPR data export requests
- Solution approach:
  - Add POST /user/export endpoint returning JSON of all user data
  - Compress and email export to user
  - Log export requests for audit trail

## Test Coverage Gaps

**Frontend Component Testing:**
- What's not tested: App.js main component (4535 lines). Specifically:
  - Voice conversation flow (WebRTC connection → transcription → session end)
  - Admin user management UI (user creation, deletion, tier changes)
  - Profile editing and avatar upload
  - Can-Do checklist display
- Files: `frontend/frontend-app/src/App.js` (no corresponding .test.js with meaningful coverage)
- Risk: Regression in core user flows undetected until production. Example: button click handler refactored, stops saving session data
- Priority: High - voice conversation is core feature

**Backend API Integration Testing:**
- What's not tested: Flask endpoints (no test directory visible)
- Specifically:
  - Admin auth verification (verify_admin function, line 206)
  - WebRTC session creation flow
  - Can-Do analysis with various transcript formats
  - Concurrent user sessions
- Files: `app/app.py` (no test_app.py or tests/ directory)
- Risk: Edge cases in authentication bypass, race conditions in database updates
- Priority: High

**Database Schema Validation:**
- What's not tested: Table structure, indexes, foreign key constraints
- Risk: Schema drift if manual SQL migrations not applied. Data corruption if relationship constraints missing
- Solution: Add database migration tool (Alembic for Python, or Supabase migrations if supported)
- Priority: Medium

**Error Handling Edge Cases:**
- What's not tested:
  - Network timeout: /analyze_session takes > 30sec
  - Invalid JSON response from OpenAI
  - Supabase query returns null (e.g., user profile deleted mid-request)
  - Large transcript (> 50KB) sent to GPT-4
- Files: `app/app.py` (error handlers present but untested)
- Risk: Unhandled exceptions crash Flask process, 500 errors returned without context
- Priority: Medium
