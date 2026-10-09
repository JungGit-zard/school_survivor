from pathlib import Path
import itertools, json, numpy as np
HERE=Path(__file__).parent
k=np.arange(38); nz=1-2*(k+.5)/38; phi=k*2.399963229728653
ns=np.stack([np.sqrt(1-nz*nz)*np.cos(phi),np.sqrt(1-nz*nz)*np.sin(phi),nz],1).astype(np.float32)
ns/=np.array([1.13,.94,.87],np.float32)
D=(.92+np.random.default_rng(31).uniform(-.075,.075,38)).astype(np.float32)
vertices=[]
for ids in itertools.combinations(range(38),3):
    A=ns[list(ids)].astype(float)
    if abs(np.linalg.det(A))<1e-8: continue
    v=np.linalg.solve(A,D[list(ids)])
    if np.all(ns@v<=D+1e-5) and not any(np.linalg.norm(v-w)<1e-5 for w in vertices): vertices.append(v)
positions=[]; normals=[]; faces=0
for i,n in enumerate(ns):
    polygon=[v for v in vertices if abs(n@v-D[i])<1e-5]
    if len(polygon)<3: continue
    faces+=1; center=np.mean(polygon,axis=0); unit=n/np.linalg.norm(n)
    axis=np.cross(unit,[0,1,0] if abs(unit[1])<.9 else [1,0,0]); axis/=np.linalg.norm(axis); other=np.cross(unit,axis)
    polygon.sort(key=lambda v:np.arctan2((v-center)@other,(v-center)@axis))
    for j in range(1,len(polygon)-1):
        for v in [polygon[0],polygon[j],polygon[j+1]]: positions.extend(v.tolist()); normals.extend(n.tolist())
mesh={"positions":positions,"planeNormals":normals,"planeCount":38,"faceCount":faces,"vertexCount":len(vertices),"triangles":len(positions)//9}
(HERE/"stone_geometry.json").write_text(json.dumps(mesh),encoding="utf-8")
print({k:v for k,v in mesh.items() if k not in ["positions","planeNormals"]})
