# LoveVerse Unreal 3D Vertical Slice

This folder contains the source for the first playable Unreal Engine 5 vertical slice. It is a development foundation, not a packaged Android application or a production-ready multiplayer service.

It is designed for this flow:

1. The Expo app handles login, partner pairing, chat, games, and Supabase state.
2. The World tab opens the Unreal Pixel Streaming URL.
3. Unreal receives `coupleId` and `userId`.
4. Unreal loads the correct room/avatar state from Supabase.
5. Unreal plays realistic 3D couple interactions such as hug, kiss, cuddle, hand-hold, dance, and sit together.

## What Is Included

| File | Purpose |
| --- | --- |
| `LoveVerseUnreal.uproject` | Unreal project descriptor with Pixel Streaming enabled |
| `LVAvatarCharacter` | Replicated third-person avatar with camera, keyboard movement, and modular placeholder mesh parts |
| `LoveVerseCharacter` | Shared character base that composes customization, avatar, emotion, and animation components |
| `LoveVerseCustomizationComponent` | Server-authoritative replicated appearance values |
| `LoveVerseEmotionComponent` | Replicated facial-expression identifier for AnimBP/Control Rig binding |
| `LoveVerseAnimationComponent` | Replicated locomotion identifier and assignable interaction montages |
| `LVRoomBuilder` | Procedural couple room with floor, walls, rug, sofa, bed, and TV; rebuilds without accumulating components |
| `LVInteractionComponent` | Server RPC request/accept flow for consent-gated couple interactions |
| `LVInteractionDirector` | Server-authoritative, distance-validated smooth approach and multicast interaction pose playback |
| `LVGameMode` / `LVPlayerController` | Default pawn/controller wiring for the playable slice |
| `LVPixelStreamingBridge` | Reads LoveVerse session values passed to Unreal |
| `LVSupabaseRealtimeComponent` | Hook point for Supabase realtime interaction sync |

## Build In Unreal Engine

1. Install Unreal Engine **5.4** with the Android platform support components if Android packaging is needed.
2. Open `unreal/LoveVerseUnreal.uproject`.
3. Let Unreal generate project files.
4. Build the `LoveVerseUnrealEditor` target from Visual Studio or allow the editor to compile it.
5. Create a map at `/Game/LoveVerse/Maps/LoveVerseRoom`.
6. Add these actors to the map:
   - `LVRoomBuilder`
   - two `LVAvatarCharacter` actors
   - one `LVInteractionDirector`
7. Assign the two avatars to the director. On **each** avatar's `InteractionComponent`, assign that same director.
8. Set the map's GameMode override to `LVGameMode` (or rely on the project default).
9. In a Widget Blueprint, bind to `OnInteractionRequestReceived`; call `RespondToPendingRequest(true)` only after an explicit Accept action. Call it with `false` for Decline.
10. Create animation Blueprints or Control Rig layers for final production motion.

The default source uses cubes and spheres deliberately as clear placeholders. It does not ship copied Bitmoji assets, a binary map, animation montages, an Android APK, or a Supabase transport implementation.

Read `CHARACTER_ENGINE.md` before importing the first skeletal asset. It records the asset gate and two-client acceptance checks.

## Network model in this slice

`ULVInteractionComponent` receives interaction requests through a reliable server RPC. The receiver decides whether to accept. `ALVInteractionDirector` then validates actor identity and distance, moves both replicated characters over a short interpolation (rather than instant placement), and multicasts the visual pose. This is transport-level UE replication only; couple/session authentication must be enforced before players join the UE session.

## Pixel Streaming

Package the Unreal project and run it with Pixel Streaming enabled. The app URL should be placed in:

```env
EXPO_PUBLIC_UNREAL_PIXEL_STREAMING_URL=https://your-unreal-stream.example.com
```

LoveVerse will open the URL with:

```text
?coupleId=<couple-id>&userId=<user-id>&source=loveverse
```

## Production animation upgrade path

The C++ code gives a consent and replication seam, not production-quality motion. For production-quality motion:

1. Replace cube/sphere placeholders with imported skeletal meshes.
2. Add Control Rig for head, spine, arms, fingers, and eye aim.
3. Create animation montages for each action:
   - Hug
   - Kiss
   - Cuddle
   - Hold hands
   - Forehead kiss
   - Blow kiss
   - Dance
   - Sit together
   - Sleep beside
4. Trigger those montages from `LVInteractionDirector::PlayCoupleInteraction`.
5. Route an authenticated backend interaction event to the authoritative game server; use Supabase Realtime only for application state, not as a substitute for server authority.

The Expo Three.js room remains the fallback renderer for phones and web when Unreal streaming is not configured.
