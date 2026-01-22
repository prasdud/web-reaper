import type { Page, Locator as PlaywrightLocator } from 'playwright';
import type { Locator, LocatorStrategy } from '../types/locator.js';

/**
 * Convert a web-reaper locator to a Playwright locator
 */
export async function toPlaywrightLocator(page: Page, locator: Locator): Promise<PlaywrightLocator> {
  // Try each strategy in order until one works
  for (const strategy of locator.strategies) {
    try {
      const pwLocator = strategyToPlaywright(page, strategy);
      
      // Check if the locator finds at least one element
      const count = await pwLocator.count();
      if (count > 0) {
        return pwLocator;
      }
    } catch {
      // Strategy failed, try next one
      continue;
    }
  }
  
  // If all strategies fail, use the first one (will fail with proper error)
  return strategyToPlaywright(page, locator.strategies[0]);
}

/**
 * Convert a single strategy to Playwright locator
 */
function strategyToPlaywright(page: Page, strategy: LocatorStrategy): PlaywrightLocator {
  switch (strategy.type) {
    case 'testId':
      return page.getByTestId(strategy.value);
    
    case 'role':
      return page.getByRole(strategy.value as any, strategy.name ? { name: strategy.name } : undefined);
    
    case 'text':
      return page.getByText(strategy.value);
    
    case 'label':
      return page.getByLabel(strategy.value);
    
    case 'placeholder':
      return page.getByPlaceholder(strategy.value);
    
    case 'css':
      return page.locator(strategy.value);
    
    case 'xpath':
      return page.locator(`xpath=${strategy.value}`);
    
    case 'component':
      // For React components, we use a custom attribute if available,
      // otherwise fall back to a more complex selector
      // This assumes react-grab has added data attributes
      return page.locator(`[data-react-component="${strategy.value}"]`).or(
        page.locator(`[data-component="${strategy.value}"]`)
      );
    
    default:
      throw new Error(`Unknown locator strategy: ${(strategy as any).type}`);
  }
}

/**
 * Describe a locator in human-readable format
 */
export function describeLocator(locator: Locator): string {
  const strategy = locator.strategies[0];
  
  switch (strategy.type) {
    case 'testId':
      return `[data-testid="${strategy.value}"]`;
    case 'role':
      return strategy.name 
        ? `role="${strategy.value}" name="${strategy.name}"`
        : `role="${strategy.value}"`;
    case 'text':
      return `text="${strategy.value}"`;
    case 'label':
      return `label="${strategy.value}"`;
    case 'placeholder':
      return `placeholder="${strategy.value}"`;
    case 'css':
      return strategy.value;
    case 'xpath':
      return `xpath: ${strategy.value}`;
    case 'component':
      return `<${strategy.value}>${strategy.file ? ` (${strategy.file})` : ''}`;
    default:
      return JSON.stringify(strategy);
  }
}

/**
 * Try to extract the best locator strategy from an element
 * This is used during recording to determine how to locate an element
 */
export function inferLocatorStrategies(elementInfo: {
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
}): LocatorStrategy[] {
  const strategies: LocatorStrategy[] = [];

  // Priority 1: data-testid
  if (elementInfo.testId) {
    strategies.push({ type: 'testId', value: elementInfo.testId });
  }

  // Priority 2: ARIA role with name
  if (elementInfo.role && elementInfo.ariaLabel) {
    strategies.push({ type: 'role', value: elementInfo.role, name: elementInfo.ariaLabel });
  }

  // Priority 3: Label (for form elements)
  if (elementInfo.ariaLabel) {
    strategies.push({ type: 'label', value: elementInfo.ariaLabel });
  }

  // Priority 4: Placeholder (for inputs)
  if (elementInfo.placeholder) {
    strategies.push({ type: 'placeholder', value: elementInfo.placeholder });
  }

  // Priority 5: React component
  if (elementInfo.componentName) {
    strategies.push({
      type: 'component',
      value: elementInfo.componentName,
      file: elementInfo.componentFile,
      line: elementInfo.componentLine,
    });
  }

  // Priority 6: Text content (for buttons, links)
  if (elementInfo.text && elementInfo.text.length < 50) {
    strategies.push({ type: 'text', value: elementInfo.text });
  }

  // Priority 7: CSS ID selector
  if (elementInfo.id) {
    strategies.push({ type: 'css', value: `#${elementInfo.id}` });
  }

  // Priority 8: Tag + class combination
  if (elementInfo.tagName && elementInfo.className) {
    const mainClass = elementInfo.className.split(' ')[0];
    if (mainClass && !mainClass.includes('_') && mainClass.length < 30) {
      strategies.push({ type: 'css', value: `${elementInfo.tagName.toLowerCase()}.${mainClass}` });
    }
  }

  // Fallback: Just tag name (not recommended)
  if (strategies.length === 0 && elementInfo.tagName) {
    strategies.push({ type: 'css', value: elementInfo.tagName.toLowerCase() });
  }

  return strategies;
}
