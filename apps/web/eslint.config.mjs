import {FlatCompat} from '@eslint/eslintrc';
import {fileURLToPath} from 'node:url';
import {dirname} from 'node:path';
import {globalIgnores} from 'eslint/config';

const baseDirectory = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({baseDirectory});

const config = [
  ...compat.extends('next/core-web-vitals'),
  globalIgnores(['.next/**', 'node_modules/**', 'coverage/**'])
];

export default config;
