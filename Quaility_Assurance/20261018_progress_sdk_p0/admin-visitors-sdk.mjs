import {spawn} from 'node:child_process'
import {readFile,writeFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {initializeApp,deleteApp} from 'firebase/app'
import {getDatabase,connectDatabaseEmulator,ref,set,get,remove,serverTimestamp} from 'firebase/database'
const port=59438, ns='demo-admin-visitors',base=`http://127.0.0.1:${port}`,apps=[],rows=[]
const child=spawn('C:/Program Files/Android/Android Studio/jbr/bin/java.exe',['-jar','C:/Users/admin/.cache/firebase/emulators/firebase-database-emulator-v4.11.2.jar','--host','127.0.0.1','--port',String(port)],{windowsHide:true,stdio:'ignore'})
const owner={Authorization:'Bearer owner'}, hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex')
const read=async()=>await(await fetch(`${base}/.json?ns=${ns}`,{headers:owner})).json()
let initial, before
try{
 for(let i=0;i<100;i++){try{initial=await read();break}catch{await new Promise(r=>setTimeout(r,100))}}
 before=hash(initial)
 const rules=await readFile('database.rules.json','utf8'),r=await fetch(`${base}/.settings/rules.json?ns=${ns}`,{method:'PUT',headers:owner,body:rules});if(!r.ok)throw Error(await r.text())
 function db(uid,provider='google.com',email='synthetic@example.invalid',verified=true){const app=initializeApp({projectId:ns,apiKey:'demo',databaseURL:`https://${ns}.firebaseio.com`},String(apps.length));apps.push(app);const d=getDatabase(app);connectDatabaseEmulator(d,'127.0.0.1',port,{mockUserToken:{sub:uid,user_id:uid,email,email_verified:verified,firebase:{sign_in_provider:provider,identities:{}}}});return d}
 const a=db('synthetic-a'),b=db('synthetic-b'),guest=db('synthetic-guest','anonymous'),master=db('synthetic-master','google.com','zard5388@gmail.com')
 async function check(name,fn,allowed){let ok=true;try{await fn()}catch{ok=false}rows.push({name,passed:ok===allowed});if(ok!==allowed)throw Error(name+' unexpected permission')}
 const visit=(uid,authType,email)=>({uid,nickname:'QA',authType,...(email?{email}:{}),firstVisitedAt:serverTimestamp(),lastVisitedAt:serverTimestamp()})
 await check('google own actual visit',()=>set(ref(a,'adminVisitors/synthetic-a'),visit('synthetic-a','google.com','synthetic@example.invalid')),true)
 await check('master root read',()=>get(ref(master,'adminVisitors')),true)
 await check('ordinary root read denied',()=>get(ref(b,'adminVisitors')),false)
 await check('other uid read denied',()=>get(ref(b,'adminVisitors/synthetic-a')),false)
 await check('other uid write denied',()=>set(ref(b,'adminVisitors/synthetic-a'),visit('synthetic-a','google.com','synthetic@example.invalid')),false)
 await check('forged email denied',()=>set(ref(b,'adminVisitors/synthetic-b'),visit('synthetic-b','google.com','forged@example.invalid')),false)
 await check('anonymous without email',()=>set(ref(guest,'adminVisitors/synthetic-guest'),visit('synthetic-guest','anonymous')),true)
 await check('anonymous email forbidden',()=>set(ref(guest,'adminVisitors/synthetic-guest'),visit('synthetic-guest','anonymous','synthetic@example.invalid')),false)
 const imported={uid:'synthetic-b',nickname:'QA',authType:'unknown',provenance:'historical-auth-only',importedAt:serverTimestamp(),linkedGoogleEmail:'synthetic@example.invalid'}
 await check('master historical import has no invented visit time',()=>set(ref(master,'adminVisitors/synthetic-b'),imported),true)
 await check('owner cannot forge historical metadata',()=>set(ref(b,'adminVisitors/synthetic-b'),{...visit('synthetic-b','google.com','synthetic@example.invalid'),provenance:'historical-auth-only',importedAt:1,linkedGoogleEmail:'synthetic@example.invalid'}),false)
 await check('owner can read own transaction record',()=>get(ref(a,'adminVisitors/synthetic-a')),true)
 await check('other uid delete denied',()=>remove(ref(b,'adminVisitors/synthetic-a')),false)
 await check('own explicit account-delete allowed',()=>remove(ref(a,'adminVisitors/synthetic-a')),true)
 await fetch(`${base}/.json?ns=${ns}`,{method:'PUT',headers:owner,body:JSON.stringify(initial)})
 const final=await read();if(hash(final)!==before)throw Error('restore hash mismatch')
 await writeFile('admin-visitors-sdk-result.json',JSON.stringify({timestamp:new Date().toISOString(),actualSDK:true,syntheticAuth:true,productionWrites:0,rulesHash:createHash('sha256').update(rules).digest('hex'),passed:rows.length,failed:0,rows,initialHash:before,finalHash:hash(final),revisionBefore:null,revisionAfter:null},null,2))
 console.log('PASS '+rows.length+' rules checks; snapshot hash restored')
}finally{await Promise.all(apps.map(deleteApp));child.kill();await new Promise(r=>child.once('exit',r))}
