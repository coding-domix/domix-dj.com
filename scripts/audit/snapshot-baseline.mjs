import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const revision = '6429a70310dc5fc45f44be36ee5aaa1d7403b587';
const output = 'output/playwright/baseline-site';
for (const file of execFileSync('git', ['ls-tree', '-r', '--name-only', revision], { encoding: 'utf8' }).trim().split('\n')) {
  const target = path.join(output, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, execFileSync('git', ['show', `${revision}:${file}`], { maxBuffer: 30 * 1024 * 1024 }));
}
console.log(`Baseline saved from ${revision}`);
