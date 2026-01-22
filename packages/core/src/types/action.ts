import { z } from 'zod';
import { LocatorSchema } from './locator.js';

/**
 * Action types supported by web-reaper
 */
export const ActionTypeSchema = z.enum([
  'navigate',
  'click',
  'dblclick',
  'fill',
  'clear',
  'select',
  'check',
  'uncheck',
  'upload',
  'hover',
  'press',
  'type',
  'waitForSelector',
  'waitForNavigation',
  'waitForNetwork',
  'waitForTimeout',
  'screenshot',
  'evaluate',
  'scroll',
  'focus',
  'blur',
]);

export type ActionType = z.infer<typeof ActionTypeSchema>;

/**
 * Base action schema
 */
const BaseActionSchema = z.object({
  /** Unique identifier for this step */
  id: z.string(),
  /** Human-readable description */
  description: z.string().optional(),
  /** Timeout override for this action */
  timeout: z.number().optional(),
  /** Continue even if this action fails */
  optional: z.boolean().optional(),
});

/**
 * Navigate action
 */
export const NavigateActionSchema = BaseActionSchema.extend({
  action: z.literal('navigate'),
  url: z.string(),
});

/**
 * Click action
 */
export const ClickActionSchema = BaseActionSchema.extend({
  action: z.literal('click'),
  locator: LocatorSchema,
  /** Click modifiers */
  modifiers: z.array(z.enum(['Alt', 'Control', 'Meta', 'Shift'])).optional(),
  /** Which mouse button */
  button: z.enum(['left', 'right', 'middle']).optional(),
  /** Number of clicks */
  clickCount: z.number().optional(),
});

/**
 * Double-click action
 */
export const DblClickActionSchema = BaseActionSchema.extend({
  action: z.literal('dblclick'),
  locator: LocatorSchema,
});

/**
 * Fill action (clears field first)
 */
export const FillActionSchema = BaseActionSchema.extend({
  action: z.literal('fill'),
  locator: LocatorSchema,
  /** Value to fill - supports {{variables}} */
  value: z.string(),
});

/**
 * Clear action
 */
export const ClearActionSchema = BaseActionSchema.extend({
  action: z.literal('clear'),
  locator: LocatorSchema,
});

/**
 * Select dropdown option
 */
export const SelectActionSchema = BaseActionSchema.extend({
  action: z.literal('select'),
  locator: LocatorSchema,
  /** Option value, label, or index */
  value: z.union([z.string(), z.number()]),
  /** How to match the option */
  by: z.enum(['value', 'label', 'index']).optional(),
});

/**
 * Check checkbox
 */
export const CheckActionSchema = BaseActionSchema.extend({
  action: z.literal('check'),
  locator: LocatorSchema,
});

/**
 * Uncheck checkbox
 */
export const UncheckActionSchema = BaseActionSchema.extend({
  action: z.literal('uncheck'),
  locator: LocatorSchema,
});

/**
 * Upload file(s)
 */
export const UploadActionSchema = BaseActionSchema.extend({
  action: z.literal('upload'),
  locator: LocatorSchema,
  /** File paths to upload - supports {{variables}} */
  files: z.array(z.string()),
});

/**
 * Hover over element
 */
export const HoverActionSchema = BaseActionSchema.extend({
  action: z.literal('hover'),
  locator: LocatorSchema,
});

/**
 * Press keyboard key
 */
export const PressActionSchema = BaseActionSchema.extend({
  action: z.literal('press'),
  /** Key to press (e.g., 'Enter', 'Tab', 'ArrowDown') */
  key: z.string(),
  /** Element to focus before pressing (optional) */
  locator: LocatorSchema.optional(),
});

/**
 * Type text (does not clear)
 */
export const TypeActionSchema = BaseActionSchema.extend({
  action: z.literal('type'),
  locator: LocatorSchema,
  /** Text to type - supports {{variables}} */
  text: z.string(),
  /** Delay between keystrokes in ms */
  delay: z.number().optional(),
});

/**
 * Wait for element
 */
export const WaitForSelectorActionSchema = BaseActionSchema.extend({
  action: z.literal('waitForSelector'),
  locator: LocatorSchema,
  /** Wait for visible, hidden, attached, or detached */
  state: z.enum(['visible', 'hidden', 'attached', 'detached']).optional(),
});

/**
 * Wait for navigation
 */
export const WaitForNavigationActionSchema = BaseActionSchema.extend({
  action: z.literal('waitForNavigation'),
  /** URL pattern to wait for */
  url: z.string().optional(),
  /** Wait until state */
  waitUntil: z.enum(['load', 'domcontentloaded', 'networkidle']).optional(),
});

/**
 * Wait for network request
 */
export const WaitForNetworkActionSchema = BaseActionSchema.extend({
  action: z.literal('waitForNetwork'),
  /** URL pattern to match */
  urlPattern: z.string(),
  /** Wait for request or response */
  type: z.enum(['request', 'response']).optional(),
});

/**
 * Wait for fixed timeout
 */
export const WaitForTimeoutActionSchema = BaseActionSchema.extend({
  action: z.literal('waitForTimeout'),
  /** Time to wait in ms */
  duration: z.number(),
});

/**
 * Take screenshot
 */
export const ScreenshotActionSchema = BaseActionSchema.extend({
  action: z.literal('screenshot'),
  /** Screenshot name */
  name: z.string(),
  /** Full page or viewport only */
  fullPage: z.boolean().optional(),
  /** Specific element to screenshot */
  locator: LocatorSchema.optional(),
});

/**
 * Evaluate JavaScript
 */
export const EvaluateActionSchema = BaseActionSchema.extend({
  action: z.literal('evaluate'),
  /** JavaScript code to execute */
  script: z.string(),
  /** Arguments to pass to the script */
  args: z.array(z.unknown()).optional(),
});

/**
 * Scroll to element or position
 */
export const ScrollActionSchema = BaseActionSchema.extend({
  action: z.literal('scroll'),
  /** Element to scroll into view */
  locator: LocatorSchema.optional(),
  /** Scroll position */
  x: z.number().optional(),
  y: z.number().optional(),
});

/**
 * Focus element
 */
export const FocusActionSchema = BaseActionSchema.extend({
  action: z.literal('focus'),
  locator: LocatorSchema,
});

/**
 * Blur element
 */
export const BlurActionSchema = BaseActionSchema.extend({
  action: z.literal('blur'),
  locator: LocatorSchema,
});

/**
 * Union of all action types
 */
export const ActionSchema = z.discriminatedUnion('action', [
  NavigateActionSchema,
  ClickActionSchema,
  DblClickActionSchema,
  FillActionSchema,
  ClearActionSchema,
  SelectActionSchema,
  CheckActionSchema,
  UncheckActionSchema,
  UploadActionSchema,
  HoverActionSchema,
  PressActionSchema,
  TypeActionSchema,
  WaitForSelectorActionSchema,
  WaitForNavigationActionSchema,
  WaitForNetworkActionSchema,
  WaitForTimeoutActionSchema,
  ScreenshotActionSchema,
  EvaluateActionSchema,
  ScrollActionSchema,
  FocusActionSchema,
  BlurActionSchema,
]);

export type Action = z.infer<typeof ActionSchema>;

/**
 * Helper to create an action with auto-generated ID
 */
let actionCounter = 0;
export function createAction<T extends ActionType>(
  type: T,
  params: Omit<Extract<Action, { action: T }>, 'action' | 'id'>
): Extract<Action, { action: T }> {
  return {
    action: type,
    id: `step-${++actionCounter}`,
    ...params,
  } as Extract<Action, { action: T }>;
}

export function resetActionCounter(): void {
  actionCounter = 0;
}
