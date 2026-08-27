import * as fs from 'node:fs';
import * as path from 'node:path';

export type PublicPageFact = {
  term: string;
  value: string;
};

export type PublicPageLink = {
  label: string;
  url: string;
  meta: string;
};

export type PublicPageSlots = {
  title: string;
  subtitle?: string;
  photoUrl?: string;
  initial: string;
  facts: PublicPageFact[];
  links: PublicPageLink[];
};

const FLIP_SCRIPT = `
      const hero = document.getElementById("hero");
      document.querySelectorAll("[data-flip]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const flipped = hero.classList.toggle("is-flipped");
          hero.querySelector(".wp-hero__face--back").setAttribute("aria-hidden", String(!flipped));
        });
      });
`;

const PHOTO_SCRIPT = `
      document.querySelectorAll(".wp-photo img").forEach((img) => {
        img.addEventListener("error", () => {
          const wrap = img.parentElement;
          if (!wrap) return;
          wrap.classList.add("wp-photo--fallback");
          wrap.textContent = wrap.getAttribute("data-initial") ?? "";
        });
      });
`;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function publicHttpsUrl(value: unknown): URL | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') {
      return undefined;
    }
    return url;
  } catch {
    return undefined;
  }
}

export function bindGenericSlots(
  publicData: Record<string, unknown>,
): PublicPageSlots {
  const title =
    typeof publicData.title === 'string' && publicData.title.trim() !== ''
      ? publicData.title
      : 'Pet ID';
  const slots: PublicPageSlots = {
    title,
    initial: title.slice(0, 1).toUpperCase(),
    facts: factsFromFields(publicData.fields),
    links: linksFromData(publicData.links),
  };
  if (typeof publicData.subtitle === 'string' && publicData.subtitle.trim() !== '') {
    slots.subtitle = publicData.subtitle;
  }
  const photo = publicHttpsUrl(publicData.imageUrl);
  if (photo) {
    slots.photoUrl = photo.href;
  }
  return slots;
}

export function renderPublicPageHtml(publicData: Record<string, unknown>): string {
  const slots = bindGenericSlots(publicData);
  return documentShell({
    title: slots.title,
    body: publicPageBody(slots),
  });
}

export function renderPublicPageNotFoundHtml(): string {
  return documentShell({
    title: 'This Pet ID is unavailable.',
    body: `
      <header class="wp-brand" aria-label="betterpet Passport">
        ${brandMarkup()}
      </header>
      <article class="wp-card wp-empty">
        <h1>This Pet ID is unavailable.</h1>
        <p>This link may be wrong or expired.</p>
      </article>
    `,
  });
}

function factsFromFields(value: unknown): PublicPageFact[] {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return [];
  }
  const facts: PublicPageFact[] = [];
  for (const [term, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === 'string' && raw.trim() !== '') {
      facts.push({ term, value: raw });
    }
  }
  return facts;
}

function linksFromData(value: unknown): PublicPageLink[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const links: PublicPageLink[] = [];
  for (const item of value) {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) {
      continue;
    }
    const record = item as Record<string, unknown>;
    const url = publicHttpsUrl(record.url);
    if (!url) {
      continue;
    }
    const label =
      typeof record.label === 'string' && record.label.trim() !== ''
        ? record.label
        : url.hostname;
    links.push({
      label,
      url: url.href,
      meta: url.hostname + url.pathname.replace(/\/$/, ''),
    });
  }
  return links;
}

function publicPageBody(slots: PublicPageSlots): string {
  const title = escapeHtml(slots.title);
  const subtitle =
    slots.subtitle !== undefined
      ? `<p class="wp-identity__subtitle">${escapeHtml(slots.subtitle)}</p>`
      : '';
  const initial = escapeHtml(slots.initial);
  const photo =
    slots.photoUrl !== undefined
      ? `<div class="wp-photo" data-initial="${initial}"><img alt="" src="${escapeHtml(slots.photoUrl)}" /></div>`
      : `<div class="wp-photo wp-photo--fallback" aria-hidden="true">${initial}</div>`;

  const facts =
    slots.facts.length === 0
      ? ''
      : `<dl class="wp-card" style="width: 100%">${slots.facts
          .map(
            (fact) =>
              `<div class="wp-fact"><dt class="wp-fact__term">${escapeHtml(fact.term)}</dt><dd class="wp-fact__value">${escapeHtml(fact.value)}</dd></div>`,
          )
          .join('')}</dl>`;

  const links =
    slots.links.length === 0
      ? ''
      : `<div class="wp-card" style="width: 100%">${slots.links
          .map(
            (link) => `
            <a
              class="wp-row"
              href="${escapeHtml(link.url)}"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span class="wp-thumb" aria-hidden="true">↗</span>
              <span class="wp-row__body">
                <p class="wp-row__title">${escapeHtml(link.label)}</p>
                <p class="wp-row__meta">${escapeHtml(link.meta)}</p>
              </span>
              <span class="wp-chevron" aria-hidden="true">›</span>
            </a>`,
          )
          .join('')}</div>`;

  return `
      <header class="wp-brand" aria-label="betterpet Passport">
        ${brandMarkup()}
      </header>
      <section class="wp-hero" id="hero">
        <div class="wp-hero__scene">
          <article class="wp-hero__face wp-hero__face--front">
            <button type="button" class="wp-hero__flip" data-flip>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M2.76 8.5a4.5 4.5 0 0 0 7.94 1.3M13.24 7.5a4.5 4.5 0 0 0-7.94-1.3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
              </svg>
              Tap to flip
            </button>
            <div class="wp-identity">
              ${photo}
              <div>
                <h1 class="wp-identity__title">${title}</h1>
                ${subtitle}
              </div>
            </div>
            ${facts}
            ${links}
          </article>
          <article class="wp-hero__face wp-hero__face--back" aria-hidden="true">
            <div class="wp-notice">
              <span class="wp-notice__icon" aria-hidden="true">✓</span>
              <div>
                <p class="wp-notice__title">Information you can trust</p>
                <p class="wp-notice__body">Pet information is self-reported by the pet parent.</p>
              </div>
            </div>
            <div class="wp-notice">
              <span class="wp-notice__icon" aria-hidden="true">◌</span>
              <div>
                <p class="wp-notice__title">Your privacy matters</p>
                <p class="wp-notice__body">Share only what you choose. You’re in control.</p>
              </div>
            </div>
            <div class="wp-notice">
              <span class="wp-notice__icon" aria-hidden="true">▣</span>
              <div>
                <p class="wp-notice__title">Verify this Pet ID</p>
                <p class="wp-notice__body">Scan the QR code or visit <strong>betterpet.com/verify</strong>.</p>
              </div>
            </div>
            <button type="button" class="wp-hero__flip" data-flip>Tap to flip back</button>
          </article>
        </div>
      </section>
  `;
}

function brandMarkup(): string {
  return `
        <span class="wp-brand__mark" aria-hidden="true">b</span>
        <div>
          <p class="wp-brand__wordmark">betterpet</p>
          <p class="wp-brand__product">Passport</p>
        </div>
  `;
}

function documentShell(input: { title: string; body: string }): string {
  const css = loadThemeCss();
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(input.title)}</title>
    <style>${css}</style>
  </head>
  <body>
    <main class="wp-page">
      ${input.body}
    </main>
    <script>${FLIP_SCRIPT}${PHOTO_SCRIPT}</script>
  </body>
</html>`;
}

let themeCssCache: string | undefined;

function loadThemeCss(): string {
  if (themeCssCache !== undefined) {
    return themeCssCache;
  }
  const dir = path.join(process.cwd(), 'public-page');
  const tokens = fs.readFileSync(path.join(dir, 'tokens.css'), 'utf8');
  const components = fs
    .readFileSync(path.join(dir, 'components.css'), 'utf8')
    .replace(/@import\s+["']\.\/tokens\.css["']\s*;\s*/u, '');
  themeCssCache = `${tokens}\n${components}`;
  return themeCssCache;
}
