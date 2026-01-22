import { z } from 'zod';
import { LocatorSchema } from './locator.js';

/**
 * Assertion types supported by web-reaper
 */
export const AssertionTypeSchema = z.enum([
  'visible',
  'hidden',
  'textContains',
  'textEquals',
  'hasValue',
  'hasAttribute',
  'hasClass',
  'urlMatches',
  'urlContains',
  'elementCount',
  'consoleContains',
  'titleContains',
  'titleEquals',
  'enabled',
  'disabled',
  'checked',
  'unchecked',
]);

export type AssertionType = z.infer<typeof AssertionTypeSchema>;

/**
 * Base assertion schema
 */
const BaseAssertionSchema = z.object({
  /** Unique identifier */
  id: z.string(),
  /** Human-readable description */
  description: z.string().optional(),
  /** Timeout for this assertion */
  timeout: z.number().optional(),
  /** Soft assertion - continue on failure */
  soft: z.boolean().optional(),
});

/**
 * Element visible assertion
 */
export const VisibleAssertionSchema = BaseAssertionSchema.extend({
  type: z.literal('visible'),
  locator: LocatorSchema,
});

/**
 * Element hidden assertion
 */
export const HiddenAssertionSchema = BaseAssertionSchema.extend({
  type: z.literal('hidden'),
  locator: LocatorSchema,
});

/**
 * Element text contains assertion
 */
export const TextContainsAssertionSchema = BaseAssertionSchema.extend({
  type: z.literal('textContains'),
  locator: LocatorSchema,
  expected: z.string(),
  /** Case-insensitive matching */
  ignoreCase: z.boolean().optional(),
});

/**
 * Element text equals assertion
 */
export const TextEqualsAssertionSchema = BaseAssertionSchema.extend({
  type: z.literal('textEquals'),
  locator: LocatorSchema,
  expected: z.string(),
  /** Case-insensitive matching */
  ignoreCase: z.boolean().optional(),
});

/**
 * Input has value assertion
 */
export const HasValueAssertionSchema = BaseAssertionSchema.extend({
  type: z.literal('hasValue'),
  locator: LocatorSchema,
  expected: z.string(),
});

/**
 * Element has attribute assertion
 */
export const HasAttributeAssertionSchema = BaseAssertionSchema.extend({
  type: z.literal('hasAttribute'),
  locator: LocatorSchema,
  attribute: z.string(),
  value: z.string().optional(),
});

/**
 * Element has class assertion
 */
export const HasClassAssertionSchema = BaseAssertionSchema.extend({
  type: z.literal('hasClass'),
  locator: LocatorSchema,
  className: z.string(),
});

/**
 * URL matches pattern assertion
 */
export const UrlMatchesAssertionSchema = BaseAssertionSchema.extend({
  type: z.literal('urlMatches'),
  pattern: z.string(),
});

/**
 * URL contains string assertion
 */
export const UrlContainsAssertionSchema = BaseAssertionSchema.extend({
  type: z.literal('urlContains'),
  value: z.string(),
});

/**
 * Element count assertion
 */
export const ElementCountAssertionSchema = BaseAssertionSchema.extend({
  type: z.literal('elementCount'),
  locator: LocatorSchema,
  count: z.number(),
  /** Comparison operator */
  operator: z.enum(['eq', 'gt', 'gte', 'lt', 'lte']).optional(),
});

/**
 * Console contains message assertion
 */
export const ConsoleContainsAssertionSchema = BaseAssertionSchema.extend({
  type: z.literal('consoleContains'),
  message: z.string(),
  /** Console level to check */
  level: z.enum(['log', 'warn', 'error', 'info', 'debug']).optional(),
});

/**
 * Title contains assertion
 */
export const TitleContainsAssertionSchema = BaseAssertionSchema.extend({
  type: z.literal('titleContains'),
  expected: z.string(),
});

/**
 * Title equals assertion
 */
export const TitleEqualsAssertionSchema = BaseAssertionSchema.extend({
  type: z.literal('titleEquals'),
  expected: z.string(),
});

/**
 * Element enabled assertion
 */
export const EnabledAssertionSchema = BaseAssertionSchema.extend({
  type: z.literal('enabled'),
  locator: LocatorSchema,
});

/**
 * Element disabled assertion
 */
export const DisabledAssertionSchema = BaseAssertionSchema.extend({
  type: z.literal('disabled'),
  locator: LocatorSchema,
});

/**
 * Checkbox checked assertion
 */
export const CheckedAssertionSchema = BaseAssertionSchema.extend({
  type: z.literal('checked'),
  locator: LocatorSchema,
});

/**
 * Checkbox unchecked assertion
 */
export const UncheckedAssertionSchema = BaseAssertionSchema.extend({
  type: z.literal('unchecked'),
  locator: LocatorSchema,
});

/**
 * Union of all assertion types
 */
export const AssertionSchema = z.discriminatedUnion('type', [
  VisibleAssertionSchema,
  HiddenAssertionSchema,
  TextContainsAssertionSchema,
  TextEqualsAssertionSchema,
  HasValueAssertionSchema,
  HasAttributeAssertionSchema,
  HasClassAssertionSchema,
  UrlMatchesAssertionSchema,
  UrlContainsAssertionSchema,
  ElementCountAssertionSchema,
  ConsoleContainsAssertionSchema,
  TitleContainsAssertionSchema,
  TitleEqualsAssertionSchema,
  EnabledAssertionSchema,
  DisabledAssertionSchema,
  CheckedAssertionSchema,
  UncheckedAssertionSchema,
]);

export type Assertion = z.infer<typeof AssertionSchema>;

/**
 * Helper to create an assertion with auto-generated ID
 */
let assertionCounter = 0;
export function createAssertion<T extends AssertionType>(
  type: T,
  params: Omit<Extract<Assertion, { type: T }>, 'type' | 'id'>
): Extract<Assertion, { type: T }> {
  return {
    type,
    id: `assert-${++assertionCounter}`,
    ...params,
  } as Extract<Assertion, { type: T }>;
}

export function resetAssertionCounter(): void {
  assertionCounter = 0;
}
