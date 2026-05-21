import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import {
  runFlow,
  validateFlow,
  parseCliVariables,
  defaultConfig,
  type Flow,
  type FlowResult,
  type TestReport,
  type Config,
} from '@web-reaper/core';

interface RunOptions {
  flow?: string;
  all?: boolean;
  url?: string;
  headed?: boolean;
  loadAuth?: string;
  vars?: string;
  dir: string;
  retries: string;
}

export async function runCommand(options: RunOptions): Promise<void> {
  console.log(chalk.blue('\n🚀 Running tests...\n'));

  // Load config
  const config = await loadConfig();
  
  // Override with CLI options
  if (options.url) {
    config.baseUrl = options.url;
  }

  // Parse variables
  const variables = options.vars ? parseCliVariables(options.vars) : {};

  // Find flows to run
  const flowFiles = await findFlows(options);
  
  if (flowFiles.length === 0) {
    console.log(chalk.yellow('⚠️  No flows found to run.'));
    console.log(chalk.gray(`   Directory: ${options.dir}`));
    console.log(chalk.gray('   Use -f <name> to specify a flow or --all to run all flows.'));
    process.exit(1);
  }

  console.log(chalk.gray(`Found ${flowFiles.length} flow(s) to run:\n`));
  for (const file of flowFiles) {
    console.log(chalk.gray(`  • ${path.basename(file)}`));
  }
  console.log('');

  // Run flows
  const results: FlowResult[] = [];
  const startedAt = Date.now();

  for (const flowFile of flowFiles) {
    const spinner = ora(`Running ${path.basename(flowFile)}...`).start();

    try {
      // Load and validate flow
      const flowContent = await fs.readFile(flowFile, 'utf-8');
      const flowData = JSON.parse(flowContent);
      const flow = validateFlow(flowData);

      // Override base URL if specified
      if (config.baseUrl) {
        flow.baseUrl = config.baseUrl;
      }

      // Run with retries
      const maxRetries = parseInt(options.retries) || config.retries || 0;
      let result: FlowResult | null = null;
      let attempts = 0;

      while (attempts <= maxRetries) {
        result = await runFlow(flow, flowFile, {
          config,
          variables,
          headed: options.headed,
          loadAuth: options.loadAuth,
          onStep: (step) => {
            if (step.status === 'passed') {
              spinner.text = `Running ${path.basename(flowFile)}... Step ${step.id} ✓`;
            }
          },
        });

        if (result.status === 'passed' || attempts >= maxRetries) {
          break;
        }

        attempts++;
        spinner.text = `Running ${path.basename(flowFile)}... Retry ${attempts}/${maxRetries}`;
      }

      if (!result) {
        throw new Error('No result from flow execution');
      }

      results.push(result);

      if (result.status === 'passed') {
        spinner.succeed(chalk.green(`${flow.name} - PASSED (${formatDuration(result.duration)})`));
      } else if (result.status === 'skipped') {
        spinner.warn(chalk.yellow(`${flow.name} - SKIPPED`));
      } else {
        spinner.fail(chalk.red(`${flow.name} - FAILED (${formatDuration(result.duration)})`));
        if (result.error) {
          console.log(chalk.red(`   └─ ${result.error}`));
        }
        if (result.screenshot) {
          console.log(chalk.gray(`   └─ Screenshot: ${result.screenshot}`));
        }
      }

    } catch (error) {
      spinner.fail(chalk.red(`${path.basename(flowFile)} - ERROR`));
      console.log(chalk.red(`   └─ ${error instanceof Error ? error.message : error}`));
      
      results.push({
        name: path.basename(flowFile),
        file: flowFile,
        status: 'failed',
        duration: 0,
        steps: [],
        assertions: [],
        error: error instanceof Error ? error.message : String(error),
        startedAt: Date.now(),
        endedAt: Date.now(),
      });
    }
  }

  const endedAt = Date.now();

  // Print summary
  printSummary(results, endedAt - startedAt);

  // Save report
  await saveReport(results, startedAt, endedAt, config);

  // Exit with appropriate code
  const failed = results.filter(r => r.status === 'failed').length;
  if (failed > 0) {
    process.exit(1);
  }
}

async function loadConfig(): Promise<Config> {
  const configPath = path.join(process.cwd(), 'web-reaper.config.json');
  
  try {
    const content = await fs.readFile(configPath, 'utf-8');
    return { ...defaultConfig, ...JSON.parse(content) };
  } catch {
    return defaultConfig;
  }
}

async function findFlows(options: RunOptions): Promise<string[]> {
  const flowsDir = path.resolve(process.cwd(), options.dir);
  
  if (options.flow) {
    // Single flow
    const flowPath = path.join(flowsDir, `${options.flow}.flow.json`);
    try {
      await fs.access(flowPath);
      return [flowPath];
    } catch {
      console.log(chalk.red(`❌ Flow not found: ${flowPath}`));
      return [];
    }
  }
  
  if (options.all) {
    // All flows in directory
    try {
      const files = await fs.readdir(flowsDir);
      return files
        .filter(f => f.endsWith('.flow.json'))
        .map(f => path.join(flowsDir, f));
    } catch {
      return [];
    }
  }
  
  console.log(chalk.yellow('⚠️  Please specify -f <flow> or --all'));
  return [];
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function printSummary(results: FlowResult[], totalDuration: number): void {
  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const skipped = results.filter(r => r.status === 'skipped').length;

  console.log('\n' + chalk.gray('─'.repeat(60)));
  console.log(chalk.bold('\n📊 Test Summary\n'));
  
  console.log(`   Total:   ${results.length}`);
  console.log(`   ${chalk.green('Passed:')}  ${passed}`);
  console.log(`   ${chalk.red('Failed:')}  ${failed}`);
  console.log(`   ${chalk.yellow('Skipped:')} ${skipped}`);
  console.log(`   Duration: ${formatDuration(totalDuration)}`);
  
  console.log('\n' + chalk.gray('─'.repeat(60)) + '\n');

  if (failed === 0) {
    console.log(chalk.green('✅ All tests passed!\n'));
  } else {
    console.log(chalk.red(`❌ ${failed} test(s) failed.\n`));
  }
}

async function saveReport(
  results: FlowResult[],
  startedAt: number,
  endedAt: number,
  config: Config
): Promise<void> {
  const report: TestReport = {
    meta: {
      version: '0.1.0',
      generatedAt: Date.now(),
      baseUrl: config.baseUrl || '',
    },
    summary: {
      total: results.length,
      passed: results.filter(r => r.status === 'passed').length,
      failed: results.filter(r => r.status === 'failed').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      duration: endedAt - startedAt,
      startedAt,
      endedAt,
    },
    results,
  };

  const reportsDir = path.resolve(process.cwd(), config.reportsDir || './reports');
  
  try {
    await fs.mkdir(reportsDir, { recursive: true });
    
    const reportPath = path.join(reportsDir, 'latest.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log(chalk.gray(`📄 Report saved to: ${reportPath}`));
  } catch (error) {
    console.log(chalk.yellow(`⚠️  Could not save report: ${error}`));
  }
}
