#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { VERSION } from '@web-reaper/core';
import { recordCommand } from './commands/record.js';
import { runCommand } from './commands/run.js';
import { reportCommand } from './commands/report.js';
import { initCommand } from './commands/init.js';

const program = new Command();

// ASCII art banner
const banner = `
${chalk.red('╦ ╦╔═╗╔╗   ╦═╗╔═╗╔═╗╔═╗╔═╗╦═╗')}
${chalk.red('║║║║╣ ╠╩╗  ╠╦╝║╣ ╠═╣╠═╝║╣ ╠╦╝')}
${chalk.red('╚╩╝╚═╝╚═╝  ╩╚═╚═╝╩ ╩╩  ╚═╝╩╚═')}
${chalk.gray('React Flow Testing Tool v' + VERSION)}
`;

program
  .name('web-reaper')
  .description('Record, replay, and assert user flows for React applications')
  .version(VERSION)
  .addHelpText('before', banner);

// Init command
program
  .command('init')
  .description('Initialize web-reaper in your project')
  .action(initCommand);

// Record command
program
  .command('record')
  .description('Record a new test flow')
  .requiredOption('-u, --url <url>', 'Base URL to start recording')
  .requiredOption('-f, --flow <name>', 'Name of the flow to record')
  .option('--load-auth <file>', 'Load authentication state from file')
  .option('--save-auth <file>', 'Save authentication state to file after recording')
  .option('-o, --output <dir>', 'Output directory for flow files', './flows')
  .action(recordCommand);

// Run command
program
  .command('run')
  .description('Run test flow(s)')
  .option('-f, --flow <name>', 'Name of flow to run (without .flow.json)')
  .option('-a, --all', 'Run all flows')
  .option('-u, --url <url>', 'Override base URL')
  .option('--headed', 'Run in headed mode (show browser)')
  .option('--vars <variables>', 'Variables in key=value,key2=value2 format')
  .option('-d, --dir <dir>', 'Directory containing flow files', './flows')
  .option('--retries <count>', 'Number of retries for failed tests', '0')
  .action(runCommand);

// Report command
program
  .command('report')
  .description('Generate test report')
  .option('-f, --format <format>', 'Report format (html, json)', 'html')
  .option('-o, --output <file>', 'Output file path')
  .option('-d, --dir <dir>', 'Reports directory', './reports')
  .action(reportCommand);

// Parse arguments
program.parse();
