# Requirements: Bernardo's English Teaching Assistant

**Defined:** 2026-01-23
**Core Value:** Capture rich linguistic data from senior learner AI interactions to test SLA theories

## Milestone 1: Research Instrument Readiness

Requirements to make the app ready for doctoral research data collection.

### Internationalization (Priority: Critical - Phase 1)

Spanish seniors learning English need UI in their native language to reduce cognitive load.

- [x] **I18N-01**: Detect browser language on app load (navigator.language)
- [x] **I18N-02**: Show Spanish UI if browser is `es` or `es-*`, English for all other languages
- [x] **I18N-03**: Create translation files for all user-facing text (es.json, en.json)
- [x] **I18N-04**: Translate: navigation, buttons, labels, instructions, tooltips, error messages
- [x] **I18N-05**: Keep AI conversation always in English (practice target language)
- [x] **I18N-06**: Persist language preference in localStorage (allow manual override later if needed)

### Can-Do System (Priority: Critical - Phase 2)

- [x] **CANDO-01**: Re-enable Can-Do achievement detection after voice session ends
- [x] **CANDO-02**: Store AI confidence score (0.6-1.0) with each achievement
- [x] **CANDO-03**: Display Can-Do achievements in user profile with unlock dates
- [x] **CANDO-04**: Admin can view all Can-Do achievements per user
- [x] **CANDO-05**: Export Can-Do achievements as CSV with user_id, statement_id, confidence, date

### Data Export (Priority: Critical - Phase 3)

- [x] **EXPORT-01**: Export transcripts in discourse analysis format (speaker, timestamp, text, turn_number)
- [x] **EXPORT-02**: Export by date range and user cohort (for experimental vs control groups)
- [x] **EXPORT-03**: Export sessions with metadata (duration, topic, total_turns, user_level)
- [x] **EXPORT-04**: Anonymize exports (replace user identifiers with participant codes P001, P002...)

### Feedback Tracking (Priority: High - Phase 4)

- [ ] **FEED-01**: Tag AI responses by feedback type (recast, expansion, explicit_correction, none)
- [ ] **FEED-02**: Detect when learner utterance follows feedback (potential uptake)
- [ ] **FEED-03**: Mark modified output instances (learner self-corrects after feedback)
- [ ] **FEED-04**: Store feedback sequences in separate table for analysis

### Discourse Metrics (Priority: High - Phase 5)

- [ ] **DISC-01**: Calculate Mean Length of Utterance (MLU) per session
- [ ] **DISC-02**: Count negotiation of meaning episodes per session
- [ ] **DISC-03**: Track turn distribution (learner vs AI turns, average turn length)
- [ ] **DISC-04**: Detect clarification requests by learner
- [ ] **DISC-05**: Detect comprehension checks by AI

### Session Reliability (Priority: Medium - Phase 6)

- [ ] **SESS-01**: Fix session timeout handling to mark abandoned sessions
- [ ] **SESS-02**: Server-side duration calculation (not client-side only)
- [ ] **SESS-03**: Session recovery after browser crash/disconnect
- [ ] **SESS-04**: Flag sessions with anomalies (> 60min, < 1min, network errors)

### Research Compliance (Priority: Medium - Phase 7)

- [ ] **GDPR-01**: User data export endpoint (all user's own data as JSON)
- [ ] **GDPR-02**: User data deletion endpoint (right to be forgotten)
- [ ] **GDPR-03**: Informed consent checkbox on signup with timestamp
- [ ] **GDPR-04**: Admin audit log (who did what, when)

### Security Fixes (Priority: Medium - Phase 8)

- [ ] **SEC-01**: Move Flask secret key to environment variable
- [ ] **SEC-02**: Validate required env vars on startup
- [ ] **SEC-03**: Add rate limiting on admin endpoints

## Milestone 2: Analysis Enhancement (Future)

Deferred to after data collection begins.

### Automated Analysis

- **ANAL-01**: Calculate CAF metrics (Complexity, Accuracy, Fluency) automatically
- **ANAL-02**: Error categorization (morphological, syntactic, lexical, phonological)
- **ANAL-03**: Scaffolding sequence detection
- **ANAL-04**: Affective marker detection in transcripts
- **ANAL-05**: ZPD analysis (achievements above assigned level)

### Visualization

- **VIS-01**: Progress dashboard for individual learners
- **VIS-02**: Cohort comparison charts (experimental vs control)
- **VIS-03**: Can-Do achievement timeline visualization

## Out of Scope

| Feature | Reason |
|---------|--------|
| Automated CEFR level assignment | Requires validated assessment, beyond app scope |
| Real-time error correction UI | Would change learner behavior, confounding variable |
| Pronunciation scoring | OpenAI Realtime doesn't provide phonetic accuracy |
| Grammar explanations | Research measures implicit learning, not explicit instruction |
| Leaderboards/competition | Not appropriate for senior learners, adds pressure |
| Multi-device sync | Participants use single device during study |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| I18N-01 | Phase 1 | Complete |
| I18N-02 | Phase 1 | Complete |
| I18N-03 | Phase 1 | Complete |
| I18N-04 | Phase 1 | Complete |
| I18N-05 | Phase 1 | Complete |
| I18N-06 | Phase 1 | Complete |
| CANDO-01 | Phase 2 | Complete |
| CANDO-02 | Phase 2 | Complete |
| CANDO-03 | Phase 2 | Complete |
| CANDO-04 | Phase 2 | Complete |
| CANDO-05 | Phase 2 | Complete |
| EXPORT-01 | Phase 3 | Complete |
| EXPORT-02 | Phase 3 | Complete |
| EXPORT-03 | Phase 3 | Complete |
| EXPORT-04 | Phase 3 | Complete |
| FEED-01 | Phase 4 | Pending |
| FEED-02 | Phase 4 | Pending |
| FEED-03 | Phase 4 | Pending |
| FEED-04 | Phase 4 | Pending |
| DISC-01 | Phase 5 | Pending |
| DISC-02 | Phase 5 | Pending |
| DISC-03 | Phase 5 | Pending |
| DISC-04 | Phase 5 | Pending |
| DISC-05 | Phase 5 | Pending |
| SESS-01 | Phase 6 | Pending |
| SESS-02 | Phase 6 | Pending |
| SESS-03 | Phase 6 | Pending |
| SESS-04 | Phase 6 | Pending |
| GDPR-01 | Phase 7 | Pending |
| GDPR-02 | Phase 7 | Pending |
| GDPR-03 | Phase 7 | Pending |
| GDPR-04 | Phase 7 | Pending |
| SEC-01 | Phase 8 | Pending |
| SEC-02 | Phase 8 | Pending |
| SEC-03 | Phase 8 | Pending |

**Coverage:**
- Milestone 1 requirements: 33 total
- Mapped to phases: 33
- Unmapped: 0 ✓

---
*Requirements defined: 2026-01-23*
*Last updated: 2026-01-24 after completing Phase 3 (Data Export)*
