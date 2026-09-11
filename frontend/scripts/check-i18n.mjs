/**
 * Locale consistency check — run with `npm run check:i18n`.
 *
 * Exits non-zero on anything that would ship a broken string:
 *   - a key present in one language but not the other
 *   - an interpolation placeholder set that differs between languages
 *     (e.g. {{count}} in English but {{n}} in French — renders literally)
 *   - a plural family with a _one but no _other, or vice versa
 *   - a key used in code but defined nowhere (renders as the raw key)
 *
 * It also prints, without failing, the keys that are byte-identical in both
 * languages and the keys nothing references — both are usually fine (real
 * cognates; keys kept for later) but worth a glance after a big change.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
const en = JSON.parse(fs.readFileSync(path.join(SRC, 'i18n/locales/en.json'), 'utf8'));
const fr = JSON.parse(fs.readFileSync(path.join(SRC, 'i18n/locales/fr.json'), 'utf8'));

const flat = (o, p = '', out = {}) => {
    for (const [k, v] of Object.entries(o)) {
        const key = p ? `${p}.${k}` : k;
        if (v && typeof v === 'object' && !Array.isArray(v)) flat(v, key, out);
        else out[key] = v;
    }
    return out;
};

const E = flat(en), F = flat(fr);
const ek = Object.keys(E), fk = Object.keys(F);

const missing = ek.filter(k => !(k in F));
const extra   = fk.filter(k => !(k in E));

// placeholder parity
const ph = s => [...String(s).matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]).sort().join(',');
const phMismatch = ek.filter(k => k in F && ph(E[k]) !== ph(F[k]));

// identical strings (possibly untranslated)
const identical = ek.filter(k => k in F && E[k] === F[k] && !k.startsWith('subjectName.') && !k.startsWith('_comment'));

// plural-family sanity: a _one must have an _other and vice versa
const pluralIssues = [];
for (const src of [['en', E], ['fr', F]]) {
    const [lang, obj] = src;
    for (const k of Object.keys(obj)) {
        if (k.endsWith('_one') && !(k.replace(/_one$/, '_other') in obj)) pluralIssues.push(`${lang}: ${k} has no _other`);
        if (k.endsWith('_other') && !(k.replace(/_other$/, '_one') in obj)) pluralIssues.push(`${lang}: ${k} has no _one`);
    }
}

// Which keys does the code actually reference?
const files = [];
(function walk(d) {
    for (const f of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, f.name);
        if (f.isDirectory()) walk(p);
        else if (/\.(jsx?|tsx?)$/.test(f.name)) files.push(p);
    }
})(SRC);

const used = new Set();
const dynamic = new Set();
const known = new Set(ek.map(k => k.replace(/_(one|other|zero|few|many)$/, '')));
for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(/\bt\(\s*'([^']+)'/g))            used.add(m[1]);
    for (const m of src.matchAll(/\bt\(\s*"([^"]+)"/g))            used.add(m[1]);
    for (const m of src.matchAll(/i18nKey=["']([^"']+)["']/g))     used.add(m[1]);
    // Keys passed indirectly — labelKey: 'nav.groups', then t(labelKey) later.
    // Any quoted string that exactly matches a defined key counts as a use.
    for (const m of src.matchAll(/["']([a-zA-Z][\w.&\/ -]*)["']/g)) {
        if (known.has(m[1])) used.add(m[1]);
    }
    // Template-literal keys, wherever they are built: `time.${x}`, `subjectName.${s}`
    for (const m of src.matchAll(/`([a-zA-Z][\w.]*\.)\$\{/g))      dynamic.add(m[1]);
}

// a used key resolves if it exists, or is a plural base with _one/_other
const resolves = k => k in E || (`${k}_one` in E && `${k}_other` in E);
const undef = [...used].filter(k => !resolves(k) && !k.includes('${'));

// keys defined but never referenced (statically or via a dynamic prefix)
const dynPrefixes = [...dynamic];
const unused = ek.filter(k => {
    const base = k.replace(/_(one|other|zero|few|many)$/, '');
    if (used.has(base) || used.has(k)) return false;
    return !dynPrefixes.some(p => p && k.startsWith(p));
});

const R = (label, arr) => console.log(`  ${label}: ${arr.length ? arr.join(', ') : 'none'}`);

console.log(`\n=== key parity ===`);
console.log(`  en: ${ek.length} keys | fr: ${fk.length} keys`);
R('missing in fr', missing);
R('extra in fr  ', extra);
R('placeholder mismatches', phMismatch);
R('plural family issues', pluralIssues);

console.log(`\n=== translation coverage ===`);
R('identical en/fr (check these are intentional)', identical);

console.log(`\n=== code <-> locale ===`);
console.log(`  static keys used in code: ${used.size}`);
console.log(`  dynamic key prefixes: ${dynPrefixes.join(', ') || 'none'}`);
R('referenced but NOT defined', undef);
R('defined but never referenced', unused);

const fatal = missing.length || extra.length || phMismatch.length || pluralIssues.length || undef.length;
console.log(`\n${fatal ? 'FAIL' : 'PASS'}\n`);
process.exit(fatal ? 1 : 0);
