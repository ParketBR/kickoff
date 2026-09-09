/* Servidor estático mínimo para o catálogo (sem dependências).
   Vive no projeto de propósito: a versão anterior morava no scratchpad
   temporário de uma sessão e o launch.json apontava para um caminho que
   deixava de existir na sessão seguinte.

   Uso: node .claude/serve.js [raiz] [--port=5178] */

const http = require('http');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const flag = (nome) => {
  const a = args.find((x) => x.startsWith(`--${nome}=`));
  return a ? a.split('=')[1] : undefined;
};

const raiz = path.resolve(args.find((a) => !a.startsWith('--')) || process.cwd());
const portaInicial = Number(flag('port') || process.env.PORT || 5178);

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.tiff': 'image/tiff',
};

const servidor = http.createServer((req, res) => {
  let rel;
  try {
    // decodeURIComponent é obrigatório: há pastas com espaço e acento
    // ("imagens descritivas", "8.1 Tipo de Paginação")
    rel = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400).end('URL inválida');
    return;
  }

  let alvo = path.join(raiz, rel);

  // trava de escopo: nada fora da raiz servida
  if (!alvo.startsWith(raiz)) {
    res.writeHead(403).end('Fora do escopo');
    return;
  }

  fs.stat(alvo, (err, st) => {
    if (!err && st.isDirectory()) alvo = path.join(alvo, 'index.html');

    fs.readFile(alvo, (err2, buf) => {
      if (err2) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 — ' + rel);
        return;
      }
      res.writeHead(200, {
        'Content-Type': TIPOS[path.extname(alvo).toLowerCase()] || 'application/octet-stream',
        // sem cache: o catálogo é editado ao vivo e o navegador segurava CSS velho
        'Cache-Control': 'no-store',
      });
      res.end(buf);
    });
  });
});

// se a porta estiver ocupada, sobe na seguinte em vez de morrer
let porta = portaInicial;
servidor.on('error', (e) => {
  if (e.code === 'EADDRINUSE' && porta < portaInicial + 20) {
    servidor.listen(++porta, '127.0.0.1');
  } else {
    console.error(e.message);
    process.exit(1);
  }
});

servidor.listen(porta, '127.0.0.1', () => {
  console.log(`servindo ${raiz}`);
  console.log(`http://localhost:${porta}`);
});
