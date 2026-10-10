# LoveVerse real-time character engine

## What the current C++ source provides

`ALoveVerseCharacter` is the shared runtime character class. It composes the following reusable components:

| Component | Responsibility |
| --- | --- |
| `ULoveVerseCustomizationComponent` | Server-RPC appearance updates and replicated appearance data |
| `ULoveVerseAvatarComponent` | Applies replicated colours and height/body proportions to the configured visual avatar |
| `ULoveVerseEmotionComponent` | Server-RPC replicated facial-expression identifier |
| `ULoveVerseAnimationComponent` | Replicated locomotion identifier plus Blueprint-configurable interaction montage map |
| `ULVInteractionComponent` | Partner request, explicit consent, accept/decline state |
| `ALVInteractionDirector` | Server-side distance check, smooth approach, facing alignment, and multicast start/idle signal |

No per-bone transform replication is used. Character movement is replicated by `ACharacter`; the animation system replicates state IDs, while the director sends discrete interaction transitions.

## Asset gate before calling this a character engine

The repository currently has code and placeholder primitives only. Before a first visual claim, create original assets and verify each item in Unreal:

1. In Blender, author one rigged original character with body, hair, clothing, and facial shape keys. Keep the `.blend` source.
2. Export through `blender/export_loveverse_avatar.py` and import the FBX as `SK_LoveVerseAvatar`.
3. Create a Blueprint subclass of `ALoveVerseCharacter`; assign the skeletal mesh to inherited `Mesh`, a mobile material, and an Animation Blueprint.
4. Create animation montages for each partner role and map them in `ULoveVerseAnimationComponent::InteractionMontages`.
5. Implement the Animation Blueprint state machine for idle, walk, run, turn, sit, stand, and jump. Drive facial morph targets from `ULoveVerseEmotionComponent` in the AnimBP/Control Rig.
6. Use Motion Warping and IK targets from the interaction director only after observing each paired interaction with two clients. Do not use the primitive poses as final motion.

## Runtime acceptance checklist

- Compile `LoveVerseUnrealEditor` with a full UE source/toolchain installation.
- Run two-client PIE or a dedicated server test: movement, request/decline, request/accept, hug, and kiss.
- Visually inspect clip clearance at different avatar scales; record the result.
- Validate Android touch controls and measure frame time on a representative device.
- Verify a reconnect restores only the authorized couple's appearance and room state.

Until those checks pass, the system is a source-level foundation and must not be presented as a completed animated avatar experience.
