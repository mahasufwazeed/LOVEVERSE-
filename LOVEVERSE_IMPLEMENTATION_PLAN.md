# LoveVerse — Implementation & Execution Plan

## Roadmap Overview & Phase Delivery

This document defines the sequential execution plan across all 8 development phases for LoveVerse.

---

### Phase 1: Foundation & Application Architecture
- [x] **1.1 Workspace Setup & Package Verification**
  - Configure `.npmrc` with legacy peer dependency resolution for Expo SDK 54, React 19, and React Native 0.81.
  - Install dependencies: `zustand`, `@tanstack/react-query`, `react-native-reanimated`, `react-native-gesture-handler`, `three`, `@types/three`, `expo-gl`, `jest`, `ts-jest`.
  - Verify TypeScript compilation (`tsc --noEmit`).
- [ ] **1.2 Design System & Romantic Theme**
  - Implement palette tokens: Primary Pink (`#FF5C8A`), Soft Pink (`#FFE4EC`), Lavender (`#B8A4FF`), Deep Purple (`#6C4AB6`), Background (`#FFF8FC`), Dark Text (`#292238`).
  - Create reusable UI primitives: `Button`, `Card`, `Input`, `Header`, `Badge`, `AvatarBadge`, `GlassCard`, `FloatingHearts`.
- [ ] **1.3 Supabase Client & Authentication Layer**
  - Create `lib/supabase.ts` with AsyncStorage persistence and auto-refreshing JWTs.
  - Create `stores/authStore.ts` with Zustand for reactive user session state.
  - Build Auth screens: `app/(auth)/login.tsx`, `app/(auth)/register.tsx`, `app/(auth)/forgot-password.tsx`.
  - Build Onboarding profile setup: `app/(onboarding)/profile.tsx` (display name, anniversary date).

### Phase 2: Partner Connection & Security
- [ ] **2.1 Database Pairing Functions**
  - Enhance `create_space` and `join_space` RPCs with expiration time and approval flow.
  - Create `couples`, `couple_members`, and `partner_invitations` tables.
- [ ] **2.2 Pairing UI & Zustand Store**
  - Create `stores/coupleStore.ts` tracking couple status, partner profile, and invitation code.
  - Build `app/(onboarding)/pairing.tsx` with single-tap code generation, copy-to-clipboard, share action, and code input with real-time verification.
  - Implement partner disconnection with confirmation dialog.

### Phase 3: Real-Time Private Chat
- [ ] **3.1 Chat Database & RLS**
  - Provision `messages` and `message_reactions` tables with Row-Level Security restricting queries to couple members.
- [ ] **3.2 Chat UI & Features**
  - Create `app/(tabs)/chat.tsx` with reverse-scrolling message list, chat bubbles with sender indicators, and optimistic message rendering.
  - Typing indicator channel via Supabase Realtime Presence.
  - Message emoji reactions (`❤️`, `🥰`, `💋`, `🎉`, `🔥`).
  - Affection card messages (hugs and kisses directly embedded in chat timeline).

### Phase 4: 3D Avatars & Shared Virtual Room
- [ ] **4.1 Three.js & Expo-GL 3D Room Renderer**
  - Create `components/world/ThreeRoomCanvas.tsx` hosting Three.js WebGL scene inside Expo-GL.
  - Build 3D isometric room environment: hardwood floor, decorative rug, sofa, window with starry night / pastel sky, ambient wall sconces, indoor potted plants, smart TV.
- [ ] **4.2 3D Cartoon Avatar System**
  - Build procedural 3D modular cartoon avatars in Three.js (head, stylized hair geometry, expressive eyes, blushing cheeks, torso, limbs).
  - Customizable properties: skin tone, hair style & color, eye color, outfit colors.
  - Create Avatar Customizer screen: `app/(onboarding)/avatar.tsx`.
- [ ] **4.3 Real-Time Spatial Movement & Presence**
  - Tap-to-walk navigation with target position raycasting and smooth interpolation.
  - Ephemeral broadcast channel (`couple:{id}:avatars`) transmitting coordinates at throttled 30Hz without database writes.

### Phase 5: Romantic Interactions
- [ ] **5.1 Coordinated 3D Couple Animations**
  - **Hug Sequence**: Avatars walk towards each other, wrap arms, hold embrace for 2.5s, spawn 3D floating hearts particle system, then smoothly return to idle.
  - **Kiss Sequence**: Lean-in tilt, cheek blush color ramp, kiss burst particles, and romantic audio/haptic feedback.
  - **Waving & Dancing**: Expressive gesture triggers.
- [ ] **5.2 Interaction Bar & History**
  - Action trigger bar in World tab.
  - Permanent persistence in `avatar_interactions` table for affection tracking.

### Phase 6: Multiplayer Couple Games
- [ ] **6.1 Turn-Engine & Persistence**
  - Create `game_sessions` and `game_moves` schema.
  - Create `stores/gameStore.ts` managing active game session.
- [ ] **6.2 Four Dedicated Couple Games**
  - **Tic-Tac-Toe**: Interactive 3x3 board with turn enforcement, win line detection, score counter.
  - **Love Quiz**: Curated relationship question bank with dual-submission simultaneous reveal.
  - **Would You Rather**: Fun & romantic dilemma choices with live partner vote reveal.
  - **Truth or Dare**: Category-filtered prompts (Romantic, Deep, Fun) with skip protection.

### Phase 7: Watch Together
- [ ] **7.1 Synchronized Playback Engine**
  - Built on `expo-video` (`VideoView` and `useVideoPlayer`).
  - Realtime broadcast synchronization (`couple:{id}:watch`).
  - Authoritative playback state (URL, status, playback position, timestamp, controller).
  - Drift calculation and smooth seeking (tolerance threshold: 750ms).
- [ ] **7.2 Watch UI & Live Overlay**
  - Video URL loader with HTTPS and direct MP4 validation.
  - Overlay with live synced play/pause controls, progress bar, partner presence indicator, and quick reaction buttons.

### Phase 8: Relationship Dashboard & Testing
- [ ] **8.1 Our Us Dashboard (`app/(tabs)/us.tsx`)**
  - Couple profiles & custom avatars showcase.
  - Live Days Together counter (Years, Months, Days, Hours).
  - Shared Memories timeline with image upload capability.
  - Relationship statistics (total hugs, kisses, games played, videos watched).
  - Settings, account management, and safe disconnect.
- [ ] **8.2 Automated Test Suite**
  - Jest unit & integration tests covering auth, pairing, chat RLS, game logic, and video sync drift calculation.
  - Verify complete end-to-end functionality.
