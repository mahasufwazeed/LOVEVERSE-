"""Validate and export an original LoveVerse avatar from Blender to FBX.

Usage:
    blender --background Avatar_Source.blend --python export_loveverse_avatar.py -- --output path/to/avatar.fbx
"""

import argparse
import os
import sys

import bpy


def parse_args():
    arguments = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True, help="Destination FBX path")
    return parser.parse_args(arguments)


def find_armature():
    armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    if len(armatures) != 1:
        raise RuntimeError("Expected exactly one avatar armature; found {}.".format(len(armatures)))
    return armatures[0]


def find_skinned_meshes(armature):
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH" and not obj.hide_render]
    if not meshes:
        raise RuntimeError("No renderable avatar meshes found.")

    for mesh in meshes:
        armature_modifier = next(
            (modifier for modifier in mesh.modifiers if modifier.type == "ARMATURE" and modifier.object == armature),
            None,
        )
        if armature_modifier is None:
            raise RuntimeError("Mesh '{}' is not skinned to the avatar armature.".format(mesh.name))
        if not mesh.vertex_groups:
            raise RuntimeError("Mesh '{}' has no vertex groups.".format(mesh.name))
    return meshes


def export_fbx(armature, meshes, output_path):
    output_path = os.path.abspath(output_path)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    bpy.ops.object.select_all(action="DESELECT")
    armature.select_set(True)
    for mesh in meshes:
        mesh.select_set(True)
    bpy.context.view_layer.objects.active = armature

    bpy.ops.export_scene.fbx(
        filepath=output_path,
        use_selection=True,
        object_types={"ARMATURE", "MESH"},
        add_leaf_bones=False,
        bake_anim=True,
        bake_anim_use_all_actions=True,
        bake_anim_use_nla_strips=False,
        apply_unit_scale=True,
        axis_forward="-Z",
        axis_up="Y",
        path_mode="COPY",
        embed_textures=False,
    )
    print("LoveVerse avatar exported: {}".format(output_path))


def main():
    args = parse_args()
    armature = find_armature()
    meshes = find_skinned_meshes(armature)
    export_fbx(armature, meshes, args.output)


if __name__ == "__main__":
    main()
