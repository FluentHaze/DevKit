import { useState } from 'react';
import { Search, ArrowUpRight } from 'lucide-react';
import { Button, controlClass, type Translate } from '@/components/ui';
const codes = [
  [100, 'Continue'],
  [101, 'Switching Protocols'],
  [200, 'OK'],
  [201, 'Created'],
  [202, 'Accepted'],
  [204, 'No Content'],
  [206, 'Partial Content'],
  [301, 'Moved Permanently'],
  [302, 'Found'],
  [303, 'See Other'],
  [304, 'Not Modified'],
  [307, 'Temporary Redirect'],
  [308, 'Permanent Redirect'],
  [400, 'Bad Request'],
  [401, 'Unauthorized'],
  [403, 'Forbidden'],
  [404, 'Not Found'],
  [405, 'Method Not Allowed'],
  [406, 'Not Acceptable'],
  [408, 'Request Timeout'],
  [409, 'Conflict'],
  [410, 'Gone'],
  [412, 'Precondition Failed'],
  [413, 'Content Too Large'],
  [415, 'Unsupported Media Type'],
  [416, 'Range Not Satisfiable'],
  [418, "I'm a teapot (unused)"],
  [422, 'Unprocessable Content'],
  [425, 'Too Early'],
  [426, 'Upgrade Required'],
  [429, 'Too Many Requests'],
  [431, 'Request Header Fields Too Large'],
  [451, 'Unavailable For Legal Reasons'],
  [500, 'Internal Server Error'],
  [501, 'Not Implemented'],
  [502, 'Bad Gateway'],
  [503, 'Service Unavailable'],
  [504, 'Gateway Timeout'],
  [505, 'HTTP Version Not Supported'],
];
const headers = [
  'Accept',
  'Accept-Encoding',
  'Accept-Language',
  'Authorization',
  'Cache-Control',
  'Connection',
  'Content-Disposition',
  'Content-Encoding',
  'Content-Length',
  'Content-Type',
  'Cookie',
  'ETag',
  'Host',
  'If-Match',
  'If-None-Match',
  'Last-Modified',
  'Location',
  'Origin',
  'Range',
  'Referer',
  'Retry-After',
  'Set-Cookie',
  'User-Agent',
  'Vary',
  'WWW-Authenticate',
  'Access-Control-Allow-Origin',
  'Access-Control-Allow-Headers',
  'Access-Control-Allow-Methods',
];
const types = [
  'application/json',
  'application/ld+json',
  'application/xml',
  'application/pdf',
  'application/octet-stream',
  'application/zip',
  'application/x-www-form-urlencoded',
  'multipart/form-data',
  'text/plain',
  'text/html',
  'text/css',
  'text/csv',
  'text/javascript',
  'image/png',
  'image/jpeg',
  'image/svg+xml',
  'image/webp',
  'audio/mpeg',
  'video/mp4',
];
export default function Reference({ t }: { t: Translate }) {
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const q = query.toLowerCase();
  return (
    <div className="space-y-6">
      <div className="relative max-w-xl">
        <Search className="absolute start-3 top-2.5 text-secondary" size={18} />
        <input
          className={`${controlClass} ps-10`}
          aria-label={t('common.search')}
          placeholder={t('common.search')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <Button onClick={() => setQuery('')}>{t('common.reset')}</Button>
      <p role="status" className="text-xs text-secondary">
        {message ? t(message) : ''}
      </p>
      {[
        {
          title: 'reference.status',
          rows: codes.map(([code, name]) => `${code} — ${name}`),
          url: 'https://www.iana.org/assignments/http-status-codes/http-status-codes.xhtml',
        },
        {
          title: 'reference.headers',
          rows: headers,
          url: 'https://www.iana.org/assignments/http-fields/http-fields.xhtml',
        },
        {
          title: 'reference.types',
          rows: types,
          url: 'https://www.iana.org/assignments/media-types/media-types.xhtml',
        },
      ].map((section) => (
        <section key={section.title} className="rounded-panel border border-border bg-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">{t(section.title)}</h2>
            <a
              className="flex items-center gap-1 text-xs text-accent"
              href={section.url}
              target="_blank"
              rel="noreferrer"
            >
              {t('common.source')}
              <ArrowUpRight size={13} />
            </a>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {section.rows
              .filter((row) => row.toLowerCase().includes(q))
              .map((row) => (
                <button
                  key={row}
                  className="rounded-lg bg-muted/60 px-3 py-2 text-start text-xs hover:bg-accent-subtle"
                  aria-label={`${t('common.copy')}: ${row}`}
                  onClick={async (e) => {
                    const element = e.currentTarget;
                    try {
                      await navigator.clipboard.writeText(row);
                      setMessage('common.copied');
                    } catch {
                      const range = document.createRange();
                      range.selectNodeContents(element);
                      const selection = window.getSelection();
                      selection?.removeAllRanges();
                      selection?.addRange(range);
                      setMessage('common.manualCopy');
                    }
                  }}
                >
                  <code>{row}</code>
                </button>
              ))}
          </div>
        </section>
      ))}
      <p className="text-xs text-secondary">IANA / RFC 9110 · {t('common.checked')}: 2026-10-28</p>
    </div>
  );
}
