import { z } from 'zod';

/**
 * Step result status
 */
export type StepStatus = 'passed' | 'failed' | 'skipped' | 'pending';

/**
 * Individual step result
 */
export interface StepResult {
  id: string;
  action: string;
  status: StepStatus;
  duration: number;
  error?: string;
  screenshot?: string;
}

/**
 * Individual assertion result
 */
export interface AssertionResult {
  id: string;
  type: string;
  status: StepStatus;
  duration: number;
  error?: string;
  expected?: string;
  actual?: string;
}

/**
 * Flow execution result
 */
export interface FlowResult {
  /** Flow name */
  name: string;
  
  /** Flow file path */
  file: string;
  
  /** Overall status */
  status: StepStatus;
  
  /** Total duration in ms */
  duration: number;
  
  /** Individual step results */
  steps: StepResult[];
  
  /** Assertion results */
  assertions: AssertionResult[];
  
  /** Error message if failed */
  error?: string;
  
  /** Screenshot on failure */
  screenshot?: string;
  
  /** Console logs captured during execution */
  consoleLogs?: Array<{
    level: string;
    message: string;
    timestamp: number;
  }>;
  
  /** Start timestamp */
  startedAt: number;
  
  /** End timestamp */
  endedAt: number;
}

/**
 * Test run summary
 */
export interface TestRunSummary {
  /** Total flows */
  total: number;
  
  /** Passed flows */
  passed: number;
  
  /** Failed flows */
  failed: number;
  
  /** Skipped flows */
  skipped: number;
  
  /** Total duration in ms */
  duration: number;
  
  /** Start timestamp */
  startedAt: number;
  
  /** End timestamp */
  endedAt: number;
}

/**
 * Complete test report
 */
export interface TestReport {
  /** Report metadata */
  meta: {
    version: string;
    generatedAt: number;
    baseUrl: string;
    environment?: string;
  };
  
  /** Summary statistics */
  summary: TestRunSummary;
  
  /** Individual flow results */
  results: FlowResult[];
}

/**
 * Config schema
 */
export const ConfigSchema = z.object({
  /** Base URL for all flows */
  baseUrl: z.string().url().optional(),
  
  /** Directory containing flow files */
  flowsDir: z.string().default('./flows'),
  
  /** Directory for auth state files */
  authDir: z.string().default('./auth'),
  
  /** Directory for reports */
  reportsDir: z.string().default('./reports'),
  
  /** Take screenshots on failure */
  screenshotsOnFailure: z.boolean().default(true),
  
  /** Default timeout for actions */
  timeout: z.number().default(30000),
  
  /** Number of retries for flaky tests */
  retries: z.number().default(0),
  
  /** Number of parallel workers */
  parallel: z.number().default(1),
  
  /** Inject react-grab for React component detection */
  injectReactGrab: z.boolean().default(true),
  
  /** Enable action verification via console hooks */
  actionVerification: z.boolean().default(true),
  
  /** Run in headless mode */
  headless: z.boolean().default(true),
  
  /** Browser to use */
  browser: z.enum(['chromium', 'firefox', 'webkit']).default('chromium'),
  
  /** Viewport size */
  viewport: z.object({
    width: z.number().default(1280),
    height: z.number().default(720),
  }).optional(),
  
  /** Default variables available to all flows */
  defaultVariables: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

/**
 * Default configuration
 */
export const defaultConfig: Config = {
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
