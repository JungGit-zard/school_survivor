// Dev-only browser oracle; run via gstack eval in rosari-room-qa.html, never imported by the app.
(() => {
  const state = window.rosariThree.getState()
  const scene = state.scene
  const character = scene.children.find(n => n.type === 'Group' && n.children.length === 1)
  const room = scene.children.find(n => n.type === 'Group' && n !== character)
  const original = {
    cameraPosition: state.camera.position.clone(), cameraQuaternion: state.camera.quaternion.clone(),
    position: character.position.clone(), rotation: character.rotation.clone(), scale: character.scale.clone(),
    roomVisible: room.visible, background: scene.background.clone(), frameloop: state.frameloop, renderDpr: state.gl.getPixelRatio(),
    poses: [], materials: [],
  }
  character.traverse(n => {
    original.poses.push([n, n.position.clone(), n.quaternion.clone(), n.scale.clone()])
    if (n.isMesh && !n.userData.isOutline) original.materials.push(...(Array.isArray(n.material) ? n.material : [n.material]))
  })
  state.setFrameloop('never')
  const render = () => {
    const s = window.rosariThree.getState()
    character.traverse(n => { if(n.userData.isOutline && n.material.userData.outlineUniforms) n.material.userData.outlineUniforms.outlineViewport.value.set(s.size.width, s.size.height) })
    scene.updateMatrixWorld(true); s.camera.updateMatrixWorld(true); s.gl.render(scene, s.camera)
  }
  window.rosariVisualQa = {
    render,
    dpr(value) {
      if (![1, 2, 3].includes(value)) throw new Error('QA DPR must be 1, 2 or 3')
      state.setDpr(value)
      render()
      return this.info()
    },
    angle(degrees, outline = true, nonuniform = false) {
      room.visible = false
      character.position.copy(original.position)
      character.rotation.set(0, degrees * Math.PI / 180, 0)
      character.scale.copy(original.scale)
      if(nonuniform) character.scale.multiply({x:0.65,y:1.25,z:1.15})
      state.camera.position.set(0, 0.85, 4.2)
      state.camera.lookAt(character.position.x, 0.7, character.position.z)
      scene.background.set('#fff1f4')
      character.traverse(n => { if(n.userData.isOutline) n.visible = outline })
      render()
      return {degrees, outline, nonuniform, dpr:devicePixelRatio, renderDpr:state.gl.getPixelRatio(), size:state.size}
    },
    async stability(frames = 180) {
      this.restore()
      const samples = []
      dispatchEvent(new KeyboardEvent('keydown', {key:'d',code:'KeyD',bubbles:true,cancelable:true}))
      try {
        for (let i = 0; i < frames; i++) {
          await new Promise(requestAnimationFrame)
          let finite = true
          character.traverse(n => { if (!n.matrixWorld.elements.every(Number.isFinite)) finite = false })
          samples.push({frame:i,finite,position:character.position.toArray(),arm:character.getObjectByName('left_shoulder_pivot')?.rotation.x,geometries:state.gl.info.memory.geometries,textures:state.gl.info.memory.textures})
        }
        return {frames:samples.length,allFinite:samples.every(s=>s.finite),poses:new Set(samples.map(s=>s.arm)).size,geometryCounts:[...new Set(samples.map(s=>s.geometries))],textureCounts:[...new Set(samples.map(s=>s.textures))],first:samples[0],last:samples.at(-1)}
      } finally {
        dispatchEvent(new KeyboardEvent('keyup', {key:'d',code:'KeyD',bubbles:true,cancelable:true}))
      }
    },
    walkPose() {
      dispatchEvent(new KeyboardEvent('keydown', {key:'w',code:'KeyW',bubbles:true,cancelable:true}))
      for(let i=0;i<12;i++) state.advance(state.clock.elapsedTime + 1/60)
      dispatchEvent(new KeyboardEvent('keyup', {key:'w',code:'KeyW',bubbles:true,cancelable:true}))
      render()
      return character.position.toArray()
    },
    restore() {
      for(const [n,p,q,s] of original.poses){n.position.copy(p);n.quaternion.copy(q);n.scale.copy(s)}
      character.position.copy(original.position); character.rotation.copy(original.rotation); character.scale.copy(original.scale)
      character.traverse(n => {if(n.userData.isOutline) n.visible=true})
      room.visible = original.roomVisible; scene.background.copy(original.background)
      state.camera.position.copy(original.cameraPosition); state.camera.quaternion.copy(original.cameraQuaternion)
      state.setDpr(original.renderDpr)
      render(); state.setFrameloop(original.frameloop)
      return 'RESTORED_IN_MEMORY_ONLY_NO_FIREBASE_ACCESS'
    },
    info() {
      const s = window.rosariThree.getState()
      return { deviceDpr: devicePixelRatio, renderDpr: s.gl.getPixelRatio(), size: s.size,
        buffer:[s.gl.domElement.width,s.gl.domElement.height],
        drawCalls:s.gl.info.render.calls,triangles:s.gl.info.render.triangles,
        geometries:s.gl.info.memory.geometries,textures:s.gl.info.memory.textures,
        materials: original.materials.length,
        outlineUniforms:(()=>{const out=[];character.traverse(n=>{if(n.userData.isOutline)out.push({viewport:n.material.userData.outlineUniforms?.outlineViewport.value.toArray(),normalMatrix:n.normalMatrix.elements.slice()})});return out.slice(0,3)})()}
    },
  }
  return JSON.stringify(window.rosariVisualQa.info())
})()
