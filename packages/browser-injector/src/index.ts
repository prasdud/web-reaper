/**
 * Web Reaper Browser Injector
 * 
 * This script is injected into the target React application to:
 * 1. Capture element information (React component names, file paths)
 * 2. Monitor user actions for recording
 * 3. Verify React actions during test replay
 * 4. Hook into console for action verification
 */

declare global {
  interface Window {
    __webReaper: WebReaperAPI;
    __webReaperInjected: boolean;
  }
}

/**
 * Element information extracted from React
 */
export interface ElementInfo {
  testId?: string;
  role?: string;
  ariaLabel?: string;
  text?: string;
  placeholder?: string;
  tagName: string;
  className?: string;
  id?: string;
  componentName?: string;
  componentFile?: string;
  componentLine?: number;
}

/**
 * Recorded action
 */
export interface RecordedAction {
  type: string;
  selector?: string;
  value?: string;
  files?: string[];
  key?: string;
  url?: string;
  elementInfo?: ElementInfo;
  timestamp: number;
}

/**
 * Web Reaper API exposed on window
 */
export interface WebReaperAPI {
  /** Version */
  version: string;
  
  /** Whether injection is active */
  isActive: boolean;
  
  /** Recorded actions during this session */
  recordedActions: Array<{ name: string; payload: any; timestamp: number }>;
  
  /** Get element info at coordinates */
  getElementInfoFromPoint(x: number, y: number): ElementInfo | null;
  
  /** Get element info from selector */
  getElementInfo(selector: string): ElementInfo | null;
  
  /** Signal that an action has been completed (for verification) */
  actionCompleted(name: string, payload?: any): void;
  
  /** Get all completed actions */
  getActions(): Array<{ name: string; payload: any; timestamp: number }>;
  
  /** Clear recorded actions */
  clearActions(): void;
  
  /** Start recording user interactions */
  startRecording(callback: (action: RecordedAction) => void): void;
  
  /** Stop recording */
  stopRecording(): void;
  
  /** Activate overlay for element selection */
  activateOverlay(): void;
  
  /** Deactivate overlay */
  deactivateOverlay(): void;
}

/**
 * Get React fiber from DOM element
 */
function getReactFiber(element: Element): any {
  const keys = Object.keys(element);
  for (const key of keys) {
    if (key.startsWith('__reactFiber$') || key.startsWith('__reactInternalInstance$')) {
      return (element as any)[key];
    }
  }
  return null;
}

/**
 * Get component name from React fiber
 */
function getComponentName(fiber: any): string | null {
  if (!fiber) return null;
  
  let current = fiber;
  while (current) {
    if (current.type) {
      // Skip HTML elements
      if (typeof current.type === 'string') {
        current = current.return;
        continue;
      }
      // Get display name or function name
      const name = current.type.displayName || current.type.name;
      if (name && !name.startsWith('_') && name !== 'Fragment') {
        return name;
      }
    }
    current = current.return;
  }
  return null;
}

/**
 * Get source info from React fiber (development mode only)
 */
function getSourceInfo(fiber: any): { fileName?: string; lineNumber?: number } | null {
  if (!fiber) return null;
  
  let current = fiber;
  while (current) {
    if (current._debugSource) {
      return {
        fileName: current._debugSource.fileName,
        lineNumber: current._debugSource.lineNumber,
      };
    }
    current = current.return;
  }
  return null;
}

/**
 * Extract element information
 */
function extractElementInfo(element: Element): ElementInfo {
  const fiber = getReactFiber(element);
  const componentName = getComponentName(fiber);
  const sourceInfo = getSourceInfo(fiber);
  
  return {
    testId: element.getAttribute('data-testid') || element.getAttribute('data-test-id') || undefined,
    role: element.getAttribute('role') || getImplicitRole(element) || undefined,
    ariaLabel: element.getAttribute('aria-label') || undefined,
    text: element.textContent?.trim().substring(0, 100) || undefined,
    placeholder: element.getAttribute('placeholder') || undefined,
    tagName: element.tagName,
    className: element.className || undefined,
    id: element.id || undefined,
    componentName: componentName || undefined,
    componentFile: sourceInfo?.fileName,
    componentLine: sourceInfo?.lineNumber,
  };
}

/**
 * Get implicit ARIA role for common elements
 */
function getImplicitRole(element: Element): string | undefined {
  const tagName = element.tagName.toLowerCase();
  const type = element.getAttribute('type');
  
  const roleMap: Record<string, string> = {
    'a': 'link',
    'button': 'button',
    'input': type === 'submit' || type === 'button' ? 'button' : 'textbox',
    'select': 'listbox',
    'textarea': 'textbox',
    'img': 'img',
    'nav': 'navigation',
    'main': 'main',
    'header': 'banner',
    'footer': 'contentinfo',
    'aside': 'complementary',
    'form': 'form',
    'table': 'table',
    'ul': 'list',
    'ol': 'list',
    'li': 'listitem',
  };
  
  return roleMap[tagName];
}

/**
 * Generate a unique CSS selector for an element
 */
function generateSelector(element: Element): string {
  // Prefer test IDs
  const testId = element.getAttribute('data-testid') || element.getAttribute('data-test-id');
  if (testId) {
    return `[data-testid="${testId}"]`;
  }
  
  // Try ID
  if (element.id) {
    return `#${element.id}`;
  }
  
  // Build path selector
  const path: string[] = [];
  let current: Element | null = element;
  
  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();
    
    if (current.id) {
      selector = `#${current.id}`;
      path.unshift(selector);
      break;
    }
    
    // Add class if unique
    if (current.className) {
      const mainClass = current.className.split(' ')[0];
      if (mainClass && !mainClass.includes('_')) {
        selector += `.${mainClass}`;
      }
    }
    
    // Add nth-child if needed
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        child => child.tagName === current!.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-child(${index})`;
      }
    }
    
    path.unshift(selector);
    current = current.parentElement;
  }
  
  return path.join(' > ');
}

/**
 * Initialize Web Reaper injection
 */
function initWebReaper(): void {
  if (window.__webReaperInjected) return;
  window.__webReaperInjected = true;
  
  let isRecording = false;
  let recordCallback: ((action: RecordedAction) => void) | null = null;
  let overlayActive = false;
  
  const api: WebReaperAPI = {
    version: '0.1.0',
    isActive: true,
    recordedActions: [],
    
    getElementInfoFromPoint(x: number, y: number): ElementInfo | null {
      const element = document.elementFromPoint(x, y);
      if (!element) return null;
      return extractElementInfo(element);
    },
    
    getElementInfo(selector: string): ElementInfo | null {
      const element = document.querySelector(selector);
      if (!element) return null;
      return extractElementInfo(element);
    },
    
    actionCompleted(name: string, payload?: any): void {
      const action = { name, payload, timestamp: Date.now() };
      this.recordedActions.push(action);
      console.log(`[WEB-REAPER] Action: ${name}`, payload);
    },
    
    getActions() {
      return this.recordedActions;
    },
    
    clearActions() {
      this.recordedActions = [];
    },
    
    startRecording(callback: (action: RecordedAction) => void): void {
      isRecording = true;
      recordCallback = callback;
      setupEventListeners();
      console.log('[WEB-REAPER] Recording started');
    },
    
    stopRecording(): void {
      isRecording = false;
      recordCallback = null;
      console.log('[WEB-REAPER] Recording stopped');
    },
    
    activateOverlay(): void {
      overlayActive = true;
      // TODO: Create visual overlay
    },
    
    deactivateOverlay(): void {
      overlayActive = false;
      // TODO: Remove visual overlay
    },
  };
  
  /**
   * Record an action
   */
  function recordAction(action: RecordedAction): void {
    if (isRecording && recordCallback) {
      recordCallback(action);
    }
  }
  
  /**
   * Set up event listeners for recording
   */
  function setupEventListeners(): void {
    // Click events
    document.addEventListener('click', (e) => {
      if (!isRecording) return;
      
      const target = e.target as Element;
      const elementInfo = extractElementInfo(target);
      
      recordAction({
        type: 'click',
        selector: generateSelector(target),
        elementInfo,
        timestamp: Date.now(),
      });
    }, { capture: true });
    
    // Input events
    document.addEventListener('input', (e) => {
      if (!isRecording) return;
      
      const target = e.target as HTMLInputElement | HTMLTextAreaElement;
      if (!target.tagName) return;
      
      const elementInfo = extractElementInfo(target);
      
      recordAction({
        type: 'fill',
        selector: generateSelector(target),
        value: target.value,
        elementInfo,
        timestamp: Date.now(),
      });
    }, { capture: true });
    
    // Select/change events
    document.addEventListener('change', (e) => {
      if (!isRecording) return;
      
      const target = e.target as HTMLSelectElement | HTMLInputElement;
      if (!target.tagName) return;
      
      const elementInfo = extractElementInfo(target);
      
      if (target.tagName === 'SELECT') {
        recordAction({
          type: 'select',
          selector: generateSelector(target),
          value: (target as HTMLSelectElement).value,
          elementInfo,
          timestamp: Date.now(),
        });
      } else if (target.type === 'checkbox') {
        recordAction({
          type: target.checked ? 'check' : 'uncheck',
          selector: generateSelector(target),
          elementInfo,
          timestamp: Date.now(),
        });
      } else if (target.type === 'file') {
        const files = Array.from(target.files || []).map(f => f.name);
        recordAction({
          type: 'upload',
          selector: generateSelector(target),
          files,
          elementInfo,
          timestamp: Date.now(),
        });
      }
    }, { capture: true });
    
    // Keyboard events
    document.addEventListener('keydown', (e) => {
      if (!isRecording) return;
      
      // Only record special keys
      const specialKeys = ['Enter', 'Tab', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
      if (specialKeys.includes(e.key)) {
        const target = e.target as Element;
        const elementInfo = target ? extractElementInfo(target) : undefined;
        
        recordAction({
          type: 'press',
          key: e.key,
          selector: target ? generateSelector(target) : undefined,
          elementInfo,
          timestamp: Date.now(),
        });
      }
    }, { capture: true });
  }
  
  // Expose API
  window.__webReaper = api;
  
  console.log('[WEB-REAPER] Browser injector loaded');
}

// Auto-initialize
initWebReaper();

export { initWebReaper, extractElementInfo, generateSelector };
