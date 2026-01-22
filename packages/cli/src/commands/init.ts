import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';

const DEFAULT_CONFIG = {
  baseUrl: 'http://localhost:3000',
  flowsDir: './flows',
  authDir: './auth',
  reportsDir: './reports',
  screenshotsOnFailure: true,
  timeout: 30000,
  retries: 0,
  parallel: 1,
  injectReactGrab: true,
  actionVerification: true,
  headless: true,
  browser: 'chromium',
};

export async function initCommand(): Promise<void> {
  console.log(chalk.blue('\n📦 Initializing web-reaper...\n'));

  const configPath = path.join(process.cwd(), 'web-reaper.config.json');
  
  // Check if config already exists
  try {
    await fs.access(configPath);
    console.log(chalk.yellow('⚠️  web-reaper.config.json already exists. Skipping config creation.'));
  } catch {
    // Create config file
    await fs.writeFile(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2));
    console.log(chalk.green('✅ Created web-reaper.config.json'));
  }

  // Create directories
  const dirs = ['flows', 'auth', 'reports', 'reports/screenshots'];
  
  for (const dir of dirs) {
    const dirPath = path.join(process.cwd(), dir);
    try {
      await fs.mkdir(dirPath, { recursive: true });
      console.log(chalk.green(`✅ Created ${dir}/`));
    } catch (error: any) {
      if (error.code !== 'EEXIST') {
        console.log(chalk.yellow(`⚠️  Could not create ${dir}/: ${error.message}`));
      }
    }
  }

  // Create .gitkeep files
  for (const dir of ['auth', 'reports']) {
    const gitkeepPath = path.join(process.cwd(), dir, '.gitkeep');
    try {
      await fs.writeFile(gitkeepPath, '');
    } catch {
      // Ignore
    }
  }

  // Create example flow
  const exampleFlow = {
    $schema: './flow.schema.json',
    name: 'Example Login Flow',
    description: 'Example flow demonstrating login functionality',
    baseUrl: 'http://localhost:3000',
    variables: {
      email: 'test@example.com',
      password: 'password123',
    },
    steps: [
      {
        id: 'step-1',
        action: 'navigate',
        url: '/login',
        description: 'Navigate to login page',
      },
      {
        id: 'step-2',
        action: 'fill',
        locator: {
          strategies: [
            { type: 'testId', value: 'email-input' },
            { type: 'placeholder', value: 'Email' },
          ],
        },
        value: '{{email}}',
        description: 'Enter email address',
      },
      {
        id: 'step-3',
        action: 'fill',
        locator: {
          strategies: [
            { type: 'testId', value: 'password-input' },
            { type: 'placeholder', value: 'Password' },
          ],
        },
        value: '{{password}}',
        description: 'Enter password',
      },
      {
        id: 'step-4',
        action: 'click',
        locator: {
          strategies: [
            { type: 'testId', value: 'login-button' },
            { type: 'role', value: 'button', name: 'Log In' },
          ],
        },
        description: 'Click login button',
      },
      {
        id: 'step-5',
        action: 'waitForNavigation',
        url: '/dashboard',
        timeout: 10000,
        description: 'Wait for redirect to dashboard',
      },
    ],
    assertions: [
      {
        id: 'assert-1',
        type: 'visible',
        locator: {
          strategies: [{ type: 'testId', value: 'dashboard-header' }],
        },
        description: 'Dashboard header should be visible',
      },
      {
        id: 'assert-2',
        type: 'urlContains',
        value: '/dashboard',
        description: 'URL should contain /dashboard',
      },
    ],
    onSuccess: {
      saveAuth: true,
      authFile: 'auth/logged-in.json',
    },
  };

  const exampleFlowPath = path.join(process.cwd(), 'flows', 'example-login.flow.json');
  try {
    await fs.access(exampleFlowPath);
    console.log(chalk.yellow('⚠️  Example flow already exists. Skipping.'));
  } catch {
    await fs.writeFile(exampleFlowPath, JSON.stringify(exampleFlow, null, 2));
    console.log(chalk.green('✅ Created flows/example-login.flow.json'));
  }

  console.log(chalk.blue('\n🎉 web-reaper initialized successfully!\n'));
  console.log(chalk.gray('Next steps:'));
  console.log(chalk.gray('  1. Start your React app on localhost:3000'));
  console.log(chalk.gray('  2. Record a flow: npx web-reaper record -u http://localhost:3000 -f my-flow'));
  console.log(chalk.gray('  3. Run tests: npx web-reaper run --all'));
  console.log('');
}
