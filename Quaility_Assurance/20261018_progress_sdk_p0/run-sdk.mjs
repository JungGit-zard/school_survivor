import {readFile,writeFile,rm} from 'node:fs/promises'
import {spawn} from 'node:child_process'
import {randomUUID} from 'node:crypto'
import {fileURLToPath} from 'node:url'
const qa=new URL('./',import.meta.url),app=new URL('../../Developer/r3f_prototype/',qa)
const suffix=randomUUID(),runner=new URL(`.qa-sdk-${suffix}.mjs`,app),entry=new URL(`.qa-sdk-${suffix}.js`,app)
const source=(await readFile(new URL('sdk-harness.mjs',qa),'utf8')).replaceAll('qa-sdk-browser-entry.js',fileURLToPath(entry).replaceAll('\\','/'))
const outputs=[...source.matchAll(/writeFile\('([^']+)'/g)].map(m=>m[1]),saved=new Map()
for(const path of outputs){try{saved.set(path,await readFile(new URL(path,app)))}catch{saved.set(path,null)}}
let exitCode=1
try{
 await writeFile(runner,source);await writeFile(entry,await readFile(new URL('sdk-browser-entry.js',qa)))
 const child=spawn(process.execPath,[fileURLToPath(runner)],{cwd:fileURLToPath(app),windowsHide:true,stdio:'inherit'})
 exitCode=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',resolve)})
 for(const path of outputs){try{await writeFile(new URL(`evidence/${path}`,qa),await readFile(new URL(path,app)))}catch{}}
}finally{
 await rm(runner,{force:true});await rm(entry,{force:true})
 for(const[path,bytes]of saved){if(bytes===null)await rm(new URL(path,app),{force:true});else await writeFile(new URL(path,app),bytes)}
}
process.exitCode=exitCode??1
