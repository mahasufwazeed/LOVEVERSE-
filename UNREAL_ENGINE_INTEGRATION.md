# LoveVerse Unreal Engine Integration

LoveVerse can connect to an Unreal Engine 3D world through Pixel Streaming. The Expo app keeps the current Three.js room as the local fallback and opens the Unreal world when a streaming URL is configured.

## Recommended Architecture

1. Build the high-fidelity LoveVerse room in Unreal Engine.
2. Enable Unreal Pixel Streaming in the Unreal project.
3. Host the Pixel Streaming frontend and signaling server.
4. Set the LoveVerse environment variable:

```env
EXPO_PUBLIC_UNREAL_PIXEL_STREAMING_URL=https://your-unreal-stream.example.com
```

5. Open the World tab in the LoveVerse app and tap `Open Unreal World`.

LoveVerse adds session context to the URL:

```text
?coupleId=<couple-id>&userId=<user-id>&source=loveverse
```

The Unreal frontend can read those query parameters and call Supabase to load the correct couple room, avatar configuration, and interaction state.

## Data Sync Contract

Use Supabase as the shared real-time source of truth:

| Data | Source |
| --- | --- |
| Couple room | `rooms`, `room_items` |
| Avatar config | `profiles.avatar_config` |
| Live actions | `avatar_interactions` |
| Presence | `avatar_presence` |
| Chat and memories | Existing LoveVerse tables |

The Unreal scene should subscribe to the same couple-level data and update the 3D scene when actions arrive.

## Unreal Project Setup

1. Install Unreal Engine 5.x.
2. Create a LoveVerse room level with two avatar spawn points.
3. Enable the `Pixel Streaming` plugin.
4. Package the project for Linux or Windows, depending on your host.
5. Run the Pixel Streaming signaling server.
6. Deploy the Unreal executable on a GPU-capable host.

Render static hosting is suitable for the Expo web build, but Unreal Pixel Streaming needs a GPU-capable runtime. Use a GPU VM or a managed Pixel Streaming host for production.

## App Files

- `lib/unreal.ts` builds the Unreal session URL.
- `components/world/UnrealRenderLauncher.tsx` shows the Unreal 3D Render card.
- `app/(tabs)/world.tsx` mounts the Unreal launcher in the World tab.
