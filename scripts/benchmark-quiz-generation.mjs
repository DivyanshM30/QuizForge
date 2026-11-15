import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const variants = process.argv.includes('--baseline-only') ? ['baseline'] : ['baseline', 'current'];
for (const variant of variants) {
  const env = { ...process.env, QF_BENCHMARK_VARIANT: variant };
  for (const key of Object.keys(env)) {
    if (/GEMINI|GOOGLE.*KEY|DATABASE_URL|RESEND_API_KEY|NEXTAUTH_SECRET/.test(key)) delete env[key];
  }
  const result = spawnSync(process.execPath, [
    'node_modules/vitest/vitest.mjs', 'run', '--config', 'benchmarks/quiz-generation.config.mts',
  ], { cwd: root, env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
if (variants.includes('current')) {
  const report = name => JSON.parse(readFileSync(new URL(`../docs/local/quiz-generation-metric/${name}.json`, import.meta.url), 'utf8'));
  const baseline = report('baseline');
  const current = report('current');
  for (const key of ['corpus', 'cases', 'lockfile', 'protocol']) {
    if (baseline.hashes[key] !== current.hashes[key]) throw new Error(`Mismatched ${key}; comparison invalid`);
  }
  if (JSON.stringify(baseline.environment) !== JSON.stringify(current.environment)) {
    throw new Error('Mismatched runtime environment; comparison invalid');
  }
  if (!baseline.cases.every((row, index) => row.id === current.cases[index]?.id &&
    row.documentSha256 === current.cases[index]?.documentSha256)) {
    throw new Error('Mismatched DOCX inputs; comparison invalid');
  }
  if (JSON.stringify(baseline.environment) !== JSON.stringify(current.environment)) {
    throw new Error('Mismatched runtime environment; comparison invalid');
  }
  if (!baseline.cases.every((row, index) => row.id === current.cases[index]?.id &&
    row.documentSha256 === current.cases[index]?.documentSha256)) {
    throw new Error('Mismatched DOCX inputs; comparison invalid');
  }
  const before = baseline.summary.answerableRequests.total;
  const after = current.summary.answerableRequests.total;
  console.log(`Answerable-case mocked requests: ${before} -> ${after} (${((before - after) / before * 100).toFixed(2)}% reduction)`);
  console.log('Raw reports: docs/local/quiz-generation-metric/{baseline,current}.json');
}
