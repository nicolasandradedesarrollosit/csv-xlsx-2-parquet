import { SITE } from '../config/site';
import { withBase } from './paths';

export function absUrl(path: string, site: URL | undefined) {
  return new URL(withBase(path), site).href;
}

export function webApplication(site: URL | undefined) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: SITE.name,
    url: absUrl('/', site),
    description: SITE.description,
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Any',
    browserRequirements: 'Requires JavaScript and WebAssembly.',
    isAccessibleForFree: true,
    inLanguage: 'en',
    image: absUrl(SITE.ogImage.path, site),
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    featureList: [
      'Convert CSV to Parquet',
      'Convert XLSX to Parquet',
      'Preview the first rows',
      'Detect and override column types',
      'ZSTD compression',
      'Runs in the browser, no upload',
    ],
    author: { '@type': 'Person', name: SITE.author, url: SITE.authorUrl },
  };
}
