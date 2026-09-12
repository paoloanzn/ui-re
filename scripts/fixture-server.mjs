#!/usr/bin/env node
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
const port=Number(process.argv[2]??4173);
if(!Number.isInteger(port)||port<1||port>65535)throw Error('Expected port 1..65535');
const server=createServer((request,response)=>{
 const path=request.url?.split('?')[0];
 if(path!=='/'&&path!=='/index.html'&&path!=='/landscape.svg'){response.writeHead(404);response.end();return;}
 const name=path==='/landscape.svg'?'landscape.svg':'index.html';
 response.setHeader('Content-Type',name.endsWith('.svg')?'image/svg+xml':'text/html');
 readFile(new URL(`../fixtures/site/${name}`,import.meta.url)).then(body=>response.end(body)).catch(()=>{response.writeHead(500);response.end();});
});
server.listen(port,'127.0.0.1',()=>console.log(`Fixture: http://127.0.0.1:${port}`));
