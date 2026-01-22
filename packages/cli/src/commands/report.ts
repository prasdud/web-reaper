import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import type { TestReport, FlowResult } from '@web-reaper/core';

interface ReportOptions {
  format: string;
  output?: string;
  dir: string;
}

export async function reportCommand(options: ReportOptions): Promise<void> {
  console.log(chalk.blue('\n📊 Generating report...\n'));

  const reportsDir = path.resolve(process.cwd(), options.dir);
  const latestReportPath = path.join(reportsDir, 'latest.json');

  // Load latest report
  let report: TestReport;
  try {
    const content = await fs.readFile(latestReportPath, 'utf-8');
    report = JSON.parse(content);
  } catch {
    console.log(chalk.red('❌ No report found. Run tests first with: npx web-reaper run --all'));
    process.exit(1);
  }

  if (options.format === 'json') {
    // JSON output
    const outputPath = options.output || path.join(reportsDir, 'report.json');
    await fs.writeFile(outputPath, JSON.stringify(report, null, 2));
    console.log(chalk.green(`✅ JSON report saved to: ${outputPath}`));
  } else {
    // HTML output
    const html = generateHtmlReport(report);
    const outputPath = options.output || path.join(reportsDir, 'report.html');
    await fs.writeFile(outputPath, html);
    console.log(chalk.green(`✅ HTML report saved to: ${outputPath}`));
    console.log(chalk.gray(`   Open in browser: file://${path.resolve(outputPath)}`));
  }

  console.log('');
}

function generateHtmlReport(report: TestReport): string {
  const { summary, results, meta } = report;
  
  const passRate = summary.total > 0 
    ? Math.round((summary.passed / summary.total) * 100) 
    : 0;

  const resultsHtml = results.map(result => `
    <div class="flow ${result.status}">
      <div class="flow-header">
        <span class="status-icon">${getStatusIcon(result.status)}</span>
        <span class="flow-name">${escapeHtml(result.name)}</span>
        <span class="flow-duration">${formatDuration(result.duration)}</span>
      </div>
      ${result.error ? `<div class="error">${escapeHtml(result.error)}</div>` : ''}
      ${result.steps.length > 0 ? `
        <div class="steps">
          <h4>Steps</h4>
          ${result.steps.map(step => `
            <div class="step ${step.status}">
              <span class="status-icon">${getStatusIcon(step.status)}</span>
              <span class="step-id">${escapeHtml(step.id)}</span>
              <span class="step-action">${escapeHtml(step.action)}</span>
              <span class="step-duration">${formatDuration(step.duration)}</span>
              ${step.error ? `<div class="step-error">${escapeHtml(step.error)}</div>` : ''}
            </div>
          `).join('')}
        </div>
      ` : ''}
      ${result.assertions.length > 0 ? `
        <div class="assertions">
          <h4>Assertions</h4>
          ${result.assertions.map(assertion => `
            <div class="assertion ${assertion.status}">
              <span class="status-icon">${getStatusIcon(assertion.status)}</span>
              <span class="assertion-id">${escapeHtml(assertion.id)}</span>
              <span class="assertion-type">${escapeHtml(assertion.type)}</span>
              ${assertion.error ? `<div class="assertion-error">${escapeHtml(assertion.error)}</div>` : ''}
            </div>
          `).join('')}
        </div>
      ` : ''}
      ${result.screenshot ? `
        <div class="screenshot">
          <h4>Screenshot on Failure</h4>
          <img src="${escapeHtml(result.screenshot)}" alt="Failure screenshot" />
        </div>
      ` : ''}
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Web Reaper Test Report</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0d1117;
      color: #c9d1d9;
      line-height: 1.6;
      padding: 40px;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    
    h1 {
      color: #58a6ff;
      margin-bottom: 8px;
    }
    
    .meta {
      color: #8b949e;
      margin-bottom: 32px;
    }
    
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 16px;
      margin-bottom: 40px;
    }
    
    .stat {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
    }
    
    .stat-value {
      font-size: 32px;
      font-weight: bold;
    }
    
    .stat-label {
      color: #8b949e;
      font-size: 14px;
    }
    
    .stat.passed .stat-value { color: #3fb950; }
    .stat.failed .stat-value { color: #f85149; }
    .stat.skipped .stat-value { color: #d29922; }
    .stat.total .stat-value { color: #58a6ff; }
    
    .flow {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 8px;
      margin-bottom: 16px;
      overflow: hidden;
    }
    
    .flow.passed { border-left: 4px solid #3fb950; }
    .flow.failed { border-left: 4px solid #f85149; }
    .flow.skipped { border-left: 4px solid #d29922; }
    
    .flow-header {
      padding: 16px 20px;
      display: flex;
      align-items: center;
      gap: 12px;
      background: #21262d;
    }
    
    .status-icon {
      font-size: 18px;
    }
    
    .flow-name {
      font-weight: 600;
      flex: 1;
    }
    
    .flow-duration {
      color: #8b949e;
      font-size: 14px;
    }
    
    .error {
      padding: 12px 20px;
      background: #f8514926;
      color: #f85149;
      font-family: monospace;
      font-size: 13px;
    }
    
    .steps, .assertions {
      padding: 16px 20px;
      border-top: 1px solid #30363d;
    }
    
    .steps h4, .assertions h4 {
      color: #8b949e;
      font-size: 12px;
      text-transform: uppercase;
      margin-bottom: 12px;
    }
    
    .step, .assertion {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 0;
      border-bottom: 1px solid #21262d;
      font-size: 14px;
    }
    
    .step:last-child, .assertion:last-child {
      border-bottom: none;
    }
    
    .step-id, .assertion-id {
      color: #8b949e;
      font-family: monospace;
    }
    
    .step-action, .assertion-type {
      color: #58a6ff;
    }
    
    .step-duration {
      margin-left: auto;
      color: #8b949e;
    }
    
    .step-error, .assertion-error {
      width: 100%;
      margin-top: 4px;
      padding: 8px;
      background: #f8514926;
      color: #f85149;
      font-family: monospace;
      font-size: 12px;
      border-radius: 4px;
    }
    
    .screenshot {
      padding: 16px 20px;
      border-top: 1px solid #30363d;
    }
    
    .screenshot h4 {
      color: #8b949e;
      font-size: 12px;
      text-transform: uppercase;
      margin-bottom: 12px;
    }
    
    .screenshot img {
      max-width: 100%;
      border-radius: 4px;
      border: 1px solid #30363d;
    }
    
    .pass-rate {
      font-size: 48px;
      font-weight: bold;
    }
    
    .pass-rate.good { color: #3fb950; }
    .pass-rate.warning { color: #d29922; }
    .pass-rate.bad { color: #f85149; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔪 Web Reaper Test Report</h1>
    <p class="meta">
      Generated: ${new Date(meta.generatedAt).toLocaleString()} |
      Base URL: ${escapeHtml(meta.baseUrl)} |
      Duration: ${formatDuration(summary.duration)}
    </p>
    
    <div class="summary">
      <div class="stat total">
        <div class="stat-value">${summary.total}</div>
        <div class="stat-label">Total</div>
      </div>
      <div class="stat passed">
        <div class="stat-value">${summary.passed}</div>
        <div class="stat-label">Passed</div>
      </div>
      <div class="stat failed">
        <div class="stat-value">${summary.failed}</div>
        <div class="stat-label">Failed</div>
      </div>
      <div class="stat skipped">
        <div class="stat-value">${summary.skipped}</div>
        <div class="stat-label">Skipped</div>
      </div>
      <div class="stat">
        <div class="pass-rate ${passRate >= 80 ? 'good' : passRate >= 50 ? 'warning' : 'bad'}">${passRate}%</div>
        <div class="stat-label">Pass Rate</div>
      </div>
    </div>
    
    <h2 style="margin-bottom: 16px;">Results</h2>
    ${resultsHtml}
  </div>
</body>
</html>`;
}

function getStatusIcon(status: string): string {
  switch (status) {
    case 'passed': return '✅';
    case 'failed': return '❌';
    case 'skipped': return '⏭️';
    default: return '⏳';
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
