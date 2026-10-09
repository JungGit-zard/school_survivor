import * as THREE from "three";
import {OrbitControls} from "orbit-controls";
const geomData=__GEOMETRY__;
const canvas=document.querySelector("#scene");
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5)); renderer.outputColorSpace=THREE.LinearSRGBColorSpace;
const scene=new THREE.Scene(); scene.background=new THREE.Color(.035,.045,.065);
const camera=new THREE.OrthographicCamera(-2,2,1.7,-1.7,.05,40);camera.position.set(0,0,6);
const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.09;controls.minZoom=.45;controls.maxZoom=3.2;controls.update();controls.saveState();
const geo=new THREE.BufferGeometry();geo.setAttribute("position",new THREE.Float32BufferAttribute(geomData.positions,3));geo.setAttribute("aPlane",new THREE.Float32BufferAttribute(geomData.planeNormals,3));geo.computeVertexNormals();
const uni={uTime:{value:1},uIntensity:{value:1},uEffect:{value:1},uScroll:{value:1},uView:{value:1}};
const mat=new THREE.ShaderMaterial({uniforms:uni,vertexShader:`attribute vec3 aPlane;varying vec3 p,nFace,nSmooth;
void main(){p=position;nFace=mat3(modelViewMatrix)*aPlane;nSmooth=mat3(modelViewMatrix)*normalize(position/vec3(1.13*1.13,.94*.94,.87*.87));gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
fragmentShader:`precision highp float;uniform float uTime,uIntensity,uEffect,uScroll,uView;varying vec3 p,nFace,nSmooth;
void main(){vec3 N=.72*nFace+.28*normalize(nSmooth);
float rough=sin(p.x*26.+p.y*19.)*cos(p.z*23.-p.y*29.);N.x+=.027*rough;N.y+=.022*sin(p.x*39.+p.z*17.);N=normalize(N);
vec3 light=normalize(vec3(-.45,.75,.65));float diffuse=max(dot(N,light),0.);
float grain=.5+.5*sin(p.x*65.+p.y*32.)*sin(p.z*57.+p.y*74.);float marble=sin(p.x*8.+p.y*5.+sin(p.z*7.));
vec3 base=vec3(.29,.32,.36)*(.38+.65*diffuse)*(.86+.12*grain)+.025*marble;
vec3 r=reflect(vec3(0.,0.,-1.),N);float u=r.x,v=r.y,t=uTime;
float flow=sin(5.*u+3.*v-t*1.6+1.2*sin(3.*v+t*.65));float ribbons=exp(-pow((flow-.56)/.18,2.));
float wisps=exp(-pow((sin(7.*v-2.*u+t*.9+sin(u*4.))+.25)/.25,2.));
float surf=p.x*3.8+p.y*2.4+sin(p.z*5.)-t*.7;float scroll=exp(-pow(sin(surf)/.26,2.));
float strength=(uView*(.66*ribbons+.25*wisps)+uScroll*.18*scroll)*(.3+.7*clamp(N.z,0.,1.));
float gold=exp(-pow((sin(u*4.-v*3.-t*.8)-.75)/.14,2.))*.5*uView;
vec3 glow=vec3(.18,.63,1.)*strength+vec3(1.,.62,.18)*gold;
float spec=pow(max(dot(N,normalize(light+vec3(0.,0.,1.))),0.),40.);
vec3 color=base+uEffect*uIntensity*glow+spec*mix(.12,.65,uEffect);gl_FragColor=vec4(clamp(color,0.,1.),1.);}`});
const rock=new THREE.Mesh(geo,mat);scene.add(rock);
const shadowMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,vertexShader:`varying vec2 u;void main(){u=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec2 u;void main(){float a=exp(-dot((u-.5)*vec2(3.,8.),(u-.5)*vec2(3.,8.)))*.55;gl_FragColor=vec4(0.,0.,0.,a);}`});
const shadow=new THREE.Mesh(new THREE.PlaneGeometry(3.6,2),shadowMat);shadow.rotation.x=-Math.PI/2;shadow.position.y=-1.04;scene.add(shadow);
const target=new THREE.WebGLRenderTarget(1,1,{depthBuffer:true});const postScene=new THREE.Scene();const postCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
const postMat=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{tex:{value:target.texture},resolution:{value:new THREE.Vector2(1,1)},bloom:{value:.38}},vertexShader:`varying vec2 u;void main(){u=uv;gl_Position=vec4(position.xy,0.,1.);}`,fragmentShader:`precision highp float;varying vec2 u;uniform sampler2D tex;uniform vec2 resolution;uniform float bloom;
vec3 bright(vec2 uv){return max(texture2D(tex,uv).rgb-vec3(.45),vec3(0.));}
void main(){vec3 c=texture2D(tex,u).rgb;vec3 g=vec3(0.);for(int i=0;i<16;i++){float a=float(i)*6.2831853/16.;g+=bright(u+vec2(cos(a),sin(a))*9./resolution);}g=g/16.;c+=g*bloom*.45;gl_FragColor=vec4(pow(clamp(c,0.,1.),vec3(.9)),1.);}`});
postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),postMat));
function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;renderer.setSize(w,h,false);const a=w/h;camera.left=-1.7*a;camera.right=1.7*a;camera.top=1.7;camera.bottom=-1.7;camera.updateProjectionMatrix();const s=renderer.getDrawingBufferSize(new THREE.Vector2());target.setSize(s.x,s.y);postMat.uniforms.resolution.value.copy(s);}
window.addEventListener("resize",resize);resize();let paused=false,time=1,last=performance.now();const $=id=>document.getElementById(id);
$("pause").onclick=()=>{paused=!paused;$("pause").textContent=paused?"빛 흐름 재생":"빛 흐름 일시정지";$("pause").setAttribute("aria-pressed",String(paused));};
$("reset").onclick=()=>controls.reset();
$("effect").onchange=e=>{uni.uEffect.value=e.target.checked?1:0;};
$("scroll").onchange=e=>{uni.uScroll.value=e.target.checked?1:0;};
$("view").onchange=e=>{uni.uView.value=e.target.checked?1:0;};
$("intensity").oninput=e=>{uni.uIntensity.value=Number(e.target.value);$("intensityValue").textContent=Number(e.target.value).toFixed(2);};
$("speed").oninput=e=>{$("speedValue").textContent=Number(e.target.value).toFixed(2);};
$("bloom").oninput=e=>{postMat.uniforms.bloom.value=Number(e.target.value);$("bloomValue").textContent=Number(e.target.value).toFixed(2);};
$("wireframe").onchange=e=>{mat.wireframe=e.target.checked;};
$("snapshot").onclick=()=>{draw();const a=document.createElement("a");a.href=canvas.toDataURL("image/png");a.download="glowing-stone-view.png";a.click();};
function draw(){renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(postScene,postCamera);}
function animate(now){requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.05);last=now;if(!paused&&!document.hidden)time+=dt*Number($("speed").value);uni.uTime.value=time;controls.update();draw();}
requestAnimationFrame(animate);window.__stoneViewer={ready:true,geometry:{vertices:geomData.vertexCount,faces:geomData.faceCount,triangles:geomData.triangles},getState:()=>({time,paused,effect:uni.uEffect.value,intensity:uni.uIntensity.value,scroll:uni.uScroll.value,view:uni.uView.value,zoom:camera.zoom,camera:camera.position.toArray(),bloom:postMat.uniforms.bloom.value}),renderer};
$("status").textContent=`실시간 3D · ${geomData.triangles}개 삼각형 · 외부 다운로드 없음`;
