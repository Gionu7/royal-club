import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STRINGS } from '../js/i18n.js';
import { LIBRARY, TEMPLATES, skillText } from '../js/library.js';

test('every interface string has a Romanian version', () => {
  const missing = Object.keys(STRINGS.en).filter((k) => !STRINGS.ro[k]);
  assert.deepEqual(missing, []);
  const extra = Object.keys(STRINGS.ro).filter((k) => !STRINGS.en[k]);
  assert.deepEqual(extra, []);
});

test('Romanian strings keep the same {placeholders}', () => {
  for (const k of Object.keys(STRINGS.en)) {
    const ph = (s) => (s.match(/\{\w+\}/g) || []).sort().join(',');
    assert.equal(ph(STRINGS.ro[k]), ph(STRINGS.en[k]), k);
  }
});

test('every skill tag in the library has a Romanian name', () => {
  for (const a of LIBRARY) for (const k of a.skills || []) assert.equal(typeof skillText(k), 'object', `${a.id}: ${k}`);
});

test('all localized library text is filled in for Romanian', () => {
  const walk = (v, path) => {
    if (v && typeof v === 'object' && 'en' in v) assert.ok(v.ro && v.ro.trim(), path);
    else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`));
    else if (v && typeof v === 'object') for (const k of Object.keys(v)) walk(v[k], `${path}.${k}`);
  };
  LIBRARY.forEach((a) => walk(a, a.id));
  TEMPLATES.forEach((tpl) => walk(tpl, tpl.id));
});
