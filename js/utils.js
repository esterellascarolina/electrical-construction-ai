/* =========================================================
   Utilities: normalize CSV rows, split semicolon-delimited
   fields, count single and multi-valued occurrences, build
   year distribution, fetch papers for a drill-down.
   ========================================================= */

window.AppUtils = window.AppUtils || {};

(function() {
  // Fields whose values are semicolon-delimited multi-values.
  // Adding a field name here makes it automatically split into
  // a clean array of strings during normalization.
  const MULTI_VALUE_FIELDS = new Set([
    'ai_technique',
    'digital_technology',
    'construction_phase',
    'value_proposition',
    'pain_point_addressed',
    'electrical_work_category',
    'specific_methods',
    'future_research_directions',
    'specific_ai_model',
    'software_platform',
    'contractor_role_impacted',
    'limitations_acknowledged',
    'data_type',
    'project_delivery_method'
  ]);

  // Tokens that mean "no data" in this dataset. Treated as empty.
  const EMPTY_TOKENS = new Set([
    '', 'nan', 'na', 'n/a',
    'not applicable', 'not specified', 'not reported',
    'none', 'null', 'undefined'
  ]);

  // Per-field override: tokens that would normally be filtered as
  // empty but carry domain meaning for a specific field and should
  // be preserved. Used for construction_phase, where "Not applicable"
  // identifies studies that sit outside any project lifecycle
  // (workforce training, education, firm-level organizational work).
  const PRESERVED_TOKENS_BY_FIELD = {
    construction_phase: new Set(['Not applicable'])
  };

  const isEmpty = (v) => {
    if (v === null || v === undefined) return true;
    return EMPTY_TOKENS.has(String(v).trim().toLowerCase());
  };

  const cleanString = (v) => (isEmpty(v) ? null : String(v).trim());

  // splitMulti now takes an optional `field` parameter. When the
  // field has a PRESERVED_TOKENS_BY_FIELD entry, tokens in that
  // set are kept even if they would otherwise be classified as
  // empty. The early isEmpty(value) shortcut is replaced with an
  // explicit null/empty check so a value like "Not applicable"
  // (which isEmpty considers empty) is not dropped before it can
  // be inspected against the preserved set.
  const splitMulti = (value, field = null, sep = ';') => {
    if (value === null || value === undefined) return [];
    const trimmed = String(value).trim();
    if (!trimmed) return [];
    const preserved = field ? PRESERVED_TOKENS_BY_FIELD[field] : null;
    return trimmed
      .split(sep)
      .map((s) => s.trim())
      .filter((s) => {
        if (!s) return false;
        if (preserved && preserved.has(s)) return true;
        return !EMPTY_TOKENS.has(s.toLowerCase());
      });
  };

  // Convert one raw CSV row into a normalized record.
  const normalizeRecord = (row) => {
    const out = {};
    for (const [k, v] of Object.entries(row)) {
      if (MULTI_VALUE_FIELDS.has(k)) {
        out[k] = splitMulti(v, k);
      } else if (k === 'Year') {
        const n = parseInt(v, 10);
        out[k] = Number.isNaN(n) ? null : n;
      } else {
        out[k] = cleanString(v);
      }
    }
    return out;
  };

  // Count occurrences of a single-value field.
  const countSingle = (rows, field) => {
    const counts = new Map();
    for (const r of rows) {
      const v = r[field];
      if (!v) continue;
      counts.set(v, (counts.get(v) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  };

  // Count occurrences of a multi-value field. Each paper contributes
  // once per distinct value it lists.
  const countMulti = (rows, field) => {
    const counts = new Map();
    for (const r of rows) {
      const arr = r[field] || [];
      const seen = new Set();
      for (const v of arr) {
        if (seen.has(v)) continue;
        seen.add(v);
        counts.set(v, (counts.get(v) || 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  };

  // Year distribution, ascending. Skips records with missing year.
  const yearDistribution = (rows) => {
    const counts = new Map();
    for (const r of rows) {
      if (r.Year == null) continue;
      counts.set(r.Year, (counts.get(r.Year) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => a[0] - b[0]);
  };

  // Generic drill-down: return every paper whose `field` matches
  // `value`. Handles single-value fields by equality and multi-value
  // fields by membership. Sorted alphabetically by Title.
  const papersByField = (rows, field, value, isMulti = false) =>
    rows
      .filter((r) => {
        if (isMulti) return Array.isArray(r[field]) && r[field].includes(value);
        return r[field] === value;
      })
      .sort((a, b) => (a['Title'] || '').localeCompare(b['Title'] || ''));

  // Back-compat wrapper retained so older callers still work.
  const papersByYear = (rows, year) => papersByField(rows, 'Year', year, false);

  const formatPercent = (n, total) =>
    total > 0 ? ((n / total) * 100).toFixed(1) + '%' : '';

  window.AppUtils = {
    MULTI_VALUE_FIELDS,
    EMPTY_TOKENS,
    isEmpty,
    cleanString,
    splitMulti,
    normalizeRecord,
    countSingle,
    countMulti,
    yearDistribution,
    papersByField,
    papersByYear,
    formatPercent
  };
})();