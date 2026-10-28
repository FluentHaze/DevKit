import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const base = process.env.VITE_BASE_PATH || '/';
if (!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(base)) throw new Error('Invalid VITE_BASE_PATH');
const shell = await readFile('dist/index.html', 'utf8');
const tools = JSON.parse(await readFile('src/tools/metadata.json', 'utf8'));
// Pages 不提供 SPA rewrite；为每个稳定工具路由写入静态入口，刷新也返回 200。
for (const { slug } of tools) {
  const directory = `dist/tools/${slug}`;
  await mkdir(directory, { recursive: true });
  await writeFile(`${directory}/index.html`, shell);
}
await writeFile('dist/404.html', shell);
await writeFile('dist/.nojekyll', '');

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) =>
      entry.isDirectory() ? walk(`${dir}/${entry.name}`) : `${dir}/${entry.name}`
    )
  );
  return files.flat();
}
const files = (await walk('dist')).filter(
  (path) => !path.endsWith('sw.js') && !path.endsWith('offline-manifest.json')
);
const version = createHash('sha256').update(shell).digest('hex').slice(0, 12);
const prefix = `devkit-${base.replace(/[^a-zA-Z0-9-]/g, '_')}-`;
await writeFile(
  'dist/offline-manifest.json',
  JSON.stringify({ version, files: [base, ...files.map((path) => base + path.slice(5))] })
);
await writeFile(
  'dist/sw.js',
  `const ROOT=${JSON.stringify(base)};
const CACHE=${JSON.stringify(prefix + version)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll([ROOT,ROOT+'index.html',ROOT+'favicon.svg',ROOT+'offline-manifest.json']))));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(ROOT))return;event.respondWith(caches.open(CACHE).then(async cache=>{const key=event.request.mode==='navigate'?ROOT+'index.html':event.request;const hit=await cache.match(key,{ignoreVary:true});if(hit)return hit;try{const response=await fetch(event.request);if(response.ok)await cache.put(key,response.clone());return response;}catch(error){if(event.request.mode==='navigate'){const shell=await cache.match(ROOT+'index.html');if(shell)return shell;}throw error;}}));});`
);
console.log(`Offline manifest: ${files.length} local resources; base: ${base}`);
