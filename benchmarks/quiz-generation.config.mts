import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { normalizePath } from 'vite';
import { defineConfig } from 'vitest/config';
import ts from 'typescript';

const root = fileURLToPath(new URL('..', import.meta.url));
const baseline = process.env.QF_BENCHMARK_VARIANT === 'baseline';
const baselineId = '\0quiz-generation-baseline.ts';
const baselineRef = '32cd140171cc01ceb77ae828a144332d7cbc4a1d';

export default defineConfig({
  plugins: baseline ? [{
    name: 'committed-gemini-baseline',
    enforce: 'pre',
    resolveId(source, importer) {
      if (source === '@benchmark/gemini') return baselineId;
      if (importer === baselineId && source.startsWith('./')) {
        return normalizePath(resolve(root, 'lib', `${source}.ts`));
      }
    },
    load(id) {
      if (id === baselineId) {
        const source = execFileSync('git', ['show', `${baselineRef}:lib/gemini.ts`], { cwd: root, encoding: 'utf8' });
        return { code: ts.transpileModule(source, {
          compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
        }).outputText, map: null };
      }
    },
  }] : [],
  resolve: { alias: {
    ...(baseline ? {} : { '@benchmark/gemini': resolve(root, 'lib/gemini.ts') }),
    '@': root,
  } },
  test: {
    include: ['benchmarks/quiz-generation/measure.bench.ts'],
    environment: 'node',
    fileParallelism: false,
    maxWorkers: 1,
    restoreMocks: true,
  },
});
