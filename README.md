# ❤️ LoveVerse — 3D Virtual Couples Application for Android

> **Our Little World ❤️**  
> A private, synchronized 3D virtual world engineered for long-distance and close couples.

---

## 🚀 Key Highlights & Architecture

- **Hardware-Accelerated 3D Virtual Room & Avatars**: Real Three.js WebGL rendering powered by Expo-GL (`ThreeRoomCanvas`). Features procedural 3D cartoon avatars with customizable skin tones, hairstyles, hair colors, eye colors, shirt and pants colors, articulated limbs, and coordinated hug/kiss animations with floating heart particles.
- **Unreal Engine 3D Render Path**: Optional Unreal Pixel Streaming launcher for a high-fidelity 3D room, with LoveVerse couple and user context passed into the Unreal session.
- **Private Partner Pairing**: Atomic PostgreSQL locking via RPC (`create_space` & `join_space`) enforcing strict two-person isolation with single-use, 48-hour 6-character invitation codes.
- **Real-Time Private Chat**: Optimistic message delivery, typing presence, interactive emoji reactions (`❤️`, `🥰`, `💋`, `✨`, `🥺`), and embedded affection cards.
- **Multiplayer Couple Games**:
  1. **Tic-Tac-Toe**: Turn-enforced 3x3 board with win/draw detection and live state broadcasting.
  2. **Love Quiz**: Dual-secret submission with simultaneous answer reveal.
  3. **Would You Rather**: Synchronized voting with live compatibility scoring.
  4. **Truth or Dare**: Category-filtered prompts (Romantic, Truth, Dare) with skip safeguards.
- **Synchronized Video Co-Watching**: Built on `expo-video` with authoritative playback state, millisecond latency compensation, and drift tolerance threshold (< 750ms drift ignored, > 750ms seeks).
- **"Our Us" Relationship Profile**: Real-time anniversary Days Together counter, shared memories gallery, and affection stats.

---

## 🛠 Tech Stack

| Category | Technology |
| :--- | :--- |
| **Framework** | React Native 0.81.4 / Expo SDK 54 |
| **Routing** | Expo Router ~6.0.0 (Tab & Stack Navigation) |
| **State Management** | Zustand 5.x |
| **3D Rendering** | Three.js (r128+) + Expo-GL |
| **High-Fidelity 3D Option** | Unreal Engine 5 Pixel Streaming |
| **Video Engine** | Expo Video ~3.0.0 |
| **Backend & Auth** | Supabase (PostgreSQL 15+ with Row-Level Security) |
| **Realtime Gateway** | Supabase Realtime (WebSockets & Postgres Changes) |
| **Testing** | Jest + ts-jest (100% passing test suites) |

---

## 📦 Getting Started

### 1. Prerequisites
- **Node.js**: v20+ (tested on Node v24.16.0)
- **Supabase Account**: [supabase.com](https://supabase.com)
- **Expo Go App**: Install on your Android phone or use Android Studio Emulator.

### 2. Configure Supabase Backend
1. In your Supabase Dashboard, open the **SQL Editor**.
2. Run the complete schema script in [`supabase/schema.sql`](supabase/schema.sql).
3. Under **Authentication -> Providers -> Email**, ensure Email sign-in is enabled (disable "Confirm email" for frictionless local testing).
4. Copy your project credentials into [`.env`](.env):
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
   EXPO_PUBLIC_UNREAL_PIXEL_STREAMING_URL=https://your-unreal-stream.example.com
   ```

Unreal setup details are documented in [`UNREAL_ENGINE_INTEGRATION.md`](UNREAL_ENGINE_INTEGRATION.md).
The Unreal Engine project scaffold lives in [`unreal/`](unreal/).

### 3. Run Automated Tests
```bash
npm test
```
All 5 test suites will execute:
```text
PASS tests/videoSync.test.ts
PASS tests/pairing.test.ts
PASS tests/relationship.test.ts
PASS tests/quiz.test.ts
PASS tests/tictactoe.test.ts
Test Suites: 5 passed, 5 total
Tests:       15 passed, 15 total
```

### 4. Start the Application
```bash
# Start Metro bundler
npx expo start

# Run on Android Emulator directly
npx expo start --android
```

---

## 📱 Building Android APK

EAS Build configuration is included in [`eas.json`](eas.json). To generate an installable standalone Android `.apk` for internal testing:

```bash
# 1. Install EAS CLI globally if not already installed
npm install -g eas-cli

# 2. Log in to your Expo account
eas login

# 3. Trigger cloud APK build
eas build -p android --profile preview
```

The build will output a direct download link for the standalone `.apk`.
