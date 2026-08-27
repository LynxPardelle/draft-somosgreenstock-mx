import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const DOMAIN = 'somosgreenstock.mx';
const CANONICAL_ORIGIN = `https://${DOMAIN}`;
const TESTING_ORIGIN = 'https://test.zoolandingpage.com.mx';
const ASSET_PREFIX = `https://assets.zoolandingpage.com.mx/${DOMAIN}/shared/`;
const INSTAGRAM_DESTINATION = 'instagram.com/greens.tock';

const ROUTES = [
  { path: '/', pageId: 'default' },
  { path: '/menu', pageId: 'menu' },
  { path: '/impacto', pageId: 'impacto' },
  { path: '/mayoreo', pageId: 'mayoreo' },
  { path: '/preguntas', pageId: 'preguntas' },
  { path: '/404', pageId: 'not-found' },
];
const TESTING_CANONICALS = new Map(ROUTES.map(({ path, pageId }) => [
  pageId,
  `${TESTING_ORIGIN}${path}?draftDomain=${DOMAIN}`,
]));

const PAGE_IDS = ROUTES.map(({ pageId }) => pageId);
const COMMERCIAL_PAGE_IDS = PAGE_IDS.filter((pageId) => pageId !== 'not-found');
const REQUIRED_PAGE_FILES = [
  'page-config.json',
  'components.json',
  'variables.json',
  'angora-combos.json',
  'i18n/es.json',
];

const PRODUCTS = new Map([
  ['Verde Detox', ['espinaca', 'pepino', 'perejil', 'nopal', 'apio', 'piña']],
  ['Green Fresh', ['pepino', 'apio', 'manzana verde']],
  ['Kale Vibes', ['piña', 'kale', 'jengibre']],
  ['Lemon Fit', ['limón', 'apio', 'manzana verde']],
  ['Mint Pop', ['pepino', 'melón', 'menta', 'limón']],
  ['Fruit Splash', ['mango', 'fresa', 'espinaca']],
]);

const ASSET_COUNTS = {
  logos: 8,
  packagePhotos: 5,
  mascots: 3,
  productCollages: 12,
  videos: 4,
};

const READY_ASSET_RELATIVE_PATHS = {
  logos: [
    'logos/greenstock-wordmark-primary.png',
    'logos/greenstock-wordmark-cream.png',
    'logos/greenstock-wordmark-orange.png',
    'logos/greenstock-wordmark-dark.png',
    'logos/greenstock-mark-primary.png',
    'logos/greenstock-mark-cream.png',
    'logos/greenstock-mark-orange.png',
    'logos/greenstock-mark-dark.png',
  ],
  packagePhotos: [
    'package-photos/package-front-01.webp',
    'package-photos/package-preparation-02.webp',
    'package-photos/package-detail-03.webp',
    'package-photos/package-freezer-04.webp',
    'package-photos/package-serving-05.webp',
  ],
  mascots: [
    'mascots/mascot-fresh-01.webp',
    'mascots/mascot-impact-02.webp',
    'mascots/mascot-question-03.webp',
  ],
  productCollages: [
    'product-collages/verde-detox-01.webp',
    'product-collages/verde-detox-02.webp',
    'product-collages/green-fresh-01.webp',
    'product-collages/green-fresh-02.webp',
    'product-collages/kale-vibes-01.webp',
    'product-collages/kale-vibes-02.webp',
    'product-collages/lemon-fit-01.webp',
    'product-collages/lemon-fit-02.webp',
    'product-collages/mint-pop-01.webp',
    'product-collages/mint-pop-02.webp',
    'product-collages/fruit-splash-01.webp',
    'product-collages/fruit-splash-02.webp',
  ],
  videos: [
    'videos/greenstock-process-01.mp4',
    'videos/greenstock-product-03.mp4',
  ],
};

const READY_POSTER_RELATIVE_PATHS = [
  'videos/greenstock-process-01-poster.webp',
  'videos/greenstock-product-03-poster.webp',
];

const PENDING_VIDEOS = new Map([
  ['greenstock-blend-02', `${DOMAIN}/shared/videos/greenstock-blend-02.mp4`],
  ['greenstock-impact-04', `${DOMAIN}/shared/videos/greenstock-impact-04.mp4`],
]);

const assetCdnUrl = (relativePath) => `${ASSET_PREFIX}${relativePath}`;

const fixtureUrl = (relativePath) => new URL(`../${relativePath}`, import.meta.url);
const productionPackageExists = existsSync(fixtureUrl('site-config.json'));

const readJson = (relativePath) => {
  const url = fixtureUrl(relativePath);
  assert.ok(existsSync(url), `Missing required production file: ${relativePath}`);
  return JSON.parse(readFileSync(url, 'utf8'));
};

const contractTest = (name, fn) => test(name, {
  skip: productionPackageExists ? false : 'waiting for the Greenstock production package',
}, fn);

const isRecord = (value) => !!value && typeof value === 'object' && !Array.isArray(value);

const normalizeText = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();

const localizedSpanish = (value) => typeof value === 'string'
  ? value.trim()
  : isRecord(value) && typeof value.es === 'string'
    ? value.es.trim()
    : '';

const collectStrings = (value) => {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (!isRecord(value)) return [];
  return Object.values(value).flatMap(collectStrings);
};

const collectStringEntries = (value, prefix = '') => {
  if (typeof value === 'string') return [{ path: prefix, value }];
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => collectStringEntries(entry, `${prefix}[${index}]`));
  }
  if (!isRecord(value)) return [];
  return Object.entries(value).flatMap(([key, entry]) => collectStringEntries(entry, prefix ? `${prefix}.${key}` : key));
};

const collectRecords = (value) => {
  if (Array.isArray(value)) return value.flatMap(collectRecords);
  if (!isRecord(value)) return [];
  return [value, ...Object.values(value).flatMap(collectRecords)];
};

const payloadComponents = (relativePath) => readJson(relativePath).components;
const sharedComponents = () => payloadComponents('components.json');
const pageComponents = (pageId) => payloadComponents(`${pageId}/components.json`);

const mergedComponents = (pageId) => {
  const components = new Map();
  for (const component of [...sharedComponents(), ...pageComponents(pageId)]) {
    components.set(component.id, component);
  }
  return components;
};

const reachableComponentIds = (startId, components) => {
  const reached = new Set();
  const pending = [startId];
  while (pending.length > 0) {
    const id = pending.pop();
    if (!id || reached.has(id)) continue;
    reached.add(id);
    const children = components.get(id)?.config?.components;
    if (Array.isArray(children)) pending.push(...children);
  }
  return reached;
};

const sharedVariablesPayload = () => readJson('variables.json');
const sharedVariables = () => sharedVariablesPayload().variables;

const productName = (product) => product.name ?? product.title ?? product.label;

const firstNumber = (records, keys) => {
  for (const record of records) {
    if (!isRecord(record)) continue;
    for (const key of keys) {
      if (typeof record[key] === 'number' && Number.isFinite(record[key])) return record[key];
    }
  }
  return undefined;
};

const normalizeInstagramDestination = (value) => {
  try {
    const url = new URL(String(value));
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    const path = url.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
    return `${host}/${path}`;
  } catch {
    return '';
  }
};

const comboMapForPage = (pageId) => ({
  ...readJson('angora-combos.json').combos,
  ...readJson(`${pageId}/angora-combos.json`).combos,
});

const expandClassString = (classString, combos) => {
  const tokens = String(classString ?? '').split(/\s+/).filter(Boolean);
  const expanded = new Set();
  const pending = [...tokens];
  while (pending.length > 0) {
    const className = pending.shift();
    if (!className || expanded.has(className)) continue;
    expanded.add(className);
    for (const entry of combos[className] ?? []) pending.push(...String(entry).split(/\s+/).filter(Boolean));
  }
  return [...expanded].join(' ');
};

const expandedClasses = (component, combos) => expandClassString(component?.config?.classes, combos);

const assertDurableFocus = (classString, combos, label) => {
  const classes = expandClassString(classString, combos);
  assert.match(classes, /outlineFocus-3px__solid__titleColor/, `${label} needs a deep 3px outline`);
  assert.match(classes, /boxShadowFocus-0__0__0__6px__bgColor/, `${label} needs a light outer focus ring`);
};

const assetUrl = (asset) => typeof asset === 'string'
  ? asset
  : asset?.url ?? asset?.src ?? asset?.publicUrl ?? '';

const assetList = (manifest, aliases) => {
  for (const alias of aliases) {
    if (Array.isArray(manifest?.[alias])) return manifest[alias];
  }
  return undefined;
};

const allProductionPayloads = () => {
  const payloads = [
    readJson('site-config.json'),
    readJson('components.json'),
    readJson('variables.json'),
    readJson('angora-combos.json'),
    readJson('i18n/es.json'),
  ];
  for (const pageId of PAGE_IDS) {
    for (const file of REQUIRED_PAGE_FILES) payloads.push(readJson(`${pageId}/${file}`));
  }
  return payloads;
};

const structuredDataTypes = (entries) => collectRecords(entries)
  .flatMap((record) => Array.isArray(record['@type']) ? record['@type'] : [record['@type']])
  .filter((value) => typeof value === 'string');

test('RED-001 requires the Greenstock production package before the contract can pass', () => {
  assert.equal(
    productionPackageExists,
    true,
    'Expected RED: site-config.json is absent because Greenstock production configuration has not been authored yet.',
  );
});

contractTest('CONTRACT-001 declares the exact five public routes and branded 404 package', () => {
  const site = readJson('site-config.json');
  assert.equal(site.domain, DOMAIN);
  assert.equal(site.defaultPageId, 'default');
  assert.equal(site.notFoundPageId, 'not-found');
  assert.deepEqual(site.routes.map(({ path, pageId }) => ({ path, pageId })), ROUTES);
  assert.equal(site.site?.i18n?.defaultLanguage, 'es');

  for (const rootFile of ['components.json', 'variables.json', 'angora-combos.json', 'i18n/es.json']) {
    const payload = readJson(rootFile);
    assert.equal(payload.domain, DOMAIN, rootFile);
    assert.equal(payload.pageId, 'allPages', rootFile);
  }

  for (const pageId of PAGE_IDS) {
    for (const file of REQUIRED_PAGE_FILES) assert.ok(existsSync(fixtureUrl(`${pageId}/${file}`)), `${pageId}/${file}`);
    const pageConfig = readJson(`${pageId}/page-config.json`);
    assert.equal(pageConfig.domain, DOMAIN);
    assert.equal(pageConfig.pageId, pageId);
  }
});

contractTest('CONTRACT-002 keeps every root, child and loop-template reference resolvable', () => {
  const shared = sharedComponents();
  assert.equal(new Set(shared.map(({ id }) => id)).size, shared.length, 'duplicate shared component id');

  for (const pageId of PAGE_IDS) {
    const page = pageComponents(pageId);
    assert.equal(new Set(page.map(({ id }) => id)).size, page.length, `duplicate ${pageId} component id`);
    const components = mergedComponents(pageId);
    const pageConfig = readJson(`${pageId}/page-config.json`);
    assert.ok(pageConfig.rootIds.length >= 3, `${pageId} needs shared chrome and a page root`);
    for (const rootId of pageConfig.rootIds) assert.ok(components.has(rootId), `${pageId} missing root ${rootId}`);
    for (const component of components.values()) {
      for (const childId of component.config?.components ?? []) {
        assert.equal(typeof childId, 'string', `${component.id} child references must be string ids`);
        assert.ok(components.has(childId), `${pageId}:${component.id} references missing ${childId}`);
      }
      if (component.loopConfig?.templateId) {
        assert.ok(components.has(component.loopConfig.templateId), `${pageId}:${component.id} loop template is missing`);
      }
    }
  }
});

contractTest('CONTRACT-003 centralizes exactly six blends with their client-supplied ingredients', () => {
  const variables = sharedVariables();
  const products = variables.products ?? variables.catalog?.products;
  assert.ok(Array.isArray(products), 'shared variables must expose products or catalog.products');
  assert.equal(products.length, PRODUCTS.size);
  assert.deepEqual(new Set(products.map(productName)), new Set(PRODUCTS.keys()));

  for (const [name, ingredients] of PRODUCTS) {
    const product = products.find((entry) => productName(entry) === name);
    assert.ok(product, name);
    assert.ok(Array.isArray(product.ingredients), `${name} ingredients`);
    assert.deepEqual(
      product.ingredients.map(normalizeText).sort(),
      ingredients.map(normalizeText).sort(),
      name,
    );
    assert.match(String(product.image ?? ''), new RegExp(`^${ASSET_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}product-collages/`), `${name} decision image`);
    assert.ok(String(product.imageAlt ?? '').trim().length >= 20, `${name} meaningful image alternative`);
  }
});

contractTest('CONTRACT-015 gives every home product decision card a distinctive ready image', () => {
  const variables = sharedVariables();
  const products = variables.products ?? variables.catalog?.products;
  const assets = variables.assets ?? variables.assetManifest;
  const readyDecisionImages = new Set([
    ...assetList(assets, ['productCollages']),
    ...assetList(assets, ['packagePhotos']),
  ].filter((asset) => asset?.status === 'ready').map(assetUrl));
  const homeComponents = pageComponents('default');
  const productLoop = homeComponents.find((component) =>
    component.type === 'container' && component.loopConfig?.path === 'products');
  assert.ok(productLoop, 'home needs a product decision loop');
  const template = homeComponents.find((component) => component.id === productLoop.loopConfig.templateId);
  assert.equal(template?.type, 'generic-card', 'home product decisions use the supported generic card');

  const bindingSources = (target) => productLoop.loopConfig.bindings
    .find((binding) => binding.to === target)?.sources ?? [];
  assert.ok(bindingSources('config.imageSrc').includes('image'), 'home cards must bind each product image');
  assert.ok(bindingSources('config.imageAlt').includes('imageAlt'), 'home cards must bind each product image alternative');
  assert.equal(products.length, PRODUCTS.size);
  assert.equal(new Set(products.map((product) => product.image)).size, PRODUCTS.size, 'home product imagery must be distinctive');
  for (const product of products) {
    assert.ok(readyDecisionImages.has(product.image), `${productName(product)} uses a ready decision image`);
    assert.ok(String(product.imageAlt ?? '').trim().length >= 20, `${productName(product)} image alternative`);
    assert.ok(Number(product.imageWidth) > 0 && Number(product.imageHeight) > 0, `${productName(product)} image dimensions`);
  }
  assert.match(String(template.config?.imageContainerClasses ?? ''), /height-(?:\d+)px/, 'home cards reserve image space');
  assert.match(String(template.config?.imageClasses ?? ''), /objectFit-cover/, 'home card imagery needs a consistent crop');
  assert.match(normalizeText(template.config?.linkLabel), /40 mxn/, 'home cards retain concise retail pricing');
});

contractTest('CONTRACT-004 preserves the B2C price and delivery-order minimum in MXN', () => {
  const variables = sharedVariables();
  const pricing = variables.pricing ?? variables.prices ?? {};
  const retail = pricing.retail ?? pricing.b2c ?? pricing.consumer ?? {};
  const records = [retail, pricing, variables];
  assert.equal(firstNumber(records, ['unitPriceMxn', 'unitPrice', 'retailPriceMxn', 'priceMxn', 'price']), 40);
  assert.equal(firstNumber(records, ['minimumOrderMxn', 'minimumDeliveryOrderMxn', 'minimumOrder', 'orderMinimumMxn']), 175);
  assert.equal(String(retail.currency ?? pricing.currency ?? '').toUpperCase(), 'MXN');
});

contractTest('CONTRACT-005 preserves the exact three B2B unit-price tiers', () => {
  const variables = sharedVariables();
  const pricing = variables.pricing ?? variables.prices ?? {};
  const tiers = pricing.wholesale ?? pricing.b2b ?? variables.wholesaleTiers;
  assert.ok(Array.isArray(tiers), 'wholesale tiers must be centralized in shared variables');
  const normalized = tiers.map((tier) => ({
    quantity: firstNumber([tier], ['minimumQuantity', 'quantity', 'pieces', 'units']),
    unitPrice: firstNumber([tier], ['unitPriceMxn', 'unitPrice', 'priceMxn', 'price']),
  })).sort((a, b) => a.quantity - b.quantity);
  assert.deepEqual(normalized, [
    { quantity: 50, unitPrice: 37 },
    { quantity: 500, unitPrice: 35 },
    { quantity: 1000, unitPrice: 30 },
  ]);
});

contractTest('CONTRACT-006 routes every order and wholesale CTA through the authorized Instagram fallback', () => {
  const variables = sharedVariables();
  const targets = variables.ctaTargets;
  assert.ok(isRecord(targets), 'ctaTargets must be centralized');
  assert.equal(normalizeInstagramDestination(targets.orderUrl), INSTAGRAM_DESTINATION);
  assert.equal(normalizeInstagramDestination(targets.wholesaleUrl), INSTAGRAM_DESTINATION);
  assert.ok((variables.socialLinks ?? []).some((link) =>
    normalizeInstagramDestination(link.url ?? link.href) === INSTAGRAM_DESTINATION));

  const targetKeys = Object.entries(targets)
    .filter(([, value]) => normalizeInstagramDestination(value) === INSTAGRAM_DESTINATION)
    .map(([key]) => key);

  for (const pageId of COMMERCIAL_PAGE_IDS) {
    const components = [...mergedComponents(pageId).values()];
    const ctas = components.filter((component) => component.type === 'link' && (
      normalizeInstagramDestination(component.config?.href) === INSTAGRAM_DESTINATION
      || targetKeys.some((key) => String(component.valueInstructions ?? '').includes(`ctaTargets.${key}`))
    ));
    assert.ok(ctas.length > 0, `${pageId} has no Instagram fallback CTA`);
    const combos = comboMapForPage(pageId);
    for (const cta of ctas) {
      const hasName = String(cta.config?.text ?? cta.config?.ariaLabel ?? '').trim()
        || /config\.(?:text|ariaLabel)/.test(String(cta.valueInstructions ?? ''));
      assert.ok(hasName, `${pageId}:${cta.id} has no accessible name`);
      const classes = expandedClasses(cta, combos);
      assert.match(classes, /minHeight-(?:44|4[5-9]|[5-9]\d)px/, `${pageId}:${cta.id} touch target`);
      assertDurableFocus(cta.config?.classes, combos, `${pageId}:${cta.id}`);
      assert.equal(cta.config?.target, '_blank');
      assert.match(String(cta.config?.rel ?? ''), /noopener/);
      assert.match(String(cta.config?.rel ?? ''), /noreferrer/);
    }
  }
});

contractTest('CONTRACT-007 renders the nutrition and medical disclaimer from the shared footer', () => {
  const dictionary = readJson('i18n/es.json').dictionary;
  const candidates = collectStringEntries(dictionary).filter(({ value }) => {
    const text = normalizeText(value);
    return text.includes('informacion')
      && text.includes('no sustituye')
      && (text.includes('medic') || text.includes('nutric'));
  });
  assert.ok(candidates.length > 0, 'missing visible nutrition/medical disclaimer copy');

  const shared = sharedComponents();
  const componentMap = new Map(shared.map((component) => [component.id, component]));
  const footer = shared.find((component) => component.type === 'container' && component.config?.tag === 'footer');
  assert.ok(footer, 'missing semantic shared footer');
  const footerIds = reachableComponentIds(footer.id, componentMap);
  const disclaimer = shared.find((component) => footerIds.has(component.id) && component.type === 'text' && (
    candidates.some(({ path }) => String(component.valueInstructions ?? '').includes(path))
    || candidates.some(({ value }) => normalizeText(component.config?.text) === normalizeText(value))
  ));
  assert.ok(disclaimer, 'disclaimer copy exists but is not rendered inside the footer');
  for (const pageId of PAGE_IDS) {
    assert.ok(readJson(`${pageId}/page-config.json`).rootIds.includes(footer.id), `${pageId} omits the disclaimer footer`);
  }
});

contractTest('CONTRACT-008 inventories and renders every supplied client asset', () => {
  const variablesPayload = sharedVariablesPayload();
  const variables = variablesPayload.variables;
  const manifest = variables.assets ?? variables.assetManifest;
  assert.ok(isRecord(manifest), 'shared variables must expose assets or assetManifest');
  assert.equal(variables.mediaLibrary, undefined, 'asset metadata must have one canonical source');
  const aliases = {
    logos: ['logos'],
    packagePhotos: ['packagePhotos', 'packagingPhotos', 'photos'],
    mascots: ['mascots', 'illustrations'],
    productCollages: ['productCollages', 'collages'],
    videos: ['videos'],
  };
  const readyUrlsByCategory = new Map();
  for (const [category, count] of Object.entries(ASSET_COUNTS)) {
    const list = assetList(manifest, aliases[category]);
    assert.ok(Array.isArray(list), `missing asset category ${category}`);
    assert.equal(list.length, count, category);
    const readyAssets = list.filter((asset) => asset?.status === 'ready');
    const expectedReadyUrls = new Set((READY_ASSET_RELATIVE_PATHS[category] ?? []).map(assetCdnUrl));
    assert.deepEqual(new Set(readyAssets.map(assetUrl)), expectedReadyUrls, `${category} ready object targets`);
    for (const asset of readyAssets) {
      const url = assetUrl(asset);
      assert.match(url, new RegExp(`^${ASSET_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`), `${category} stable CDN URL`);
      assert.equal(url.includes('?'), false, `${category} must not contain signed/query URLs`);
    }
    readyUrlsByCategory.set(category, [...expectedReadyUrls]);
  }

  const readyAssets = Object.values(aliases)
    .flatMap((categoryAliases) => assetList(manifest, categoryAliases) ?? [])
    .filter((asset) => asset?.status === 'ready');
  assert.equal(readyAssets.length, 30, 'exactly 30 supplied assets are ready');
  assert.equal(new Set(readyAssets.map(assetUrl)).size, readyAssets.length, 'ready asset URLs must be unique');

  const videos = assetList(manifest, aliases.videos);
  const readyVideos = videos.filter((asset) => asset.status === 'ready');
  assert.deepEqual(new Set(readyVideos.map((asset) => asset.posterUrl)), new Set(READY_POSTER_RELATIVE_PATHS.map(assetCdnUrl)));
  for (const [id, expectedObjectKey] of PENDING_VIDEOS) {
    const asset = videos.find((entry) => entry.id === id);
    assert.ok(asset, `missing pending video ${id}`);
    assert.equal(asset.status, 'pending-source-materialization');
    assert.equal(assetUrl(asset), '', `${id} must not expose a playable URL`);
    assert.equal(asset.expectedObjectKey, expectedObjectKey);
    assert.ok(String(asset.operationalGate ?? '').trim().length >= 30, `${id} needs an explicit operational gate`);
  }

  const variablesWithoutManifest = JSON.parse(JSON.stringify(variablesPayload));
  delete variablesWithoutManifest.variables.assets;
  delete variablesWithoutManifest.variables.assetManifest;
  const usageCorpus = JSON.stringify([
    ...allProductionPayloads().filter((payload) => payload !== variablesPayload),
    variablesWithoutManifest,
  ]);
  const loopPaths = new Set(allProductionPayloads()
    .flatMap((payload) => payload.components ?? [])
    .map((component) => component.loopConfig?.path)
    .filter(Boolean));
  for (const [category, urls] of readyUrlsByCategory) {
    const renderedByCanonicalLoop = loopPaths.has(`assets.${category}`);
    for (const url of urls) {
      assert.ok(renderedByCanonicalLoop || usageCorpus.includes(url), `ready asset is not rendered: ${url}`);
    }
  }
  for (const posterUrl of READY_POSTER_RELATIVE_PATHS.map(assetCdnUrl)) {
    assert.ok(usageCorpus.includes(posterUrl), `ready poster is not rendered: ${posterUrl}`);
  }
  for (const id of PENDING_VIDEOS.keys()) {
    const pendingUrl = assetCdnUrl(`videos/${id}.mp4`);
    assert.equal(usageCorpus.includes(pendingUrl), false, `${id} pending MP4 must not be playable`);
  }
});

contractTest('CONTRACT-009 uses validator-safe testing canonicals while remaining non-indexable', () => {
  const siteSeo = readJson('site-config.json').site?.seo ?? {};
  assert.equal(siteSeo.canonicalOrigin, undefined, 'uncontrolled domain must not be advertised as canonical');
  assert.equal(localizedSpanish(siteSeo.robots), 'noindex,nofollow');
  const titles = new Set();
  const descriptions = new Set();
  for (const { pageId } of ROUTES) {
    const seo = readJson(`${pageId}/page-config.json`).seo;
    const title = localizedSpanish(seo?.title);
    const description = localizedSpanish(seo?.description);
    assert.ok(title.length >= 20, `${pageId} SEO title`);
    assert.ok(description.length >= 70, `${pageId} SEO description`);
    const canonical = localizedSpanish(seo?.canonical);
    assert.equal(canonical, TESTING_CANONICALS.get(pageId), `${pageId} testing canonical`);
    const canonicalUrl = new URL(canonical);
    assert.equal(canonicalUrl.origin, TESTING_ORIGIN, `${pageId} canonical host`);
    assert.equal(canonicalUrl.searchParams.get('draftDomain'), DOMAIN, `${pageId} canonical draft scope`);
    assert.equal(canonicalUrl.searchParams.size, 1, `${pageId} canonical has only the draft scope`);
    assert.equal(canonical.includes(CANONICAL_ORIGIN), false, `${pageId} must not claim the uncontrolled domain`);
    assert.equal(seo?.openGraph?.url, undefined, `${pageId} must not claim an uncontrolled Open Graph URL`);
    assert.ok(localizedSpanish(seo?.openGraph?.title), `${pageId} Open Graph title`);
    assert.ok(localizedSpanish(seo?.openGraph?.description), `${pageId} Open Graph description`);
    assert.match(localizedSpanish(seo?.openGraph?.image), new RegExp(`^${ASSET_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
    assert.equal(localizedSpanish(seo?.twitter?.card), 'summary_large_image');
    assert.match(localizedSpanish(seo?.twitter?.image), new RegExp(`^${ASSET_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
    assert.equal(localizedSpanish(seo?.robots), 'noindex,nofollow', `${pageId} pre-domain robots`);
    assert.equal(titles.has(title), false, `duplicate SEO title: ${title}`);
    assert.equal(descriptions.has(description), false, `duplicate SEO description: ${description}`);
    titles.add(title);
    descriptions.add(description);
  }
});

contractTest('CONTRACT-010 publishes safe route-specific JSON-LD without invented inventory', () => {
  const expectedTypes = {
    default: ['Organization', 'WebSite'],
    menu: ['ItemList', 'Product'],
    impacto: ['AboutPage'],
    mayoreo: ['Service'],
    preguntas: ['FAQPage'],
    'not-found': ['WebPage'],
  };

  for (const pageId of PAGE_IDS) {
    const entries = readJson(`${pageId}/page-config.json`).structuredData?.entries;
    assert.ok(Array.isArray(entries) && entries.length > 0, `${pageId} JSON-LD`);
    for (const entry of entries) assert.equal(entry['@context'], 'https://schema.org', `${pageId} JSON-LD context`);
    const types = structuredDataTypes(entries);
    for (const type of expectedTypes[pageId]) assert.ok(types.includes(type), `${pageId} missing ${type}`);
    const serialized = JSON.stringify(entries);
    assert.doesNotMatch(serialized, /"(?:availability|inventoryLevel|priceValidUntil)"/i, `${pageId} invents inventory`);
    assert.equal(serialized.includes(CANONICAL_ORIGIN), false, `${pageId} JSON-LD claims an uncontrolled domain`);
  }

  const menuEntries = readJson('menu/page-config.json').structuredData.entries;
  const products = collectRecords(menuEntries).filter((record) => record['@type'] === 'Product');
  assert.equal(products.length, PRODUCTS.size);
  assert.deepEqual(new Set(products.map((product) => product.name)), new Set(PRODUCTS.keys()));
  const faq = collectRecords(readJson('preguntas/page-config.json').structuredData.entries)
    .find((record) => record['@type'] === 'FAQPage');
  assert.ok(Array.isArray(faq?.mainEntity) && faq.mainEntity.length >= 5, 'FAQPage must expose useful questions');
});

contractTest('CONTRACT-011 makes the not-found experience useful and recoverable', () => {
  const components = [...mergedComponents('not-found').values()];
  const links = components.filter((component) => component.type === 'link').map((component) => component.config?.href);
  assert.ok(links.includes('/'), '404 must link home');
  assert.ok(links.includes('/menu'), '404 must link to the menu');
  assert.match(localizedSpanish(readJson('not-found/page-config.json').seo?.robots), /noindex/);
});

contractTest('CONTRACT-012 provides semantic landmarks, headings, alt text and accessible FAQ/media fallbacks', () => {
  const shared = sharedComponents();
  const skipLink = shared.find((component) =>
    component.config?.href === '#main-content'
    || component.eventInstructions === 'skipToMain:main-content');
  const header = shared.find((component) => component.type === 'container' && component.config?.tag === 'header');
  const footer = shared.find((component) => component.type === 'container' && component.config?.tag === 'footer');
  const nav = shared.find((component) => component.type === 'container' && component.config?.tag === 'nav');
  assert.ok(skipLink, 'missing skip link');
  assert.ok(header, 'missing semantic header');
  assert.ok(footer, 'missing semantic footer');
  assert.ok(nav?.config?.ariaLabel || nav?.config?.ariaLabelledby, 'navigation needs an accessible label');

  for (const pageId of PAGE_IDS) {
    const components = mergedComponents(pageId);
    const roots = readJson(`${pageId}/page-config.json`).rootIds;
    assert.ok(roots.includes(skipLink.id), `${pageId} skip link`);
    assert.ok(roots.includes(header.id), `${pageId} header`);
    assert.ok(roots.includes(footer.id), `${pageId} footer`);
    const mains = roots.map((id) => components.get(id)).filter((component) => component?.config?.tag === 'main');
    assert.equal(mains.length, 1, `${pageId} needs one main landmark`);
    assert.equal(mains[0].config.id, 'main-content');
    const reachable = reachableComponentIds(mains[0].id, components);
    const headings = [...components.values()].filter((component) =>
      reachable.has(component.id) && component.type === 'text' && component.config?.tag === 'h1');
    assert.equal(headings.length, 1, `${pageId} needs one reachable h1`);
  }

  const allComponents = [shared, ...PAGE_IDS.map(pageComponents)].flat();
  for (const component of allComponents) {
    if (component.type === 'media' && component.config?.tag === 'image') {
      assert.ok(Object.hasOwn(component.config, 'alt') || /config\.alt/.test(String(component.valueInstructions ?? '')), `${component.id} image alt`);
    }
    if (component.type === 'generic-card' && (
      String(component.config?.imageSrc ?? '').trim()
      || /config\.imageSrc/.test(String(component.valueInstructions ?? ''))
    )) {
      assert.ok(Object.hasOwn(component.config, 'imageAlt') || /config\.imageAlt/.test(String(component.valueInstructions ?? '')), `${component.id} card image alt`);
    }
  }

  const sharedCombos = readJson('angora-combos.json').combos;
  for (const component of allComponents.filter((entry) => entry.type === 'link')) {
    const classes = expandedClasses(component, sharedCombos);
    assert.match(classes, /minHeight-(?:44|4[5-9]|[5-9]\d)px/, `${component.id} link touch target`);
    assertDurableFocus(component.config?.classes, sharedCombos, `${component.id} link`);
  }

  const palette = readJson('site-config.json').site.theme.palettes;
  assert.deepEqual(palette.dark, palette.light, 'supported dark tokens must reuse the verified AA-safe semantic palette');

  for (const pageId of COMMERCIAL_PAGE_IDS) {
    const lcpImages = pageComponents(pageId).filter((component) =>
      component.type === 'media'
      && component.config?.tag === 'image'
      && component.config?.loading === 'eager'
      && component.config?.fetchPriority === 'high');
    assert.equal(lcpImages.length, 1, `${pageId} needs exactly one eager/high LCP candidate`);
    assert.ok(Number(lcpImages[0].config.width) > 0 && Number(lcpImages[0].config.height) > 0, `${pageId} LCP dimensions`);
  }
  const headerLogo = shared.find((component) => component.id === 'headerLogo');
  assert.notEqual(headerLogo?.config?.fetchPriority, 'high', 'the shared logo must not compete with route LCP media');

  const faq = [...mergedComponents('preguntas').values()].find((component) => component.type === 'accordion');
  assert.ok(faq?.config?.itemsSource?.path, 'FAQ must use the accessible accordion item source');
  assert.ok(['i18n', 'var'].includes(faq.config.itemsSource.source));
  assert.equal(faq.config.mode, 'single');
  assertDurableFocus(faq.config.defaultItemButtonIsExpandedClasses, sharedCombos, 'expanded FAQ trigger');
  assertDurableFocus(faq.config.defaultItemButtonIsNotExpandedClasses, sharedCombos, 'collapsed FAQ trigger');

  for (const pageId of ['menu', 'mayoreo']) {
    const components = mergedComponents(pageId);
    const gallery = [...components.values()].find((component) =>
      component.type === 'container'
      && ['assets.productCollages', 'assets.packagePhotos'].includes(component.loopConfig?.path));
    assert.ok(gallery, `${pageId} canonical asset gallery`);
    assert.equal(gallery.config?.role, 'region', `${pageId} gallery role`);
    assert.equal(gallery.config?.tabindex, 0, `${pageId} gallery keyboard focus`);
    assert.ok(gallery.config?.ariaLabel || gallery.config?.ariaLabelledby, `${pageId} gallery name`);
    assert.ok(gallery.config?.ariaDescribedby, `${pageId} gallery instructions`);
    const instruction = [...components.values()].find((component) =>
      component.type === 'text' && component.config?.id === gallery.config.ariaDescribedby);
    assert.ok(instruction, `${pageId} gallery instruction must be visible text`);
  }

  const menuComponents = mergedComponents('menu');
  const menuMain = menuComponents.get('menuMain');
  const menuReachable = reachableComponentIds(menuMain.id, menuComponents);
  const productImageUrls = new Set(sharedVariables().products.map((product) => product.image));
  const productArticles = [...menuComponents.values()].filter((component) => {
    if (!menuReachable.has(component.id) || component.type !== 'container' || component.config?.tag !== 'article') return false;
    const articleReachable = reachableComponentIds(component.id, menuComponents);
    return [...menuComponents.values()].some((child) =>
      articleReachable.has(child.id)
      && child.type === 'media'
      && productImageUrls.has(child.config?.src));
  });
  assert.equal(productArticles.length, PRODUCTS.size, 'menu must show six image-led product decisions');
  const renderedProductImages = new Set(productArticles.flatMap((article) => {
    const articleReachable = reachableComponentIds(article.id, menuComponents);
    return [...menuComponents.values()]
      .filter((child) => articleReachable.has(child.id) && child.type === 'media')
      .map((child) => child.config?.src)
      .filter((src) => productImageUrls.has(src));
  }));
  assert.deepEqual(renderedProductImages, productImageUrls);

  const footerIds = reachableComponentIds(footer.id, new Map(shared.map((component) => [component.id, component])));
  const footerImages = shared.filter((component) => footerIds.has(component.id) && component.type === 'media' && component.config?.tag === 'image');
  assert.equal(footerImages.length, 1, 'shared footer must contain one purposeful brand mark, not a logo cloud');
  assert.equal(shared.some((component) => component.loopConfig?.path === 'assets.logos'), false, 'shared footer must not loop logo variants');

  const videoRenderers = allComponents.filter((component) => component.type === 'media' && component.config?.tag === 'video');
  assert.deepEqual(new Set(videoRenderers.map((component) => component.config?.src)), new Set(READY_ASSET_RELATIVE_PATHS.videos.map(assetCdnUrl)), 'only ready optimized MP4s may render');
  for (const [videoPath, posterPath] of READY_ASSET_RELATIVE_PATHS.videos.map((videoPath, index) => [videoPath, READY_POSTER_RELATIVE_PATHS[index]])) {
    const video = videoRenderers.find((component) => component.config?.src === assetCdnUrl(videoPath));
    const pagePayload = PAGE_IDS.map(pageComponents).find((components) => components.some((component) => component.id === video.id));
    const parent = pagePayload.find((component) => component.type === 'container' && component.config?.tag === 'figure' && component.config?.components?.includes(video.id));
    assert.ok(parent, `${video.id} needs a figure`);
    const siblings = pagePayload.filter((component) => parent.config.components.includes(component.id));
    assert.ok(siblings.some((component) => component.type === 'media' && component.config?.tag === 'image' && component.config?.src === assetCdnUrl(posterPath)), `${video.id} optimized static poster`);
    const adjacentText = siblings.filter((component) => component.type === 'text').map((component) => String(component.config?.text ?? '')).join(' ');
    assert.match(normalizeText(adjacentText), /reproduccion opcional/, `${video.id} play/load label`);
    assert.match(normalizeText(adjacentText), /descripcion completa/, `${video.id} full adjacent description`);
    assert.match(normalizeText(adjacentText), /sin audio/, `${video.id} silent-footage disclosure`);
  }
  const pendingFallbacks = allComponents.filter((component) => component.assetStatus === 'pending-source-materialization');
  assert.deepEqual(new Set(pendingFallbacks.map((component) => component.assetRef)), new Set(PENDING_VIDEOS.keys()));
  for (const fallback of pendingFallbacks) {
    assert.notEqual(fallback.type, 'video', `${fallback.assetRef} must render a static fallback`);
    const pagePayload = PAGE_IDS.map(pageComponents).find((components) => components.some((component) => component.id === fallback.id));
    const reachable = reachableComponentIds(fallback.id, new Map([...shared, ...pagePayload].map((component) => [component.id, component])));
    assert.ok(pagePayload.some((component) => reachable.has(component.id) && component.type === 'media' && component.config?.tag === 'image'), `${fallback.assetRef} fallback image`);
    const fallbackCopy = pagePayload.filter((component) => reachable.has(component.id) && component.type === 'text').map((component) => component.config?.text).join(' ');
    assert.match(normalizeText(fallbackCopy), /pendiente/, `${fallback.assetRef} operational state copy`);
  }
});

contractTest('CONTRACT-013 excludes ecommerce, PII forms and invented contact or payment channels', () => {
  const payloads = allProductionPayloads();
  const records = payloads.flatMap(collectRecords);
  const strings = payloads.flatMap(collectStrings);
  const forbiddenTypes = new Set(['input', 'interaction-scope', 'generic-file-dropzone']);
  for (const record of records) {
    if (typeof record.type === 'string') assert.equal(forbiddenTypes.has(record.type), false, `forbidden component: ${record.type}`);
    assert.notEqual(record.type, 'submit', 'submit controls are not part of this draft');
  }
  const corpus = strings.join('\n');
  assert.doesNotMatch(corpus, /mailto:|tel:|wa\.me|api\.whatsapp\.com|whatsapp/i);
  assert.doesNotMatch(corpus, /stripe|paypal|mercado\s*pago|mercadopago|openpay|conekta|\bcheckout\b|\bcarrito\b|\bsubscription\b|\bsuscripci[oó]n\b/i);
  assert.doesNotMatch(corpus, /drive\.google\.com|docs\.google\.com|X-Amz-Signature/i);
  for (const value of strings.filter((entry) => !/^https?:\/\//i.test(entry))) {
    assert.doesNotMatch(value, /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i, 'invented email');
    assert.doesNotMatch(value, /(?:\d[\s().-]*){10,}/, 'invented phone number');
  }
  assert.equal(existsSync(fixtureUrl('commerce.json')), false);
  assert.equal(existsSync(fixtureUrl('server')), false);

  const absoluteUrls = strings.filter((value) => /^https?:\/\//i.test(value));
  for (const value of absoluteUrls) {
    const approved = value === 'https://schema.org'
      || new Set(TESTING_CANONICALS.values()).has(value)
      || value.startsWith(ASSET_PREFIX)
      || normalizeInstagramDestination(value) === INSTAGRAM_DESTINATION;
    assert.equal(approved, true, `unapproved external URL: ${value}`);
  }
  const runtime = readJson('site-config.json').runtime ?? {};
  assert.equal(runtime.auth, undefined);
  assert.equal(runtime.authRemote, undefined);
  assert.deepEqual(runtime.apiActions ?? [], []);
  assert.deepEqual(runtime.dataSources ?? [], []);
});

contractTest('CONTRACT-014 rejects unsupported global keyframe classes and unfinished copy', () => {
  const payloads = allProductionPayloads();
  const strings = payloads.flatMap(collectStrings);
  const unsupportedAnimation = /(?:gradientShift|fadeUp|scaleIn|pulseSoft|wiggle|shimmer|growX|revealWidth|breathe)Animation|ank-animation/i;
  for (const value of strings) assert.doesNotMatch(value, unsupportedAnimation, `unsupported global animation: ${value}`);
  const corpus = strings.join('\n');
  assert.doesNotMatch(corpus, /\b(?:TODO|TBD|FIXME|CHANGE_ME)\b|lorem ipsum|example\.com|\{\{[^}]+\}\}/i);
  assert.doesNotMatch(corpus, /borderLeft-(?:[2-9]|\d{2,})px__solid__accentColor/i, 'thick accent stripe is not part of the design system');
  for (const component of payloads.flatMap((payload) => payload.components ?? [])) {
    if (component.type === 'link') assert.notEqual(component.config?.href, '#', `${component.id} placeholder link`);
  }
});

contractTest('CONTRACT-016 gives links real target boxes and orange CTAs an explicit AA foreground', () => {
  const links = [sharedComponents(), ...PAGE_IDS.map(pageComponents)].flat()
    .filter((component) => component.type === 'link');
  for (const link of links) {
    const styles = link.config?.styles ?? {};
    assert.ok(['inline-flex', 'flex', 'block'].includes(styles.display), `${link.id} needs a real block/flex target, not inline min-height`);
    assert.ok(parseFloat(styles.minHeight) >= 44, `${link.id} minimum clickable height`);
    assert.equal(styles.boxSizing, 'border-box', `${link.id} stable target sizing`);
    if (String(link.config.classes).split(/\s+/).includes('primaryCta')) {
      assert.equal(styles.color, 'var(--ank-titleColor)', `${link.id} must not inherit cream on orange`);
      assert.equal(styles.backgroundColor, 'var(--ank-accentColor)', `${link.id} explicit orange surface`);
    }
  }
});

contractTest('CONTRACT-017 keeps the shared header compact without hiding any navigation choice', () => {
  const shared = sharedComponents();
  const byId = new Map(shared.map((component) => [component.id, component]));
  const header = shared.find((component) => component.config?.tag === 'header');
  const shell = byId.get(header.config.components[0]);
  assert.ok(parseFloat(shell.config?.styles?.minHeight) >= 80 && parseFloat(shell.config.styles.minHeight) <= 96, 'desktop header content budget');
  assert.ok(parseFloat(shell.config.styles.paddingBlock) <= 4, 'two compact mobile rows must fit about 120px');
  const headerIds = reachableComponentIds(header.id, byId);
  const logo = shared.find((component) => headerIds.has(component.id) && component.config?.tag === 'image');
  assert.ok(parseFloat(logo.config?.styles?.width) >= 56 && parseFloat(logo.config.styles.width) <= 72, 'header logo width');
  assert.ok(parseFloat(logo.config?.styles?.height) <= 64, 'square artwork must not grow the header');
  const nav = shared.find((component) => headerIds.has(component.id) && component.config?.tag === 'nav');
  const navLinks = nav.config.components.map((id) => byId.get(id));
  assert.deepEqual(new Set(navLinks.map((link) => link.config.href)), new Set(ROUTES.filter(({ pageId }) => pageId !== 'not-found').map(({ path }) => path)));
  for (const link of navLinks) {
    assert.ok(parseFloat(link.config?.styles?.fontSize) >= 14, `${link.id} mobile-readable label`);
    assert.ok(parseFloat(link.config.styles.paddingInline) <= 6, `${link.id} room for all five labels at 375px`);
    assert.equal(link.config.styles.whiteSpace, 'nowrap');
  }
});

contractTest('CONTRACT-018 bounds the home hero independently of portrait image intrinsic height', () => {
  const components = mergedComponents('default');
  const main = [...components.values()].find((component) => component.config?.tag === 'main');
  const hero = components.get(main.config.components[0]);
  assert.equal(hero.config?.styles?.display, 'grid');
  assert.match(hero.config.styles.gridTemplateColumns, /repeat\(auto-fit, minmax\(min\(100%, 420px\), 1fr\)\)/, 'hero must stack without a narrow fixed text column');
  assert.equal(hero.config.styles.minHeight, '0');
  const heroIds = reachableComponentIds(hero.id, components);
  const heading = [...components.values()].find((component) => heroIds.has(component.id) && component.config?.tag === 'h1');
  assert.ok(parseFloat(heading.config?.styles?.maxWidth) >= 18 && parseFloat(heading.config.styles.maxWidth) <= 24, 'readable hero title measure');
  assert.equal(heading.config.styles.fontSize, 'clamp(2.2rem, 3.4vw, 4.25rem)', 'bounded heading scale');
  const image = [...components.values()].find((component) => heroIds.has(component.id) && component.config?.fetchPriority === 'high');
  const frame = [...components.values()].find((component) => component.config?.components?.includes(image.id));
  assert.equal(frame.config?.styles?.height, 'clamp(240px, 46vw, 640px)', 'bounded portrait frame at mobile and desktop');
  assert.equal(frame.config.styles.overflow, 'hidden');
  assert.equal(image.config.styles.height, '100%');
  assert.equal(image.config.styles.minHeight, '0');
  assert.equal(image.config.styles.objectFit, 'cover');
  assert.equal(image.config.width, 1200);
  assert.equal(image.config.height, 1600);
  const copy = components.get(hero.config.components[0]);
  assert.equal(copy.config?.styles?.backgroundColor, 'var(--ank-bgColor)', 'supplied black artwork needs a coherent cream text plane');
  assert.ok(parseFloat(copy.config.styles.gap) <= 16, 'compact mobile copy rhythm');
});

contractTest('CONTRACT-019 skips directly to a focusable main without hash navigation resetting the page', () => {
  const skip = sharedComponents().find((component) =>
    /saltar al contenido principal/.test(normalizeText(component.config?.label ?? component.config?.text)));
  assert.ok(skip, 'visible keyboard skip control');
  // generic-link cancels native hash navigation, dispatches popstate, and the runtime
  // reinitializes with scroll-to-top. The supported button action avoids that race.
  assert.equal(skip.type, 'button', 'skip must not enter the generic-link navigation cycle');
  assert.equal(skip.config.type, 'button');
  assert.equal(skip.config.href, undefined);
  assert.equal(skip.config.ariaControls, 'main-content');
  assert.equal(skip.eventInstructions, 'skipToMain:main-content');
  assertDurableFocus(skip.config.classes, readJson('angora-combos.json').combos, 'skip control');
  for (const pageId of PAGE_IDS) {
    const main = pageComponents(pageId).find((component) => component.config?.tag === 'main');
    assert.equal(main.config.tabindex, -1, `${pageId} programmatic focus target`);
    assert.ok(parseFloat(main.config.styles.scrollMarginTop) >= 120, `${pageId} main clears compact sticky header`);
    assert.equal(readJson(`${pageId}/page-config.json`).rootIds[0], skip.id, `${pageId} first keyboard control`);
  }
});

contractTest('CONTRACT-020 keeps colored section gutters self-contained and content centered', () => {
  const combos = readJson('angora-combos.json').combos;
  for (const name of ['marketSection', 'marketSectionDark', 'marketSectionBright', 'marketSectionWarm']) {
    const tokens = combos[name].join(' ').split(/\s+/);
    assert.ok(tokens.includes('ank-display-flex'), `${name} must not depend on nested combo expansion`);
    assert.ok(tokens.includes('ank-justifyContent-center'), `${name} centered content`);
    assert.ok(tokens.includes('ank-paddingInline-20px'), `${name} mobile gutter`);
    assert.ok(tokens.includes('ank-paddingInline-md-32px'), `${name} desktop gutter`);
    assert.ok(tokens.includes('ank-boxSizing-BBX'), `${name} padding uses the supported border-box token`);
  }
  for (const name of ['marketContent', 'marketSplit']) {
    assert.ok(combos[name].join(' ').includes('ank-marginInline-auto'), `${name} independently centered content`);
  }
});

contractTest('CONTRACT-021 keeps ready video presentations bounded with a thumbnail, not a second full-size poster', () => {
  for (const pageId of PAGE_IDS) {
    const components = pageComponents(pageId);
    for (const video of components.filter((component) => component.config?.tag === 'video')) {
      assert.equal(video.config?.styles?.height, 'clamp(320px, 40vw, 480px)', `${video.id} practical responsive height`);
      assert.equal(video.config.styles.maxHeight, '480px');
      assert.equal(video.config.styles.objectFit, 'contain');
      const figure = components.find((component) => component.config?.tag === 'figure' && component.config?.components?.includes(video.id));
      const poster = components.find((component) => figure.config.components.includes(component.id) && /-poster\.webp$/.test(component.config?.src ?? ''));
      assert.ok(poster, `${video.id} static poster remains available`);
      assert.ok(parseFloat(poster.config?.styles?.width) <= 120 && parseFloat(poster.config.styles.height) <= 160, `${video.id} poster must be a compact thumbnail`);
      assert.equal(poster.config.styles.objectFit, 'contain');
      assert.equal(figure.config?.styles?.display, 'grid', `${video.id} ordered media presentation`);
    }
  }
});

contractTest('CONTRACT-022 gives every supplied black logo a light brand surface', () => {
  const logos = [sharedComponents(), ...PAGE_IDS.map(pageComponents)].flat()
    .filter((component) => component.type === 'media' && /\/logos\//.test(component.config?.src ?? ''));
  for (const logo of logos) {
    assert.equal(logo.config?.styles?.backgroundColor, 'var(--ank-bgColor)', `${logo.id} supplied black artwork must not disappear on green`);
    assert.equal(logo.config.styles.objectFit, 'contain');
  }
});

for (const [number, pageId, shape, width, height] of [
  ['023', 'default', 'landscape', 1280, 720],
  ['024', 'mayoreo', 'portrait', 720, 1280],
]) {
  contractTest(`CONTRACT-${number} gives the ${shape} player and caption full-width rows outside the thumbnail column`, () => {
    const components = pageComponents(pageId);
    const video = components.find((component) => component.config?.tag === 'video');
    const figure = components.find((component) => component.config?.tag === 'figure' && component.config?.components?.includes(video.id));
    const ordered = figure.config.components.map((id) => components.find((component) => component.id === id));
    const poster = ordered.find((component) => /-poster\.webp$/.test(component.config?.src ?? ''));
    const caption = ordered.find((component) => component.config?.tag === 'figcaption');

    // generic-media is the grid item; config.styles belongs to its inner video.
    // An inner gridColumn cannot span the host out of a 96px thumbnail track.
    assert.equal(figure.config.styles.gridTemplateColumns, 'minmax(0, 1fr)', `${pageId} media hosts need one full-width track`);
    assert.equal(figure.config.styles.width, '100%');
    assert.equal(figure.config.styles.minWidth, '0');
    assert.equal(video.config.styles.width, '100%');
    assert.equal(video.config.styles.maxWidth, '960px');
    assert.equal(video.config.styles.height, 'clamp(320px, 40vw, 480px)');
    assert.equal(video.config.styles.objectFit, 'contain', `${shape} footage must retain its proportions`);
    assert.equal(video.config.controls, true);
    assert.equal(video.config.autoplay, false);
    assert.equal(poster.config.width, width, `${shape} source preview width`);
    assert.equal(poster.config.height, height, `${shape} source preview height`);
    assert.equal(poster.config.styles.width, '96px');
    assert.equal(poster.config.styles.height, '128px');
    assert.ok(ordered.indexOf(video) > ordered.indexOf(poster), 'preview precedes full-width player');
    assert.equal(ordered.at(-1), caption, 'description occupies its own final row');
    for (const child of ordered) {
      assert.equal(child.config?.styles?.gridColumn, undefined, `${child.id} must not claim to position a wrapper from its inner element`);
      assert.equal(child.config?.styles?.gridRow, undefined, `${child.id} follows semantic source order`);
    }
  });
}

contractTest('CONTRACT-025 fits all five primary labels within the measured 375px navigation budget', () => {
  const shared = sharedComponents();
  const byId = new Map(shared.map((component) => [component.id, component]));
  const header = shared.find((component) => component.config?.tag === 'header');
  const headerIds = reachableComponentIds(header.id, byId);
  const nav = shared.find((component) => headerIds.has(component.id) && component.config?.tag === 'nav');
  const links = nav.config.components.map((id) => byId.get(id));
  // Browser baseline: link widths 54.797, 53.234, 75.016, 77.328, 90.359
  // with 6px padding on each side. Keep the measured 14px type; reclaim padding.
  const measuredTextWidths = new Map([
    ['/', 42.796875], ['/menu', 41.234375], ['/impacto', 63.015625],
    ['/mayoreo', 65.328125], ['/preguntas', 78.359375],
  ]);
  const available = 375 - 2 * parseFloat(header.config.styles.paddingInline);
  const required = links.reduce((sum, link) => {
    const styles = link.config.styles;
    assert.equal(styles.fontSize, '14px', `${link.id} keeps the measured readable type`);
    assert.ok(parseFloat(styles.minHeight) >= 44, `${link.id} usable target height`);
    const textWidth = measuredTextWidths.get(link.config.href);
    assert.ok(Number.isFinite(textWidth), `${link.id} measured primary route`);
    return sum + Math.max(parseFloat(styles.minWidth) || 0, textWidth + 2 * parseFloat(styles.paddingInline));
  }, 0) + (links.length - 1) * parseFloat(nav.config.styles.gap);
  assert.ok(required <= available, `primary labels need ${required.toFixed(3)}px but only ${available}px are available`);
  assert.equal(nav.config.styles.flexWrap, 'wrap', 'narrower viewports must reflow labels rather than clip them');
  assert.equal(nav.config.styles.overflowX, 'visible', 'keyboard users must not depend on an undiscoverable horizontal scroller');
  for (const link of links) assert.ok(parseFloat(link.config.styles.minWidth) >= 44, `${link.id} usable target width`);
});

contractTest('CONTRACT-026 keeps section titles tablet-safe before the desktop breakpoint', () => {
  const tokens = readJson('angora-combos.json').combos.sectionTitle.join(' ').split(/\s+/);
  const fontSizes = tokens.filter((token) => token.startsWith('ank-fontSize-'));
  assert.deepEqual(fontSizes, [
    'ank-fontSize-2rem',
    'ank-fontSize-lg-3_2rem',
  ], 'retain 2rem through md; apply the unchanged 3.2rem increment only at lg');
});

contractTest('CONTRACT-027 keeps pending-media descriptions source-backed without claiming unseen playback', () => {
  const variables = sharedVariables();
  for (const id of ['greenstock-blend-02', 'greenstock-impact-04']) {
    const video = variables.assets.videos.find((asset) => asset.id === id);
    assert.equal(video.status, 'pending-source-materialization', `${id} has not been inspected`);
  }
  const questions = readJson('preguntas/i18n/es.json').dictionary.page.video;
  const impact = readJson('impacto/i18n/es.json').dictionary.page.process;
  const fallback = pageComponents('preguntas').find((component) => component.id === 'questionsVideoDescription').config.text;
  const staticCopies = {
    questionsDescription: questions.description,
    questionsFallback: fallback,
    questionsCaption: questions.caption,
    impactCaption: impact.caption,
  };
  const playbackClaims = Object.entries(staticCopies)
    .filter(([, copy]) => /\bvideo\b|\breproduc\w*\b|\bcontroles\b/.test(normalizeText(copy)))
    .map(([name]) => name);
  assert.deepEqual(playbackClaims, [], 'pending-media prose describes recorded steps or process, not unseen footage');
  assert.equal(fallback, questions.description, 'fallback and translated preparation instructions agree');
  for (const copy of [questions.description, questions.caption, fallback]) {
    let previousStep = -1;
    for (const step of variables.preparationSteps) {
      const position = normalizeText(copy).indexOf(normalizeText(step.title));
      assert.ok(position > previousStep, `static preparation copy preserves the recorded ${step.title} step in order`);
      previousStep = position;
    }
  }
  for (const step of ['porcionar', 'congelar', 'empacar al vacio']) {
    assert.ok(normalizeText(impact.description).includes(step), `${step} is part of the recorded process`);
    assert.ok(normalizeText(impact.caption).includes(step), `static impact caption preserves ${step}`);
  }
});
