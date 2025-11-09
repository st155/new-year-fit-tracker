#!/usr/bin/env node

/**
 * Performance testing script using Lighthouse
 * Run with: node scripts/performance-test.js
 */

const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs');
const path = require('path');

const THRESHOLDS = {
  performance: 0.9,
  accessibility: 0.95,
  bestPractices: 0.85,
  seo: 0.9,
  lcp: 2500, // ms
  fid: 100, // ms
  cls: 0.1,
  tti: 3500, // ms
};

const URLS_TO_TEST = [
  { url: 'http://localhost:5173/habits-v3', name: 'Habits V3' },
  { url: 'http://localhost:5173/dashboard', name: 'Dashboard' },
  { url: 'http://localhost:5173/', name: 'Home' },
];

async function runLighthouse(url, name) {
  console.log(`\n🔍 Testing: ${name} (${url})`);
  
  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless', '--disable-gpu', '--no-sandbox'],
  });
  
  const options = {
    logLevel: 'info',
    output: 'json',
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    port: chrome.port,
    throttling: {
      rttMs: 40,
      throughputKbps: 10 * 1024,
      requestLatencyMs: 0,
      downloadThroughputKbps: 0,
      uploadThroughputKbps: 0,
      cpuSlowdownMultiplier: 1,
    },
  };
  
  try {
    const runnerResult = await lighthouse(url, options);
    await chrome.kill();
    
    const { lhr } = runnerResult;
    
    // Extract scores
    const scores = {
      performance: lhr.categories.performance.score * 100,
      accessibility: lhr.categories.accessibility.score * 100,
      bestPractices: lhr.categories['best-practices'].score * 100,
      seo: lhr.categories.seo.score * 100,
    };
    
    // Extract Core Web Vitals
    const vitals = {
      lcp: lhr.audits['largest-contentful-paint'].numericValue,
      fid: lhr.audits['max-potential-fid']?.numericValue || 0,
      cls: lhr.audits['cumulative-layout-shift'].numericValue,
      tti: lhr.audits['interactive'].numericValue,
      fcp: lhr.audits['first-contentful-paint'].numericValue,
      si: lhr.audits['speed-index'].numericValue,
    };
    
    // Print results
    console.log('\n📊 Scores:');
    console.log(`  Performance:    ${scores.performance.toFixed(1)}% ${getEmoji(scores.performance, THRESHOLDS.performance * 100)}`);
    console.log(`  Accessibility:  ${scores.accessibility.toFixed(1)}% ${getEmoji(scores.accessibility, THRESHOLDS.accessibility * 100)}`);
    console.log(`  Best Practices: ${scores.bestPractices.toFixed(1)}% ${getEmoji(scores.bestPractices, THRESHOLDS.bestPractices * 100)}`);
    console.log(`  SEO:            ${scores.seo.toFixed(1)}% ${getEmoji(scores.seo, THRESHOLDS.seo * 100)}`);
    
    console.log('\n⚡ Core Web Vitals:');
    console.log(`  LCP: ${(vitals.lcp / 1000).toFixed(2)}s ${getEmoji(vitals.lcp, THRESHOLDS.lcp, true)}`);
    console.log(`  FID: ${vitals.fid.toFixed(0)}ms ${getEmoji(vitals.fid, THRESHOLDS.fid, true)}`);
    console.log(`  CLS: ${vitals.cls.toFixed(3)} ${getEmoji(vitals.cls, THRESHOLDS.cls, true)}`);
    console.log(`  TTI: ${(vitals.tti / 1000).toFixed(2)}s ${getEmoji(vitals.tti, THRESHOLDS.tti, true)}`);
    console.log(`  FCP: ${(vitals.fcp / 1000).toFixed(2)}s`);
    console.log(`  SI:  ${(vitals.si / 1000).toFixed(2)}s`);
    
    // Check thresholds
    const failures = [];
    
    if (scores.performance < THRESHOLDS.performance * 100) {
      failures.push(`Performance score ${scores.performance.toFixed(1)}% is below ${THRESHOLDS.performance * 100}%`);
    }
    
    if (scores.accessibility < THRESHOLDS.accessibility * 100) {
      failures.push(`Accessibility score ${scores.accessibility.toFixed(1)}% is below ${THRESHOLDS.accessibility * 100}%`);
    }
    
    if (vitals.lcp > THRESHOLDS.lcp) {
      failures.push(`LCP ${(vitals.lcp / 1000).toFixed(2)}s exceeds ${THRESHOLDS.lcp / 1000}s`);
    }
    
    if (vitals.fid > THRESHOLDS.fid) {
      failures.push(`FID ${vitals.fid.toFixed(0)}ms exceeds ${THRESHOLDS.fid}ms`);
    }
    
    if (vitals.cls > THRESHOLDS.cls) {
      failures.push(`CLS ${vitals.cls.toFixed(3)} exceeds ${THRESHOLDS.cls}`);
    }
    
    if (vitals.tti > THRESHOLDS.tti) {
      failures.push(`TTI ${(vitals.tti / 1000).toFixed(2)}s exceeds ${THRESHOLDS.tti / 1000}s`);
    }
    
    // Save report
    const reportDir = path.join(process.cwd(), 'lighthouse-reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(reportDir, `${name.replace(/\s/g, '-')}-${timestamp}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(lhr, null, 2));
    console.log(`\n💾 Report saved to: ${reportPath}`);
    
    return { name, scores, vitals, failures };
  } catch (error) {
    console.error(`❌ Error testing ${name}:`, error.message);
    await chrome.kill();
    return { name, error: error.message };
  }
}

function getEmoji(value, threshold, invert = false) {
  const passed = invert ? value < threshold : value >= threshold;
  return passed ? '✅' : '❌';
}

async function main() {
  console.log('🚀 Starting Lighthouse Performance Tests\n');
  console.log('Thresholds:');
  console.log(`  Performance: ≥${THRESHOLDS.performance * 100}%`);
  console.log(`  Accessibility: ≥${THRESHOLDS.accessibility * 100}%`);
  console.log(`  LCP: ≤${THRESHOLDS.lcp / 1000}s`);
  console.log(`  FID: ≤${THRESHOLDS.fid}ms`);
  console.log(`  CLS: ≤${THRESHOLDS.cls}`);
  console.log(`  TTI: ≤${THRESHOLDS.tti / 1000}s`);
  
  const results = [];
  
  for (const { url, name } of URLS_TO_TEST) {
    const result = await runLighthouse(url, name);
    results.push(result);
  }
  
  // Summary
  console.log('\n\n' + '='.repeat(60));
  console.log('📈 SUMMARY');
  console.log('='.repeat(60));
  
  let allPassed = true;
  
  for (const result of results) {
    if (result.error) {
      console.log(`\n❌ ${result.name}: ERROR - ${result.error}`);
      allPassed = false;
      continue;
    }
    
    if (result.failures && result.failures.length > 0) {
      console.log(`\n❌ ${result.name}: FAILED`);
      result.failures.forEach(failure => {
        console.log(`   - ${failure}`);
      });
      allPassed = false;
    } else {
      console.log(`\n✅ ${result.name}: PASSED`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (allPassed) {
    console.log('✅ All tests passed!');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed. See details above.');
    process.exit(1);
  }
}

// Check if lighthouse and chrome-launcher are installed
try {
  require.resolve('lighthouse');
  require.resolve('chrome-launcher');
} catch (error) {
  console.error('❌ Missing dependencies. Please install:');
  console.error('   npm install --save-dev lighthouse chrome-launcher');
  process.exit(1);
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
