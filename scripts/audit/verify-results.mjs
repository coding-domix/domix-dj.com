// Validate the saved evidence without rerunning successful browser tests.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';

const pages = ['index.html', 'shows.html', 'music.html', 'about.html', 'contact.html', 'legal-privacy.html'];
const reports = [];
for (const phase of ['before', 'after']) {
  for (const file of pages) {
    for (const formFactor of ['mobile', 'desktop']) {
      for (let run = 1; run <= 3; run++) {
        const reportPath = `output/playwright/${phase}/lighthouse/${file}-${formFactor}-${run}.json`;
        const report = JSON.parse(fs.readFileSync(reportPath));
        assert.equal(report.runtimeError, undefined, reportPath);
        assert.deepEqual(report.runWarnings, [], reportPath);
        assert.equal(report.configSettings.formFactor, formFactor, reportPath);
        assert.equal(report.configSettings.throttlingMethod, 'simulate', reportPath);
        assert.equal(report.lighthouseVersion, '13.5.0', reportPath);
        assert.ok(Number.isFinite(report.categories.performance.score), reportPath);
        for (const metric of ['largest-contentful-paint', 'cumulative-layout-shift', 'first-contentful-paint', 'total-blocking-time', 'speed-index']) {
          assert.ok(Number.isFinite(report.audits[metric].numericValue), `${reportPath}: ${metric}`);
        }
        reports.push({ phase, file, formFactor, run, date: report.fetchTime,
          settings: { throttling: report.configSettings.throttling, screenEmulation: report.configSettings.screenEmulation },
          sha256: crypto.createHash('sha256').update(fs.readFileSync(reportPath)).digest('hex') });
      }
    }
  }
}
for (const formFactor of ['mobile', 'desktop']) {
  const group = reports.filter(r => r.formFactor === formFactor);
  for (const report of group) assert.deepEqual(report.settings, group[0].settings);
}
const firstMeasurement = Math.min(...reports.map(r => Date.parse(r.date)));
const baselineRevision = '6429a70310dc5fc45f44be36ee5aaa1d7403b587';
const tracked = execFileSync('git', ['ls-tree', '-r', '--name-only', baselineRevision], {encoding: 'utf8'}).trim().split('\n');
const hashes = {};
for (const file of tracked) {
  const baseline = fs.readFileSync(path.join('output/playwright/baseline-site', file));
  const original = execFileSync('git', ['show', `${baselineRevision}:${file}`], {maxBuffer: 30 * 1024 * 1024});
  assert.ok(baseline.equals(original), `Baseline differs from Git: ${file}`);
  assert.ok(fs.existsSync(file), `Original URL/file removed: ${file}`);
}
const production = [...tracked, 'images/social/instagram-icon.webp', 'images/social/soundcloud-icon.webp',
  'images/domix/sets/cafe-opera-tomorrowland-academy.webp', 'releases/remixes/where-have-you-been/cover.webp'];
for (const file of production) {
  assert.ok(fs.statSync(file).mtimeMs <= firstMeasurement, `Source changed after measurement began: ${file}`);
  hashes[file] = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}
let scripts = 0;
for (const file of [...pages, 'index_mobil.html']) {
  const html = fs.readFileSync(file, 'utf8');
  for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
    new vm.Script(match[1], {filename: file}); scripts++;
  }
  const baseline = fs.readFileSync(`output/playwright/baseline-site/${file}`, 'utf8');
  const mailto = text => [...text.matchAll(/href="(mailto:[^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(mailto(html), mailto(baseline), `Mailto changed: ${file}`);
}
new vm.Script(fs.readFileSync('js/site.js', 'utf8'), {filename: 'js/site.js'});
const evidence = { verifiedOn: '2026-10-10', baselineRevision, validLighthouseReports: reports.length,
  measurementStart: new Date(firstMeasurement).toISOString(), measurementEnd: reports.map(r=>r.date).sort().at(-1),
  baselineFilesVerified: tracked.length, productionFilesHashed: production.length, inlineScriptsParsed: scripts,
  productionUnchangedSinceMeasurements: true, mailtoTargetsUnchanged: true, reports, sourceSha256: hashes };
fs.writeFileSync('docs/audit-data/final-verification.json', JSON.stringify(evidence, null, 2));
console.log(JSON.stringify({reports: reports.length, baselineFiles: tracked.length, sourceUnchanged: true, syntaxAndMailto: 'passed'}));
