import type { TestReport, FlowResult } from '@web-reaper/core';

export interface ReporterOptions {
  /** Output directory */
  outputDir: string;
  
  /** Include screenshots in report */
  includeScreenshots?: boolean;
  
  /** Include console logs */
  includeConsoleLogs?: boolean;
}

/**
 * Generate a JSON report
 */
export function generateJsonReport(report: TestReport): string {
  return JSON.stringify(report, null, 2);
}

/**
 * Generate console output for terminal
 */
export function generateConsoleReport(report: TestReport): string {
  const { summary, results } = report;
  const lines: string[] = [];
  
  lines.push('');
  lines.push('╔══════════════════════════════════════════════════════════════════╗');
  lines.push('║                     WEB-REAPER TEST REPORT                       ║');
  lines.push(`║                     Generated: ${new Date(report.meta.generatedAt).toLocaleString().padEnd(23)}       ║`);
  lines.push('╠══════════════════════════════════════════════════════════════════╣');
  lines.push('║                                                                  ║');
  lines.push('║  SUMMARY                                                         ║');
  lines.push('║  ────────────────────────────────────────────────                ║');
  lines.push(`║  Total: ${String(summary.total).padEnd(3)} Passed: ${String(summary.passed).padEnd(3)} Failed: ${String(summary.failed).padEnd(3)} Duration: ${formatDuration(summary.duration).padEnd(8)}  ║`);
  lines.push('║                                                                  ║');
  lines.push('╠══════════════════════════════════════════════════════════════════╣');
  lines.push('║                                                                  ║');
  lines.push('║  RESULTS                                                         ║');
  lines.push('║  ────────────────────────────────────────────────                ║');
  
  for (const result of results) {
    const icon = result.status === 'passed' ? '✓' : result.status === 'skipped' ? '⏭' : '✗';
    const name = result.name.substring(0, 45).padEnd(45);
    const duration = formatDuration(result.duration).padStart(8);
    lines.push(`║  ${icon} ${name} ${duration}     ║`);
    
    if (result.error) {
      const errorLines = result.error.match(/.{1,55}/g) || [];
      for (const errorLine of errorLines.slice(0, 2)) {
        lines.push(`║    └─ ${errorLine.padEnd(55)}║`);
      }
    }
  }
  
  lines.push('║                                                                  ║');
  lines.push('╚══════════════════════════════════════════════════════════════════╝');
  lines.push('');
  
  return lines.join('\n');
}

/**
 * Format duration in human readable format
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = Math.round((ms % 60000) / 1000);
  return `${mins}m ${secs}s`;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Get status icon
 */
function getStatusIcon(status: string): string {
  switch (status) {
    case 'passed': return '✅';
    case 'failed': return '❌';
    case 'skipped': return '⏭️';
    default: return '⏳';
  }
}

/**
 * Generate HTML report
 */
export function generateHtmlReport(report: TestReport): string {
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
        <details class="steps">
          <summary>Steps (${result.steps.length})</summary>
          <div class="steps-list">
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
        </details>
      ` : ''}
      ${result.assertions.length > 0 ? `
        <details class="assertions">
          <summary>Assertions (${result.assertions.length})</summary>
          <div class="assertions-list">
            ${result.assertions.map(assertion => `
              <div class="assertion ${assertion.status}">
                <span class="status-icon">${getStatusIcon(assertion.status)}</span>
                <span class="assertion-id">${escapeHtml(assertion.id)}</span>
                <span class="assertion-type">${escapeHtml(assertion.type)}</span>
                ${assertion.error ? `<div class="assertion-error">${escapeHtml(assertion.error)}</div>` : ''}
              </div>
            `).join('')}
          </div>
        </details>
      ` : ''}
      ${result.consoleLogs && result.consoleLogs.length > 0 ? `
        <details class="console-logs">
          <summary>Console Logs (${result.consoleLogs.length})</summary>
          <div class="logs-list">
            ${result.consoleLogs.map(log => `
              <div class="log log-${log.level}">
                <span class="log-level">[${log.level}]</span>
                <span class="log-message">${escapeHtml(log.message)}</span>
              </div>
            `).join('')}
          </div>
        </details>
      ` : ''}
      ${result.screenshot ? `
        <details class="screenshot">
          <summary>Screenshot on Failure</summary>
          <img src="${escapeHtml(result.screenshot)}" alt="Failure screenshot" />
        </details>
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
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0d1117;
      color: #c9d1d9;
      line-height: 1.6;
      padding: 40px;
    }
    
    .container { max-width: 1200px; margin: 0 auto; }
    
    h1 { color: #ff4757; margin-bottom: 8px; }
    
    .meta { color: #8b949e; margin-bottom: 32px; }
    
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
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
    
    .stat-value { font-size: 32px; font-weight: bold; }
    .stat-label { color: #8b949e; font-size: 14px; }
    
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
    
    .status-icon { font-size: 18px; }
    .flow-name { font-weight: 600; flex: 1; }
    .flow-duration { color: #8b949e; font-size: 14px; }
    
    .error {
      padding: 12px 20px;
      background: #f8514926;
      color: #f85149;
      font-family: monospace;
      font-size: 13px;
    }
    
    details { border-top: 1px solid #30363d; }
    
    summary {
      padding: 12px 20px;
      cursor: pointer;
      color: #8b949e;
      font-size: 13px;
    }
    
    summary:hover { background: #21262d; }
    
    .steps-list, .assertions-list, .logs-list {
      padding: 0 20px 16px;
    }
    
    .step, .assertion {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 0;
      border-bottom: 1px solid #21262d;
      font-size: 14px;
    }
    
    .step:last-child, .assertion:last-child { border-bottom: none; }
    
    .step-id, .assertion-id { color: #8b949e; font-family: monospace; width: 80px; }
    .step-action, .assertion-type { color: #58a6ff; flex: 1; }
    .step-duration { color: #8b949e; }
    
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
    
    .log {
      padding: 4px 0;
      font-family: monospace;
      font-size: 12px;
      display: flex;
      gap: 8px;
    }
    
    .log-level { color: #8b949e; width: 50px; }
    .log-log .log-level { color: #c9d1d9; }
    .log-warn .log-level { color: #d29922; }
    .log-error .log-level { color: #f85149; }
    .log-info .log-level { color: #58a6ff; }
    
    .screenshot img {
      max-width: 100%;
      margin: 0 20px 16px;
      border-radius: 4px;
      border: 1px solid #30363d;
    }
    
    .pass-rate { font-size: 48px; font-weight: bold; }
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
      Base URL: ${escapeHtml(meta.baseUrl || 'N/A')} |
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
    
    <h2 style="margin-bottom: 16px; color: #c9d1d9;">Results</h2>
    ${resultsHtml}
  </div>
</body>
</html>`;
}

export { escapeHtml, formatDuration };
