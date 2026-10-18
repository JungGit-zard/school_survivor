import { initializeApp } from 'firebase/app'
import { getDatabase, connectDatabaseEmulator, goOffline, goOnline } from 'firebase/database'
import * as progress from './src/lib/firebaseProgress.js'
import { useGameStore } from './src/store/useGameStore.js'
import { useAuthStore } from './src/store/useAuthStore.js'
const uid = 'synthetic-p0-user'
const app = initializeApp({projectId:'demo-ezs-progress-p0',apiKey:'demo-key',databaseURL:'https://demo-ezs-progress-p0.firebaseio.com',appId:'demo-app'})
const database=getDatabase(app,app.options.databaseURL)
connectDatabaseEmulator(database,'127.0.0.1',59437,{mockUserToken:{sub:uid,user_id:uid}})
const user={uid,displayName:'QA'}
window.qa = { progress, store:useGameStore, auth:useAuthStore, user, offline:()=>goOffline(database),online:()=>goOnline(database) }
window.qaReady = true
