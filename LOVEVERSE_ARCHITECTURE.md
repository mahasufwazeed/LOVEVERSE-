# LoveVerse — System Architecture Specification

## 1. Executive Summary
**LoveVerse** ("Our Little World ❤️") is a production-grade 3D virtual couples application for Android, engineered for partners in long-distance and close relationships. The platform combines a shared 3D interactive virtual world with real-time encrypted messaging, multiplayer couple games, synchronized media co-watching, affection gestures, and a relationship memory dashboard.

---

## 2. Technology Stack & Runtime Matrix

| Layer | Technology | Specification / Role |
| :--- | :--- | :--- |
| **Mobile Core** | React Native 0.81.4 / Expo SDK 54 | Android-optimized architecture, Hermes engine |
| **Language & Typings** | TypeScript ~5.9.2 | Strict mode, zero `any` policy for core domain types |
| **Navigation & Routing** | Expo Router ~6.0.0 | Typed, deep-linkable, file-based navigation |
| **3D Graphics Engine** | Three.js (r128+) + Expo-GL 3D Context | Hardware-accelerated WebGL rendering on Android |
| **Animation Engine** | React Native Reanimated & Custom 3D Slerp/Interpolation | 60 FPS UI transitions & smooth 3D character blending |
| **Client State Management** | Zustand 5.x | High-performance, uncoupled reactive global state stores |
| **Server State & Caching** | TanStack Query v5 | Optimistic updates, background revalidation |
| **Backend & Database** | Supabase (PostgreSQL 15+) | Row-Level Security (RLS), atomic RPC stored procedures |
| **Realtime Sync** | Supabase Realtime (WebSockets) | Ephemeral broadcast channels + CDC postgres changes |
| **Media & Audio/Video** | Expo Video ~3.0.0 | Direct MP4 streaming with millisecond sync drift correction |
| **Local Storage** | React Native Async Storage | Encrypted session persistence and local offline caching |
| **Testing Automation** | Jest + ts-jest | Unit, integration, RLS policy, and synchronization tests |

---

## 3. High-Level Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        LoveVerse Android Client                        │
│                                                                        │
│  ┌────────────────────────┐  ┌──────────────────────────────────────┐  │
│  │     Expo Router UI     │  │          Zustand Global Store        │  │
│  │ ├─ (auth)              │  │ ├─ authStore      ├─ coupleStore     │  │
│  │ ├─ (onboarding)        │  │ ├─ worldStore     ├─ chatStore       │  │
│  │ └─ (tabs) [World, Chat,│  │ ├─ gameStore      └─ watchStore      │  │
│  │            Games,Watch,│  └──────────────────┬───────────────────┘  │
│  │            Us]         │                     │                      │
│  └───────────┬────────────┘                     │                      │
│              ▼                                  ▼                      │
│  ┌────────────────────────┐  ┌──────────────────────────────────────┐  │
│  │    3D Virtual Room     │  │        Network & Sync Layer          │  │
│  │ ├─ Three.js / Expo-GL  │  │ ├─ Supabase Client (Auth + DB)       │  │
│  │ ├─ 3D Avatar Customizer│  │ ├─ Realtime Broadcast (Movement/Anim)│  │
│  │ ├─ Skeletal Anim Blend │  │ └─ Realtime Postgres Changes (Chat,  │  │
│  │ └─ Affection VFX       │  │    Games, Sessions, Room States)     │  │
│  └────────────────────────┘  └──────────────────┬───────────────────┘  │
└─────────────────────────────────────────────────┼──────────────────────┘
                                                  │ WSS + HTTPS
                                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Supabase Cloud Platform                         │
│                                                                        │
│  ┌────────────────────────┐  ┌──────────────────────────────────────┐  │
│  │     Supabase Auth      │  │       Realtime WebSocket Gateway     │  │
│  │ (JWT, Email, Sessions) │  │ ├─ couple:{id}:presence              │  │
│  └────────────────────────┘  │ ├─ couple:{id}:avatars (60Hz bcast)  │  │
│                              │ ├─ couple:{id}:interactions          │  │
│  ┌────────────────────────┐  │ ├─ couple:{id}:games                 │  │
│  │    Storage Buckets     │  │ └─ couple:{id}:watch                 │  │
│  │ (Avatar snaps, media)  │  └──────────────────────────────────────┘  │
│  └────────────────────────┘                     │                      │
│                                                 ▼                      │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │            PostgreSQL Database (Row-Level Security)              │  │
│  │  profiles · couples · couple_members · partner_invitations       │  │
│  │  messages · message_reactions · avatar_configs · interactions    │  │
│  │  virtual_rooms · game_sessions · game_moves · watch_rooms        │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Subsystem Breakdown

### 4.1 3D Avatar & Virtual Room Subsystem
- **Renderer**: Uses an Expo-GL context initializing a Three.js WebGLRenderer with antialiasing enabled, tone mapping, and pixel ratio clamped to `Math.min(window.devicePixelRatio, 2)` for thermal & battery efficiency on Android.
- **Scene Hierarchy**:
  - `RoomScene`: Stylized isometric camera (`OrthographicCamera` or low FOV `PerspectiveCamera`), directional soft pastel lighting, ambient hemisphere fill, floor rug, sofa, indoor plants, ambient wall lamps, photo frame showing couple's portrait, smart TV displaying synchronized videos.
  - `AvatarModel`: Stylized 3D cartoon avatars constructed with modular meshes (head, hair, eyes, blush cheeks, torso, limbs, shoes). Customizer changes materials, mesh geometries, skin colors, hair styles, and outfit color schemes.
  - `Animation Controller`: State machine handling:
    - `IDLE`: Subtle breathing sinus wave and natural periodic eye-blinking.
    - `WALK`: Forward kinematic leg swing and arm swing with ground collision plane.
    - `HUG`: Coordinated pathfinding toward partner, arm wrap-around, and 3D floating heart burst.
    - `KISS`: Head tilt, cheek blush intensity increase, lean-in, and kiss particle burst.
    - `HOLD_HANDS` & `DANCE`: Synchronized dual-mesh transform matrices.

### 4.2 Real-Time Movement & Interaction Sync
- **Ephemerality vs. Durability**:
  - High-frequency avatar movements (touch-to-move coordinates) are broadcast over `couple:{coupleId}:avatars` without incurring database writes.
  - High-frequency updates use linear interpolation (LERP) and dead-reckoning on the receiver device with timestamp-based drift compensation.
  - High-value interactions (Hugs, Kisses, Cuddles) are written to `avatar_interactions` in PostgreSQL so the affection history is preserved permanently, while simultaneously firing an immediate client-side optimistic trigger.

### 4.3 Real-Time Private Chat Subsystem
- **Security**: Double RLS validation: only members of `couple_id` matching `auth.uid()` can SELECT or INSERT messages.
- **Capabilities**: Real-time optimistic sending, delivery status indicators (`sending`, `sent`, `delivered`), typing indicators via ephemeral presence channel, message reactions (`❤️`, `🥰`, `✨`), and pagination with reverse scrolling.

### 4.4 Multiplayer Couple Games Subsystem
- **Architecture**: A centralized turn-engine supporting 4 multiplayer game modes:
  1. **Tic-Tac-Toe**: Enforces turn rotation, validates legal unoccupied grid cells, evaluates win/draw conditions atomically.
  2. **Love Quiz**: Dual-secret answering. Both partners answer independently; responses remain masked until both have submitted, triggering an simultaneous reveal.
  3. **Would You Rather**: Synchronized prompt cards with live choice reveals and compatibility score calculation.
  4. **Truth or Dare**: Consensual, romantic & fun category cards with skip safeguards.
- **Persistence**: Game sessions and moves are stored in `game_sessions` and `game_moves`, preventing game progress loss if an app is closed.

### 4.5 Watch Together Subsystem
- **Playback Engine**: Built on `expo-video` with `useVideoPlayer` supporting direct MP4 / HLS streams and authorized Supabase storage media.
- **Sync Protocol**:
  - Broadcast payload: `{ action: 'play' | 'pause' | 'seek', position: number, sentAt: number, controllerId: string }`.
  - Latency compensation: If remote partner sends `play` at timestamp $T_{sent}$ with position $P$, local player seeks to $P + (T_{now} - T_{sent})$ and calls `play()`.
  - Drift tolerance: Small drift (< 0.75 seconds) is ignored to prevent annoying audio jitter; larger drift triggers a smooth reposition.

### 4.6 Relationship Dashboard ("Our Us")
- Days-together live counter calculating elapsed days, hours, and minutes from the relationship anniversary date.
- Milestone memories cards (first date, first kiss, special trips) with image uploads.
- Affection statistics: total hugs, kisses exchanged, games won, and favorite activities.
- Safe disconnect and account deletion with atomic partner disconnection confirmation.

---

## 5. Security Architecture
1. **Zero Trust Client**: All authorization checks enforced via PostgreSQL Row-Level Security policies.
2. **Atomic Pairing Protocol**: Database-level locking (`FOR UPDATE`) in `create_space` and `join_space` RPCs prevents race conditions where more than two users could join a couple.
3. **API Keys**: Only publishable `EXPO_PUBLIC_SUPABASE_ANON_KEY` is embedded in the client; service-role keys are strictly banned.
4. **URL Sanitation**: Co-watch URLs are validated against regular expressions enforcing HTTPS and valid media extensions to prevent protocol injection.
