import { z } from 'zod';

/**
 * Locator Strategy - How to find an element
 */
export const LocatorStrategySchema = z.object({
  type: z.enum(['testId', 'role', 'text', 'css', 'xpath', 'component', 'label', 'placeholder']),
  value: z.string(),
  /** Additional options for role-based locators */
  name: z.string().optional(),
  /** React component file path (from react-grab) */
  file: z.string().optional(),
  /** Line number in source file */
  line: z.number().optional(),
});

export type LocatorStrategy = z.infer<typeof LocatorStrategySchema>;

/**
 * Locator - Contains multiple strategies for resilient element selection
 */
export const LocatorSchema = z.object({
  /** Ordered list of strategies - tries first, falls back to next */
  strategies: z.array(LocatorStrategySchema).min(1),
  /** Optional description for debugging */
  description: z.string().optional(),
});

export type Locator = z.infer<typeof LocatorSchema>;

/**
 * Create a simple locator with a single strategy
 */
export function createLocator(type: LocatorStrategy['type'], value: string, options?: Partial<LocatorStrategy>): Locator {
  return {
    strategies: [{ type, value, ...options }],
  };
}

/**
 * Create a locator from react-grab element info
 */
export function createReactGrabLocator(info: {
  testId?: string;
  component?: string;
  file?: string;
  line?: number;
  tagName?: string;
}): Locator {
  const strategies: LocatorStrategy[] = [];

  // Prefer test IDs
  if (info.testId) {
    strategies.push({ type: 'testId', value: info.testId });
  }

  // Then React component name
  if (info.component) {
    strategies.push({
      type: 'component',
      value: info.component,
      file: info.file,
      line: info.line,
    });
  }

  // Fallback to CSS if we have tag name
  if (info.tagName) {
    strategies.push({ type: 'css', value: info.tagName.toLowerCase() });
  }

  if (strategies.length === 0) {
    throw new Error('Cannot create locator: no valid strategies provided');
  }

  return { strategies };
}
