import {defineRouting} from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['es', 'ru', 'en'],
  defaultLocale: 'es',
  localePrefix: 'always'
});
