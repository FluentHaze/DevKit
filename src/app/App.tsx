import { cachePrefix, readRoute, siteBase, sitePath } from '@/lib/urls';
import { Select } from '@/components/Select';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Braces,
  ChevronDown,
  Download,
  Home,
  Languages,
  Menu,
  Monitor,
  Moon,
  Search,
  Settings2,
  ShieldCheck,
  Star,
  Sun,
  Trash2,
  X,
} from 'lucide-react';
import { ToolBoundary } from '@/components/ToolBoundary';
import { tools, categories, getTool, type Tool } from '@/tools/registry';
import { Button } from '@/components/ui';
import { categoryIcons, toolIcon } from '@/components/icons';
import { detectLocale, initialLanguage, translate, type LanguagePreference } from '@/i18n';
import { readPreference, savePreference, clearDrafts } from '@/lib/storage';
import { shortcutModifier } from '@/lib/keyboard';
import type { AppContext } from './context';
const ToolPage = lazy(() => import('@/tools/ToolPage'));
type Theme = 'light' | 'dark' | 'system';
type Recent = { id: string; time: number };
const isStringList = (v: unknown): v is string[] =>
  Array.isArray(v) &&
  v.length <= tools.length &&
  v.every((id) => typeof id === 'string' && !!getTool(id));
const isRecent = (v: unknown): v is Recent[] =>
  Array.isArray(v) &&
  v.length <= 20 &&
  v.every(
    (r) =>
      r &&
      typeof r === 'object' &&
      typeof r.id === 'string' &&
      !!getTool(r.id) &&
      typeof r.time === 'number'
  );
export default function App() {
  const modifier = shortcutModifier();
  const [path, setPath] = useState(readRoute);
  const [language, setLanguage] = useState<LanguagePreference>(initialLanguage);
  const locale = language === 'auto' ? detectLocale(navigator.languages) : language;
  const t = (key: string) => translate(locale, key);
  const [theme, setTheme] = useState<Theme>(() =>
    readPreference('theme', 'system', (v): v is Theme =>
      ['light', 'dark', 'system'].includes(String(v))
    )
  );
  const [favorites, setFavorites] = useState(() => readPreference('favorites', [], isStringList));
  const [recent, setRecent] = useState(() => {
    const saved = readPreference('recent', [], isRecent);
    const current = getTool(readRoute().slice(7));
    return current
      ? [{ id: current.id, time: Date.now() }, ...saved.filter((r) => r.id !== current.id)].slice(
          0,
          20
        )
      : saved;
  });
  const [drawer, setDrawer] = useState(false);
  const [settings, setSettings] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const [homeQuery, setHomeQuery] = useState('');
  const [cacheMessage, setCacheMessage] = useState('');
  const [caching, setCaching] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const registration = useRef<ServiceWorkerRegistration | null>(null);
  const searchDialog = useRef<HTMLDialogElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const settingsDialog = useRef<HTMLDialogElement>(null);
  const tool = path.startsWith('/tools/') ? getTool(path.slice(7)) : undefined;
  const navigate = (next: string) => {
    history.pushState(null, '', sitePath(next));
    setPath(next);
    const current = getTool(next.slice(7));
    if (current)
      setRecent((old) =>
        [{ id: current.id, time: Date.now() }, ...old.filter((r) => r.id !== current.id)].slice(
          0,
          20
        )
      );
    setDrawer(false);
    setSearchOpen(false);
    window.scrollTo({ top: 0 });
  };
  const toggleFavorite = (id: string) =>
    setFavorites((old) => (old.includes(id) ? old.filter((item) => item !== id) : [...old, id]));
  const context: AppContext = { t, locale, favorites, toggleFavorite, navigate };
  useEffect(() => {
    const handler = () => {
      setPath(readRoute());
      setDrawer(false);
      const current = getTool(readRoute().slice(7));
      if (current)
        setRecent((old) =>
          [{ id: current.id, time: Date.now() }, ...old.filter((r) => r.id !== current.id)].slice(
            0,
            20
          )
        );
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
    savePreference('language', language);
  }, [locale, language]);
  useEffect(() => {
    document.title = tool
      ? `${translate(locale, tool.titleKey)} · DevKit`
      : `DevKit · ${translate(locale, 'common.home')}`;
  }, [locale, tool]);
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const apply = () =>
      (document.documentElement.dataset.theme =
        theme === 'system' ? (media.matches ? 'dark' : 'light') : theme);
    apply();
    media.addEventListener('change', apply);
    savePreference('theme', theme);
    return () => media.removeEventListener('change', apply);
  }, [theme]);
  useEffect(() => savePreference('favorites', favorites), [favorites]);
  useEffect(() => savePreference('recent', recent), [recent]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  useEffect(() => {
    const dialog = searchDialog.current;
    if (!dialog) return;
    if (searchOpen) {
      previousFocus.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
      searchInput.current?.focus();
    } else {
      dialog.close();
      previousFocus.current?.focus();
    }
  }, [searchOpen]);
  useEffect(() => {
    if (settings) settingsDialog.current?.showModal();
    else settingsDialog.current?.close();
  }, [settings]);
  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
    void navigator.serviceWorker
      .register(sitePath('sw.js'), { scope: siteBase })
      .then((reg) => {
        registration.current = reg;
        if (reg.waiting) setUpdateReady(true);
        reg.addEventListener('updatefound', () => {
          const installing = reg.installing;
          installing?.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller)
              setUpdateReady(true);
          });
        });
      })
      .catch(() => undefined);
  }, []);
  const matches = (tool: Tool, q: string) =>
    tool.keywords.join(' ').toLowerCase().includes(q.trim().toLowerCase());
  const results = tools
    .filter((item) => matches(item, query))
    .sort(
      (a, b) =>
        (favorites.includes(b.id) ? 20 : 0) +
        (recent.some((r) => r.id === b.id) ? 5 : 0) -
        (favorites.includes(a.id) ? 20 : 0) -
        (recent.some((r) => r.id === a.id) ? 5 : 0)
    );
  const reorder = (index: number, delta: number) =>
    setFavorites((old) => {
      const next = [...old];
      const dest = index + delta;
      if (dest < 0 || dest >= next.length) return old;
      [next[index], next[dest]] = [next[dest], next[index]];
      return next;
    });
  const offline = async (clear = false) => {
    if (clear && !confirm(t('common.confirmClear'))) return;
    setCaching(true);
    setCacheMessage('');
    try {
      if (!('serviceWorker' in navigator) || !('caches' in window) || !import.meta.env.PROD)
        throw Error();
      if (clear) {
        for (const key of await caches.keys())
          if (key.startsWith(cachePrefix)) await caches.delete(key);
        setCacheMessage('common.cacheStatus');
      } else {
        await navigator.serviceWorker.ready;
        const response = await fetch(sitePath('offline-manifest.json'));
        if (!response.ok) throw Error();
        const manifest: { version: string; files: string[] } = await response.json();
        const cache = await caches.open(`${cachePrefix}${manifest.version}`);
        await cache.addAll(manifest.files);
        setCacheMessage('common.offlineReady');
      }
    } catch {
      setCacheMessage('common.offlineError');
    } finally {
      setCaching(false);
    }
  };
  return (
    <div className="min-h-screen">
      {drawer && (
        <button
          aria-label={t('common.close')}
          className="fixed inset-0 z-20 bg-black/30 desktop:hidden"
          onClick={() => setDrawer(false)}
        />
      )}
      <div className="fixed inset-y-0 start-0 z-10 hidden w-16 flex-col items-center gap-4 border-e border-border bg-surface py-5 md:flex desktop:hidden">
        <button
          aria-label={t('common.home')}
          onClick={() => navigate('/')}
          className="mb-3 rounded-lg bg-accent-solid p-2 text-on-accent"
        >
          <Braces size={21} />
        </button>
        <button
          aria-label={t('common.search')}
          onClick={() => setSearchOpen(true)}
          className="rounded-lg p-2 text-secondary hover:bg-muted"
        >
          <Search size={19} />
        </button>
        {categories.map((category) => {
          const Icon = categoryIcons[category];
          return (
            <button
              key={category}
              aria-label={t(`categories.${category}`)}
              onClick={() => setDrawer(true)}
              className="rounded-lg p-2 text-secondary hover:bg-muted"
            >
              <Icon size={19} />
            </button>
          );
        })}
        <button
          aria-label={t('common.settings')}
          onClick={() => setSettings(true)}
          className="mt-auto rounded-lg p-2 text-secondary"
        >
          <Settings2 size={19} />
        </button>
      </div>
      <aside
        className={`fixed inset-y-0 start-0 z-30 flex w-60 flex-col border-e border-border bg-surface/95 backdrop-blur-xl transition-transform desktop:visible desktop:translate-x-0 ${drawer ? 'visible translate-x-0' : 'invisible -translate-x-full'}`}
      >
        <button
          onClick={() => navigate('/')}
          className="flex h-18 shrink-0 items-center gap-2.5 px-6 text-start"
        >
          <span className="flex size-8 items-center justify-center rounded-[9px] bg-accent-solid text-on-accent">
            <Braces size={21} />
          </span>
          <span className="text-xl font-bold tracking-tight">
            DevKit<span className="text-accent">.</span>
          </span>
          <span className="ms-auto rounded border border-border px-1.5 text-[9px] font-medium text-secondary">
            WEB
          </span>
        </button>
        <div className="px-3 pb-4">
          <button
            onClick={() => setSearchOpen(true)}
            className="flex h-9 w-full items-center gap-2 rounded-lg border border-border bg-background px-3 text-xs text-secondary"
          >
            <Search size={14} />
            <span>{t('common.search')}</span>
            <kbd className="ms-auto text-[10px] whitespace-nowrap">{modifier} K</kbd>
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label={t('common.allTools')}>
          <button
            onClick={() => navigate('/')}
            className={`mb-5 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium ${path === '/' ? 'bg-accent-subtle text-accent' : 'text-secondary hover:bg-muted'}`}
          >
            <Home size={17} />
            {t('common.home')}
          </button>
          {favorites.length > 0 && (
            <div className="mb-5">
              <p className="mb-1 px-3 text-[10px] font-semibold tracking-wider text-secondary">
                {t('common.favorites')}
              </p>
              {favorites.map((id) => {
                const item = getTool(id);
                return item ? (
                  <button
                    key={id}
                    onClick={() => navigate(`/tools/${id}`)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-start text-xs text-secondary hover:bg-muted"
                  >
                    <Star size={13} className="text-warning" />
                    {t(item.titleKey)}
                  </button>
                ) : null;
              })}
            </div>
          )}
          <p className="mb-2 px-3 text-[10px] font-semibold tracking-wider text-secondary">
            {t('common.allTools')}
          </p>
          {categories.map((category) => {
            const Icon = categoryIcons[category];
            return (
              <details
                key={category}
                open={tool?.category === category || !tool}
                className="group mb-1"
              >
                <summary className="flex list-none items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-secondary hover:bg-muted">
                  <Icon size={16} />
                  <span className="flex-1">{t(`categories.${category}`)}</span>
                  <span className="text-[10px] opacity-65">
                    {tools.filter((item) => item.category === category).length}
                  </span>
                  <ChevronDown size={12} className="transition-transform group-open:rotate-180" />
                </summary>
                <div className="ms-5 border-s border-border py-1 ps-2">
                  {tools
                    .filter((item) => item.category === category)
                    .map((item) => (
                      <a
                        href={sitePath(`/tools/${item.slug}`)}
                        key={item.id}
                        onClick={(e) => {
                          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                          e.preventDefault();
                          navigate(`/tools/${item.slug}`);
                        }}
                        className={`my-0.5 block rounded-lg px-3 py-1.5 text-xs ${tool?.id === item.id ? 'bg-accent-subtle font-medium text-accent' : 'text-secondary hover:bg-muted hover:text-primary'}`}
                      >
                        {t(item.titleKey)}
                      </a>
                    ))}
                </div>
              </details>
            );
          })}
        </nav>
        <div className="space-y-3 border-t border-border p-4">
          <button
            onClick={() => setSettings(true)}
            className="flex w-full items-center gap-2.5 px-2 text-xs text-secondary"
          >
            <Settings2 size={16} />
            {t('common.settings')}
          </button>
          <div className="flex items-center gap-2 rounded-lg bg-muted/70 px-3 py-2 text-[10px] text-secondary">
            <ShieldCheck size={13} className="text-success" />
            {t('common.local')}
          </div>
        </div>
      </aside>
      <div className="md:ms-16 desktop:ms-60">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-3 border-b border-border bg-background/90 px-4 backdrop-blur-xl md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              className="shrink-0 p-1 text-secondary desktop:hidden"
              aria-label={t('common.menu')}
              onClick={() => setDrawer(!drawer)}
            >
              <Menu size={20} />
            </button>
            <span className="hidden truncate text-xs text-secondary sm:inline">
              {t('common.home')}
              <span className="mx-2 text-border">/</span>
              <span className="text-primary">{tool ? t(tool.titleKey) : t('common.allTools')}</span>
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="me-3 hidden items-center gap-1.5 text-[10px] text-secondary sm:flex">
              <span className="size-1.5 rounded-full bg-success" />
              {t('common.privacy')}
            </span>
            <Select
              aria-label={t('common.language')}
              title={t('common.languageHint')}
              wrapperClassName="w-40 shrink-0 sm:w-56"
              className="h-9 text-xs font-medium"
              leading={
                <span
                  aria-hidden="true"
                  className="flex shrink-0 items-center gap-1.5 text-secondary"
                >
                  <Languages size={17} className="text-accent" />
                  <span className="hidden sm:inline">{t('common.language')}</span>
                </span>
              }
              displayValue={
                language === 'auto'
                  ? `${locale === 'zh-CN' ? '简体中文' : 'English'} · ${t('common.autoShort')}`
                  : undefined
              }
              value={language}
              onValueChange={(value) => setLanguage(value as LanguagePreference)}
            >
              <option value="zh-CN">简体中文</option>
              <option value="en">English</option>
              <option value="auto">{t('common.followBrowser')}</option>
            </Select>
            <button
              className="rounded-lg p-2 text-secondary hover:bg-muted"
              aria-label={t('common.theme')}
              onClick={() =>
                setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light')
              }
            >
              {theme === 'dark' ? (
                <Moon size={16} />
              ) : theme === 'system' ? (
                <Monitor size={16} />
              ) : (
                <Sun size={16} />
              )}
            </button>
            <button
              className="rounded-lg p-2 text-secondary hover:bg-muted"
              aria-label={t('common.settings')}
              onClick={() => setSettings(true)}
            >
              <Settings2 size={16} />
            </button>
          </div>
        </header>
        {updateReady && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-accent-subtle px-6 py-3 text-xs">
            <span>{t('common.updateAvailable')}</span>
            <Button
              onClick={() => {
                if (!confirm(t('common.confirmUpdate'))) return;
                registration.current?.waiting?.postMessage({ type: 'SKIP_WAITING' });
                navigator.serviceWorker.addEventListener(
                  'controllerchange',
                  () => location.reload(),
                  { once: true }
                );
              }}
            >
              {t('common.updateNow')}
            </Button>
          </div>
        )}
        <main className="p-4 pb-12 md:p-6 xl:p-8">
          {tool ? (
            <ToolBoundary key={tool.id} t={t} onHome={() => navigate('/')}>
              <Suspense fallback={<p className="p-8 text-secondary">{t('common.running')}</p>}>
                <ToolPage key={tool.id} tool={tool} {...context} />
              </Suspense>
            </ToolBoundary>
          ) : path !== '/' ? (
            <div className="mx-auto max-w-lg py-24 text-center">
              <h1 className="mb-4 text-2xl font-semibold">{t('common.notFound')}</h1>
              <Button primary onClick={() => navigate('/')}>
                {t('common.backHome')}
              </Button>
            </div>
          ) : (
            <div className="mx-auto max-w-350 space-y-9">
              <section className="pt-3">
                <p className="mb-2 text-[11px] font-medium tracking-widest text-secondary">
                  {t('common.tagline')}
                </p>
                <h1 className="text-[28px] leading-tight font-semibold tracking-tight md:text-[32px]">
                  {t('common.welcome')}
                </h1>
                <p className="mt-2 text-[13px] text-secondary">{t('common.welcomeNote')}</p>
                <div className="relative mt-6">
                  <Search size={20} className="absolute start-4 top-4 text-secondary" />
                  <input
                    value={homeQuery}
                    onChange={(e) => setHomeQuery(e.target.value)}
                    aria-label={t('common.search')}
                    placeholder={t('common.searchHint')}
                    className="h-13 w-full rounded-panel border border-border bg-surface ps-12 pe-16 text-sm shadow-card outline-none focus:border-accent focus:ring-2 focus:ring-accent/10"
                  />
                  <button
                    onClick={() => setSearchOpen(true)}
                    className="absolute end-4 top-4 flex items-center gap-1 text-[10px] text-secondary"
                  >
                    <kbd className="whitespace-nowrap">{modifier} K</kbd>
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] text-secondary">
                  <span>{t('common.toolsCount')}</span>
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck size={12} />
                    {t('common.local')}
                  </span>
                </div>
              </section>
              {!homeQuery && (
                <>
                  <section>
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="flex items-center gap-2 text-sm font-semibold">
                        <Star size={16} className="text-warning" />
                        {t('common.favorites')}
                      </h2>
                      <span className="text-xs text-secondary">{favorites.length}</span>
                    </div>
                    {favorites.length ? (
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {favorites.map((id, index) => {
                          const item = getTool(id);
                          return item ? (
                            <div
                              key={id}
                              className="relative"
                              draggable
                              onDragStart={(e) => e.dataTransfer.setData('text/plain', id)}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                e.preventDefault();
                                const moving = e.dataTransfer.getData('text/plain');
                                setFavorites((old) => {
                                  const from = old.indexOf(moving),
                                    to = old.indexOf(id);
                                  if (from < 0 || to < 0) return old;
                                  const next = [...old];
                                  next.splice(from, 1);
                                  next.splice(to, 0, moving);
                                  return next;
                                });
                              }}
                            >
                              <ToolCard tool={item} {...context} />
                              <div className="absolute end-3 bottom-3 flex gap-1">
                                <button
                                  aria-label={t('common.moveUp')}
                                  disabled={index === 0}
                                  onClick={() => reorder(index, -1)}
                                  className="rounded p-1 text-secondary hover:bg-muted"
                                >
                                  <ArrowUp size={12} />
                                </button>
                                <button
                                  aria-label={t('common.moveDown')}
                                  disabled={index === favorites.length - 1}
                                  onClick={() => reorder(index, 1)}
                                  className="rounded p-1 text-secondary hover:bg-muted"
                                >
                                  <ArrowDown size={12} />
                                </button>
                              </div>
                            </div>
                          ) : null;
                        })}
                      </div>
                    ) : (
                      <button
                        onClick={() => navigate('/tools/json-formatter')}
                        className="flex w-full items-center justify-between rounded-panel border border-dashed border-border px-5 py-5 text-start text-xs text-secondary hover:border-accent"
                      >
                        <span>{t('common.emptyFavorites')}</span>
                        <ArrowRight size={15} />
                      </button>
                    )}
                  </section>
                  {recent.length > 0 && (
                    <section>
                      <h2 className="mb-3 text-sm font-semibold">{t('common.recent')}</h2>
                      <div className="flex flex-wrap gap-2">
                        {recent.slice(0, 8).map(({ id }) => {
                          const item = getTool(id);
                          return item ? (
                            <button
                              key={id}
                              onClick={() => navigate(`/tools/${id}`)}
                              className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-secondary hover:border-accent hover:text-accent"
                            >
                              {t(item.titleKey)}
                            </button>
                          ) : null;
                        })}
                      </div>
                    </section>
                  )}
                </>
              )}
              {categories.map((category) => {
                const items = tools.filter(
                  (item) => item.category === category && matches(item, homeQuery)
                );
                if (!items.length) return null;
                const Icon = categoryIcons[category];
                return (
                  <section key={category}>
                    <div className="mb-3 flex items-center gap-2">
                      <Icon size={17} className="text-secondary" />
                      <h2 className="text-sm font-semibold">{t(`categories.${category}`)}</h2>
                      <span className="ms-1 text-[11px] text-secondary">
                        {items.length.toString().padStart(2, '0')}
                      </span>
                      <div className="ms-2 h-px flex-1 bg-border/60" />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {items.map((item) => (
                        <ToolCard key={item.id} tool={item} {...context} />
                      ))}
                    </div>
                  </section>
                );
              })}
              {homeQuery && !tools.some((item) => matches(item, homeQuery)) && (
                <p className="py-10 text-center text-secondary">{t('common.noResults')}</p>
              )}
              <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5 text-[11px] text-secondary">
                <span>DevKit · {t('common.version')}</span>
                <span>{t('common.localNote')}</span>
              </footer>
            </div>
          )}
        </main>
      </div>
      <dialog
        ref={searchDialog}
        onCancel={() => setSearchOpen(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setSearchOpen(false);
        }}
        className="fixed inset-0 m-auto max-h-[75vh] w-[calc(100%-32px)] max-w-150 overflow-hidden rounded-2xl border border-border bg-surface p-0 text-primary shadow-overlay"
        aria-label={t('common.search')}
      >
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <Search size={20} className="text-accent" />
          <input
            ref={searchInput}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelected((v) => {
                  const next = Math.min(results.length - 1, v + 1);
                  document
                    .getElementById(`search-${results[next]?.id}`)
                    ?.scrollIntoView({ block: 'nearest' });
                  return next;
                });
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelected((v) => {
                  const next = Math.max(0, v - 1);
                  document
                    .getElementById(`search-${results[next]?.id}`)
                    ?.scrollIntoView({ block: 'nearest' });
                  return next;
                });
              }
              if (e.key === 'Enter' && results[selected])
                navigate(`/tools/${results[selected].slug}`);
            }}
            role="combobox"
            aria-expanded="true"
            aria-controls="search-results"
            aria-activedescendant={results[selected] ? `search-${results[selected].id}` : undefined}
            className="min-w-0 flex-1 bg-transparent outline-none"
            placeholder={t('common.searchHint')}
          />
          <button
            aria-label={t('common.close')}
            onClick={() => setSearchOpen(false)}
            className="rounded border border-border px-1.5 py-0.5 text-[10px] text-secondary"
          >
            ESC
          </button>
        </div>
        <div id="search-results" role="listbox" className="max-h-[55vh] overflow-y-auto p-2">
          {results.map((item, index) => {
            const Icon = toolIcon(item.id, item.category);
            return (
              <button
                id={`search-${item.id}`}
                role="option"
                aria-selected={index === selected}
                key={item.id}
                onClick={() => navigate(`/tools/${item.slug}`)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-start ${index === selected ? 'bg-accent-subtle text-accent' : 'hover:bg-muted'}`}
              >
                <Icon size={19} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{t(item.titleKey)}</span>
                  <span className="block text-xs text-secondary">{t(item.descriptionKey)}</span>
                </span>
                <ArrowRight size={14} />
              </button>
            );
          })}
          {!results.length && (
            <p className="p-6 text-center text-sm text-secondary">{t('common.noResults')}</p>
          )}
        </div>
      </dialog>
      <dialog
        ref={settingsDialog}
        onCancel={() => setSettings(false)}
        className="fixed inset-0 m-auto max-h-[85vh] w-[calc(100%-32px)] max-w-xl overflow-auto rounded-2xl border border-border bg-surface p-6 text-primary shadow-overlay"
        aria-label={t('common.settings')}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t('common.settings')}</h2>
          <button onClick={() => setSettings(false)} aria-label={t('common.close')}>
            <X size={20} />
          </button>
        </div>
        <div className="space-y-6">
          <label className="block text-sm">
            {t('common.theme')}
            <Select
              aria-label={t('common.theme')}
              wrapperClassName="mt-2"
              value={theme}
              onValueChange={(value) => setTheme(value as Theme)}
            >
              {(['light', 'dark', 'system'] as const).map((v) => (
                <option key={v} value={v}>
                  {t(`common.${v}`)}
                </option>
              ))}
            </Select>
          </label>
          <section>
            <h3 className="font-medium">{t('common.offline')}</h3>
            <p className="mt-2 text-xs text-secondary">{t('common.offlineNote')}</p>
            <p className="mt-1 text-xs text-secondary">{t('common.cacheStatus')}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                disabled={caching}
                onClick={() => {
                  void offline();
                }}
              >
                <Download size={14} />
                {t(caching ? 'common.running' : 'common.offlineDownload')}
              </Button>
              <Button
                disabled={caching}
                onClick={() => {
                  void offline(true);
                }}
              >
                <Trash2 size={14} />
                {t('common.offlineClear')}
              </Button>
            </div>
            <p className="mt-2 text-xs text-secondary" role="status">
              {cacheMessage ? t(cacheMessage) : ''}
            </p>
          </section>
          <section className="space-y-3">
            <h3 className="font-medium">{t('common.localData')}</h3>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  if (confirm(t('common.confirmDataClear'))) {
                    setFavorites([]);
                  }
                }}
              >
                {t('common.clearFavorites')}
              </Button>
              <Button
                onClick={() => {
                  if (confirm(t('common.confirmDataClear'))) {
                    setRecent([]);
                  }
                }}
              >
                {t('common.clearRecent')}
              </Button>
              <Button
                onClick={() => {
                  if (confirm(t('common.confirmDataClear'))) {
                    clearDrafts();
                  }
                }}
              >
                {t('common.clearDrafts')}
              </Button>
            </div>
          </section>
          <div className="rounded-lg bg-muted p-4 text-xs text-secondary">
            <ShieldCheck size={18} className="mb-2 text-success" />
            {t('common.localNote')}
          </div>
        </div>
      </dialog>
    </div>
  );
}
function ToolCard({ tool, t, navigate, favorites, toggleFavorite }: AppContext & { tool: Tool }) {
  const Icon = toolIcon(tool.id, tool.category);
  return (
    <article className="group relative h-full min-h-34 rounded-panel border border-border bg-surface p-4 shadow-card transition-colors hover:border-accent/50">
      <button
        className="absolute end-3 top-3 rounded-md p-1.5 text-secondary/65 hover:bg-muted hover:text-warning"
        aria-pressed={favorites.includes(tool.id)}
        aria-label={t(favorites.includes(tool.id) ? 'common.unfavorite' : 'common.favorite')}
        onClick={() => toggleFavorite(tool.id)}
      >
        <Star
          size={14}
          className={favorites.includes(tool.id) ? 'fill-warning text-warning' : ''}
        />
      </button>
      <button onClick={() => navigate(`/tools/${tool.slug}`)} className="block w-full text-start">
        <span className="mb-3 flex size-9 items-center justify-center rounded-[10px] bg-accent-subtle text-accent">
          <Icon size={20} strokeWidth={1.6} />
        </span>
        <span className="mb-1 block pe-6 text-[13px] font-semibold group-hover:text-accent">
          {t(tool.titleKey)}
        </span>
        <span className="block pe-4 text-[11px] leading-5 text-secondary">
          {t(tool.descriptionKey)}
        </span>
      </button>
    </article>
  );
}
