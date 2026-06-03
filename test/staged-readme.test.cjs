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

test('staged check passes when ignored directory is staged without README', () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'readme-staged-ignore-dir-'));
    initRepoWithFiles(cwd, {
        '.readme-enforcerignore': 'vendor/\n',
        'vendor/a.ts': 'export {}\n',
        'vendor/README.md': '# Vendor\n'
    });
    stageChanges(cwd, { 'vendor/a.ts': 'export {}\n// updated\n' });
    const r = runStagedHook(cwd);
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.match(r.stdout, /Skipped 1 staged file\(s\) matching ignore rules/);
});

test('staged check passes when ignored extension is staged without README', () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'readme-staged-ignore-ext-'));
    initRepoWithFiles(cwd, {
        '.readme-enforcerignore': '*.lock\n',
        'yarn.lock': 'packages:\n',
        'README.md': '# Root\n'
    });
    stageChanges(cwd, { 'yarn.lock': 'packages:\n# updated\n' });
    const r = runStagedHook(cwd);
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.match(r.stdout, /Skipped 1 staged file\(s\) matching ignore rules/);
});

test('staged check passes when exact ignored path is staged without README', () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'readme-staged-ignore-exact-'));
    initRepoWithFiles(cwd, {
        '.readme-enforcerignore': 'scripts/codegen.ts\n',
        'scripts/codegen.ts': 'export {}\n',
        'scripts/README.md': '# Scripts\n'
    });
    stageChanges(cwd, { 'scripts/codegen.ts': 'export {}\n// updated\n' });
    const r = runStagedHook(cwd);
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.match(r.stdout, /Skipped 1 staged file\(s\) matching ignore rules/);
});

test('staged check still fails for non-ignored code when directory is ignored', () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'readme-staged-ignore-mixed-'));
    initRepoWithFiles(cwd, {
        '.readme-enforcerignore': 'vendor/\n',
        'vendor/a.ts': 'export {}\n',
        'src/a.ts': 'export {}\n',
        'src/README.md': '# Src\n'
    });
    stageChanges(cwd, {
        'vendor/a.ts': 'export {}\n// vendor\n',
        'src/a.ts': 'export {}\n// updated\n'
    });
    const r = runStagedHook(cwd);
    assert.equal(r.status, 1, r.stdout);
    const out = r.stderr + r.stdout;
    assert.match(out, /src\/README\.md/);
    assert.match(out, /Skipped 1 staged file\(s\) matching ignore rules/);
});

test('staged check respects package.json readmeEnforcer.ignore', () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'readme-staged-ignore-pkg-'));
    initRepoWithFiles(cwd, {
        'package.json': JSON.stringify({
            name: 'test-app',
            readmeEnforcer: { ignore: ['generated/'] }
        }, null, 2) + '\n',
        'generated/a.ts': 'export {}\n',
        'generated/README.md': '# Generated\n'
    });
    stageChanges(cwd, { 'generated/a.ts': 'export {}\n// updated\n' });
    const r = runStagedHook(cwd);
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.match(r.stdout, /Skipped 1 staged file\(s\) matching ignore rules/);
});

test('staged check merges ignore patterns from file and package.json', () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'readme-staged-ignore-merge-'));
    initRepoWithFiles(cwd, {
        '.readme-enforcerignore': 'vendor/\n',
        'package.json': JSON.stringify({
            name: 'test-app',
            readmeEnforcer: { ignore: ['*.lock'] }
        }, null, 2) + '\n',
        'vendor/a.ts': 'export {}\n',
        'yarn.lock': 'packages:\n',
        'README.md': '# Root\n'
    });
    stageChanges(cwd, {
        'vendor/a.ts': 'export {}\n// vendor\n',
        'yarn.lock': 'packages:\n# updated\n'
    });
    const r = runStagedHook(cwd);
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.match(r.stdout, /Skipped 2 staged file\(s\) matching ignore rules/);
});
