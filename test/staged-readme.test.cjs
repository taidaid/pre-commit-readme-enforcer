'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const script = path.join(__dirname, '..', 'check-readme-updated.js');

function runStagedHook(cwd) {
    const env = { ...process.env };
    delete env.README_ENFORCE_INTERLINK;
    return spawnSync(process.execPath, [script], {
        cwd,
        env,
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

function stageChanges(cwd, changes) {
    for (const [rel, body] of Object.entries(changes)) {
        const abs = path.join(cwd, rel);
        fs.writeFileSync(abs, body, 'utf8');
        git(cwd, ['add', rel]);
    }
}

test('staged check passes when code and nearest README are staged', () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'readme-staged-ok-'));
    initRepoWithFiles(cwd, {
        'src/a.ts': 'export {}\n',
        'src/README.md': '# Src\n'
    });
    stageChanges(cwd, {
        'src/a.ts': 'export {}\n// updated\n',
        'src/README.md': '# Src\n\nupdated\n'
    });
    const r = runStagedHook(cwd);
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.match(r.stdout, /README update requirement satisfied/);
});

test('staged check fails when code is staged without nearest README', () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'readme-staged-fail-'));
    initRepoWithFiles(cwd, {
        'src/a.ts': 'export {}\n',
        'src/README.md': '# Src\n'
    });
    stageChanges(cwd, { 'src/a.ts': 'export {}\n// updated\n' });
    const r = runStagedHook(cwd);
    assert.equal(r.status, 1, r.stdout);
    const out = r.stderr + r.stdout;
    assert.match(out, /src\/README\.md/);
    assert.doesNotMatch(out, /src\\README\.md/);
});

test('staged check passes when only README files are staged', () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'readme-staged-readme-only-'));
    initRepoWithFiles(cwd, {
        'src/a.ts': 'export {}\n',
        'src/README.md': '# Src\n'
    });
    stageChanges(cwd, { 'src/README.md': '# Src\n\nupdated\n' });
    const r = runStagedHook(cwd);
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.match(r.stdout, /Only README files staged/);
});

test('reported paths use forward slashes (Windows regression)', () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'readme-staged-posix-'));
    initRepoWithFiles(cwd, {
        'src/a.ts': 'export {}\n',
        'src/README.md': '# Src\n'
    });
    stageChanges(cwd, { 'src/a.ts': 'export {}\n// updated\n' });
    const r = runStagedHook(cwd);
    assert.equal(r.status, 1);
    const out = r.stderr + r.stdout;
    assert.ok(out.includes('src/README.md'), 'expected forward-slash path in output');
    assert.ok(!/src\\README\.md/.test(out), 'output must not use backslashes in paths');
});
