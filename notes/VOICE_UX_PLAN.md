# Voice learning interface plan

## Evidence and limits

- W3C's older-user guidance, grounded in its literature review, supports readable and adjustable text, understandable content, clear feedback, and large controls: https://www.w3.org/WAI/older-users/ and https://www.w3.org/TR/wai-age-literature/ . Age alone does not establish a person's ability or preferences.
- Native modal dialogs support focus containment and inert background content: https://www.w3.org/WAI/WCAG22/Techniques/html/H102 . Follow the keyboard and focus expectations at https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/ .
- Lyster and Saito (2010), 15 classroom studies, N=827, found benefits of oral corrective feedback, with larger effects for prompts than recasts: https://waseda.elsevierpure.com/en/publications/oral-feedback-in-classroom-sla-a-meta-analysis/ . This is not a trial of this app or exclusively senior learners, and does not establish an optimal correction frequency or exact wording.
- Treat the affective filter as a pedagogical rationale for reducing anxiety, not proof that particular words always cause anxiety. Measure perceived comfort, useful feedback, and willingness to continue.
- Evaluate with actual participants: https://www.w3.org/WAI/test-evaluate/involving-users/ . No numerical usability score is justified by source inspection alone.

## Implementation status (6 September 2026)

Implemented: topics-first home with three choices, more topics, Just chat and per-user recent-topic shortcut; explicit microphone start; persistent display preferences and wrapping header; localized voice states, separate interruption and large red End conversation controls; local-only microphone level display; safe onboarding practice and replay; JSON-driven varied feedback; session-scoped microphone gate and stale-event guards; startup/stop cleanup and persistent errors.

The OpenAI WebRTC interruption sequence follows https://developers.openai.com/api/docs/guides/realtime-conversations : cancel active generation, clear the server output buffer (which also truncates unplayed context), wait for clear acknowledgement and the echo tail, clear captured input, then reopen the microphone. Failure to acknowledge ends the session with a recoverable error. Full assistant replies are saved only after playback finishes; an interrupted partial reply is omitted rather than represented as fully heard.

Automated checks cover onboarding, topic choice, controls, preferences, pending microphone permission cancellation, delayed playback, stale responses, interruption and instruction rendering. Production build checked. These do not establish real-world echo performance or learning outcomes.

Still requires release validation: real Safari/Chrome speaker and headphone tests, keyboard/zoom/screen-reader walkthroughs, and senior-participant usability and feedback evaluation. Hands-free interruption and structured correction cards remain deliberately deferred. Registration/account onboarding is separate from the revised first-use guide.

## Onboarding

Replace screenshot-heavy instructions with three short steps: what the app does, a safe practice of start/stop, and permission/turn-taking/recovery guidance. The practice never requests the microphone or starts a paid session. Preserve the large red stop control. Explain current half-duplex behavior honestly. Provide Spanish/English switching, inherited text size, a native modal, focused headings, scroll reset, persistent navigation, and a replay entry point. Version completion per user. No forced exercise or timed progression.

Verify keyboard containment, Escape, focus restoration, both languages, small screens, and large text. This guide covers first use after login; account registration remains a separate flow.

## Priority 1: accurate conversation states and recovery

Represent connecting, listening, preparing, speaking, and error explicitly. Show whose turn it is using text and an icon, never color alone. Preserve the 192px red end button; add a visible End conversation label. Do not claim the microphone is listening when it is muted. Keep errors persistent until recovered; separate microphone permissions, connection, and configuration failures. Add a local microphone activity indicator that does not upload additional audio. Announce state changes, not every streaming transcript token.

Acceptance: the displayed state follows actual audio playback, including delayed playback, failed/no-audio responses, and reconnection. Navigating away and failed startup close all microphone tracks and pending timers.

## Priority 2: interruptions without acoustic false triggers

First offer a separate large I would like to speak button while the assistant speaks. Keep the red button exclusively for ending the session. Explicit interruption cancels generation, clears pending output and updates conversation context, clears stale captured input, then reopens the microphone after an echo tail. Use response IDs and a session-scoped state machine to prevent old timers/events reopening the microphone in a new session.

Optional hands-free mode: keep WebRTC echo cancellation, inspect applied track settings, verify accepted session configuration, and test actual speaker/microphone pairs. Speech detection alone cannot identify the speaker. Energy thresholds and transcript similarity alone are not reliable echo rejection; they can reject quiet learners or genuine repetitions. Do not promise zero false interruptions. Headphones can reduce leakage; provide explicit-button fallback for unreliable devices. Semantic turn detection may help with learner pauses, but is not an echo canceller.

Test laptop speakers, iPhone Safari, Android Chrome, headphones, quiet speech, louder playback, room noise, deliberate repetitions, and long pauses. Measure false cancellations during assistant-only playback, successful intended interruptions, first-word clipping, and turn-end latency. Verify current API schema/events before implementation. Do not restore automatic interruption globally without these checks.

## Priority 3: varied, supportive feedback

Keep a short correct model and preserve the learner's meaning. Vary simple frames: You can say…, Try…, Here, we use…, For yesterday, say…, We usually say… . Sometimes use a clearly emphasized recast; offer one brief retry when useful. Avoid repeating an opener in adjacent turns, generic praise, invented personal progress, or correcting uncertain audio. Do not turn every response into an obligatory correction: correct only clearly identified eligible forms; allow conversational breathing room and adapt to a learner request for less feedback.

Move the effective voice feedback policy into one JSON section rendered by the instruction builder so it cannot drift from the reference JSON. Remove conflicting implicit-only hard rules and percentage quotas. Test correct speech, past-tense errors, self-corrections, uncertain transcription, requests for help, anxiety, and repeated errors. Score correctness, preservation of meaning, variety, and perceived pressure, not keyword presence alone.

Optional visible feedback should distinguish the learner's verified words from the assistant's suggested form. Do not infer a correction card by brittle parsing of spoken phrases. Introduce structured feedback with stable turn IDs before building cards; never manufacture a learner quote from uncertain transcription.

## Priority 4: topics as the entry screen

Recommend a small topic-choice home screen for new users: three familiar options and Just chat, with more topics one tap away. This is a design hypothesis to test, not an age-based research finding. Localize topics and allow meaningful adult interests without stereotypes. Selecting a topic opens preparation; it must not activate the microphone automatically. Returning users should have a clear resume/recent choice and retain access to Talk.

Compare first-session task success, time to begin, requests for assistance, and self-reported comfort against the current Talk-first route. Use participant preferences to choose the default rather than assuming topics suit everyone.

## Priority 5: layout and preferences

Reduce header crowding at narrow widths while keeping language/text controls discoverable. Persist text-size and theme choices with safe storage defaults. Complete Spanish interface labels. Keep time remaining available but visually secondary, with a readable warning near the limit. Confirm zoom, contrast, focus visibility, safe-area spacing, and control reachability on small screens. Do not remove the large red button.

## Release checks

Onboarding: component interaction checks and production build, followed by a real browser check at 320px and 200% zoom and a short participant walkthrough. Voice: device testing and session usage logging before release. Keep prompt/model/voice changes separately identifiable in research records; changing feedback style changes the learning intervention. No claim of improved learning or eliminated echo until observed.
