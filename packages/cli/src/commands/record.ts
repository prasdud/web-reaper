import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { record, type Flow } from '@web-reaper/core';

interface RecordOptions {
  url: string;
  flow: string;
  loadAuth?: string;
  saveAuth?: string;
  output: string;
}

export async function recordCommand(options: RecordOptions): Promise<void> {
  console.log(chalk.blue('\n🔴 Starting recorder...\n'));
  console.log(chalk.gray(`  URL: ${options.url}`));
  console.log(chalk.gray(`  Flow: ${options.flow}`));
  
  if (options.loadAuth) {
    console.log(chalk.gray(`  Loading auth from: ${options.loadAuth}`));
  }
  if (options.saveAuth) {
    console.log(chalk.gray(`  Saving auth to: ${options.saveAuth}`));
  }
  
  console.log('');

  // Ensure output directory exists
  try {
    await fs.mkdir(options.output, { recursive: true });
  } catch {
    // Directory may already exist
  }

  const spinner = ora('Launching browser...').start();

  try {
    // Run recorder
    const flow = await record({
      baseUrl: options.url,
      flowName: options.flow,
      injectReactGrab: true,
      loadAuth: options.loadAuth,
      saveAuth: options.saveAuth,
      onStart: () => {
        spinner.succeed('Browser launched');
        console.log(chalk.yellow('\n⚡ Recording your actions...'));
        console.log(chalk.gray('   Click "Stop Recording" in the browser panel when done.\n'));
      },
      onAction: (action) => {
        console.log(chalk.gray(`   📝 ${action.type}${action.selector ? ` on ${action.selector.substring(0, 40)}` : ''}`));
      },
      onStop: (actions) => {
        console.log(chalk.green(`\n✅ Recorded ${actions.length} actions`));
      },
    });

    // Save flow to file
    const outputPath = path.join(options.output, `${options.flow}.flow.json`);
    await fs.writeFile(outputPath, JSON.stringify(flow, null, 2));
    
    console.log(chalk.green(`\n📁 Flow saved to: ${outputPath}`));
    console.log(chalk.gray('\nTo run this flow:'));
    console.log(chalk.cyan(`   npx web-reaper run -f ${options.flow}`));
    console.log('');

  } catch (error) {
    spinner.fail('Recording failed');
    console.error(chalk.red(`\n❌ Error: ${error instanceof Error ? error.message : error}`));
    process.exit(1);
  }
}
