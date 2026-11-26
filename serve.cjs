const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=__dirname;
function createServer(){return http.createServer((req,res)=>{
  let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);return res.end();}
  const relative=pathname.replace(/^\/diary\//,'/');
  const file=path.resolve(root,'.'+(relative==='/'?'/index.html':relative));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);return res.end('Not found');}
    res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript','.webmanifest':'application/manifest+json','.json':'application/json','.png':'image/png'})[path.extname(file)]||'application/octet-stream');
    res.setHeader('Cache-Control','no-cache');res.end(data);
  });
});}
module.exports={createServer};
if(require.main===module)createServer().listen(4174,'127.0.0.1',()=>console.log('http://127.0.0.1:4174'));
