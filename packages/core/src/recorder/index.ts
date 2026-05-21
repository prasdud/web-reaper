import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import type { Flow, Action, Locator, Config } from '../types/index.js';
import type { LocatorStrategy } from '../types/locator.js';
import { createAction, resetActionCounter } from '../types/action.js';
import { createAssertion, resetAssertionCounter } from '../types/assertion.js';
import { inferLocatorStrategies } from '../utils/locator.js';
import { REACT_GRAB_BRIDGE } from '../injection/react-grab.js';

/**
 * Recorded action from the browser
 */
export interface RecordedAction {
  type: string;
  selector?: string;
  value?: string;
  files?: string[];
  key?: string;
  url?: string;
  elementInfo?: {
    testId?: string;
    role?: string;
    ariaLabel?: string;
    text?: string;
    placeholder?: string;
    tagName?: string;
    className?: string;
    id?: string;
    componentName?: string;
    componentFile?: string;
    componentLine?: number;
  };
  timestamp: number;
}

/**
 * Recorder state
 */
export interface RecorderState {
  isRecording: boolean;
  actions: RecordedAction[];
  startUrl: string;
  currentUrl: string;
}

/**
 * Recorder options
 */
export interface RecorderOptions {
  /** Base URL to start recording */
  baseUrl: string;
  
  /** Flow name */
  flowName: string;
  
  /** Inject react-grab for React component info */
  injectReactGrab?: boolean;
  
  /** Viewport size */
  viewport?: { width: number; height: number };
  
  /** Load auth state from file */
  loadAuth?: string;
  
  /** Save auth state to file on completion */
  saveAuth?: string;
  
  /** Callback when recording starts */
  onStart?: () => void;
  
  /** Callback for each recorded action */
  onAction?: (action: RecordedAction) => void;
  
  /** Callback when recording stops */
  onStop?: (actions: RecordedAction[]) => void;
}

/**
 * React-grab injection script
 * This is injected into the page to capture React component information
 */
/**
 * Event capture injection script
 * Sets up listeners to forward user actions to the recorder
 */
const EVENT_CAPTURE_INJECTION = `
(function() {
  document.addEventListener('click', function(e) {
    var el = e.target;
    if (!el || !el.tagName) return;
    if (window.__webReaperRecordAction) {
      window.__webReaperRecordAction({
        type: 'click',
        selector: generateSelector(el),
        elementInfo: window.__webReaperCaptureElementInfo(el),
        timestamp: Date.now()
      });
    }
  }, { capture: true });

  document.addEventListener('input', function(e) {
    var el = e.target;
    if (!el || !el.tagName) return;
    if (window.__webReaperRecordAction) {
      window.__webReaperRecordAction({
        type: 'fill',
        selector: generateSelector(el),
        value: el.value,
        elementInfo: window.__webReaperCaptureElementInfo(el),
        timestamp: Date.now()
      });
    }
  }, { capture: true });

  document.addEventListener('change', function(e) {
    var el = e.target;
    if (!el || !el.tagName) return;
    var info = window.__webReaperCaptureElementInfo(el);
    if (el.tagName === 'SELECT') {
      window.__webReaperRecordAction && window.__webReaperRecordAction({
        type: 'select',
        selector: generateSelector(el),
        value: el.value,
        elementInfo: info,
        timestamp: Date.now()
      });
    } else if (el.type === 'checkbox') {
      window.__webReaperRecordAction && window.__webReaperRecordAction({
        type: el.checked ? 'check' : 'uncheck',
        selector: generateSelector(el),
        elementInfo: info,
        timestamp: Date.now()
      });
    } else if (el.type === 'file' && el.files && el.files.length) {
      var fileNames = [];
      for (var i = 0; i < el.files.length; i++) fileNames.push(el.files[i].name);
      window.__webReaperRecordAction && window.__webReaperRecordAction({
        type: 'upload',
        selector: generateSelector(el),
        files: fileNames,
        elementInfo: info,
        timestamp: Date.now()
      });
    }
  }, { capture: true });

  document.addEventListener('keydown', function(e) {
    var specialKeys = ['Enter', 'Tab', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    if (specialKeys.indexOf(e.key) === -1) return;
    var el = e.target;
    if (window.__webReaperRecordAction) {
      window.__webReaperRecordAction({
        type: 'press',
        key: e.key,
        selector: el ? generateSelector(el) : undefined,
        elementInfo: el ? window.__webReaperCaptureElementInfo(el) : undefined,
        timestamp: Date.now()
      });
    }
  }, { capture: true });

  function generateSelector(element) {
    var testId = element.getAttribute('data-testid') || element.getAttribute('data-test-id');
    if (testId) return '[data-testid="' + testId + '"]';
    if (element.id) return '#' + element.id;
    var path = [];
    var current = element;
    while (current && current !== document.body) {
    var selector = current.tagName.toLowerCase();
    if (current.id) { path.unshift('#' + CSS.escape(current.id)); break; }
    if (current.className && typeof current.className === 'string') {
      var cls = current.className.split(' ')[0];
      if (cls && cls.indexOf('_') === -1) selector += '.' + CSS.escape(cls);
    }
    var parent = current.parentElement;
    if (parent) {
      var index = Array.prototype.indexOf.call(parent.children, current);
      if (parent.children.length > 1) {
        selector += ':nth-child(' + (index + 1) + ')';
      }
    }
      path.unshift(selector);
      current = current.parentElement;
    }
    return path.join(' > ');
  }
})();
`;

/**
 * Recorder panel injection script
 * Creates a floating panel for controlling the recorder
 */
const RECORDER_PANEL_SCRIPT = `
(function() {
  if (window.__webReaperPanel) return;

  function injectPanel() {
    if (window.__webReaperPanel) return;

    const panel = document.createElement('div');
    panel.id = '__web-reaper-panel';
    panel.innerHTML = \`
      <div style="
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #1a1a2e;
        color: white;
        padding: 16px;
        border-radius: 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        z-index: 999999;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        min-width: 280px;
      ">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
          <div style="width: 12px; height: 12px; background: #ff4757; border-radius: 50%; animation: pulse 1.5s infinite;"></div>
          <span style="font-weight: 600;">Web Reaper Recording</span>
        </div>
        <div id="__web-reaper-actions" style="color: #a0a0a0; font-size: 12px; max-height: 150px; overflow-y: auto;">
          <div>Waiting for actions...</div>
        </div>
        <div style="margin-top: 12px; display: flex; gap: 8px;">
          <button id="__web-reaper-assert" style="
            flex: 1;
            padding: 8px 12px;
            background: #4834d4;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
          ">+ Add Assertion</button>
          <button id="__web-reaper-stop" style="
            flex: 1;
            padding: 8px 12px;
            background: #ff4757;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
          ">Stop Recording</button>
        </div>
      </div>
      <style>
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      </style>
    \`;
    document.body.appendChild(panel);
    window.__webReaperPanel = panel;

    // Update actions display
    window.__webReaperUpdatePanel = function(actions) {
      const container = document.getElementById('__web-reaper-actions');
      if (!container) return;

      const lastActions = actions.slice(-5);
      container.innerHTML = lastActions.map(a =>
        '<div style="padding: 4px 0; border-bottom: 1px solid #333;">' +
        a.type + (a.selector ? ' on ' + a.selector.substring(0, 30) : '') +
        '</div>'
      ).join('') || '<div>Waiting for actions...</div>';
    };

    // Stop button
    document.getElementById('__web-reaper-stop').addEventListener('click', function() {
      window.__webReaperStopRequested = true;
    });

    // Assert button
    document.getElementById('__web-reaper-assert').addEventListener('click', function() {
      window.__webReaperAssertMode = true;
      alert('Click on an element to add an assertion for it.');
    });

    console.log('[web-reaper] Panel loaded');
  }

  if (document.body) {
    injectPanel();
  } else {
    document.addEventListener('DOMContentLoaded', injectPanel);
  }
})();
`;

/**
 * Recorder class
 * Handles recording user interactions and generating flow files
 */
export class Recorder {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private state: RecorderState;
  private options: RecorderOptions;
  private actionQueue: RecordedAction[] = [];

  constructor(options: RecorderOptions) {
    this.options = options;
    this.state = {
      isRecording: false,
      actions: [],
      startUrl: options.baseUrl,
      currentUrl: options.baseUrl,
    };
  }

  /**
   * Start recording
   */
  async start(): Promise<void> {
    // Launch browser
    this.browser = await chromium.launch({
      headless: false,
      args: ['--disable-blink-features=AutomationControlled'],
    });

    // Create context with optional auth state
    const contextOptions: any = {
      viewport: this.options.viewport || { width: 1280, height: 720 },
    };

    if (this.options.loadAuth) {
      contextOptions.storageState = this.options.loadAuth;
    }

    this.context = await this.browser.newContext(contextOptions);
    this.page = await this.context.newPage();

    // Inject scripts (addInitScript survives navigation)
    await this.page.addInitScript(REACT_GRAB_BRIDGE);
    await this.page.addInitScript(EVENT_CAPTURE_INJECTION);
    await this.page.addInitScript(RECORDER_PANEL_SCRIPT);

    // Set up event listeners
    this.setupListeners();

    // Navigate to start URL
    await this.page.goto(this.options.baseUrl, { waitUntil: 'networkidle' });

    // Add initial navigate action
    this.recordAction({
      type: 'navigate',
      url: this.options.baseUrl,
      timestamp: Date.now(),
    });

    this.state.isRecording = true;
    this.options.onStart?.();

    console.log('\n🔴 Recording started. Perform actions in the browser.');
    console.log('   Click "Stop Recording" in the panel when done.\n');
  }

  /**
   * Set up page event listeners
   */
  private setupListeners(): void {
    if (!this.page) return;

    // Track clicks
    this.page.on('console', async (msg) => {
      const text = msg.text();
      if (text.includes('[web-reaper]')) {
        console.log(text);
      }
    });

    // Listen for navigation
    this.page.on('framenavigated', (frame) => {
      if (frame === this.page?.mainFrame()) {
        const url = frame.url();
        if (url !== this.state.currentUrl) {
          this.state.currentUrl = url;
          // Navigation is captured via action handlers
        }
      }
    });

    // Expose function for element info retrieval
    this.page.exposeFunction('__webReaperRecordAction', (action: RecordedAction) => {
      this.recordAction(action);
    });
  }

  /**
   * Record an action
   */
  private recordAction(action: RecordedAction): void {
    this.actionQueue.push(action);
    this.state.actions.push(action);
    this.options.onAction?.(action);
  }

  /**
   * Wait for user to stop recording
   */
  async waitForStop(): Promise<RecordedAction[]> {
    if (!this.page) throw new Error('Recorder not started');

    while (true) {
      try {
        const stopRequested = await this.page.evaluate(() => {
          return (window as any).__webReaperStopRequested === true;
        });

        if (stopRequested) {
          break;
        }

        await this.page.evaluate((actions) => {
          (window as any).__webReaperUpdatePanel?.(actions);
        }, this.state.actions);
      } catch {
        // Page navigated — execution context was destroyed.
        // addInitScript will re-inject panel and state on next page load.
      }

      await this.page.waitForTimeout(500);
    }

    return this.state.actions;
  }

  /**
   * Stop recording and save auth if needed
   */
  async stop(): Promise<{ actions: RecordedAction[]; authSaved?: string }> {
    this.state.isRecording = false;
    this.options.onStop?.(this.state.actions);

    let authSaved: string | undefined;

    // Save auth state if requested
    if (this.options.saveAuth && this.context) {
      await this.context.storageState({ path: this.options.saveAuth });
      authSaved = this.options.saveAuth;
    }

    // Close browser
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
    }

    return {
      actions: this.state.actions,
      authSaved,
    };
  }

  /**
   * Convert recorded actions to a Flow object
   */
  toFlow(): Flow {
    resetActionCounter();
    resetAssertionCounter();

    const steps: Action[] = this.state.actions.map((recorded) => {
      return this.recordedActionToStep(recorded);
    }).filter((step): step is Action => step !== null);

    return {
      name: this.options.flowName,
      description: `Recorded flow for ${this.options.flowName}`,
      baseUrl: this.options.baseUrl,
      steps,
      assertions: [],
      onSuccess: this.options.saveAuth ? {
        saveAuth: true,
        authFile: this.options.saveAuth,
      } : undefined,
    };
  }

  /**
   * Convert a recorded action to a flow step
   */
  private recordedActionToStep(recorded: RecordedAction): Action | null {
    const strategies: LocatorStrategy[] = [];
    if (recorded.selector) {
      strategies.push({ type: 'css', value: recorded.selector });
    }
    if (recorded.elementInfo) {
      strategies.push(...inferLocatorStrategies(recorded.elementInfo));
    }
    const locator: Locator | undefined = strategies.length > 0
      ? { strategies }
      : undefined;

    switch (recorded.type) {
      case 'navigate':
        return createAction('navigate', { url: recorded.url! });

      case 'click':
        if (!locator) return null;
        return createAction('click', { locator });

      case 'fill':
      case 'input':
        if (!locator || !recorded.value) return null;
        return createAction('fill', { locator, value: recorded.value });

      case 'select':
        if (!locator || !recorded.value) return null;
        return createAction('select', { locator, value: recorded.value });

      case 'upload':
        if (!locator || !recorded.files) return null;
        return createAction('upload', { locator, files: recorded.files });

      case 'press':
        if (!recorded.key) return null;
        return createAction('press', { key: recorded.key, locator });

      case 'check':
        if (!locator) return null;
        return createAction('check', { locator });

      case 'uncheck':
        if (!locator) return null;
        return createAction('uncheck', { locator });

      default:
        console.warn(`Unknown action type: ${recorded.type}`);
        return null;
    }
  }
}

/**
 * Create and start a new recorder
 */
export async function record(options: RecorderOptions): Promise<Flow> {
  const recorder = new Recorder(options);
  
  await recorder.start();
  await recorder.waitForStop();
  const { authSaved } = await recorder.stop();
  
  const flow = recorder.toFlow();
  
  if (authSaved) {
    console.log(`\n✅ Auth state saved to: ${authSaved}`);
  }
  
  return flow;
}
