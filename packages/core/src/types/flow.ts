import { z } from 'zod';
import { ActionSchema } from './action.js';
import { AssertionSchema } from './assertion.js';

/**
 * On success configuration
 */
export const OnSuccessSchema = z.object({
  /** Save authentication state after flow completes */
  saveAuth: z.boolean().optional(),
  /** Path to save auth state */
  authFile: z.string().optional(),
});

export type OnSuccess = z.infer<typeof OnSuccessSchema>;

/**
 * Flow configuration schema
 */
export const FlowSchema = z.object({
  /** JSON Schema reference */
  $schema: z.string().optional(),
  
  /** Flow name */
  name: z.string(),
  
  /** Flow description */
  description: z.string().optional(),
  
  /** Base URL for the flow */
  baseUrl: z.string().url(),
  
  /** Whether this flow requires authentication */
  requiresAuth: z.boolean().optional(),
  
  /** Path to auth state file to load */
  authFile: z.string().optional(),
  
  /** Variables for this flow - supports {{variable}} interpolation */
  variables: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  
  /** Tags for filtering flows */
  tags: z.array(z.string()).optional(),
  
  /** Default timeout for actions */
  timeout: z.number().optional(),
  
  /** Steps to execute */
  steps: z.array(ActionSchema).min(1),
  
  /** Assertions to run after steps complete */
  assertions: z.array(AssertionSchema).optional(),
  
  /** Configuration for successful completion */
  onSuccess: OnSuccessSchema.optional(),
  
  /** Skip this flow */
  skip: z.boolean().optional(),
  
  /** Only run this flow (for debugging) */
  only: z.boolean().optional(),
});

export type Flow = z.infer<typeof FlowSchema>;

/**
 * Validate a flow object
 */
export function validateFlow(data: unknown): Flow {
  return FlowSchema.parse(data);
}

/**
 * Safely validate a flow, returning errors
 */
export function safeValidateFlow(data: unknown): { success: true; data: Flow } | { success: false; error: z.ZodError } {
  const result = FlowSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Create a new empty flow
 */
export function createFlow(name: string, baseUrl: string): Flow {
  return {
    name,
    baseUrl,
    steps: [],
    assertions: [],
  };
}
