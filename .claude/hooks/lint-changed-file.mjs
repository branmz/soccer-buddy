// PostToolUse hook: formats and lints the file Claude just edited.
// Exit 2 + stderr feeds ESLint errors back to Claude so they get fixed immediately.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const LINTABLE = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const IGNORED_DIRS = ['node_modules', 'dist', '.expo', path.join('src', 'db', 'migrations')];

const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

let filePath;
try {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  filePath = input.tool_response?.filePath ?? input.tool_input?.file_path;
} catch {
  process.exit(0);
}
if (!filePath || !existsSync(filePath)) process.exit(0);

const relative = path.relative(projectDir, path.resolve(filePath));
const outsideProject = relative.startsWith('..') || path.isAbsolute(relative);
const ignored = IGNORED_DIRS.some((dir) => relative === dir || relative.startsWith(dir + path.sep));
if (outsideProject || ignored || !LINTABLE.has(path.extname(filePath))) process.exit(0);

function runBin(bin, args) {
  const binPath = path.join(projectDir, 'node_modules', ...bin);
  if (!existsSync(binPath)) return null;
  return spawnSync(process.execPath, [binPath, ...args], { cwd: projectDir, encoding: 'utf8' });
}

runBin(['prettier', 'bin', 'prettier.cjs'], ['--write', '--log-level', 'warn', relative]);

const eslint = runBin(['eslint', 'bin', 'eslint.js'], ['--max-warnings=0', relative]);
if (eslint && eslint.status !== 0) {
  process.stderr.write(`ESLint found problems in ${relative}:\n${eslint.stdout}${eslint.stderr}`);
  process.exit(2);
}
