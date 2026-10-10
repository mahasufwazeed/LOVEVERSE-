# LoveVerse Unreal 3D Renderer

This folder contains the Unreal Engine 5 source scaffold for the high-fidelity LoveVerse room.

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
| `LVAvatarCharacter` | Bitmoji-style 3D avatar character built from modular mesh parts |
| `LVRoomBuilder` | Procedural 3D couple room with floor, walls, rug, sofa, bed, and TV |
| `LVInteractionDirector` | Positions both avatars and applies interaction poses |
| `LVPixelStreamingBridge` | Reads LoveVerse session values passed to Unreal |
| `LVSupabaseRealtimeComponent` | Hook point for Supabase realtime interaction sync |

## Build In Unreal Engine

1. Install Unreal Engine 5.4 or newer.
2. Open `unreal/LoveVerseUnreal.uproject`.
3. Let Unreal generate project files.
4. Compile the `LoveVerseUnreal` module.
5. Create a map at `/Game/LoveVerse/Maps/LoveVerseRoom`.
6. Add these actors to the map:
   - `LVRoomBuilder`
   - two `LVAvatarCharacter` actors
   - one `LVInteractionDirector`
7. Assign the two avatars to the director.
8. Create animation Blueprints or Control Rig layers for final production motion.

## Pixel Streaming

Package the Unreal project and run it with Pixel Streaming enabled. The app URL should be placed in:

```env
EXPO_PUBLIC_UNREAL_PIXEL_STREAMING_URL=https://your-unreal-stream.example.com
```

LoveVerse will open the URL with:

```text
?coupleId=<couple-id>&userId=<user-id>&source=loveverse
```

## Realistic Animation Upgrade Path

The C++ code gives the first functional interaction system. For production-quality motion:

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
5. Use Supabase realtime events to trigger the same montage for both partners.

The Expo Three.js room remains the fallback renderer for phones and web when Unreal streaming is not configured.
