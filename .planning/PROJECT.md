# Bernardo's English Teaching Assistant

## What This Is

An AI-powered English conversation practice tool designed for senior learners (50+), serving as the primary research instrument for a doctoral dissertation in Applied Linguistics at Universidad Complutense de Madrid. The app enables investigation of SLA (Second Language Acquisition) processes, interlanguage development, and discourse patterns through AI-mediated speaking practice with automatic transcription and CEFR-based competency tracking.

## Core Value

**Capture rich, analyzable linguistic data from senior learner interactions to test SLA theories (Krashen, Swain, Long, Schmidt, Vygotsky) while providing a low-anxiety, scaffolded practice environment.**

If everything else fails, the transcription logging and CEFR Can-Do tracking must work—these are the foundation of the research data.

## Requirements

### Validated

<!-- Shipped and confirmed working -->

- ✓ Real-time voice conversation with OpenAI (gpt-4o-realtime-preview) — v1
- ✓ Text-based chat with AI (gpt-4o-mini) — v1
- ✓ Automatic transcription logging to Supabase — v1
- ✓ User authentication via Supabase Auth — v1
- ✓ Senior-friendly UI (high contrast, large fonts, simple navigation) — v1
- ✓ Admin panel for user management — v1
- ✓ Session duration tracking — v1
- ✓ Voice preference selection (alloy, shimmer, echo, etc.) — v1
- ✓ Topic-based conversation starters — v1

### Active

<!-- Current milestone: Research Instrument Readiness -->

#### Data Collection for Thesis (Critical)
- [ ] **DATA-01**: Re-enable Can-Do achievement detection after voice sessions
- [ ] **DATA-02**: Export conversation transcripts in discourse analysis format (turn-by-turn with timestamps)
- [ ] **DATA-03**: Export Can-Do achievements per user with confidence scores
- [ ] **DATA-04**: Track and log corrective feedback instances (recasts, expansions, explicit corrections)
- [ ] **DATA-05**: Log negotiation of meaning episodes (clarification requests, comprehension checks)
- [ ] **DATA-06**: Calculate and store CAF metrics (Complexity, Accuracy, Fluency) per session

#### SLA Theory Operationalization
- [ ] **SLA-01**: Implement feedback type tagging in AI responses (recast vs. expansion vs. explicit)
- [ ] **SLA-02**: Track learner uptake after corrective feedback
- [ ] **SLA-03**: Detect scaffolding sequences and log ZPD-appropriate support instances
- [ ] **SLA-04**: Measure pushed output episodes (when AI prompts for elaboration)
- [ ] **SLA-05**: Track affective markers in discourse (anxiety, frustration, confidence indicators)

#### Research Compliance
- [ ] **COMP-01**: Add GDPR-compliant data export for participant right to portability
- [ ] **COMP-02**: Implement data anonymization for thesis appendix transcripts
- [ ] **COMP-03**: Add informed consent capture and tracking in user onboarding
- [ ] **COMP-04**: Audit trail for all admin actions (required for ethics approval)

#### Reliability Improvements
- [ ] **REL-01**: Fix session timeout handling for accurate duration metrics
- [ ] **REL-02**: Add session recovery for interrupted conversations
- [ ] **REL-03**: Server-side session duration validation (not client-side only)

### Out of Scope

<!-- Explicit boundaries for this milestone -->

- Real-time chat/messaging between users — not relevant to research design
- Mobile native app — web is sufficient for study, seniors use tablets/laptops
- Multi-language support — research focused on English only
- Gamification beyond Can-Do achievements — avoid confounding variables
- Video recording — audio transcription is primary data source
- Social features (forums, groups) — controlled individual sessions required

## Context

**Research Setting:**
- PhD in English Linguistics, Universidad Complutense de Madrid
- Focus: Using AI-mediated interaction to investigate SLA processes in senior learners
- Participants: 40-60 adults 50+, A2+ English level, from adult education centers
- Design: Mixed-methods with pre/post speaking assessments + discourse analysis

**SLA Theories Being Tested:**
1. Krashen's Input Hypothesis (i+1) and Affective Filter
2. Schmidt's Noticing Hypothesis (uptake after corrective feedback)
3. Swain's Output Hypothesis (pushed output, modified output)
4. Long's Interaction Hypothesis (negotiation of meaning)
5. Vygotsky's ZPD and Bruner's Scaffolding

**Current Codebase State (from mapping):**
- Monolithic App.js (4535 lines) — needs refactoring but functional
- Can-Do analysis backend exists but frontend disabled
- 328 CEFR Can-Do descriptors in database
- Basic session logging working

**Known Technical Debt:**
- Hardcoded Flask secret key (security risk)
- Deprecated OpenAI SDK (0.27.0)
- No test coverage
- CORS origins hardcoded

## Constraints

- **Timeline**: Data collection must begin by academic term (target: 3 months to research-ready)
- **Tech Stack**: Must keep React/Flask/Supabase/OpenAI (too late to switch)
- **Cost**: OpenAI API budget limited—use gpt-4o-mini where possible
- **Participants**: Senior users with limited tech experience—UI must remain simple
- **Ethics**: UCM ethics approval requires GDPR compliance, anonymization, consent tracking
- **Thesis Framing**: Technology is the instrument, not the contribution—avoid over-engineering

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use OpenAI gpt-4o-realtime for voice | Best available voice AI quality for natural conversation | ✓ Good |
| Store transcripts in Supabase | Centralized data, easy export, real-time sync | ✓ Good |
| CEFR Can-Do for competency tracking | Standard framework, aligns with thesis assessment chapter | — Pending (needs re-enabling) |
| Single-page React app | Simplicity for senior users, fast deployment | ✓ Good |
| Flask backend for OpenAI orchestration | Keeps API keys server-side, enables prompt.json customization | ✓ Good |
| Disable Can-Do analysis temporarily | Was causing UI issues, needs re-integration | ⚠️ Revisit |

---

## Research Instrument Gap Analysis

Based on thesis requirements (Chapter 6-7), the following capabilities are needed but missing:

### Chapter 7.4.1 - Discourse Analysis Framework
**Gap:** No automated coding of interactional moves
**Current:** Raw transcripts only
**Need:** Tag turns as: clarification request, comprehension check, confirmation, recast, expansion, explicit correction, uptake, modified output

### Chapter 7.4.2 - CAF Analysis
**Gap:** No metrics calculated
**Current:** Raw text only
**Need:** MLU, subordination ratio, error rates, speech rate, pause analysis

### Chapter 7.4.3 - Error Analysis
**Gap:** No error categorization
**Current:** AI provides corrections inline but not tagged
**Need:** Classify errors as morphological/syntactic/lexical/phonological + track repair patterns

### Chapter 11 - Corrective Feedback & Uptake
**Gap:** Feedback types not distinguished
**Current:** All AI responses treated equally
**Need:** Tag feedback as recast (70%), expansion (20%), explicit (10%) + measure uptake rates

### Chapter 13 - Can-Do Achievement System
**Gap:** Currently disabled in frontend
**Current:** Backend `/analyze_session` works, frontend doesn't call it
**Need:** Re-enable + add validation against human judgment

---
*Last updated: 2026-01-23 after /gsd:new-project initialization*
