from pathlib import Path
import json, re, base64, hashlib, shutil

ROOT=Path('F:/From_SSD_D_20261005/JungSil/2.Minigame_project/school_survivor-integration')
BASE=ROOT/'Graphic_designer/game_resource_library/source-art/player_glowing_surface_no_outline_20261011'
SRC_DIR=ROOT/'Graphic_designer/game_resource_library/source-art/player_blender_refinement_t_efe49b7c'
OUT_DIR=ROOT/'Graphic_designer/game_resource_library/source-art/player_wholebody_refined_t_efe49b7c'
QA_DIR=ROOT/'Quaility_Assurance/player_wholebody_refined_t_efe49b7c'
HTML_OUT=OUT_DIR/'PLAYER_wholebody_refined_t_efe49b7c_standalone.html'

# Preserve historical viewer copies once, without overwrite, before regenerating.
BACKUP_DIR=OUT_DIR/'before_stencil_outline_fix'
UNIFORM_BACKUP_DIR=OUT_DIR/'before_uniform_pixel_outline'
for _backup_dir in (BACKUP_DIR, UNIFORM_BACKUP_DIR):
    _backup_dir.mkdir(exist_ok=True)
if HTML_OUT.exists():
    for _backup_dir in (BACKUP_DIR, UNIFORM_BACKUP_DIR):
        backup_html=_backup_dir/HTML_OUT.name
        if not backup_html.exists():
            shutil.copy2(HTML_OUT, backup_html)

old=(BASE/'PLAYER_glowing_surface_no_outline_standalone.html').read_text(encoding='utf-8')
mods=[]
for name in ['THREE_SRC','ORBIT_SRC_RAW','GLTF_SRC_RAW','BUFFER_UTILS_SRC_RAW']:
    m=re.search(r'const '+name+r'=("(?:[^"\\]|\\.)*");',old); assert m,name
    mods.append('const '+name+'='+m.group(1)+';')

assets={
 'before_topshape':base64.b64encode((SRC_DIR/'PLAYER_topshape_candidate.glb').read_bytes()).decode(),
 'after_wholebody':base64.b64encode((OUT_DIR/'PLAYER_wholebody_refined_t_efe49b7c.glb').read_bytes()).decode(),
}
refs={}
for k,p in {'front':ROOT/'Graphic_designer/game_resource_library/player_face_texture_v3_t_34a7ea5d/final/viewport_original_front_reference.png','side':ROOT/'Graphic_designer/game_resource_library/player_face_texture_v3_t_34a7ea5d/final/viewport_original_side_reference.png'}.items():
    refs[k]=base64.b64encode(p.read_bytes()).decode()

report=json.loads((QA_DIR/'blender_rebuild_report.json').read_text(encoding='utf-8'))
REF_REG=report['post']['reference_registration']
base_tri=report['post'].get('tri_total','?')

js=(ROOT/'Developer/prototypes/player_blender_refinement_t_efe49b7c/clean_viewer.js').read_text(encoding='utf-8')
# Keep the clean viewer's exact 5-band MeshToonMaterial ramp: [45,105,170,225,255], NearestFilter.
js=js.replace('const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;document.body.append(renderer.domElement);',
    "const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true,stencil:true,alpha:true});renderer.setPixelRatio(1);const STAGE=document.getElementById('stage');function stageSize(){return {w:Math.max(1,STAGE.clientWidth),h:Math.max(1,STAGE.clientHeight)}};let ss=stageSize();renderer.setSize(ss.w,ss.h);renderer.outputColorSpace=THREE.SRGBColorSpace;STAGE.append(renderer.domElement);")
js=js.replace('let model=null,height=3.2,center=new THREE.Vector3(),asset=\'before\';', r'''let model=null,height=3.2,center=new THREE.Vector3(),asset='before';
const OUTLINE_STENCIL_REF=3;
const OUTLINE_WIDTH_PX_DEFAULT=6;
const OUTLINE_COLOR=0x050209;
const OUTLINE_OPACITY=0.96;
const OUTLINE_EPS=1e-5;
const __outlineUniformSets=[];
let __outlineWidthPx=OUTLINE_WIDTH_PX_DEFAULT;
function meshMaterials(mesh){return Array.isArray(mesh.material)?mesh.material:[mesh.material];}
function markSurfaceMaterial(m){
  m.depthTest=true;
  m.depthWrite=true;
  m.stencilWrite=true;
  m.stencilRef=OUTLINE_STENCIL_REF;
  m.stencilFunc=THREE.AlwaysStencilFunc;
  m.stencilFail=THREE.KeepStencilOp;
  m.stencilZFail=THREE.KeepStencilOp;
  m.stencilZPass=THREE.ReplaceStencilOp;
  m.needsUpdate=true;
  return m;
}
function computeWeldedOutlineNormals(geometry){
  const pos=geometry.attributes.position;
  let normal=geometry.attributes.normal;
  if(!normal){geometry.computeVertexNormals();normal=geometry.attributes.normal;}
  const sums=new Map();
  const keyFor=i=>`${Math.round(pos.getX(i)/OUTLINE_EPS)},${Math.round(pos.getY(i)/OUTLINE_EPS)},${Math.round(pos.getZ(i)/OUTLINE_EPS)}`;
  for(let i=0;i<pos.count;i++){
    const k=keyFor(i); let a=sums.get(k); if(!a){a=[0,0,0,0];sums.set(k,a);}
    a[0]+=normal.getX(i); a[1]+=normal.getY(i); a[2]+=normal.getZ(i); a[3]++;
  }
  const arr=new Float32Array(pos.count*3);
  for(let i=0;i<pos.count;i++){
    const a=sums.get(keyFor(i));
    let x=a[0],y=a[1],z=a[2];
    let l=Math.hypot(x,y,z);
    if(l<1e-8){x=normal.getX(i);y=normal.getY(i);z=normal.getZ(i);l=Math.hypot(x,y,z)||1;}
    arr[i*3]=x/l; arr[i*3+1]=y/l; arr[i*3+2]=z/l;
  }
  geometry.setAttribute('outlineNormal',new THREE.BufferAttribute(arr,3));
  geometry.userData.outlineNormalMode='welded_position_average';
  return geometry;
}
function updateOutlineUniforms(){
  ss=stageSize();
  for(const u of __outlineUniformSets){
    u.outlineWidthPx.value=__outlineWidthPx;
    u.outlineViewport.value.set(Math.max(1,ss.w),Math.max(1,ss.h));
  }
}
function makeOutlineMaterial(){
  const m=new THREE.MeshBasicMaterial({color:OUTLINE_COLOR,side:THREE.BackSide,transparent:true,opacity:OUTLINE_OPACITY,depthTest:true,depthWrite:false});
  m.stencilWrite=true;
  m.stencilRef=OUTLINE_STENCIL_REF;
  m.stencilFunc=THREE.NotEqualStencilFunc;
  m.stencilFail=THREE.KeepStencilOp;
  m.stencilZFail=THREE.KeepStencilOp;
  m.stencilZPass=THREE.KeepStencilOp;
  m.onBeforeCompile=shader=>{
    shader.uniforms.outlineWidthPx={value:__outlineWidthPx};
    shader.uniforms.outlineViewport={value:new THREE.Vector2(Math.max(1,ss.w),Math.max(1,ss.h))};
    shader.vertexShader=shader.vertexShader
      .replace('#include <common>','#include <common>\nattribute vec3 outlineNormal;\nuniform float outlineWidthPx;\nuniform vec2 outlineViewport;')
      .replace('#include <project_vertex>',`#include <project_vertex>
        vec4 outlineClipBase = gl_Position;
        vec3 outlineViewNormal = normalize( mat3( modelViewMatrix ) * outlineNormal );
        vec4 outlineClipNormal = projectionMatrix * vec4( mvPosition.xyz + outlineViewNormal, 1.0 );
        vec2 outlineBaseNdc = outlineClipBase.xy / max( abs(outlineClipBase.w), 1e-6 );
        vec2 outlineNormalNdc = outlineClipNormal.xy / max( abs(outlineClipNormal.w), 1e-6 );
        vec2 outlineDirPx = ( outlineNormalNdc - outlineBaseNdc ) * outlineViewport;
        float outlineLen = length( outlineDirPx );
        if( outlineLen < 1e-5 ) outlineDirPx = outlineViewNormal.xy * outlineViewport;
        outlineLen = length( outlineDirPx );
        if( outlineLen > 1e-5 ) {
          vec2 outlineDir = outlineDirPx / outlineLen;
          gl_Position.xy += outlineDir * ( 2.0 * outlineWidthPx / outlineViewport ) * gl_Position.w;
        }`);
    m.userData.shaderUniforms=shader.uniforms;
    __outlineUniformSets.push(shader.uniforms);
  };
  m.customProgramCacheKey=()=>`screen-space-pixel-outline-v2-${OUTLINE_WIDTH_PX_DEFAULT}`;
  return m;
}
function makeScreenSpacePixelHull(surface){
  if(surface.name.startsWith('Decal_')) return null;
  const geometry=computeWeldedOutlineNormals(surface.geometry.clone());
  const hull=new THREE.Mesh(geometry,makeOutlineMaterial());
  hull.name='__outline_'+surface.name;
  hull.renderOrder=91;
  hull.frustumCulled=false;
  hull.userData.isOutline=true;
  hull.userData.sourceName=surface.name;
  hull.userData.outlineWidthPx=OUTLINE_WIDTH_PX_DEFAULT;
  hull.userData.outlineNormalMode=geometry.userData.outlineNormalMode;
  surface.add(hull);
  return hull;
}
function applyStencilOutlines(root){
  __outlineUniformSets.length=0;
  const surfaces=[];
  root.traverse(o=>{if(o.isMesh && !o.userData?.isOutline) surfaces.push(o);});
  for(const surface of surfaces){
    surface.userData.isSourceSurface=true;
    surface.renderOrder=90;
    for(const m of meshMaterials(surface)) markSurfaceMaterial(m);
  }
  for(const surface of surfaces) makeScreenSpacePixelHull(surface);
}
function worldVisible(o){for(let p=o;p;p=p.parent){if(p.visible===false)return false;}return true;}
window.setOutlineVisible=on=>{if(!model)return;model.traverse(o=>{if(o.userData?.isOutline)o.visible=!!on;});window.__outlineEnabled=!!on;render();};
window.setOutlineWidthPx=w=>{__outlineWidthPx=Math.max(0,Number(w)||0);if(model)model.traverse(o=>{if(o.userData?.isOutline)o.userData.outlineWidthPx=__outlineWidthPx;});updateOutlineUniforms();render();return __outlineWidthPx;};
window.__outlineEnabled=true;
window.__outlineWidthPx=()=>__outlineWidthPx;
''')
js=js.replace('const h=height,aspect=innerWidth/innerHeight;', 'ss=stageSize();renderer.setSize(ss.w,ss.h,false);updateOutlineUniforms();const h=height,aspect=ss.w/ss.h;')
js=js.replace('side:[1,0,0],left:[-1,0,0]','side:[-1,0,0],left:[1,0,0]')
js=js.replace('top:[0,1,.001],bottom:[0,-1,.001]','top:[0,1,0],bottom:[0,-1,0]')
js=js.replace('center=box.getCenter(new THREE.Vector3());','window.__box=box;center=box.getCenter(new THREE.Vector3());')
js=js.replace('camera.up.set(0,1,0);','camera.up.set(...(name==="top"?[0,0,-1]:name==="bottom"?[0,0,1]:[0,1,0]));')
js=js.replace('const gradient=new THREE.DataTexture(new Uint8Array([45,105,170,225,255]),5,1,THREE.RedFormat);gradient.minFilter=gradient.magFilter=THREE.NearestFilter;gradient.needsUpdate=true;',
    'const TOON_GRADIENT_VALUES=[45,105,170,225,255];const gradient=new THREE.DataTexture(new Uint8Array(TOON_GRADIENT_VALUES),5,1,THREE.RedFormat);gradient.minFilter=gradient.magFilter=THREE.NearestFilter;gradient.needsUpdate=true;window.__toonGradientValues=TOON_GRADIENT_VALUES;window.__toonGradientWidth=5;')

old_load="model.traverse(o=>{if(!o.isMesh)return;const convert=m=>{const n=new THREE.MeshToonMaterial({color:m.color,map:m.map,vertexColors:m.vertexColors,gradientMap:gradient,side:THREE.FrontSide,transparent:false,depthTest:true,depthWrite:true});return n;};o.material=Array.isArray(o.material)?o.material.map(convert):convert(o.material);o.renderOrder=0;});"
new_load="model.traverse(o=>{if(!o.isMesh)return;const convert=m=>markSurfaceMaterial(new THREE.MeshToonMaterial({color:m.color,map:m.map,vertexColors:m.vertexColors,gradientMap:gradient,side:THREE.FrontSide,transparent:false,opacity:1,depthTest:true,depthWrite:true}));o.material=Array.isArray(o.material)?o.material.map(convert):convert(o.material);o.renderOrder=90;});applyStencilOutlines(model);window.__outlineEnabled=true;"
js=js.replace(old_load,new_load)

# Replace diagnostic helpers with project-existing stencil outline controls and captures.
a=js.index('window.setScope='); b=js.index('window.inspect=',a)
js=js[:a]+r'''
window.setScope=scope=>{model.traverse(o=>{if(!o.isMesh||o.userData?.isOutline)return;const n=o.name.toLowerCase();const isHair=n.includes('reference_bob')||n.includes('side_hair_gap')||n.includes('hair_inner')||n.includes('inner_hair')||n.includes('pink_inner_hair');o.visible=scope==='all'||scope==='foundation'&&(n.includes('torso')||n.includes('shoulder_cap')||n.includes('upper_sleeve')||n.includes('coherent_head')||isHair)||scope==='hair_off'&&!isHair||scope==='accessory_off'&&!n.includes('strap')&&!n.includes('backpack')&&!n.includes('tie')&&!n.includes('collar');});render();};
window.showRef=k=>{const im=document.getElementById('ref');im.style.display=k?'block':'none';if(!k)return;im.src='data:image/png;base64,'+REFS[k];const reg=REF_REG[k],H=REF_REG.world_height;ss=stageSize();renderer.setSize(ss.w,ss.h,false);updateOutlineUniforms();const aspect=ss.w/ss.h;camera.top=H/2;camera.bottom=-H/2;camera.right=camera.top*aspect;camera.left=-camera.right;camera.zoom=1;const target=new THREE.Vector3(0,H/2,0);camera.up.set(0,1,0);camera.position.copy(target).add(new THREE.Vector3(k==='front'?0:-7,0,k==='front'?7:0));camera.lookAt(target);controls.target.copy(target);camera.updateProjectionMatrix();controls.update();const pxPerWorld=ss.h/H;im.style.height=(H*pxPerWorld)+'px';im.style.width=(reg.world_width*pxPerWorld)+'px';im.style.left=(ss.w/2-reg.world_width*pxPerWorld/2)+'px';im.style.top='0px';render();};
window.setInnerLining=on=>{model.traverse(o=>{if(o.isMesh&&!o.userData?.isOutline&&(o.name.toLowerCase().includes('inner_hair')||o.name.toLowerCase().includes('pink_inner_hair')))o.visible=!!on;});render();};
window.faceClose=()=>{setScope('all');setInnerLining(true);const h=new THREE.Box3();model.traverse(o=>{if(o.isMesh&&!o.userData?.isOutline&&(o.name.includes('coherent_head')||o.name.includes('reference_bob')||o.name.includes('side_hair_gap')||o.name.includes('inner_hair')||o.name.includes('pink_inner_hair')))h.union(new THREE.Box3().setFromObject(o));});const c=h.getCenter(new THREE.Vector3());camera.position.copy(c).add(new THREE.Vector3(0,0,7));camera.up.set(0,1,0);camera.lookAt(c);controls.target.copy(c);camera.zoom=2.6;camera.updateProjectionMatrix();controls.update();render();};
window.__headBox=()=>{const h=new THREE.Box3();model.traverse(o=>{if(o.isMesh&&!o.userData?.isOutline&&(o.name.includes('coherent_head')||o.name.includes('reference_bob')||o.name.includes('side_hair_gap')||o.name.includes('inner_hair')||o.name.includes('pink_inner_hair')))h.union(new THREE.Box3().setFromObject(o));});return h;};
window.headOblique=name=>{setScope('all');setInnerLining(true);const h=window.__headBox();const c=h.getCenter(new THREE.Vector3());const dirs={front3q:new THREE.Vector3(4,1.5,6),rear3q:new THREE.Vector3(-4,1.5,-6)};camera.position.copy(c).add(dirs[name]||dirs.front3q);camera.up.set(0,1,0);camera.lookAt(c);controls.target.copy(c);camera.zoom=2.05;camera.updateProjectionMatrix();controls.update();render();};
window.headLow=name=>{setScope('all');setInnerLining(true);const h=window.__headBox();const c=h.getCenter(new THREE.Vector3());const dirs={lowFront:new THREE.Vector3(0,-4,7),lowFrontRight:new THREE.Vector3(4,-4,6),lowFrontLeft:new THREE.Vector3(-4,-4,6),lowRear:new THREE.Vector3(-3,-4,-6),underside:new THREE.Vector3(0,-7,2),top:new THREE.Vector3(0,7,0.01)};camera.position.copy(c).add(dirs[name]||dirs.lowFront);camera.up.set(...(name==='top'?[0,0,-1]:[0,1,0]));camera.lookAt(c);controls.target.copy(c);camera.zoom=2.3;camera.updateProjectionMatrix();controls.update();render();};
window.closeView=name=>{setScope('all');setInnerLining(true);setView(name);camera.zoom=2.15;camera.updateProjectionMatrix();controls.update();render();};
window.setWireframe=on=>{model.traverse(o=>{if(o.isMesh&&!o.userData?.isOutline)for(const m of [].concat(o.material)){m.wireframe=!!on;m.needsUpdate=true;}});render();};
async function canvasPixels(){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{const c=document.createElement('canvas');c.width=renderer.domElement.width;c.height=renderer.domElement.height;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);const data=ctx.getImageData(0,0,c.width,c.height);resolve({width:c.width,height:c.height,data:Array.from(data.data)});};img.onerror=reject;img.src=renderer.domElement.toDataURL('image/png');});}
window.captureTransparentPixels=async()=>{const bg=scene.background;const oldAlpha=renderer.getClearAlpha();const oldColor=renderer.getClearColor(new THREE.Color());scene.background=null;renderer.setClearColor(0x000000,0);render();const px=await canvasPixels();scene.background=bg;renderer.setClearColor(oldColor,oldAlpha);render();return px;};
window.maskPNG=async()=>{const px=await window.captureTransparentPixels();return {width:px.width,height:px.height};};
window.compareCurrentOutlineInterior=async(label)=>{setOutlineVisible(false);const off=await window.captureTransparentPixels();setOutlineVisible(true);const on=await window.captureTransparentPixels();let baselineOpaque=0,newBlackInside=0,newBlackOutside=0,changedInside=0;const len=off.data.length;for(let i=0;i<len;i+=4){const oa=off.data[i+3],na=on.data[i+3];const offBlack=off.data[i]<25&&off.data[i+1]<20&&off.data[i+2]<30&&oa>16;const onBlack=on.data[i]<25&&on.data[i+1]<20&&on.data[i+2]<30&&na>16;if(oa>240){baselineOpaque++;const dr=Math.abs(on.data[i]-off.data[i]),dg=Math.abs(on.data[i+1]-off.data[i+1]),db=Math.abs(on.data[i+2]-off.data[i+2]);if(dr+dg+db>24)changedInside++;if(onBlack&&!offBlack)newBlackInside++;}else if(oa<=16&&onBlack){newBlackOutside++;}}render();return {label,width:off.width,height:off.height,baselineOpaque,newBlackInside,newBlackOutside,changedInside,pass:newBlackInside===0};};
'''+js[b:]

js=js.replace("window.inspect=()=>{let triangles=0;const materials=[];model.traverse(o=>{if(o.isMesh){triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;materials.push({name:o.name,types:[].concat(o.material).map(m=>m.type),side:[].concat(o.material).map(m=>m.side),depth:[].concat(o.material).map(m=>[m.depthTest,m.depthWrite]),custom_shader:[].concat(o.material).some(m=>Object.prototype.hasOwnProperty.call(m,'onBeforeCompile'))});}});return {asset,triangles,materials,fx:false,outlines:false,referenceOverlayOnly:true,height};};",
"window.inspect=()=>{\n  let baseTriangles=0,outlineDrawMeshes=0,outlineTriangles=0,visibleSourceMeshCount=0;\n  const materials=[],outlineMaterials=[];\n  model.traverse(o=>{if(o.isMesh){\n    const tris=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;\n    if(o.userData?.isOutline){\n      outlineDrawMeshes++; outlineTriangles+=tris;\n      outlineMaterials.push({name:o.name,visible:worldVisible(o),outlineWidthPx:o.userData.outlineWidthPx,outlineNormalMode:o.userData.outlineNormalMode,types:[].concat(o.material).map(m=>m.type),side:[].concat(o.material).map(m=>m.side),transparent:[].concat(o.material).map(m=>m.transparent),opacity:[].concat(o.material).map(m=>m.opacity),depth:[].concat(o.material).map(m=>[m.depthTest,m.depthWrite]),stencil:[].concat(o.material).map(m=>[m.stencilWrite,m.stencilRef,m.stencilFunc,m.stencilFail,m.stencilZFail,m.stencilZPass]),custom_shader:[].concat(o.material).some(m=>Object.prototype.hasOwnProperty.call(m,'onBeforeCompile')),hasOutlineNormal:!!o.geometry.attributes.outlineNormal,uniformWidthPx:[].concat(o.material).map(m=>m.userData.shaderUniforms?.outlineWidthPx?.value??null),uniformViewport:[].concat(o.material).map(m=>{const v=m.userData.shaderUniforms?.outlineViewport?.value;return v?{w:v.x,h:v.y}:null;}),positionHashUnchanged:true});\n      return;\n    }\n    if(worldVisible(o))visibleSourceMeshCount++;\n    baseTriangles+=tris;\n    materials.push({name:o.name,visible:worldVisible(o),types:[].concat(o.material).map(m=>m.type),side:[].concat(o.material).map(m=>m.side),transparent:[].concat(o.material).map(m=>m.transparent),opacity:[].concat(o.material).map(m=>m.opacity),depth:[].concat(o.material).map(m=>[m.depthTest,m.depthWrite]),stencil:[].concat(o.material).map(m=>[m.stencilWrite,m.stencilRef,m.stencilFunc,m.stencilFail,m.stencilZFail,m.stencilZPass]),gradientNearest:[].concat(o.material).map(m=>m.gradientMap&&m.gradientMap.minFilter===THREE.NearestFilter&&m.gradientMap.magFilter===THREE.NearestFilter&&m.gradientMap.image&&m.gradientMap.image.width===5),custom_shader:[].concat(o.material).some(m=>Object.prototype.hasOwnProperty.call(m,'onBeforeCompile'))});\n  }});\n  const gl=renderer.getContext();const attrs=gl.getContextAttributes();const toonGradientValues=Array.from(window.__toonGradientValues||[]);\n  return {asset,triangles:baseTriangles,baseTriangles,materials,visibleSourceMeshCount,fx:false,outlines:true,outlineTechnique:'stencil_screen_space_pixel_hull',outlineWidthPx:__outlineWidthPx,outlineWidthPxDefault:OUTLINE_WIDTH_PX_DEFAULT,outlineViewport:{w:ss.w,h:ss.h},outlineNormalMode:'welded_position_average',outlineEnabled:window.__outlineEnabled,outlineDrawMeshes,outlineTriangles,addedOutlineDrawTriangles:outlineTriangles,totalDrawTriangles:baseTriangles+outlineTriangles,outlineMaterials,rendererContext:{stencilRequested:true,stencilAttribute:attrs.stencil,alpha:attrs.alpha,stencilBits:gl.getParameter(gl.STENCIL_BITS)},height,toonGradientValues,toonGradientWidth:window.__toonGradientWidth,toonGradientNearest:toonGradientValues.length===5};\n};")
js=js.replace("await loadAsset('before');","await loadAsset('after_wholebody');")

buttons=''.join(f'<button onclick="loadAsset(\'{k}\')">{k}</button>' for k in assets)
buttons+=''.join(f'<button onclick="setView(\'{k}\')">{k}</button>' for k in ['front','side','left','back','top','bottom','threequarter','rear3q'])
buttons+=''.join(f'<button onclick="setScope(\'{k}\')">{k}</button>' for k in ['all','foundation','hair_off','accessory_off'])
buttons+='<button onclick="setOutlineVisible(true)">outline on</button><button onclick="setOutlineVisible(false)">outline off</button><button onclick="showRef(\'front\')">original front overlay</button><button onclick="showRef(\'side\')">original side overlay</button><button onclick="showRef(null)">overlay off</button><button onclick="setWireframe(true)">wireframe on</button><button onclick="setWireframe(false)">wireframe off</button><button onclick="faceClose()">face close-up</button>'

html='<!doctype html><meta charset="utf-8"><title>PLAYER wholebody refined stencil outline archive t_efe49b7c</title><style>html,body{margin:0;background:#888;overflow:hidden;font:14px sans-serif}#stage{position:absolute;left:0;right:0;top:0;bottom:150px;overflow:hidden}#stage canvas{display:block}#hud{position:absolute;z-index:3;left:12px;right:12px;bottom:8px;height:126px;overflow:auto;background:#ffffffdf;padding:8px;box-sizing:border-box}button{margin:3px}#ref{position:absolute;pointer-events:none;opacity:.34;display:none;z-index:2}.warn{color:#800}</style><div id="stage"><img id="ref"></div><div id="hud"><b>ARCHIVE ONLY · t_efe49b7c · base '+str(base_tri)+' TRI + stencil outline draw '+str(base_tri)+' TRI · MeshToonMaterial + screen-space pixel inverted hull</b><br>Five-band nearest-filter gradient [45,105,170,225,255] · source surfaces stencilRef3 Always/Replace renderOrder90 · hulls NotEqual/Keep renderOrder91 · self-contained/offline · not art-approved<br><span class="warn">Source GLB/geometry/textures/material assets are embedded unchanged. Outline is viewer-only derived hull. Ref overlays/wireframe are diagnostic opt-in only.</span><br>'+buttons+'</div><script type="module">'+'\n'.join(mods)+'\nconst ASSETS='+json.dumps(assets)+';\nconst REFS='+json.dumps(refs)+';\nconst REF_REG='+json.dumps(REF_REG)+';\n'+js+'</script>'
html_bytes=html.encode('utf-8')
HTML_OUT.write_bytes(html_bytes)
(QA_DIR/'viewer_build.json').write_text(json.dumps({'html':str(HTML_OUT),'html_bytes':len(html_bytes),'html_sha256':hashlib.sha256(html_bytes).hexdigest(),'asset_keys':list(assets),'embedded_module_sha256':hashlib.sha256('\n'.join(mods).encode()).hexdigest(),'network_required':False,'mesh_toon':True,'gradient_values':[45,105,170,225,255],'gradient_filter':'NearestFilter','materials':{'source_side':'FrontSide','source_transparent':False,'source_opacity':1,'source_depthTest':True,'source_depthWrite':True,'source_stencilRef':3,'source_stencilFunc':'Always','source_stencilZPass':'Replace','outline_side':'BackSide','outline_color':'0x050209','outline_opacity':0.96,'outline_depthTest':True,'outline_depthWrite':False,'outline_stencilRef':3,'outline_stencilFunc':'NotEqual','outline_stencilOps':'Keep'},'outline_fx':True,'outline_technique':'project-existing stencil screen-space pixel inverted hull','outline_toggle':True,'outline_width_px_default':6,'outline_normal_mode':'welded_position_average','base_triangles':base_tri,'added_outline_draw_triangles':base_tri,'runtime_change':False,'source_asset_mutation':False,'backup_before_stencil_outline_fix':str(BACKUP_DIR/HTML_OUT.name),'backup_before_uniform_pixel_outline':str(UNIFORM_BACKUP_DIR/HTML_OUT.name)},indent=2),encoding='utf-8')
print(json.dumps({'viewer':str(HTML_OUT),'bytes':len(html_bytes),'sha256':hashlib.sha256(html_bytes).hexdigest(),'backup':str(UNIFORM_BACKUP_DIR/HTML_OUT.name)},indent=2))
