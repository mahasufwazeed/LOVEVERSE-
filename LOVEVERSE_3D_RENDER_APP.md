# LoveVerse 3D Render App

LoveVerse now includes a complete in-app 3D render flow at:

```text
app/(tabs)/render3d.tsx
```

This screen gives the app a direct 3D experience without waiting for Unreal hosting:

1. Loads the couple room from Supabase when configured.
2. Renders the editable 3D room through Expo GL and Three.js.
3. Shows both Bitmoji-style avatars in the room.
4. Plays realistic synchronized couple actions.
5. Keeps Unreal Pixel Streaming available as the high-fidelity render handoff.

## Main Code

| File | Purpose |
| --- | --- |
| `app/(tabs)/render3d.tsx` | Full 3D Render tab and app flow |
| `lib/render3d.ts` | Action metadata and engine capability list |
| `components/world/RoomCreator3D.tsx` | Live Three.js renderer, room editor, avatars, camera, lighting |
| `components/avatars/AvatarRenderer.ts` | Modular Bitmoji-style 3D avatar builder |
| `components/avatars/AvatarAnimationController.ts` | Realistic couple action animation controller |
| `components/world/UnrealRenderLauncher.tsx` | Opens Unreal Pixel Streaming when configured |
| `unreal/` | Unreal Engine 5 source scaffold for the production renderer |

## Realistic Actions

The 3D Render tab exposes these action states:

- Real Hug
- Kiss
- Cuddle
- Hold Hands
- Forehead Kiss
- Blow Kiss
- Dance
- Sit Together
- Sleep Beside
- Flying Hearts

Each action maps to `CoupleInteraction` and triggers the shared world store, so both partners can see the same synchronized animation when Supabase realtime is configured.

## Build

```bash
npm install
npm run build:web
```

Android preview:

```bash
npx expo start --android
```

Production Android APK:

```bash
eas build -p android --profile preview
```

## Unreal Connection

Set this value to connect the app to the Unreal production render:

```env
EXPO_PUBLIC_UNREAL_PIXEL_STREAMING_URL=https://your-unreal-stream.example.com
```

When configured, the app passes:

```text
coupleId
userId
source=loveverse
```

to the Unreal session URL.
