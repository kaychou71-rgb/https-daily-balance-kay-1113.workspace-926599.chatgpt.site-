const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'web-preview');
http.createServer((req,res)=>{const name=new URL(req.url,'http://localhost').pathname;const file=path.resolve(root,'.'+decodeURIComponent(name==='/'?'/index.html':name));if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);return res.end('Not found');}res.setHeader('Content-Type',({'html':'text/html; charset=utf-8','css':'text/css','js':'application/javascript'})[file.split('.').pop()]||'application/octet-stream');res.end(data);});}).listen(4174,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4174'));

