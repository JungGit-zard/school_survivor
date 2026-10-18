import {createRequire} from 'node:module'
import {writeFile} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'
const require=createRequire('C:/Users/admin/AppData/Roaming/npm/node_modules/firebase-tools/package.json')
const{Command}=require('./lib/command.js'),{requireAuth}=require('./lib/requireAuth.js'),{Client}=require('./lib/apiv2.js'),{logger}=require('./lib/logger.js')
logger.silent=true
const site='escape-zombie-school',version='d6b5abe3d7bb45aa'
const app=new URL('../../Developer/r3f_prototype/',import.meta.url)
process.chdir(fileURLToPath(app))
await new Command('qa-read-hosting-manifest').before(requireAuth).action(async()=>{
 const client=new Client({urlPrefix:'https://firebasehosting.googleapis.com',apiVersion:'v1beta1'})
 const files=[];let pageToken
 do{const response=await client.get(`/sites/${site}/versions/${version}/files`,{queryParams:{pageSize:1000,...(pageToken?{pageToken}:{})}});files.push(...(response.body.files??[]));pageToken=response.body.nextPageToken}while(pageToken)
 const output={capturedAt:new Date().toISOString(),site,version,fileCount:files.length,files}
 await writeFile(new URL('./hosting-live-before.json',import.meta.url),JSON.stringify(output,null,2))
 console.log(JSON.stringify({version,count:files.length}))
}).runner()({project:site,nonInteractive:true,json:true})
