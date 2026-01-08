/**
 * Comprehensive i18n Analysis Tool
 * 
 * Modes:
 *   hardcoded - Find hardcoded Russian strings in code
 *   sync      - Check EN/RU key synchronization
 *   unused    - Find unused keys in locale files
 *   missing   - Find t() calls with non-existent keys
 *   full      - Run all checks with statistics
 * 
 * Usage:
 *   npx tsx scripts/i18n-analyzer.ts <mode> [options]
 *   
 * Options:
 *   --verbose    Show detailed output
 *   --json       Output as JSON
 *   --fix        Auto-fix sync issues (add TODO keys)
 *   --namespace  Filter by namespace
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Types
// ============================================================================

interface HardcodedString {
  file: string;
  line: number;
  content: string;
  category: 'toast' | 'title' | 'label' | 'placeholder' | 'button' | 'description' | 'text';
  hasUseTranslation: boolean;
}

interface SyncIssue {
  namespace: string;
  key: string;
  missingIn: 'en' | 'ru';
}

interface UnusedKey {
  namespace: string;
  key: string;
  language: 'en' | 'ru' | 'both';
}

interface MissingKey {
  file: string;
  line: number;
  key: string;
  namespace: string;
}

interface AnalysisReport {
  hardcoded: HardcodedString[];
  syncIssues: SyncIssue[];
  unusedKeys: UnusedKey[];
  missingKeys: MissingKey[];
  stats: {
    totalNamespaces: number;
    totalKeysRu: number;
    totalKeysEn: number;
    totalTCalls: number;
    coverageByNamespace: Record<string, { ru: number; en: number; used: number }>;
  };
}

interface Options {
  mode: 'hardcoded' | 'sync' | 'unused' | 'missing' | 'full';
  verbose: boolean;
  json: boolean;
  fix: boolean;
  namespace?: string;
}

// ============================================================================
// Constants
// ============================================================================

const SRC_DIR = path.join(process.cwd(), 'src');
const LOCALES_DIR = path.join(process.cwd(), 'public', 'locales');

const RUSSIAN_PATTERN = /[а-яёА-ЯЁ]{2,}/;
const EXCLUDED_DIRS = ['node_modules', '.git', 'dist', 'build', '__tests__', 'test'];
const FILE_EXTENSIONS = ['.tsx', '.ts'];

// Patterns to exclude from hardcoded string search
const EXCLUDE_PATTERNS = [
  /^\s*\/\//, // Comments
  /^\s*\*/, // JSDoc comments
  /console\.(log|warn|error|info|debug)/, // Console statements
  /import\s+.*from/, // Import statements
  /export\s+(default\s+)?/, // Export statements
  /throw\s+new\s+Error/, // Error throwing (often technical)
  /\.test\.(ts|tsx)$/, // Test files
  /\.d\.ts$/, // Type definition files
];

// ============================================================================
// Utility Functions
// ============================================================================

function getAllFiles(dir: string, extensions: string[]): string[] {
  const files: string[] = [];
  
  if (!fs.existsSync(dir)) return files;
  
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    
    if (item.isDirectory()) {
      if (!EXCLUDED_DIRS.includes(item.name)) {
        files.push(...getAllFiles(fullPath, extensions));
      }
    } else if (extensions.some(ext => item.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function flattenKeys(obj: object, prefix = ''): string[] {
  const keys: string[] = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...flattenKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  
  return keys;
}

function loadLocaleFiles(lang: 'en' | 'ru'): Record<string, object> {
  const locales: Record<string, object> = {};
  const langDir = path.join(LOCALES_DIR, lang);
  
  if (!fs.existsSync(langDir)) {
    console.error(`Locale directory not found: ${langDir}`);
    return locales;
  }
  
  const files = fs.readdirSync(langDir).filter(f => f.endsWith('.json'));
  
  for (const file of files) {
    const namespace = file.replace('.json', '');
    try {
      const content = fs.readFileSync(path.join(langDir, file), 'utf-8');
      locales[namespace] = JSON.parse(content);
    } catch (e) {
      console.error(`Error parsing ${lang}/${file}:`, e);
    }
  }
  
  return locales;
}

function categorizeString(line: string): HardcodedString['category'] {
  const lowerLine = line.toLowerCase();
  
  if (lowerLine.includes('toast') || lowerLine.includes('sonner')) return 'toast';
  if (lowerLine.includes('title') || lowerLine.includes('заголовок')) return 'title';
  if (lowerLine.includes('label') || lowerLine.includes('метка')) return 'label';
  if (lowerLine.includes('placeholder')) return 'placeholder';
  if (lowerLine.includes('button') || lowerLine.includes('<button') || lowerLine.includes('Button')) return 'button';
  if (lowerLine.includes('description') || lowerLine.includes('описание')) return 'description';
  
  return 'text';
}

// ============================================================================
// Analysis Functions
// ============================================================================

function findHardcodedStrings(): HardcodedString[] {
  const results: HardcodedString[] = [];
  const files = getAllFiles(SRC_DIR, FILE_EXTENSIONS);
  
  for (const file of files) {
    // Skip test files
    if (file.includes('.test.') || file.includes('.spec.') || file.includes('__tests__')) {
      continue;
    }
    
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    const hasUseTranslation = content.includes('useTranslation');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip excluded patterns
      if (EXCLUDE_PATTERNS.some(pattern => pattern.test(line))) {
        continue;
      }
      
      // Check for Russian text
      if (RUSSIAN_PATTERN.test(line)) {
        // Extract the Russian text
        const matches = line.match(/["'`]([^"'`]*[а-яёА-ЯЁ][^"'`]*)["'`]/g);
        
        if (matches) {
          for (const match of matches) {
            const content = match.slice(1, -1);
            
            // Skip if it's a translation key or already using t()
            if (line.includes(`t('`) || line.includes(`t("`) || line.includes('t(`')) {
              continue;
            }
            
            results.push({
              file: path.relative(process.cwd(), file),
              line: i + 1,
              content: content.length > 60 ? content.substring(0, 60) + '...' : content,
              category: categorizeString(line),
              hasUseTranslation,
            });
          }
        }
      }
    }
  }
  
  return results;
}

function checkSyncIssues(enLocales: Record<string, object>, ruLocales: Record<string, object>): SyncIssue[] {
  const issues: SyncIssue[] = [];
  
  // Get all namespaces
  const allNamespaces = new Set([...Object.keys(enLocales), ...Object.keys(ruLocales)]);
  
  for (const namespace of allNamespaces) {
    const enKeys = new Set(flattenKeys(enLocales[namespace] || {}));
    const ruKeys = new Set(flattenKeys(ruLocales[namespace] || {}));
    
    // Keys in RU but not in EN
    for (const key of ruKeys) {
      if (!enKeys.has(key)) {
        issues.push({ namespace, key, missingIn: 'en' });
      }
    }
    
    // Keys in EN but not in RU
    for (const key of enKeys) {
      if (!ruKeys.has(key)) {
        issues.push({ namespace, key, missingIn: 'ru' });
      }
    }
  }
  
  return issues;
}

function parseTranslationCalls(): Map<string, { file: string; line: number }[]> {
  const calls = new Map<string, { file: string; line: number }[]>();
  const files = getAllFiles(SRC_DIR, FILE_EXTENSIONS);
  
  // Pattern to match t('key'), t("key"), t(`key`)
  const tCallPattern = /\bt\s*\(\s*['"`]([^'"`]+)['"`]/g;
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    
    // Find namespace from useTranslation call
    const nsMatch = content.match(/useTranslation\s*\(\s*['"`]([^'"`]+)['"`]/);
    const namespace = nsMatch ? nsMatch[1] : null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let match;
      
      while ((match = tCallPattern.exec(line)) !== null) {
        let fullKey = match[1];
        
        // If key doesn't contain namespace prefix, add it
        if (namespace && !fullKey.includes(':') && !fullKey.includes('.')) {
          fullKey = `${namespace}.${fullKey}`;
        } else if (namespace && !fullKey.includes(':')) {
          fullKey = `${namespace}.${fullKey}`;
        }
        
        if (!calls.has(fullKey)) {
          calls.set(fullKey, []);
        }
        calls.get(fullKey)!.push({
          file: path.relative(process.cwd(), file),
          line: i + 1,
        });
      }
    }
  }
  
  return calls;
}

function findUnusedKeys(
  locales: Record<string, object>,
  usedKeys: Set<string>
): UnusedKey[] {
  const unused: UnusedKey[] = [];
  
  for (const [namespace, obj] of Object.entries(locales)) {
    const keys = flattenKeys(obj);
    
    for (const key of keys) {
      const fullKey = `${namespace}.${key}`;
      
      // Check if key is used (with or without namespace prefix)
      const isUsed = usedKeys.has(fullKey) || 
                     usedKeys.has(key) ||
                     // Check partial matches for dynamic keys
                     Array.from(usedKeys).some(used => 
                       fullKey.startsWith(used.split('.').slice(0, -1).join('.') + '.')
                     );
      
      if (!isUsed) {
        unused.push({ namespace, key, language: 'both' });
      }
    }
  }
  
  return unused;
}

function findMissingKeys(
  tCalls: Map<string, { file: string; line: number }[]>,
  enLocales: Record<string, object>,
  ruLocales: Record<string, object>
): MissingKey[] {
  const missing: MissingKey[] = [];
  
  for (const [fullKey, locations] of tCalls) {
    const parts = fullKey.split('.');
    const namespace = parts[0];
    const key = parts.slice(1).join('.');
    
    if (!key) continue;
    
    const enKeys = new Set(flattenKeys(enLocales[namespace] || {}));
    const ruKeys = new Set(flattenKeys(ruLocales[namespace] || {}));
    
    // Check if key exists in either locale
    if (!enKeys.has(key) && !ruKeys.has(key)) {
      for (const loc of locations) {
        missing.push({
          file: loc.file,
          line: loc.line,
          key: fullKey,
          namespace,
        });
      }
    }
  }
  
  return missing;
}

// ============================================================================
// Reporting
// ============================================================================

function printHardcodedReport(results: HardcodedString[], verbose: boolean) {
  console.log('\n🔴 ХАРДКОД-СТРОКИ');
  console.log('─'.repeat(60));
  
  if (results.length === 0) {
    console.log('   ✅ Хардкод-строк не найдено!');
    return;
  }
  
  // Group by file
  const byFile = new Map<string, HardcodedString[]>();
  for (const item of results) {
    if (!byFile.has(item.file)) byFile.set(item.file, []);
    byFile.get(item.file)!.push(item);
  }
  
  // Sort by count (most strings first)
  const sorted = [...byFile.entries()].sort((a, b) => b[1].length - a[1].length);
  
  // Priority files (without useTranslation)
  const priority = sorted.filter(([, items]) => !items[0].hasUseTranslation);
  
  console.log(`   Всего: ${results.length} строк в ${sorted.length} файлах`);
  
  if (priority.length > 0) {
    console.log(`\n   ⚠️  Приоритетные файлы (без useTranslation): ${priority.length}`);
  }
  
  const showCount = verbose ? sorted.length : Math.min(15, sorted.length);
  
  for (let i = 0; i < showCount; i++) {
    const [file, items] = sorted[i];
    const priority = items[0].hasUseTranslation ? '' : ' ⚠️';
    console.log(`   • ${file} (${items.length} строк)${priority}`);
    
    if (verbose) {
      for (const item of items.slice(0, 5)) {
        console.log(`      L${item.line}: "${item.content}" [${item.category}]`);
      }
      if (items.length > 5) {
        console.log(`      ... и ещё ${items.length - 5}`);
      }
    }
  }
  
  if (!verbose && sorted.length > showCount) {
    console.log(`   ... и ещё ${sorted.length - showCount} файлов (используйте --verbose)`);
  }
}

function printSyncReport(issues: SyncIssue[], verbose: boolean) {
  console.log('\n🟡 СИНХРОНИЗАЦИЯ EN/RU');
  console.log('─'.repeat(60));
  
  if (issues.length === 0) {
    console.log('   ✅ Все ключи синхронизированы!');
    return;
  }
  
  const missingInEn = issues.filter(i => i.missingIn === 'en');
  const missingInRu = issues.filter(i => i.missingIn === 'ru');
  
  console.log(`   Отсутствует в EN: ${missingInEn.length} ключей`);
  console.log(`   Отсутствует в RU: ${missingInRu.length} ключей`);
  
  // Group by namespace
  const byNamespace = new Map<string, SyncIssue[]>();
  for (const issue of issues) {
    if (!byNamespace.has(issue.namespace)) byNamespace.set(issue.namespace, []);
    byNamespace.get(issue.namespace)!.push(issue);
  }
  
  const showCount = verbose ? byNamespace.size : Math.min(10, byNamespace.size);
  let shown = 0;
  
  for (const [namespace, nsIssues] of byNamespace) {
    if (shown >= showCount) break;
    shown++;
    
    const enCount = nsIssues.filter(i => i.missingIn === 'en').length;
    const ruCount = nsIssues.filter(i => i.missingIn === 'ru').length;
    
    console.log(`\n   📁 ${namespace}.json:`);
    if (enCount > 0) console.log(`      ❌ Нет в EN: ${enCount} ключей`);
    if (ruCount > 0) console.log(`      ❌ Нет в RU: ${ruCount} ключей`);
    
    if (verbose) {
      for (const issue of nsIssues.slice(0, 5)) {
        console.log(`         • ${issue.key} (нет в ${issue.missingIn.toUpperCase()})`);
      }
      if (nsIssues.length > 5) {
        console.log(`         ... и ещё ${nsIssues.length - 5}`);
      }
    }
  }
}

function printUnusedReport(unused: UnusedKey[], verbose: boolean) {
  console.log('\n🟠 НЕИСПОЛЬЗУЕМЫЕ КЛЮЧИ');
  console.log('─'.repeat(60));
  
  if (unused.length === 0) {
    console.log('   ✅ Неиспользуемых ключей не найдено!');
    return;
  }
  
  console.log(`   Всего: ${unused.length} ключей`);
  
  // Group by namespace
  const byNamespace = new Map<string, UnusedKey[]>();
  for (const item of unused) {
    if (!byNamespace.has(item.namespace)) byNamespace.set(item.namespace, []);
    byNamespace.get(item.namespace)!.push(item);
  }
  
  const showCount = verbose ? byNamespace.size : Math.min(10, byNamespace.size);
  let shown = 0;
  
  for (const [namespace, items] of byNamespace) {
    if (shown >= showCount) break;
    shown++;
    
    console.log(`\n   📁 ${namespace}.json: ${items.length} ключей`);
    
    if (verbose) {
      for (const item of items.slice(0, 5)) {
        console.log(`      • ${item.key}`);
      }
      if (items.length > 5) {
        console.log(`      ... и ещё ${items.length - 5}`);
      }
    }
  }
}

function printMissingReport(missing: MissingKey[], verbose: boolean) {
  console.log('\n🔵 ОТСУТСТВУЮЩИЕ КЛЮЧИ (t() с несуществующими ключами)');
  console.log('─'.repeat(60));
  
  if (missing.length === 0) {
    console.log('   ✅ Все ключи t() существуют в файлах локализации!');
    return;
  }
  
  console.log(`   Всего: ${missing.length} использований`);
  
  // Group by key
  const byKey = new Map<string, MissingKey[]>();
  for (const item of missing) {
    if (!byKey.has(item.key)) byKey.set(item.key, []);
    byKey.get(item.key)!.push(item);
  }
  
  const showCount = verbose ? byKey.size : Math.min(15, byKey.size);
  let shown = 0;
  
  for (const [key, items] of byKey) {
    if (shown >= showCount) break;
    shown++;
    
    console.log(`   • t('${key}') - ${items.length} использований`);
    
    if (verbose) {
      for (const item of items.slice(0, 3)) {
        console.log(`      ${item.file}:${item.line}`);
      }
    }
  }
}

function printFullReport(report: AnalysisReport, verbose: boolean) {
  console.log('\n═'.repeat(70));
  console.log('   📊 ПОЛНЫЙ ОТЧЁТ ЛОКАЛИЗАЦИИ');
  console.log('═'.repeat(70));
  
  console.log('\n📁 СТАТИСТИКА:');
  console.log(`   • Namespaces: ${report.stats.totalNamespaces}`);
  console.log(`   • Ключей в RU: ${report.stats.totalKeysRu.toLocaleString()}`);
  console.log(`   • Ключей в EN: ${report.stats.totalKeysEn.toLocaleString()}`);
  console.log(`   • Использований t() в коде: ${report.stats.totalTCalls.toLocaleString()}`);
  
  printHardcodedReport(report.hardcoded, verbose);
  printSyncReport(report.syncIssues, verbose);
  printUnusedReport(report.unusedKeys, verbose);
  printMissingReport(report.missingKeys, verbose);
  
  // Coverage summary
  console.log('\n📈 СВОДКА:');
  console.log('─'.repeat(60));
  
  const hasIssues = report.hardcoded.length > 0 || 
                    report.syncIssues.length > 0 || 
                    report.missingKeys.length > 0;
  
  if (hasIssues) {
    console.log('   ⚠️  Найдены проблемы, требующие внимания:');
    if (report.hardcoded.length > 0) {
      console.log(`      • ${report.hardcoded.length} хардкод-строк`);
    }
    if (report.syncIssues.length > 0) {
      console.log(`      • ${report.syncIssues.length} рассинхронизированных ключей`);
    }
    if (report.missingKeys.length > 0) {
      console.log(`      • ${report.missingKeys.length} отсутствующих ключей в t()`);
    }
  } else {
    console.log('   ✅ Критических проблем не найдено!');
  }
  
  if (report.unusedKeys.length > 0) {
    console.log(`   ℹ️  ${report.unusedKeys.length} потенциально неиспользуемых ключей (можно очистить)`);
  }
  
  console.log('\n' + '═'.repeat(70));
}

// ============================================================================
// Main
// ============================================================================

function parseArgs(): Options {
  const args = process.argv.slice(2);
  const mode = (args[0] || 'full') as Options['mode'];
  
  return {
    mode: ['hardcoded', 'sync', 'unused', 'missing', 'full'].includes(mode) ? mode : 'full',
    verbose: args.includes('--verbose') || args.includes('-v'),
    json: args.includes('--json'),
    fix: args.includes('--fix'),
    namespace: args.find(a => a.startsWith('--namespace='))?.split('=')[1],
  };
}

function main() {
  const options = parseArgs();
  
  console.log('🔍 Анализ локализации...\n');
  
  // Load locale files
  const enLocales = loadLocaleFiles('en');
  const ruLocales = loadLocaleFiles('ru');
  
  // Parse t() calls from code
  const tCalls = parseTranslationCalls();
  const usedKeys = new Set(tCalls.keys());
  
  // Initialize report
  const report: AnalysisReport = {
    hardcoded: [],
    syncIssues: [],
    unusedKeys: [],
    missingKeys: [],
    stats: {
      totalNamespaces: new Set([...Object.keys(enLocales), ...Object.keys(ruLocales)]).size,
      totalKeysRu: Object.values(ruLocales).reduce((sum, obj) => sum + flattenKeys(obj).length, 0),
      totalKeysEn: Object.values(enLocales).reduce((sum, obj) => sum + flattenKeys(obj).length, 0),
      totalTCalls: tCalls.size,
      coverageByNamespace: {},
    },
  };
  
  // Run analyses based on mode
  if (options.mode === 'hardcoded' || options.mode === 'full') {
    report.hardcoded = findHardcodedStrings();
  }
  
  if (options.mode === 'sync' || options.mode === 'full') {
    report.syncIssues = checkSyncIssues(enLocales, ruLocales);
  }
  
  if (options.mode === 'unused' || options.mode === 'full') {
    report.unusedKeys = findUnusedKeys(ruLocales, usedKeys);
  }
  
  if (options.mode === 'missing' || options.mode === 'full') {
    report.missingKeys = findMissingKeys(tCalls, enLocales, ruLocales);
  }
  
  // Filter by namespace if specified
  if (options.namespace) {
    report.syncIssues = report.syncIssues.filter(i => i.namespace === options.namespace);
    report.unusedKeys = report.unusedKeys.filter(i => i.namespace === options.namespace);
    report.missingKeys = report.missingKeys.filter(i => i.namespace === options.namespace);
  }
  
  // Output
  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    switch (options.mode) {
      case 'hardcoded':
        printHardcodedReport(report.hardcoded, options.verbose);
        break;
      case 'sync':
        printSyncReport(report.syncIssues, options.verbose);
        break;
      case 'unused':
        printUnusedReport(report.unusedKeys, options.verbose);
        break;
      case 'missing':
        printMissingReport(report.missingKeys, options.verbose);
        break;
      case 'full':
      default:
        printFullReport(report, options.verbose);
    }
  }
  
  // Exit code for CI
  const hasErrors = report.hardcoded.length > 0 || 
                    report.syncIssues.length > 0 || 
                    report.missingKeys.length > 0;
  
  if (hasErrors && !options.json) {
    process.exit(1);
  }
}

main();
