# LoveVerse → Unreal Engine migration plan

## Evidence-based starting point

The repository is an Expo SDK 54 / React Native application with TypeScript, Zustand, Three.js / Expo GL, Supabase, and Jest. `unreal/` contains a UE 5.4 C++ project scaffold. The Expo renderer is the currently usable mobile 3D path; the Unreal project has not been compiled or packaged in this environment.

## Compatibility decision

Keep the Expo application as the account, pairing, chat, gallery, games, and fallback-room client. Build Unreal as a separately authenticated 3D client/service. Do not expose a Supabase service-role key or a user token in Pixel Streaming query parameters. Instead exchange an authenticated, short-lived, audience-bound UE session ticket with the backend, then validate it at the authoritative UE session gateway.

## Delivery sequence

| Priority | Scope | Exit criterion |
| --- | --- | --- |
| P0 | UE project loads; room builder; two placeholder avatars; third-person movement; consent request seam | Editor build and a two-client PIE test succeed |
| P1 | Imported original stylized skeletal avatars, montage pairs, motion warping/IK, consent UI | Hug/kiss/hold-hands execute with acceptance and replicate in a dedicated-server test |
| P2 | Authenticated backend gateway, profile/room translation, chat/media handoff | A paired couple can enter only its own room and recover after reconnect |
| P3 | Watch/music integrations and mini-games | Each integration passes platform-policy and two-client tests |
| P4 | Android device profile, build pipeline, telemetry, penetration/RLS tests | Signed test APK and device benchmark evidence exist |

## API boundary

The existing schema uses `spaces` and `members` as the couple boundary. The new integration should expose versioned endpoints or Edge Functions for a UE ticket, avatar config, room snapshot, interaction authorization, and reconnect state. Persistent events belong in PostgreSQL; transient transforms should travel only through the authoritative UE server's replication stream.

## Explicit non-goals for the current slice

No proprietary avatar assets, animation files, Blender files, binary `.umap`, Android build, Pixel Streaming deployment, or live Unreal/Blender MCP claim is included. Those require the relevant toolchains and assets to be installed and validated.
