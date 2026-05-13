'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const script = path.join(__dirname, '..', 'check-readme-updated.js');

function runHook(cwd, env = {}) {
    return spawnSync(process.execPath, [script], {
        cwd,
        env: { ...process.env, ...env, README_ENFORCE_INTERLINK: '1' },
        encoding: 'utf8'
    });
}

function git(cwd, args) {
    const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
    assert.equal(r.status, 0, `git ${args.join(' ')}: ${r.stderr || r.stdout}`);
    return r.stdout;
}

function initRepoWithFiles(cwd, files) {
    fs.mkdirSync(cwd, { recursive: true });
    git(cwd, ['init']);
    git(cwd, ['config', 'user.email', 'test@test.local']);
    git(cwd, ['config', 'user.name', 'Test']);
    for (const [rel, body] of Object.entries(files)) {
        const abs = path.join(cwd, rel);
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        fs.writeFileSync(abs, body, 'utf8');
    }
    git(cwd, ['add', '.']);
    git(cwd, ['commit', '-m', 'init']);
}

test('reachability passes when root links to nested README', () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'readme-reach-ok-'));
    initRepoWithFiles(cwd, {
        'README.md': '# Root\n\nSee [docs](./docs/README.md).\n',
        'docs/README.md': '# Docs\n'
    });
    const r = runHook(cwd);
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.match(r.stdout, /all 2 tracked README/);
});

test('reachability fails when nested README is not linked', () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'readme-reach-bad-'));
    initRepoWithFiles(cwd, {
        'README.md': '# Root\n\nNo link to docs.\n',
        'docs/README.md': '# Orphan\n'
    });
    const r = runHook(cwd);
    assert.equal(r.status, 1, r.stdout);
    assert.match(r.stderr + r.stdout, /docs\/README\.md/);
});

test('reachability passes with directory-style relative link', () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'readme-reach-dir-'));
    initRepoWithFiles(cwd, {
        'README.md': '# Root\n\nSee [docs](./docs).\n',
        'docs/README.md': '# Docs\n'
    });
    const r = runHook(cwd);
    assert.equal(r.status, 0, r.stderr + r.stdout);
});

test('CLI flag enables reachability without env', () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'readme-reach-flag-'));
    initRepoWithFiles(cwd, {
        'README.md': '# Root\n\n[sub](./sub/README.md)\n',
        'sub/README.md': '# Sub\n'
    });
    const r = spawnSync(process.execPath, [script, '--enforce-readme-interlink'], {
        cwd,
        env: { ...process.env },
        encoding: 'utf8'
    });
    assert.equal(r.status, 0, r.stderr + r.stdout);
});

test('fails when no root-level tracked README exists', () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'readme-reach-noroot-'));
    initRepoWithFiles(cwd, {
        'pkg/README.md': '# Only nested\n'
    });
    const r = runHook(cwd);
    assert.equal(r.status, 1);
    assert.match(r.stderr + r.stdout, /no root-level README/i);
});
