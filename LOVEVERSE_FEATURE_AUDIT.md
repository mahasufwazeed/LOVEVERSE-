# LoveVerse feature audit

Audit performed from repository source on 2026-10-10. “Present” means source was found; it does not mean end-to-end verified.

| Area | Evidence | Status | Main gap / risk |
| --- | --- | --- | --- |
| Mobile client | Expo Router routes under `app/` | Present | Test coverage is unit-level; device flows still need validation |
| Authentication | `stores/authStore.ts`, Supabase client | Present | Requires integration test against a configured project |
| Pairing | pairing route/store and `spaces` / `members` schema | Present | Must be tested for exactly two members and race conditions |
| 3D room | Three.js, room creator/collision engine | Present | Native Unreal room not yet editor-verified |
| Avatar customization | `components/avatars/` renderer/customizer | Present | UE uses placeholder primitives, not skeletal mesh customization |
| Couple interactions | client interaction engine and UE consent/replication source | Partial | UE has placeholder poses only; no montages, IK, or dedicated-server test |
| Chat and encrypted media | secure chat store, crypto helpers, Supabase schema | Partial | Crypto implementation and RLS need independent security review |
| Realtime | Supabase Realtime client/source and UE component seam | Partial | UE component does not implement authenticated WebSocket/Supabase transport |
| Games/watch | Jest tests and stores | Present in source | Not executed in this session |
| Android | Expo Android target | Partial | No device benchmark or APK evidence |
| Unreal MCP | Plugin skill available to this agent | Blocked | No live Unreal MCP server/tool connection was exposed; the local UE 5.8 install also lacks `Engine/Source`, preventing C++ builds |

## Security findings to resolve before production

1. `profile_select` permits every authenticated user to read every profile. Restrict it to the account owner and their current partner unless a public-profile model is explicitly intended.
2. The encrypted-device policies reference `public.space_members`, but the defined membership table is `public.members`. This will fail when those policies are created unless a missing compatibility view/table exists outside this repository.
3. The current Pixel Streaming URL carries `coupleId` and `userId` as query values. Treat these only as hints; they are not authorization. Replace them with a short-lived session ticket validated server-side.
4. Storage object select policies shown for encrypted buckets are not scoped to a couple/conversation path. Enforce ownership/membership on both read and write policies before enabling uploads.

## Test status

The global `npm`/`npx` shims are broken on this host, but the checked-in local tools ran directly. `node node_modules/jest/bin/jest.js --runInBand` passed **11 suites / 61 tests** and `node node_modules/typescript/bin/tsc --noEmit` exited successfully. A Three.js CommonJS deprecation warning was emitted; it did not fail either command.
