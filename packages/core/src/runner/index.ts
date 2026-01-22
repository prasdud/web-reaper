import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import type {
  Flow,
  Action,
  Assertion,
  Config,
  FlowResult,
  StepResult,
  AssertionResult,
  StepStatus,
} from '../types/index.js';
import { toPlaywrightLocator, describeLocator } from '../utils/locator.js';
import { interpolate, mergeVariables, type Variables } from '../utils/variables.js';

/**
 * Runner options
 */
export interface RunnerOptions {
  /** Configuration */
  config: Partial<Config>;
  
  /** Variables to use for interpolation */
  variables?: Variables;
  
  /** Run in headed mode */
  headed?: boolean;
  
  /** Callback for step completion */
  onStep?: (step: StepResult) => void;
  
  /** Callback for assertion completion */
  onAssertion?: (assertion: AssertionResult) => void;
}

/**
 * Console log entry
 */
interface ConsoleLog {
  level: string;
  message: string;
  timestamp: number;
}

/**
 * Runner class
 * Executes flow files and collects results
 */
export class Runner {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private options: RunnerOptions;
  private consoleLogs: ConsoleLog[] = [];

  constructor(options: RunnerOptions) {
    this.options = options;
  }

  /**
   * Initialize browser
   */
  private async init(flow: Flow): Promise<void> {
    const config = this.options.config;
    const browserType = chromium; // TODO: Support other browsers

    this.browser = await browserType.launch({
      headless: !this.options.headed && (config.headless ?? true),
    });

    const contextOptions: any = {
      viewport: config.viewport || { width: 1280, height: 720 },
    };

    // Load auth state if specified
    if (flow.authFile) {
      try {
        contextOptions.storageState = flow.authFile;
      } catch (error) {
        console.warn(`Could not load auth state from ${flow.authFile}`);
      }
    }

    this.context = await this.browser.newContext(contextOptions);
    this.page = await this.context.newPage();

    // Capture console logs
    this.page.on('console', (msg) => {
      this.consoleLogs.push({
        level: msg.type(),
        message: msg.text(),
        timestamp: Date.now(),
      });
    });

    // Inject react-grab bridge if enabled
    if (config.injectReactGrab) {
      await this.injectReactGrabBridge();
    }
  }

  /**
   * Inject react-grab bridge for action verification
   */
  private async injectReactGrabBridge(): Promise<void> {
    if (!this.page) return;

    await this.page.addInitScript(() => {
      (window as any).__webReaper = {
        actions: [] as Array<{ name: string; payload: any; timestamp: number }>,
        actionCompleted(name: string, payload?: any) {
          this.actions.push({ name, payload, timestamp: Date.now() });
          console.log(`[WEB-REAPER] Action: ${name}`, payload);
        },
        getActions() {
          return this.actions;
        },
        clearActions() {
          this.actions = [];
        },
      };
    });
  }

  /**
   * Run a flow
   */
  async run(flow: Flow, flowFile: string): Promise<FlowResult> {
    const startedAt = Date.now();
    const stepResults: StepResult[] = [];
    const assertionResults: AssertionResult[] = [];
    let overallStatus: StepStatus = 'passed';
    let errorMessage: string | undefined;
    let failureScreenshot: string | undefined;

    // Skip if marked
    if (flow.skip) {
      return {
        name: flow.name,
        file: flowFile,
        status: 'skipped',
        duration: 0,
        steps: [],
        assertions: [],
        startedAt,
        endedAt: Date.now(),
      };
    }

    // Merge variables
    const variables = mergeVariables(
      this.options.config.defaultVariables,
      flow.variables,
      this.options.variables
    );

    try {
      await this.init(flow);

      // Execute steps
      for (const step of flow.steps) {
        const stepResult = await this.executeStep(step, variables);
        stepResults.push(stepResult);
        this.options.onStep?.(stepResult);

        if (stepResult.status === 'failed' && !step.optional) {
          overallStatus = 'failed';
          errorMessage = `Step "${step.id}" failed: ${stepResult.error}`;
          
          // Take screenshot on failure
          if (this.options.config.screenshotsOnFailure && this.page) {
            const screenshotPath = `${this.options.config.reportsDir}/screenshots/${flow.name.replace(/\s+/g, '-')}-${step.id}.png`;
            await this.page.screenshot({ path: screenshotPath });
            failureScreenshot = screenshotPath;
          }
          
          break;
        }
      }

      // Run assertions if steps passed
      if (overallStatus === 'passed' && flow.assertions) {
        for (const assertion of flow.assertions) {
          const assertionResult = await this.executeAssertion(assertion, variables);
          assertionResults.push(assertionResult);
          this.options.onAssertion?.(assertionResult);

          if (assertionResult.status === 'failed' && !assertion.soft) {
            overallStatus = 'failed';
            errorMessage = `Assertion "${assertion.id}" failed: ${assertionResult.error}`;

            // Take screenshot on failure
            if (this.options.config.screenshotsOnFailure && this.page) {
              const screenshotPath = `${this.options.config.reportsDir}/screenshots/${flow.name.replace(/\s+/g, '-')}-${assertion.id}.png`;
              await this.page.screenshot({ path: screenshotPath });
              failureScreenshot = screenshotPath;
            }

            break;
          }
        }
      }

      // Save auth state if flow passed and configured
      if (overallStatus === 'passed' && flow.onSuccess?.saveAuth && flow.onSuccess.authFile && this.context) {
        await this.context.storageState({ path: flow.onSuccess.authFile });
      }

    } catch (error) {
      overallStatus = 'failed';
      errorMessage = error instanceof Error ? error.message : String(error);
    } finally {
      await this.cleanup();
    }

    const endedAt = Date.now();

    return {
      name: flow.name,
      file: flowFile,
      status: overallStatus,
      duration: endedAt - startedAt,
      steps: stepResults,
      assertions: assertionResults,
      error: errorMessage,
      screenshot: failureScreenshot,
      consoleLogs: this.consoleLogs,
      startedAt,
      endedAt,
    };
  }

  /**
   * Execute a single step
   */
  private async executeStep(step: Action, variables: Variables): Promise<StepResult> {
    const startTime = Date.now();
    
    try {
      await this.performAction(step, variables);
      
      return {
        id: step.id,
        action: step.action,
        status: 'passed',
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        id: step.id,
        action: step.action,
        status: 'failed',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Perform a single action
   */
  private async performAction(action: Action, variables: Variables): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');

    const timeout = action.timeout || this.options.config.timeout || 30000;

    switch (action.action) {
      case 'navigate': {
        const url = interpolate(action.url, variables);
        await this.page.goto(url, { timeout, waitUntil: 'networkidle' });
        break;
      }

      case 'click': {
        const locator = await toPlaywrightLocator(this.page, action.locator);
        await locator.click({
          timeout,
          modifiers: action.modifiers,
          button: action.button,
          clickCount: action.clickCount,
        });
        break;
      }

      case 'dblclick': {
        const locator = await toPlaywrightLocator(this.page, action.locator);
        await locator.dblclick({ timeout });
        break;
      }

      case 'fill': {
        const locator = await toPlaywrightLocator(this.page, action.locator);
        const value = interpolate(action.value, variables);
        await locator.fill(value, { timeout });
        break;
      }

      case 'clear': {
        const locator = await toPlaywrightLocator(this.page, action.locator);
        await locator.clear({ timeout });
        break;
      }

      case 'select': {
        const locator = await toPlaywrightLocator(this.page, action.locator);
        const value = typeof action.value === 'string' 
          ? interpolate(action.value, variables) 
          : action.value;
        
        if (action.by === 'label') {
          await locator.selectOption({ label: String(value) }, { timeout });
        } else if (action.by === 'index') {
          await locator.selectOption({ index: Number(value) }, { timeout });
        } else {
          await locator.selectOption(String(value), { timeout });
        }
        break;
      }

      case 'check': {
        const locator = await toPlaywrightLocator(this.page, action.locator);
        await locator.check({ timeout });
        break;
      }

      case 'uncheck': {
        const locator = await toPlaywrightLocator(this.page, action.locator);
        await locator.uncheck({ timeout });
        break;
      }

      case 'upload': {
        const locator = await toPlaywrightLocator(this.page, action.locator);
        const files = action.files.map(f => interpolate(f, variables));
        await locator.setInputFiles(files, { timeout });
        break;
      }

      case 'hover': {
        const locator = await toPlaywrightLocator(this.page, action.locator);
        await locator.hover({ timeout });
        break;
      }

      case 'press': {
        if (action.locator) {
          const locator = await toPlaywrightLocator(this.page, action.locator);
          await locator.press(action.key, { timeout });
        } else {
          await this.page.keyboard.press(action.key);
        }
        break;
      }

      case 'type': {
        const locator = await toPlaywrightLocator(this.page, action.locator);
        const text = interpolate(action.text, variables);
        await locator.pressSequentially(text, { delay: action.delay, timeout });
        break;
      }

      case 'waitForSelector': {
        const locator = await toPlaywrightLocator(this.page, action.locator);
        await locator.waitFor({ state: action.state || 'visible', timeout });
        break;
      }

      case 'waitForNavigation': {
        await this.page.waitForURL(action.url || '**/*', {
          timeout,
          waitUntil: action.waitUntil || 'networkidle',
        });
        break;
      }

      case 'waitForNetwork': {
        const urlPattern = new RegExp(action.urlPattern);
        if (action.type === 'request') {
          await this.page.waitForRequest(urlPattern, { timeout });
        } else {
          await this.page.waitForResponse(urlPattern, { timeout });
        }
        break;
      }

      case 'waitForTimeout': {
        await this.page.waitForTimeout(action.duration);
        break;
      }

      case 'screenshot': {
        const path = `${this.options.config.reportsDir}/screenshots/${action.name}.png`;
        if (action.locator) {
          const locator = await toPlaywrightLocator(this.page, action.locator);
          await locator.screenshot({ path });
        } else {
          await this.page.screenshot({ path, fullPage: action.fullPage });
        }
        break;
      }

      case 'evaluate': {
        await this.page.evaluate(action.script, action.args);
        break;
      }

      case 'scroll': {
        if (action.locator) {
          const locator = await toPlaywrightLocator(this.page, action.locator);
          await locator.scrollIntoViewIfNeeded({ timeout });
        } else if (action.x !== undefined || action.y !== undefined) {
          await this.page.evaluate(({ x, y }) => {
            window.scrollTo(x ?? window.scrollX, y ?? window.scrollY);
          }, { x: action.x, y: action.y });
        }
        break;
      }

      case 'focus': {
        const locator = await toPlaywrightLocator(this.page, action.locator);
        await locator.focus({ timeout });
        break;
      }

      case 'blur': {
        const locator = await toPlaywrightLocator(this.page, action.locator);
        await locator.blur({ timeout });
        break;
      }

      default:
        throw new Error(`Unknown action: ${(action as any).action}`);
    }
  }

  /**
   * Execute an assertion
   */
  private async executeAssertion(assertion: Assertion, variables: Variables): Promise<AssertionResult> {
    const startTime = Date.now();
    const timeout = assertion.timeout || this.options.config.timeout || 30000;

    try {
      await this.checkAssertion(assertion, variables, timeout);

      return {
        id: assertion.id,
        type: assertion.type,
        status: 'passed',
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        id: assertion.id,
        type: assertion.type,
        status: 'failed',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Check a single assertion
   */
  private async checkAssertion(assertion: Assertion, variables: Variables, timeout: number): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');

    switch (assertion.type) {
      case 'visible': {
        const locator = await toPlaywrightLocator(this.page, assertion.locator);
        await locator.waitFor({ state: 'visible', timeout });
        break;
      }

      case 'hidden': {
        const locator = await toPlaywrightLocator(this.page, assertion.locator);
        await locator.waitFor({ state: 'hidden', timeout });
        break;
      }

      case 'textContains': {
        const locator = await toPlaywrightLocator(this.page, assertion.locator);
        const expected = interpolate(assertion.expected, variables);
        const text = await locator.textContent({ timeout });
        
        const matches = assertion.ignoreCase
          ? text?.toLowerCase().includes(expected.toLowerCase())
          : text?.includes(expected);
          
        if (!matches) {
          throw new Error(`Expected text to contain "${expected}", got "${text}"`);
        }
        break;
      }

      case 'textEquals': {
        const locator = await toPlaywrightLocator(this.page, assertion.locator);
        const expected = interpolate(assertion.expected, variables);
        const text = (await locator.textContent({ timeout }))?.trim();
        
        const matches = assertion.ignoreCase
          ? text?.toLowerCase() === expected.toLowerCase()
          : text === expected;
          
        if (!matches) {
          throw new Error(`Expected text to equal "${expected}", got "${text}"`);
        }
        break;
      }

      case 'hasValue': {
        const locator = await toPlaywrightLocator(this.page, assertion.locator);
        const expected = interpolate(assertion.expected, variables);
        const value = await locator.inputValue({ timeout });
        
        if (value !== expected) {
          throw new Error(`Expected value "${expected}", got "${value}"`);
        }
        break;
      }

      case 'hasAttribute': {
        const locator = await toPlaywrightLocator(this.page, assertion.locator);
        const attrValue = await locator.getAttribute(assertion.attribute, { timeout });
        
        if (assertion.value !== undefined && attrValue !== assertion.value) {
          throw new Error(`Expected attribute "${assertion.attribute}" to be "${assertion.value}", got "${attrValue}"`);
        } else if (assertion.value === undefined && attrValue === null) {
          throw new Error(`Expected element to have attribute "${assertion.attribute}"`);
        }
        break;
      }

      case 'hasClass': {
        const locator = await toPlaywrightLocator(this.page, assertion.locator);
        const className = await locator.getAttribute('class', { timeout });
        
        if (!className?.split(' ').includes(assertion.className)) {
          throw new Error(`Expected element to have class "${assertion.className}", got "${className}"`);
        }
        break;
      }

      case 'urlMatches': {
        const pattern = new RegExp(assertion.pattern);
        const currentUrl = this.page.url();
        
        if (!pattern.test(currentUrl)) {
          throw new Error(`Expected URL to match "${assertion.pattern}", got "${currentUrl}"`);
        }
        break;
      }

      case 'urlContains': {
        const currentUrl = this.page.url();
        
        if (!currentUrl.includes(assertion.value)) {
          throw new Error(`Expected URL to contain "${assertion.value}", got "${currentUrl}"`);
        }
        break;
      }

      case 'elementCount': {
        const locator = await toPlaywrightLocator(this.page, assertion.locator);
        const count = await locator.count();
        const expected = assertion.count;
        const op = assertion.operator || 'eq';
        
        let pass = false;
        switch (op) {
          case 'eq': pass = count === expected; break;
          case 'gt': pass = count > expected; break;
          case 'gte': pass = count >= expected; break;
          case 'lt': pass = count < expected; break;
          case 'lte': pass = count <= expected; break;
        }
        
        if (!pass) {
          throw new Error(`Expected element count ${op} ${expected}, got ${count}`);
        }
        break;
      }

      case 'consoleContains': {
        const found = this.consoleLogs.some(log => {
          if (assertion.level && log.level !== assertion.level) return false;
          return log.message.includes(assertion.message);
        });
        
        if (!found) {
          throw new Error(`Expected console to contain "${assertion.message}"`);
        }
        break;
      }

      case 'titleContains': {
        const title = await this.page.title();
        const expected = interpolate(assertion.expected, variables);
        
        if (!title.includes(expected)) {
          throw new Error(`Expected title to contain "${expected}", got "${title}"`);
        }
        break;
      }

      case 'titleEquals': {
        const title = await this.page.title();
        const expected = interpolate(assertion.expected, variables);
        
        if (title !== expected) {
          throw new Error(`Expected title "${expected}", got "${title}"`);
        }
        break;
      }

      case 'enabled': {
        const locator = await toPlaywrightLocator(this.page, assertion.locator);
        const disabled = await locator.isDisabled({ timeout });
        
        if (disabled) {
          throw new Error('Expected element to be enabled');
        }
        break;
      }

      case 'disabled': {
        const locator = await toPlaywrightLocator(this.page, assertion.locator);
        const disabled = await locator.isDisabled({ timeout });
        
        if (!disabled) {
          throw new Error('Expected element to be disabled');
        }
        break;
      }

      case 'checked': {
        const locator = await toPlaywrightLocator(this.page, assertion.locator);
        const checked = await locator.isChecked({ timeout });
        
        if (!checked) {
          throw new Error('Expected checkbox to be checked');
        }
        break;
      }

      case 'unchecked': {
        const locator = await toPlaywrightLocator(this.page, assertion.locator);
        const checked = await locator.isChecked({ timeout });
        
        if (checked) {
          throw new Error('Expected checkbox to be unchecked');
        }
        break;
      }

      default:
        throw new Error(`Unknown assertion type: ${(assertion as any).type}`);
    }
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
    }
  }
}

/**
 * Run a single flow
 */
export async function runFlow(flow: Flow, flowFile: string, options: RunnerOptions): Promise<FlowResult> {
  const runner = new Runner(options);
  return runner.run(flow, flowFile);
}
