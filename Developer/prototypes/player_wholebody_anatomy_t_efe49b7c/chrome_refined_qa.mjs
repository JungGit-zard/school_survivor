import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire('F:/From_SSD_D_20261005/JungSil/2.Minigame_project/school_survivor-integration/Developer/r3f_prototype/package.json');
const { chromium } = require('@playwright/test');
const root='F:/From_SSD_D_20261005/JungSil/2.Minigame_project/school_survivor-integration';
const html=path.join(root,'Graphic_designer/game_resource_library/source-art/player_wholebody_refined_t_efe49b7c/PLAYER_wholebody_refined_t_efe49b7c_standalone.html');
const outDir=path.join(root,'Quaility_Assurance/player_wholebody_refined_t_efe49b7c/chrome');
fs.mkdirSync(outDir,{recursive:true});
const result={viewer:html,url:'file:///'+html.replaceAll('\\','/'),console:[],pageErrors:[],requestFailed:[],externalRequests:[],screenshots:[],outlineComparisons:[],inspect:null,ready:false};
let browser;
const sha256File=async p=>{const crypto=await import('node:crypto');return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');};
try{
  browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  const page=await browser.newPage({viewport:{width:1280,height:960},deviceScaleFactor:1});
  page.on('console',m=>result.console.push({type:m.type(),text:m.text()}));
  page.on('pageerror',e=>result.pageErrors.push(String(e.stack||e.message||e)));
  page.on('request',req=>{const u=req.url(); if(!u.startsWith('file:')&&!u.startsWith('blob:')&&!u.startsWith('data:')) result.externalRequests.push(u);});
  page.on('requestfailed',req=>result.requestFailed.push({url:req.url(),failure:req.failure()?.errorText||'failed'}));
  await page.goto(result.url,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>window.__READY===true,null,{timeout:30000});
  result.ready=true;
  result.inspect=await page.evaluate(()=>window.inspect());

  const captures=[
    ['after_front_outline_on',()=>window.loadAsset('after_wholebody').then(()=>{window.setScope('all');window.setWireframe(false);window.showRef(null);window.setOutlineVisible(true);window.setView('front')})],
    ['after_front_outline_off',()=>{window.setOutlineVisible(false);window.setView('front')}],
    ['after_side_outline_on',()=>{window.setOutlineVisible(true);window.setView('side')}],
    ['after_side_outline_off',()=>{window.setOutlineVisible(false);window.setView('side')}],
    ['after_left_outline_on',()=>{window.setOutlineVisible(true);window.setView('left')}],
    ['after_left_outline_off',()=>{window.setOutlineVisible(false);window.setView('left')}],
    ['after_rear_outline_on',()=>{window.setOutlineVisible(true);window.setView('back')}],
    ['after_rear_outline_off',()=>{window.setOutlineVisible(false);window.setView('back')}],
    ['after_top_outline_on',()=>{window.setOutlineVisible(true);window.setView('top')}],
    ['after_top_outline_off',()=>{window.setOutlineVisible(false);window.setView('top')}],
    ['after_threequarter_outline_on',()=>{window.setOutlineVisible(true);window.setView('threequarter')}],
    ['after_front_oblique_head_outline_on',()=>{window.setOutlineVisible(true);window.headOblique('front3q')}],
    ['after_rear_oblique_head_outline_on',()=>{window.setOutlineVisible(true);window.headOblique('rear3q')}],
    ['after_low_front_head_underside_outline_on',()=>{window.setOutlineVisible(true);window.headLow('lowFront')}],
    ['after_low_front_head_underside_outline_off',()=>{window.setOutlineVisible(false);window.headLow('lowFront')}],
    ['after_low_front_right_oblique_head_underside_outline_on',()=>{window.setOutlineVisible(true);window.headLow('lowFrontRight')}],
    ['after_low_front_right_oblique_head_underside_outline_off',()=>{window.setOutlineVisible(false);window.headLow('lowFrontRight')}],
    ['after_low_front_left_oblique_head_underside_outline_on',()=>{window.setOutlineVisible(true);window.headLow('lowFrontLeft')}],
    ['after_low_front_left_oblique_head_underside_outline_off',()=>{window.setOutlineVisible(false);window.headLow('lowFrontLeft')}],
    ['after_low_rear_head_underside_outline_on',()=>{window.setOutlineVisible(true);window.headLow('lowRear')}],
    ['after_low_rear_head_underside_outline_off',()=>{window.setOutlineVisible(false);window.headLow('lowRear')}],
    ['after_front_close_outline_on',()=>{window.setOutlineVisible(true);window.faceClose()}],
    ['after_wire_scope_foundation_outline_off',()=>{window.setOutlineVisible(false);window.setScope('foundation');window.setWireframe(true);window.setView('front')}],
    ['after_overlay_front_diagnostic_outline_on',()=>{window.setWireframe(false);window.setOutlineVisible(true);window.setScope('all');window.showRef('front')}],
    ['after_overlay_side_diagnostic_outline_on',()=>{window.setOutlineVisible(true);window.showRef('side')}],
    ['after_hair_off_front_diagnostic_outline_on',()=>{window.showRef(null);window.setOutlineVisible(true);window.setScope('hair_off');window.setView('front')}],
    ['before_front_outline_on',()=>window.loadAsset('before_topshape').then(()=>{window.setScope('all');window.setWireframe(false);window.showRef(null);window.setOutlineVisible(true);window.setView('front')})],
    ['before_side_outline_on',()=>{window.setOutlineVisible(true);window.setView('side')}]
  ];
  for(const [name,fn] of captures){
    await page.evaluate(fn);
    await page.waitForTimeout(250);
    const p=path.join(outDir,`${name}.png`);
    await page.screenshot({path:p});
    result.screenshots.push({name,path:p,sha256:null});
  }

  await page.evaluate(()=>window.loadAsset('after_wholebody'));
  const compareSetups=[
    ['front',()=>{window.setScope('all');window.setWireframe(false);window.showRef(null);window.setView('front')}],
    ['side',()=>{window.setScope('all');window.setView('side')}],
    ['left',()=>{window.setScope('all');window.setView('left')}],
    ['rear',()=>{window.setScope('all');window.setView('back')}],
    ['top',()=>{window.setScope('all');window.setView('top')}],
    ['lowFront',()=>window.headLow('lowFront')],
    ['lowFrontRight',()=>window.headLow('lowFrontRight')],
    ['lowFrontLeft',()=>window.headLow('lowFrontLeft')],
    ['lowRear',()=>window.headLow('lowRear')]
  ];
  for(const [name,setup] of compareSetups){
    await page.evaluate(setup);
    await page.waitForTimeout(100);
    result.outlineComparisons.push(await page.evaluate(label=>window.compareCurrentOutlineInterior(label),name));
  }
  result.inspectAfterComparisons=await page.evaluate(()=>window.inspect());

  async function measureThickness(label, setup, regions){
    await page.evaluate(setup);
    await page.waitForTimeout(100);
    const px=await page.evaluate(async()=>{
      window.setOutlineVisible(false); const off=await window.captureTransparentPixels();
      window.setOutlineVisible(true); const on=await window.captureTransparentPixels();
      return {off,on};
    });
    const w=px.off.width,h=px.off.height,n=w*h,INF=1e9;
    const dist=new Float32Array(n); dist.fill(INF);
    let minX=w,minY=h,maxX=0,maxY=0,opaque=0;
    for(let i=0,j=0;i<n;i++,j+=4){
      if(px.off.data[j+3]>16){dist[i]=0; opaque++; const x=i%w,y=(i/w)|0; if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;}
    }
    const d1=1,d2=1.41421356;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;let v=dist[i];if(x>0)v=Math.min(v,dist[i-1]+d1);if(y>0)v=Math.min(v,dist[i-w]+d1);if(x>0&&y>0)v=Math.min(v,dist[i-w-1]+d2);if(x+1<w&&y>0)v=Math.min(v,dist[i-w+1]+d2);dist[i]=v;}
    for(let y=h-1;y>=0;y--)for(let x=w-1;x>=0;x--){const i=y*w+x;let v=dist[i];if(x+1<w)v=Math.min(v,dist[i+1]+d1);if(y+1<h)v=Math.min(v,dist[i+w]+d1);if(x+1<w&&y+1<h)v=Math.min(v,dist[i+w+1]+d2);if(x>0&&y+1<h)v=Math.min(v,dist[i+w-1]+d2);dist[i]=v;}
    const out={label,width:w,height:h,opaque,bbox:{minX,minY,maxX,maxY},regions:{}};
    for(const [rname,frac] of Object.entries(regions)){
      const y0=minY+(maxY-minY)*frac[0], y1=minY+(maxY-minY)*frac[1];
      const vals=[];
      for(let i=0,j=0;i<n;i++,j+=4){
        const y=(i/w)|0; if(y<y0||y>y1) continue;
        const oa=px.off.data[j+3], na=px.on.data[j+3];
        const onBlack=px.on.data[j]<25&&px.on.data[j+1]<20&&px.on.data[j+2]<30&&na>16;
        if(oa<=16 && onBlack && dist[i]<20) vals.push(dist[i]);
      }
      vals.sort((a,b)=>a-b);
      const q=q=>vals.length?vals[Math.min(vals.length-1,Math.floor((vals.length-1)*q))]:null;
      const mean=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;
      out.regions[rname]={count:vals.length,mean,p50:q(.5),p80:q(.8),p90:q(.9),p95:q(.95),max:vals.length?vals[vals.length-1]:null};
    }
    return out;
  }
  result.outlineThicknessMeasurements=[];
  result.outlineThicknessMeasurements.push(await measureThickness('front_full_head_vs_lower',()=>{window.setScope('all');window.setWireframe(false);window.showRef(null);window.setOutlineWidthPx(6);window.setView('front')},{head:[0,0.38],lowerBody:[0.58,1]}));
  result.outlineThicknessMeasurements.push(await measureThickness('threequarter_full_head_vs_lower',()=>{window.setScope('all');window.setWireframe(false);window.showRef(null);window.setOutlineWidthPx(6);window.setView('threequarter')},{head:[0,0.38],lowerBody:[0.58,1]}));
  result.outlineThicknessMeasurements.push(await measureThickness('low_front_head_close',()=>{window.setScope('all');window.setWireframe(false);window.showRef(null);window.setOutlineWidthPx(6);window.headLow('lowFront')},{headClose:[0,1]}));
  await page.setViewportSize({width:900,height:700});
  await page.evaluate(()=>{window.setOutlineWidthPx(5); window.setView('front');});
  await page.waitForTimeout(100);
  result.inspectResizedWidth5=await page.evaluate(()=>window.inspect());
  await page.evaluate(()=>window.setOutlineWidthPx(6));
  await page.setViewportSize({width:1280,height:960});

} finally { if(browser) await browser.close(); }
for(const s of result.screenshots){s.sha256=await sha256File(s.path);}
const i=result.inspect;
const expectedGradient=[45,105,170,225,255];
const THREE_SIDE={FrontSide:0,BackSide:1};
const STENCIL={Always:519,NotEqual:517,Keep:7680,Replace:7681};
const allVisibleSourceMeshToon=!!(i && i.materials.filter(m=>m.visible).every(m=>
  m.types.every(t=>t==='MeshToonMaterial') &&
  m.side.every(s=>s===THREE_SIDE.FrontSide) &&
  m.transparent.every(t=>t===false) &&
  m.opacity.every(o=>o===1) &&
  m.depth.every(d=>d[0]===true && d[1]===true) &&
  m.stencil.every(s=>s[0]===true && s[1]===3 && s[2]===STENCIL.Always && s[3]===STENCIL.Keep && s[4]===STENCIL.Keep && s[5]===STENCIL.Replace) &&
  m.gradientNearest.every(Boolean) &&
  !m.custom_shader
));
const allOutlineMaterials=!!(i && i.outlineMaterials.every(m=>
  m.types.every(t=>t==='MeshBasicMaterial') &&
  m.side.every(s=>s===THREE_SIDE.BackSide) &&
  m.transparent.every(t=>t===true) &&
  m.opacity.every(o=>Math.abs(o-0.96)<1e-9) &&
  m.depth.every(d=>d[0]===true && d[1]===false) &&
  m.stencil.every(s=>s[0]===true && s[1]===3 && s[2]===STENCIL.NotEqual && s[3]===STENCIL.Keep && s[4]===STENCIL.Keep && s[5]===STENCIL.Keep) &&
  m.custom_shader===true &&
  m.hasOutlineNormal===true &&
  m.outlineWidthPx===6 &&
  m.outlineNormalMode==='welded_position_average'
));
const comparisonsPass=result.outlineComparisons.length===9 && result.outlineComparisons.every(c=>c.pass && c.newBlackInside===0 && c.baselineOpaque>0 && c.newBlackOutside>0);
const resizedUniformsPass=!!(result.inspectResizedWidth5 && result.inspectResizedWidth5.outlineWidthPx===5 && result.inspectResizedWidth5.outlineViewport?.w===900 && result.inspectResizedWidth5.outlineViewport?.h===550 && result.inspectResizedWidth5.outlineMaterials.every(m=>m.outlineWidthPx===5 && m.uniformWidthPx.every(v=>v===5) && m.uniformViewport.every(v=>v && v.w===900 && v.h===550)));
const thicknessStats=[];
for(const m of result.outlineThicknessMeasurements||[]) for(const [region,stats] of Object.entries(m.regions||{})) thicknessStats.push({...stats,label:m.label,region});
const thicknessMeasured=thicknessStats.length>=5 && thicknessStats.every(t=>t.count>20 && t.p50>=0.7 && t.p50<=4.5 && t.p90>=1.2 && t.p90<=7.5);
const frontMeasure=result.outlineThicknessMeasurements?.find(m=>m.label==='front_full_head_vs_lower');
const headLowerP90Close=!!(frontMeasure && Math.abs(frontMeasure.regions.head.p90-frontMeasure.regions.lowerBody.p90)<=2.25);
result.pass=!!(result.ready && i && i.triangles===1220 && i.baseTriangles===1220 && i.outlines===true && i.outlineTechnique==='stencil_screen_space_pixel_hull' && i.outlineWidthPxDefault===6 && i.outlineWidthPx===6 && i.outlineNormalMode==='welded_position_average' && i.outlineTriangles===1220 && i.addedOutlineDrawTriangles===1220 && i.totalDrawTriangles===2440 && i.outlineDrawMeshes>0 && i.rendererContext?.stencilRequested===true && i.rendererContext?.stencilAttribute===true && i.rendererContext?.stencilBits>0 && i.rendererContext?.alpha===true && i.fx===false && i.toonGradientWidth===5 && JSON.stringify(i.toonGradientValues)===JSON.stringify(expectedGradient) && i.toonGradientNearest===true && allVisibleSourceMeshToon && allOutlineMaterials && comparisonsPass && resizedUniformsPass && thicknessMeasured && headLowerP90Close && result.pageErrors.length===0 && result.requestFailed.length===0 && result.externalRequests.length===0 && !result.console.some(c=>c.type==='error'));
result.assertions={actualBaseTriangles1220:i?.triangles===1220,addedOutlineTriangles1220:i?.addedOutlineDrawTriangles===1220,totalDrawTriangles2440:i?.totalDrawTriangles===2440,outlinesTrue:i?.outlines===true,outlineTechniqueScreenPixel:i?.outlineTechnique==='stencil_screen_space_pixel_hull',outlineWidthDefault6:i?.outlineWidthPxDefault===6&&i?.outlineWidthPx===6,weldedNormals:i?.outlineNormalMode==='welded_position_average',rendererStencil:i?.rendererContext?.stencilAttribute===true&&i?.rendererContext?.stencilBits>0,gradientFiveBands:JSON.stringify(i?.toonGradientValues)===JSON.stringify(expectedGradient),gradientNearest:i?.toonGradientNearest===true,allVisibleSourceMeshToon,allOutlineMaterials,comparisonsPass,resizedUniformsPass,thicknessMeasured,headLowerP90Close,thicknessStats};
fs.writeFileSync(path.join(root,'Quaility_Assurance/player_wholebody_refined_t_efe49b7c/chrome_refined_qa.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
if(!result.pass) process.exit(1);
