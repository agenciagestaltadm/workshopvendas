import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');

const DEFAULT_META = {
  title: 'Evento de Capacitação',
  description: 'Evento com inscrições e programação configuráveis.',
  image: '/favicon.ico',
};

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
};

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  '';

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const escapeHtml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const ensureLeadingSlash = (value) => (value.startsWith('/') ? value : `/${value}`);

const buildOrigin = (req) => {
  if (process.env.SITE_URL) {
    return process.env.SITE_URL.replace(/\/$/, '');
  }

  const forwardedProto = req.headers['x-forwarded-proto'];
  const forwardedHost = req.headers['x-forwarded-host'];
  const protocol = typeof forwardedProto === 'string' ? forwardedProto : 'http';
  const host = typeof forwardedHost === 'string' ? forwardedHost : req.headers.host;
  return `${protocol}://${host}`;
};

const getAssetUrl = (req, assetPath) => {
  if (!assetPath) return null;
  if (assetPath.startsWith('http://') || assetPath.startsWith('https://')) return assetPath;

  const origin = buildOrigin(req);

  if (assetPath.startsWith('/')) {
    return `${origin}${assetPath}`;
  }

  if (!supabaseUrl) return `${origin}${ensureLeadingSlash(assetPath)}`;
  return `${supabaseUrl}/storage/v1/object/public/site-assets/${assetPath}`;
};

const fetchSiteSettings = async () => {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.rpc('get_site_settings');
    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
};

const replaceTagContent = (html, pattern, replacement) => {
  if (!pattern.test(html)) {
    return html;
  }
  return html.replace(pattern, replacement);
};

const injectMeta = (html, req, settings) => {
  const title = settings?.seo_title?.trim() || DEFAULT_META.title;
  const description = settings?.seo_description?.trim() || DEFAULT_META.description;
  const image =
    getAssetUrl(req, settings?.logo_main_path) ||
    getAssetUrl(req, settings?.logo_nav_path) ||
    getAssetUrl(req, settings?.favicon_path) ||
    `${buildOrigin(req)}${DEFAULT_META.image}`;
  const pageUrl = `${buildOrigin(req)}${req.url === '/' ? '' : req.url}`;
  const favicon = getAssetUrl(req, settings?.favicon_path) || `${buildOrigin(req)}/favicon.ico`;

  let result = html;
  result = replaceTagContent(result, /<title>.*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  result = replaceTagContent(
    result,
    /<meta\s+name="description"\s+content=".*?"\s*\/?>/i,
    `<meta name="description" content="${escapeHtml(description)}" />`,
  );
  result = replaceTagContent(
    result,
    /<meta\s+property="og:title"\s+content=".*?"\s*\/?>/i,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
  );
  result = replaceTagContent(
    result,
    /<meta\s+property="og:description"\s+content=".*?"\s*\/?>/i,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
  );
  result = replaceTagContent(
    result,
    /<meta\s+property="og:image"\s+content=".*?"\s*\/?>/i,
    `<meta property="og:image" content="${escapeHtml(image)}" />`,
  );
  result = replaceTagContent(
    result,
    /<meta\s+property="og:url"\s+content=".*?"\s*\/?>/i,
    `<meta property="og:url" content="${escapeHtml(pageUrl)}" />`,
  );
  result = replaceTagContent(
    result,
    /<meta\s+name="twitter:title"\s+content=".*?"\s*\/?>/i,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
  );
  result = replaceTagContent(
    result,
    /<meta\s+name="twitter:description"\s+content=".*?"\s*\/?>/i,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
  );
  result = replaceTagContent(
    result,
    /<meta\s+name="twitter:image"\s+content=".*?"\s*\/?>/i,
    `<meta name="twitter:image" content="${escapeHtml(image)}" />`,
  );
  result = replaceTagContent(
    result,
    /<link\s+rel="icon"\s+href=".*?"\s*\/?>/i,
    `<link rel="icon" href="${escapeHtml(favicon)}" />`,
  );

  return result;
};

const sendFile = async (res, filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  const file = await readFile(filePath);

  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': ext === '.html' ? 'no-store, must-revalidate' : 'public, max-age=31536000, immutable',
  });
  res.end(file);
};

const server = createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = decodeURIComponent(requestUrl.pathname);
    const requestedPath = path.join(distDir, pathname);
    const safeRequestedPath = path.resolve(requestedPath);

    if (!safeRequestedPath.startsWith(distDir)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Acesso negado');
      return;
    }

    const hasExtension = path.extname(pathname) !== '';

    if (hasExtension) {
      try {
        const fileStats = await stat(safeRequestedPath);
        if (fileStats.isFile()) {
          await sendFile(res, safeRequestedPath);
          return;
        }
      } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Arquivo não encontrado');
        return;
      }
    }

    const templatePath = path.join(distDir, 'index.html');
    const template = await readFile(templatePath, 'utf8');
    const settings = await fetchSiteSettings();
    const html = injectMeta(template, req, settings);

    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, must-revalidate',
    });
    res.end(html);
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(error instanceof Error ? error.message : 'Erro interno do servidor');
  }
});

const port = Number(process.env.PORT || 3000);

server.listen(port, () => {
  console.log(`Servidor iniciado em http://localhost:${port}`);
});
