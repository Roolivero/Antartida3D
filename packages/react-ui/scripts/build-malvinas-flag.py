"""Run through Blender MCP with REPO_ROOT set; exports the authored boxes and an isolated .blend."""
import json
import re
from pathlib import Path

import bpy

root = Path(REPO_ROOT)
palette_source = (root / "packages/react-ui/src/orcadas/stationModels.ts").read_text()
palette = dict((name, int(value, 16)) for name, value in re.findall(
    r"^  ([A-Z_]+): 0x([0-9a-f]+),", palette_source, re.M
))
scene_name = "Malvinas Flag - Issue 97"
if bpy.data.scenes.get(scene_name):
    raise RuntimeError("The flag scene already exists; inspect it before rebuilding.")
scene = bpy.data.scenes.new(scene_name)
scene["description"] = "Illustrative Argentine flag: rigid top support, no animation, no real flagpole location."
collection = bpy.data.collections.new("Malvinas Flag 97")
scene.collection.children.link(collection)
materials = {}


def linear(channel):
    return channel / 12.92 if channel <= 0.04045 else ((channel + 0.055) / 1.055) ** 2.4


def box(name, x, y, z, sx, sy, sz, color):
    if color not in materials:
        value = palette[color]
        rgb = [linear(((value >> shift) & 255) / 255) for shift in (16, 8, 0)]
        material = bpy.data.materials.new("Flag97 " + color)
        material.diffuse_color = (*rgb, 1)
        material.use_nodes = True
        shader = next(n for n in material.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
        shader.inputs["Base Color"].default_value = (*rgb, 1)
        shader.inputs["Roughness"].default_value = 0.8
        materials[color] = material
    # App: y up, front +z. Blender: z up, front -y.
    verts = [(dx * sx / 2, -dz * sz / 2, dy * sy / 2)
             for dx, dy, dz in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),
                               (-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
    faces = [(3,2,1,0),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new("Flag97 " + name, mesh)
    collection.objects.link(obj)
    obj.location = (x, -z, y)
    obj.data.materials.append(materials[color])
    obj["palette"] = color
    return obj


box("mast", 0, .49, 0, .024, .98, .024, "ZINC")
box("mast highlight", -.008, .49, .014, .008, .98, .006, "ICE")
box("top support", .335, .966, 0, .69, .022, .022, "ZINC")
box("top cap", 0, .989, 0, .035, .022, .035, "ICE")
box("upper collar", 0, .95, 0, .04, .025, .04, "WHITE")
box("lower collar", 0, .56, 0, .04, .025, .04, "WHITE")
box("upper stripe", .34, .885, 0, .63, .13, .014, "SKY")
box("middle stripe", .34, .755, 0, .63, .13, .014, "WHITE")
box("lower stripe", .34, .625, 0, .63, .13, .014, "SKY")
box("sun", .34, .755, 0, .05, .05, .022, "LAMP")
box("sun horizontal rays", .34, .755, 0, .096, .014, .02, "LAMP")
box("sun vertical rays", .34, .755, 0, .014, .096, .02, "LAMP")
for i, (dx, dy) in enumerate([(-.031,-.031),(-.031,.031),(.031,-.031),(.031,.031)]):
    box("sun diagonal " + str(i), .34 + dx, .755 + dy, 0, .016, .016, .02, "LAMP")

bpy.context.view_layer.update()
lines = ["// Authored in Blender with scripts/build-malvinas-flag.py. Static, y up, base at y = 0.",
         "import type { Box } from '../voyage/vehicles.ts';", ""]
for color in materials:
    lines.append(f"const {color} = 0x{palette[color]:06x};")
lines.extend(["", "export const MALVINAS_FLAG_BOXES: readonly Box[] = ["])
for obj in collection.objects:
    # Read the actual Blender geometry, rather than exporting a second model definition.
    xs, ys, zs = zip(*(v.co for v in obj.data.vertices))
    values = [obj.location.x, obj.location.z, -obj.location.y,
              max(xs)-min(xs), max(zs)-min(zs), max(ys)-min(ys)]
    lines.append("  [" + ", ".join(f"{v:.6f}".rstrip("0").rstrip(".") or "0" for v in values)
                 + ", " + obj["palette"] + "],")
lines.append("];\n")
out = root / "packages/react-ui/src/map3d/malvinasFlagModel.ts"
out.write_text("\n".join(lines))
blend = root / "docs/diseno/modelos/malvinas-flag.blend"
blend.parent.mkdir(parents=True, exist_ok=True)
bpy.data.libraries.write(str(blend), {scene}, fake_user=True)
print(json.dumps({"scene": scene.name, "boxes": len(collection.objects), "model": str(out), "blend": str(blend)}))
