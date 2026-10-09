from pathlib import Path
import base64, json, html
HERE=Path(__file__).parent
REPO=HERE.parents[2]
MODULES=REPO/"Developer/r3f_prototype/node_modules/three"
OUT=REPO/"Graphic_designer/game_resource_library/source-art/glowing_stone/glowing-stone-viewer.html"
imports={"imports":{}}
for name,rel in [("three","build/three.module.js"),("orbit-controls","examples/jsm/controls/OrbitControls.js")]:
    raw=(MODULES/rel).read_bytes()
    imports["imports"][name]="data:text/javascript;base64,"+base64.b64encode(raw).decode()
js=(HERE/"viewer.js").read_text(encoding="utf-8").replace("__GEOMETRY__",(HERE/"stone_geometry.json").read_text(encoding="utf-8"))
license=(MODULES/"LICENSE").read_text(encoding="utf-8")
s=(HERE/"viewer.template.html").read_text(encoding="utf-8").replace("__IMPORTMAP__",json.dumps(imports)).replace("__JS__",js).replace("__LICENSE__",html.escape(license))
OUT.write_text(s,encoding="utf-8")
(HERE/"THREE_LICENSE.txt").write_text(license,encoding="utf-8")
print("Built standalone viewer:",OUT,OUT.stat().st_size)
