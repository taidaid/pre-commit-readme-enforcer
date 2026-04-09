#!/usr/bin/env node

/**
 * Pre-commit hook to ensure README files are updated when code changes are made.
 * 
 * This script checks if any non-README files are staged for commit, and if so,
 * ensures that at least one README file is also staged. It finds the closest
 * README file (same directory or parent directory) for each changed file.
 */

import { execSync } from 'child_process';
import { existsSync, readdirSync, statSync } from 'fs';
import { dirname, basename, join } from 'path';

function getStagedFiles(): string[] {
    try {
        const result = execSync('git diff --cached --name-only', { encoding: 'utf8' });
        return result.trim().split('\n').filter(f => f.trim().length > 0);
    } catch (error) {
        console.error('Error: Unable to get staged files from git');
        return [];
    }
}

function isReadmeFile(filename: string): boolean {
    const baseName = basename(filename).toLowerCase();
    return baseName.startsWith('readme');
}

function findNearestReadme(filePath: string): string | null {
    let currentDir = dirname(filePath);
    
    // Search upward through directories
    while (true) {
        try {
            const items = readdirSync(currentDir);
            
            // Look for README files in this directory
            for (const item of items) {
                const itemPath = join(currentDir, item);
                if (existsSync(itemPath) && statSync(itemPath).isFile() && isReadmeFile(item)) {
                    return itemPath;
                }
            }
            
            // Move up to parent directory
            const parentDir = dirname(currentDir);
            if (parentDir === currentDir) {
                // Reached root directory
                break;
            }
            currentDir = parentDir;
        } catch (error) {
            // Directory doesn't exist or can't be read
            break;
        }
    }
    
    return null;
}

function main(): number {
    const stagedFiles = getStagedFiles();
    
    if (stagedFiles.length === 0) {
        console.log('No staged files found.');
        return 0;
    }
    
    // Separate README files from other files
    const readmeFiles: string[] = [];
    const codeFiles: string[] = [];
    
    for (const filePath of stagedFiles) {
        if (isReadmeFile(filePath)) {
            readmeFiles.push(filePath);
        } else {
            codeFiles.push(filePath);
        }
    }
    
    // If no code files are staged, no need to check README
    if (codeFiles.length === 0) {
        console.log('Only README files staged - no additional README update required.');
        return 0;
    }
    
    // Find required README files for each code file
    const requiredReadmes = new Set<string>();
    
    for (const codeFile of codeFiles) {
        const nearestReadme = findNearestReadme(codeFile);
        if (nearestReadme) {
            requiredReadmes.add(nearestReadme);
        }
    }
    
    // Convert staged README file paths to a Set for easier lookup
    const stagedReadmeSet = new Set(readmeFiles);
    
    // Check if all required READMEs are staged
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
        
        // Show which READMEs were required and staged
        if (requiredReadmes.size > 0) {
            console.log('Staged README files that correspond to code changes:');
            Array.from(requiredReadmes).sort().forEach(readme => {
                console.log(`  ✓ ${readme}`);
            });
        }
        return 0;
    }
    
    // Some required READMEs are missing
    console.log('❌ README update required!');
    console.log(`Code files staged for commit: ${codeFiles.length}`);
    
    if (missingReadmes.size > 0) {
        console.log(`Missing required README files: ${missingReadmes.size}`);
        console.log('');
        console.log('The following README files must be updated because they are closest to your code changes:');
        Array.from(missingReadmes).sort().forEach(readme => {
            console.log(`  - ${readme}`);
        });
        
        // Show any staged READMEs that are not required
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

if (require.main === module) {
    process.exit(main());
} 