import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
test('desktop limits navigation to local application and keeps renderer sandboxed',()=>{
 const {allowedNavigation,windowOptions}=require('../apps/desktop/policy.cjs');
 assert.equal(allowedNavigation('https://evil.example','http://127.0.0.1:3211'),false);
 assert.equal(allowedNavigation('file:///etc/passwd','http://127.0.0.1:3211'),false);
 assert.equal(allowedNavigation('http://127.0.0.1:3211/','http://127.0.0.1:3211'),true);
 assert.equal(windowOptions.nodeIntegration,false);assert.equal(windowOptions.sandbox,true);assert.equal(windowOptions.contextIsolation,true);
});
