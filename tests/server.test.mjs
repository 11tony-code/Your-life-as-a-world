import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {readJson,validateModelResult,handleApi} from '../server/guide.mjs';
const facts={records:[{id:'known',artist:'Known Artist'}],years:[2024]};
test('model targets are restricted to supplied evidence',()=>{assert.deepEqual(validateModelResult({text:'Hello',target:{song:'invented'}},facts).target,{});assert.deepEqual(validateModelResult({text:'Hello',target:{song:'known'}},facts).target,{song:'known'});assert.deepEqual(validateModelResult({text:'Hello',target:{year:1900}},facts).target,{});assert.deepEqual(validateModelResult({text:'Hello',target:{artist:'Known Artist'}},facts).target,{artist:'Known Artist'});assert.throws(()=>validateModelResult({text:''},facts));});
test('request body is size bounded and parsed as data',async()=>{assert.deepEqual(await readJson(Readable.from([Buffer.from('{"query":"hi"}')]),100),{query:'hi'});await assert.rejects(readJson(Readable.from([Buffer.from('xxxxxxxxxx')]),5),/过大/);});
test('health endpoint identifies this app without returning credentials',async()=>{const req={url:'/api/health',method:'GET'};let result,status;const res={writeHead:s=>{status=s;},end:data=>{result=JSON.parse(data);}};await handleApi(req,res);assert.equal(status,200);assert.equal(result.app,'echo-atlas');assert.equal(typeof result.aiConfigured,'boolean');assert.equal(Object.hasOwn(result,'AI_API_KEY'),false);});
test('cross-origin requests cannot trigger model calls',async()=>{let status;const res={writeHead:s=>{status=s;},end:()=>{}};await handleApi({url:'/api/guide',method:'POST',headers:{origin:'https://untrusted.example',host:'127.0.0.1:4173'}},res);assert.equal(status,403);});
