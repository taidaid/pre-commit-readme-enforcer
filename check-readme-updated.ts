#!/usr/bin/env node

/**
 * Pre-commit hook to ensure README files are updated when code changes are made.
 *
 * Optionally (opt-in): verify every tracked README is reachable from the root README
 * via relative inline Markdown links (root reachability).
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { basename, join, posix, relative, sep } from 'path';

const INTERLINK_FLAG = '--enforce-readme-interlink';
const INTERLINK_ENV = 'README_ENFORCE_INTERLINK';

function isEnforceReadmeInterlink(): boolean {
    if (process.argv.includes(INTERLINK_FLAG)) {
        return true;
    }
    const v = process.env[INTERLINK_ENV];
    if (v === undefined || v === '') {
        return false;
    }
    const lower = v.toLowerCase();
    return lower === '1' || lower === 'true' || lower === 'yes';
}

function getGitOutput(args: string, errorMessage: string): string {
    try {
        return execSync(`git ${args}`, { encoding: 'utf8' }).trim();
    } catch {
        console.error(errorMessage);
        return '';
    }
}

function getGitTopLevel(): string | null {
    const out = getGitOutput('rev-parse --show-toplevel', 'Error: Unable to resolve git repository root');
    return out.length > 0 ? out : null;
}

function normalizeGitPath(filePath: string): string {
    return filePath.replace(/\\/g, '/');
}

function toRepoRelativePosix(repoRoot: string, absolutePath: string): string {
    const rel = relative(repoRoot, absolutePath);
    if (rel.startsWith('..')) {
        return normalizeGitPath(absolutePath);
    }
    const posixPath = rel.split(sep).join('/');
    return posixPath === '' ? '.' : posixPath;
}

function getStagedFiles(): string[] {
    try {
        const result = execSync('git diff --cached --name-only', { encoding: 'utf8' });
        return result
            .trim()
            .split('\n')
            .filter(f => f.trim().length > 0)
            .map(normalizeGitPath);
    } catch {
        console.error('Error: Unable to get staged files from git');
        return [];
    }
}

function isReadmeFile(filename: string): boolean {
    const baseName = basename(filename).toLowerCase();
    return baseName.startsWith('readme');
}

function isMarkdownReadmeSource(repoRelativePath: string): boolean {
    const lower = basename(repoRelativePath).toLowerCase();
    return lower.endsWith('.md') || lower.endsWith('.markdown');
}

function getTrackedReadmePaths(): string[] {
    try {
        const buf = execSync('git ls-files -z', { encoding: 'utf8' });
        const paths = buf.split('\0').filter(Boolean);
        return paths.filter(p => isReadmeFile(p));
    } catch {
        console.error('Error: Unable to list tracked files from git');
        return [];
    }
}

/**
 * Tracked README files at repository root (single path segment).
 */
function getRootLevelReadmePaths(readmePaths: string[]): string[] {
    return readmePaths.filter(p => !p.includes('/'));
}

/**
 * Deterministic root: prefer README.md, then readme.md; otherwise first by localeCompare.
 */
function pickRootReadme(rootLevelReadmes: string[]): string | null {
    if (rootLevelReadmes.length === 0) {
        return null;
    }
    const set = new Set(rootLevelReadmes);
    for (const name of ['README.md', 'readme.md']) {
        if (set.has(name)) {
            return name;
        }
    }
    return [...rootLevelReadmes].sort((a, b) => a.localeCompare(b, 'en'))[0];
}

function stripMarkdownLinkTitle(target: string): string {
    const t = target.trim();
    const m = t.match(/^(.*?)(\s+"[^"]*"\s*)$/);
    return (m ? m[1] : t).trim();
}

function unwrapAngleBrackets(s: string): string {
    if (s.startsWith('<') && s.endsWith('>')) {
        return s.slice(1, -1).trim();
    }
    return s;
}

function extractInlineMarkdownLinkTargets(content: string): string[] {
    const re = /\]\(([^)]+)\)/g;
    const out: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
        out.push(m[1]);
    }
    return out;
}

function decodeLinkTarget(raw: string): string {
    let s = unwrapAngleBrackets(stripMarkdownLinkTitle(raw));
    const hash = s.indexOf('#');
    if (hash >= 0) {
        s = s.slice(0, hash);
    }
    const q = s.indexOf('?');
    if (q >= 0) {
        s = s.slice(0, q);
    }
    s = s.trim();
    try {
        return decodeURIComponent(s);
    } catch {
        return s;
    }
}

function isSkippedAbsoluteOrSpecialTarget(decoded: string): boolean {
    const lower = decoded.trim().toLowerCase();
    if (lower.length === 0) {
        return true;
    }
    if (lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('mailto:')) {
        return true;
    }
    if (lower.startsWith('//')) {
        return true;
    }
    return false;
}

function isRelativeReadmeLinkTarget(decoded: string): boolean {
    const t = decoded.trim();
    if (t.length === 0) {
        return false;
    }
    if (t.startsWith('#')) {
        return false;
    }
    if (t.startsWith('/')) {
        return false;
    }
    return true;
}

function resolveReadmeLinkTargets(
    sourceRepoPath: string,
    targetRaw: string,
    readmeSet: Set<string>
): string[] {
    const decoded = decodeLinkTarget(targetRaw);
    if (isSkippedAbsoluteOrSpecialTarget(decoded) || !isRelativeReadmeLinkTarget(decoded)) {
        return [];
    }
    const sourceDir = posix.dirname(sourceRepoPath);
    const joined = posix.normalize(posix.join(sourceDir, decoded));
    const normalized = joined === '' ? '.' : joined;

    const hits = new Set<string>();

    if (readmeSet.has(normalized)) {
        hits.add(normalized);
    }

    const dirKey = normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
    if (!readmeSet.has(normalized)) {
        for (const r of readmeSet) {
            const parent = posix.dirname(r);
            if (parent === dirKey) {
                hits.add(r);
            }
        }
    }

    return [...hits];
}

function buildAdjacency(readmePaths: string[], topLevel: string, readmeSet: Set<string>): Map<string, Set<string>> {
    const adj = new Map<string, Set<string>>();
    for (const p of readmePaths) {
        adj.set(p, new Set());
    }

    for (const repoPath of readmePaths) {
        if (!isMarkdownReadmeSource(repoPath)) {
            continue;
        }
        const abs = join(topLevel, ...repoPath.split('/'));
        let content: string;
        try {
            content = readFileSync(abs, 'utf8');
        } catch {
            continue;
        }
        for (const raw of extractInlineMarkdownLinkTargets(content)) {
            for (const dest of resolveReadmeLinkTargets(repoPath, raw, readmeSet)) {
                adj.get(repoPath)?.add(dest);
            }
        }
    }
    return adj;
}

function bfsReachable(adj: Map<string, Set<string>>, start: string): Set<string> {
    const visited = new Set<string>();
    const q: string[] = [start];
    visited.add(start);
    while (q.length > 0) {
        const u = q.pop() as string;
        for (const v of adj.get(u) ?? []) {
            if (!visited.has(v)) {
                visited.add(v);
                q.push(v);
            }
        }
    }
    return visited;
}

function runReadmeReachability(): number {
    const topLevel = getGitTopLevel();
    if (!topLevel) {
        return 1;
    }

    const readmePaths = getTrackedReadmePaths();
    const readmeSet = new Set(readmePaths);

    if (readmePaths.length === 0) {
        console.log('README reachability: no tracked README files (readme*). Skipping.');
        return 0;
    }

    const rootCandidates = getRootLevelReadmePaths(readmePaths);
    const rootReadme = pickRootReadme(rootCandidates);

    if (!rootReadme) {
        console.error('❌ README reachability: no root-level README (readme*) is tracked.');
        console.error('Add README.md or readme.md at the repository root, or track a readme* file there.');
        return 1;
    }

    console.log(`README reachability: using root README ${rootReadme}`);

    const adj = buildAdjacency(readmePaths, topLevel, readmeSet);
    const visited = bfsReachable(adj, rootReadme);
    const orphans = readmePaths.filter(p => !visited.has(p));

    if (orphans.length === 0) {
        console.log(`✓ README reachability: all ${readmePaths.length} tracked README(s) reachable from ${rootReadme}.`);
        return 0;
    }

    console.error('❌ README reachability failed.');
    console.error(`Root README: ${rootReadme}`);
    console.error(`Orphan README(s) (not reachable via relative inline Markdown links): ${orphans.length}`);
    for (const p of [...orphans].sort((a, b) => a.localeCompare(b, 'en'))) {
        console.error(`  - ${p}`);
    }
    console.error('');
    console.error('Add relative links from the root README (or from already-linked READMEs) so every tracked README is reachable.');
    return 1;
}

function findNearestReadme(codeFile: string, repoRoot: string): string | null {
    const normalizedCode = normalizeGitPath(codeFile);
    let currentDirPosix = posix.dirname(normalizedCode);

    while (true) {
        const fsDir =
            currentDirPosix === '.' || currentDirPosix === ''
                ? repoRoot
                : join(repoRoot, ...currentDirPosix.split('/').filter(Boolean));

        try {
            const items = readdirSync(fsDir);

            for (const item of items) {
                const absPath = join(fsDir, item);
                if (existsSync(absPath) && statSync(absPath).isFile() && isReadmeFile(item)) {
                    return toRepoRelativePosix(repoRoot, absPath);
                }
            }

            if (currentDirPosix === '.' || currentDirPosix === '') {
                break;
            }
            const parentPosix = posix.dirname(currentDirPosix);
            if (parentPosix === currentDirPosix) {
                break;
            }
            currentDirPosix = parentPosix;
        } catch {
            break;
        }
    }

    return null;
}

function parseIgnoreFile(content: string): string[] {
    return content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('#'));
}

function loadIgnorePatternsFromPackageJson(repoRoot: string): string[] {
    const pkgPath = join(repoRoot, 'package.json');
    if (!existsSync(pkgPath)) {
        return [];
    }
    try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
            readmeEnforcer?: { ignore?: unknown };
        };
        const ignore = pkg.readmeEnforcer?.ignore;
        if (!Array.isArray(ignore)) {
            return [];
        }
        return ignore.filter((entry): entry is string => typeof entry === 'string');
    } catch {
        return [];
    }
}

function loadIgnorePatterns(repoRoot: string): string[] {
    const patterns: string[] = [];
    const ignoreFilePath = join(repoRoot, '.readme-enforcerignore');
    if (existsSync(ignoreFilePath)) {
        try {
            patterns.push(...parseIgnoreFile(readFileSync(ignoreFilePath, 'utf8')));
        } catch {
            // unreadable ignore file — skip
        }
    }
    patterns.push(...loadIgnorePatternsFromPackageJson(repoRoot));
    return patterns;
}

function matchesIgnorePattern(repoRelativePath: string, pattern: string): boolean {
    const path = normalizeGitPath(repoRelativePath);
    const trimmed = pattern.trim();
    if (trimmed.length === 0) {
        return false;
    }

    if (trimmed.startsWith('*.')) {
        const suffix = trimmed.slice(1);
        return basename(path).endsWith(suffix);
    }

    if (trimmed.includes('/')) {
        const normalizedPattern = trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
        if (trimmed.endsWith('/')) {
            return path === normalizedPattern || path.startsWith(`${normalizedPattern}/`);
        }
        return path === normalizedPattern;
    }

    return path === trimmed || path.startsWith(`${trimmed}/`);
}

function shouldIgnore(repoRelativePath: string, patterns: string[]): boolean {
    if (patterns.length === 0) {
        return false;
    }
    return patterns.some(pattern => matchesIgnorePattern(repoRelativePath, pattern));
}

function runStagedReadmeCheck(): number {
    const repoRoot = getGitTopLevel();
    if (!repoRoot) {
        return 1;
    }

    const stagedFiles = getStagedFiles();

    if (stagedFiles.length === 0) {
        console.log('No staged files found.');
        return 0;
    }

    const ignorePatterns = loadIgnorePatterns(repoRoot);
    const readmeFiles: string[] = [];
    const codeFiles: string[] = [];
    let ignoredCount = 0;

    for (const filePath of stagedFiles) {
        if (shouldIgnore(filePath, ignorePatterns)) {
            ignoredCount++;
            continue;
        }
        if (isReadmeFile(filePath)) {
            readmeFiles.push(filePath);
        } else {
            codeFiles.push(filePath);
        }
    }

    if (ignoredCount > 0) {
        console.log(`Skipped ${ignoredCount} staged file(s) matching ignore rules.`);
    }

    if (codeFiles.length === 0) {
        if (readmeFiles.length > 0) {
            console.log('Only README files staged - no additional README update required.');
        }
        return 0;
    }

    const requiredReadmes = new Set<string>();

    for (const codeFile of codeFiles) {
        const nearestReadme = findNearestReadme(codeFile, repoRoot);
        if (nearestReadme) {
            requiredReadmes.add(nearestReadme);
        }
    }

    const stagedReadmeSet = new Set(readmeFiles);

    const missingReadmes = new Set<string>();
    for (const requiredReadme of requiredReadmes) {
        if (!stagedReadmeSet.has(requiredReadme)) {
            missingReadmes.add(requiredReadme);
        }
    }

    if (missingReadmes.size === 0 && requiredReadmes.size > 0) {
        console.log(`✓ Code files staged: ${codeFiles.length}`);
        console.log(`✓ Required README files staged: ${requiredReadmes.size}`);
        console.log('✓ README update requirement satisfied!');

        if (requiredReadmes.size > 0) {
            console.log('Staged README files that correspond to code changes:');
            Array.from(requiredReadmes).sort().forEach(readme => {
                console.log(`  ✓ ${readme}`);
            });
        }
        return 0;
    }

    console.log('❌ README update required!');
    console.log(`Code files staged for commit: ${codeFiles.length}`);

    if (missingReadmes.size > 0) {
        console.log(`Missing required README files: ${missingReadmes.size}`);
        console.log('');
        console.log('The following README files must be updated because they are closest to your code changes:');
        Array.from(missingReadmes).sort().forEach(readme => {
            console.log(`  - ${readme}`);
        });

        const unnecessaryReadmes = readmeFiles.filter(readme => !requiredReadmes.has(readme));
        if (unnecessaryReadmes.length > 0) {
            console.log('');
            console.log('You have staged other README files, but not the ones closest to your code changes:');
            unnecessaryReadmes.forEach(readme => {
                console.log(`  • ${readme} (staged but not required)`);
            });
        }
    } else if (requiredReadmes.size === 0) {
        console.log('No README files found near your code changes.');
        console.log('Consider creating README files in the appropriate directories.');
    }

    console.log('');
    console.log('You can make a simple change like:');
    console.log("  - Add a timestamp: 'Last updated: 2024-01-15'");
    console.log('  - Update version information');
    console.log('  - Document your changes');
    console.log("  - Add whitespace (if you've truly reviewed the documentation)");

    return 1;
}

function main(): number {
    const stagedExit = runStagedReadmeCheck();
    if (stagedExit !== 0) {
        return stagedExit;
    }

    if (isEnforceReadmeInterlink()) {
        return runReadmeReachability();
    }

    return 0;
}

if (require.main === module) {
    process.exit(main());
}
