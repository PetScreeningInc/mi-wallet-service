import {
  bindGenericSlots,
  publicHttpsUrl,
  renderPublicPageHtml,
  renderPublicPageNotFoundHtml,
} from './public-page-html';

const publicData = {
  title: 'Stay with Pico',
  subtitle: 'Demo reservation card',
  imageUrl: 'https://placehold.co/400x400/png',
  fields: {
    guest: 'Alex Rivera',
    dates: '12–15 Sep',
    unit: 'Cabin 4',
  },
  links: [{ label: 'Details', url: 'https://example.com/stay/demo-a' }],
  ownerEmail: 'not-public@example.com',
};

describe('public-page-html', () => {
  it('binds GENERIC slots without inventing Pet ID tabs', () => {
    const slots = bindGenericSlots(publicData);
    expect(slots.title).toBe('Stay with Pico');
    expect(slots.subtitle).toBe('Demo reservation card');
    expect(slots.photoUrl).toBe('https://placehold.co/400x400/png');
    expect(slots.facts).toEqual([
      { term: 'guest', value: 'Alex Rivera' },
      { term: 'dates', value: '12–15 Sep' },
      { term: 'unit', value: 'Cabin 4' },
    ]);
    expect(slots.links[0]).toMatchObject({
      label: 'Details',
      url: 'https://example.com/stay/demo-a',
    });
  });

  it('renders theme slots and never includes ownerEmail', () => {
    const html = renderPublicPageHtml(publicData);
    expect(html).toContain('Stay with Pico');
    expect(html).toContain('Alex Rivera');
    expect(html).toContain('https://example.com/stay/demo-a');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('--wp-color-brand');
    expect(html).not.toContain('ownerEmail');
    expect(html).not.toContain('not-public@example.com');
    expect(html).not.toContain('Documents');
    expect(html).not.toContain('Visas');
    expect(html).not.toContain('Cooper');
  });

  it('suppresses non-https link and image schemes', () => {
    const html = renderPublicPageHtml({
      title: 'Unsafe',
      imageUrl: 'javascript:alert(1)',
      fields: { guest: 'Alex' },
      links: [{ label: 'Bad', url: 'javascript:alert(1)' }],
    });
    expect(html).not.toContain('javascript:');
    expect(html).toContain('wp-photo--fallback');
    expect(html).not.toContain('href="javascript:');
  });

  it('escapes HTML in field values', () => {
    const html = renderPublicPageHtml({
      title: '<script>alert(1)</script>',
      fields: { note: '<b>bold</b>' },
    });
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('&lt;b&gt;bold&lt;/b&gt;');
    expect(html).not.toContain('<script>alert(1)</script>');
  });

  it('renders the 404 empty state without a field dump', () => {
    const html = renderPublicPageNotFoundHtml();
    expect(html).toContain('This Pet ID is unavailable.');
    expect(html).toContain('wrong or expired');
    expect(html).not.toContain('Alex Rivera');
  });

  it('rejects http and malformed URLs', () => {
    expect(publicHttpsUrl('http://example.com')).toBeUndefined();
    expect(publicHttpsUrl('not a url')).toBeUndefined();
    expect(publicHttpsUrl('https://example.com/a')).toEqual(
      new URL('https://example.com/a'),
    );
  });
});
