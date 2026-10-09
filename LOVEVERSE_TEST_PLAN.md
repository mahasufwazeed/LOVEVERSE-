# LoveVerse — Automated Test Plan & Quality Assurance

## 1. Test Strategy Overview
Quality assurance for LoveVerse enforces multi-layer verification:
1. **Unit Testing**: Strict business logic validation (games, drift math, pairing codes, date calculations).
2. **State Store Testing**: Zustand store state mutations, optimistic updates, and reset behaviors.
3. **Security & RLS Validation**: Verification that unauthorized queries outside a couple boundary are rejected.
4. **Realtime Protocol Testing**: Message deduplication, packet sequencing, and latency drift thresholds.

---

## 2. Test Suite Matrix

| Module | Test File | Target Coverage | Key Test Scenarios |
| :--- | :--- | :--- | :--- |
| **Pairing & Security** | `tests/pairing.test.ts` | 100% | 6-char code format, expiration check, sanitize code inputs |
| **Tic-Tac-Toe Game** | `tests/tictactoe.test.ts` | 100% | Legal move execution, turn rotation, win detection (row, col, diag), draw detection, illegal move rejection |
| **Couple Quiz & Games** | `tests/quiz.test.ts` | 100% | Masked answering, dual-answer reveal logic, question cycling, Would You Rather choice agreement |
| **Video Co-Watching** | `tests/videoSync.test.ts` | 100% | Drift calculation math, sync threshold (< 750ms drift ignores seek, > 750ms seeks), pause/play propagation, URL validation |
| **Relationship Math** | `tests/relationship.test.ts` | 100% | Days together calculation, leap years, milestone counter, affectionate event counters |
| **Chat & Deduplication** | `tests/chat.test.ts` | 100% | Optimistic message insertion, deduplication filter on incoming stream, reaction toggling |

---

## 3. Test Runner Configuration
- Test framework: **Jest** (`ts-jest` preset)
- Execution command: `npm test` or `npx jest`
- Configuration file: `jest.config.js` with TypeScript support and React Native mock bridges.

---

## 4. Exit Criteria & Quality Gates
- All automated unit tests must exit with code 0.
- No TypeScript compiler errors (`tsc --noEmit`).
- No unchecked sensitive database queries without couple isolation.
