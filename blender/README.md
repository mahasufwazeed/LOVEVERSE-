# LoveVerse Blender character source

Keep every editable avatar source file here. Use one original humanoid armature shared by all body, hair, clothing, and accessory variants. The Unreal target uses centimetres; establish that unit convention deliberately and verify it on import rather than relying on a guessed exporter scale.

## Required source contract

- An original mesh and textures—never proprietary Bitmoji assets.
- One named armature, weighted body and clothing meshes, and no leaf bones.
- Facial shape keys for the expression set documented in `unreal/CHARACTER_ENGINE.md`.
- Separate, reusable animation actions for idle, walk, run, turn, sit, wave, hug, kiss, and hand-hold pairs.
- FBX exports produced with `export_loveverse_avatar.py`; retain the `.blend` source beside the export record.

Run from Blender after saving the source file:

```text
blender --background Avatar_Source.blend --python export_loveverse_avatar.py -- --output ../unreal/Content/Avatars/SK_LoveVerseAvatar.fbx
```

The script validates armature ownership and mesh skinning before exporting. It does not generate a mesh, rig, animations, or facial shapes for you.
