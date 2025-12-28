#!/usr/bin/env npx tsx

/**
 * Automated script to find unlocalized Russian strings in the codebase.
 * 
 * Usage:
 *   npx tsx scripts/find-unlocalized.ts
 *   npx tsx scripts/find-unlocalized.ts --verbose
 *   npx tsx scripts/find-unlocalized.ts --json > report.json
 */

import * as fs from 'fs';
import * as path from 'path';

const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

interface UnlocalizedString {
  line: number;
  content: string;
  category: 'toast' | 'title' | 'label' | 'placeholder' | 'description' | 'button' | 'other';
}

interface FileReport {
  filePath: string;
  strings: UnlocalizedString[];
  hasUseTranslation: boolean;
}

// Russian character regex
const RUSSIAN_REGEX = /[а-яА-ЯёЁ]+/;

// Patterns to exclude
const EXCLUDE_PATTERNS = [
  /^\/\//,           // Single line comments
  /^\/\*/,           // Multi-line comment start
  /^\s*\*/,          // Multi-line comment middle
  /^\s*\*\//,        // Multi-line comment end
  /console\.(log|warn|error|info|debug)/, // Console statements
  /import\s+/,       // Import statements
  /from\s+['"].*['"]/, // From import
  /require\(/,       // Require statements
  /@deprecated/,     // JSDoc deprecated
  /eslint-disable/,  // ESLint comments
  /\.json$/,         // JSON file references
  /TODO:/i,          // TODO comments
  /FIXME:/i,         // FIXME comments
];

// Files/directories to skip
const SKIP_PATHS = [
  'node_modules',
  'dist',
  'build',
  '.git',
  'public/locales',  // Skip localization files
  'scripts',         // Skip scripts folder
  '.d.ts',           // Skip type definitions
  '.test.ts',        // Skip tests
  '.test.tsx',       // Skip tests
  '.spec.ts',        // Skip specs
  '.spec.tsx',       // Skip specs
];

function shouldSkipFile(filePath: string): boolean {
  return SKIP_PATHS.some(skip => filePath.includes(skip));
}

function shouldSkipLine(line: string): boolean {
  const trimmed = line.trim();
  return EXCLUDE_PATTERNS.some(pattern => pattern.test(trimmed));
}

function categorizeString(line: string, content: string): UnlocalizedString['category'] {
  const lower = line.toLowerCase();
  
  if (/toast\s*\(|toast\s*\{|title:\s*['"]/i.test(line)) return 'toast';
  if (/placeholder\s*[:=]/i.test(line)) return 'placeholder';
  if (/<(h[1-6]|title|label)/i.test(line)) return 'title';
  if (/<(button|Button)/i.test(line)) return 'button';
  if (/<(p|span|div)[^>]*>.*<\/(p|span|div)>/i.test(line)) return 'description';
  if (/<Label/i.test(line)) return 'label';
  
  return 'other';
}

function extractRussianStrings(content: string): UnlocalizedString[] {
  const lines = content.split('\n');
  const results: UnlocalizedString[] = [];
  
  let inMultilineComment = false;
  let inImport = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    
    // Track multi-line comments
    if (/\/\*/.test(line)) inMultilineComment = true;
    if (/\*\//.test(line)) {
      inMultilineComment = false;
      continue;
    }
    if (inMultilineComment) continue;
    
    // Skip import blocks
    if (/^import\s/.test(line.trim())) inImport = true;
    if (inImport && /from\s+['"]/.test(line)) {
      inImport = false;
      continue;
    }
    if (inImport) continue;
    
    // Skip lines that match exclude patterns
    if (shouldSkipLine(line)) continue;
    
    // Check for Russian characters
    if (RUSSIAN_REGEX.test(line)) {
      // Extract the actual Russian string (between quotes usually)
      const quotedMatches = line.match(/['"`]([^'"`]*[а-яА-ЯёЁ][^'"`]*)['"`]/g);
      
      if (quotedMatches) {
        for (const match of quotedMatches) {
          const cleanMatch = match.slice(1, -1); // Remove quotes
          results.push({
            line: lineNum,
            content: cleanMatch.length > 60 ? cleanMatch.substring(0, 60) + '...' : cleanMatch,
            category: categorizeString(line, cleanMatch),
          });
        }
      }
    }
  }
  
  return results;
}

function checkHasUseTranslation(content: string): boolean {
  return /useTranslation\s*\(/.test(content);
}

function scanDirectory(dir: string, results: FileReport[]): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      if (!SKIP_PATHS.some(skip => entry.name === skip)) {
        scanDirectory(fullPath, results);
      }
    } else if (entry.isFile() && /\.(tsx?|jsx?)$/.test(entry.name)) {
      if (shouldSkipFile(fullPath)) continue;
      
      const content = fs.readFileSync(fullPath, 'utf-8');
      const strings = extractRussianStrings(content);
      
      if (strings.length > 0) {
        results.push({
          filePath: fullPath,
          strings,
          hasUseTranslation: checkHasUseTranslation(content),
        });
      }
    }
  }
}

function printReport(reports: FileReport[], verbose: boolean): void {
  console.log(`\n${BOLD}${CYAN}═══════════════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}${CYAN}   📋 Отчет о нелокализованных строках${RESET}`);
  console.log(`${BOLD}${CYAN}═══════════════════════════════════════════════════════════════${RESET}\n`);
  
  // Summary
  const totalStrings = reports.reduce((sum, r) => sum + r.strings.length, 0);
  const filesWithI18n = reports.filter(r => r.hasUseTranslation).length;
  const filesWithoutI18n = reports.filter(r => !r.hasUseTranslation).length;
  
  console.log(`${BOLD}📊 Сводка:${RESET}`);
  console.log(`   • Файлов с русскими строками: ${YELLOW}${reports.length}${RESET}`);
  console.log(`   • Всего нелокализованных строк: ${RED}${totalStrings}${RESET}`);
  console.log(`   • Файлов с useTranslation: ${GREEN}${filesWithI18n}${RESET}`);
  console.log(`   • Файлов без useTranslation: ${RED}${filesWithoutI18n}${RESET}\n`);
  
  // Category breakdown
  const categories: Record<string, number> = {};
  for (const report of reports) {
    for (const str of report.strings) {
      categories[str.category] = (categories[str.category] || 0) + 1;
    }
  }
  
  console.log(`${BOLD}📁 По категориям:${RESET}`);
  for (const [cat, count] of Object.entries(categories).sort((a, b) => b[1] - a[1])) {
    console.log(`   • ${cat}: ${count}`);
  }
  console.log('');
  
  // Sort by number of strings (highest first)
  reports.sort((a, b) => b.strings.length - a.strings.length);
  
  // Priority files (no useTranslation hook)
  const priorityFiles = reports.filter(r => !r.hasUseTranslation);
  if (priorityFiles.length > 0) {
    console.log(`${BOLD}${RED}🚨 Приоритетные файлы (без useTranslation):${RESET}`);
    for (const report of priorityFiles.slice(0, 15)) {
      const relativePath = report.filePath.replace(process.cwd() + '/', '');
      console.log(`   ${relativePath} ${YELLOW}(${report.strings.length} строк)${RESET}`);
      
      if (verbose) {
        for (const str of report.strings.slice(0, 5)) {
          console.log(`      L${str.line}: [${str.category}] "${str.content}"`);
        }
        if (report.strings.length > 5) {
          console.log(`      ... и ещё ${report.strings.length - 5} строк`);
        }
      }
    }
    console.log('');
  }
  
  // Files with partial localization
  const partialFiles = reports.filter(r => r.hasUseTranslation);
  if (partialFiles.length > 0) {
    console.log(`${BOLD}${YELLOW}⚠️ Файлы с частичной локализацией:${RESET}`);
    for (const report of partialFiles.slice(0, 10)) {
      const relativePath = report.filePath.replace(process.cwd() + '/', '');
      console.log(`   ${relativePath} ${YELLOW}(${report.strings.length} строк)${RESET}`);
      
      if (verbose) {
        for (const str of report.strings.slice(0, 3)) {
          console.log(`      L${str.line}: [${str.category}] "${str.content}"`);
        }
        if (report.strings.length > 3) {
          console.log(`      ... и ещё ${report.strings.length - 3} строк`);
        }
      }
    }
  }
  
  console.log(`\n${BOLD}${CYAN}═══════════════════════════════════════════════════════════════${RESET}\n`);
}

function printJsonReport(reports: FileReport[]): void {
  const output = {
    summary: {
      totalFiles: reports.length,
      totalStrings: reports.reduce((sum, r) => sum + r.strings.length, 0),
      filesWithI18n: reports.filter(r => r.hasUseTranslation).length,
      filesWithoutI18n: reports.filter(r => !r.hasUseTranslation).length,
      generatedAt: new Date().toISOString(),
    },
    files: reports.map(r => ({
      path: r.filePath.replace(process.cwd() + '/', ''),
      stringCount: r.strings.length,
      hasUseTranslation: r.hasUseTranslation,
      strings: r.strings,
    })),
  };
  
  console.log(JSON.stringify(output, null, 2));
}

// Main execution
const args = process.argv.slice(2);
const verbose = args.includes('--verbose') || args.includes('-v');
const jsonOutput = args.includes('--json');

const srcDir = path.join(process.cwd(), 'src');
const reports: FileReport[] = [];

if (!fs.existsSync(srcDir)) {
  console.error(`${RED}Error: src directory not found${RESET}`);
  process.exit(1);
}

scanDirectory(srcDir, reports);

if (jsonOutput) {
  printJsonReport(reports);
} else {
  printReport(reports, verbose);
}
