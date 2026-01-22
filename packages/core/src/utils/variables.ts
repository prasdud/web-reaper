/**
 * Variable interpolation utilities
 * 
 * Supports {{variable}} syntax in strings
 */

/**
 * Variable store type
 */
export type Variables = Record<string, string | number | boolean>;

/**
 * Pattern to match {{variable}} placeholders
 */
const VARIABLE_PATTERN = /\{\{(\w+)\}\}/g;

/**
 * Interpolate variables in a string
 * 
 * @example
 * interpolate("Hello {{name}}!", { name: "World" }) // "Hello World!"
 */
export function interpolate(template: string, variables: Variables): string {
  return template.replace(VARIABLE_PATTERN, (match, key) => {
    if (key in variables) {
      return String(variables[key]);
    }
    // Return original placeholder if variable not found
    console.warn(`Variable "${key}" not found in variables`);
    return match;
  });
}

/**
 * Check if a string contains variables
 */
export function hasVariables(str: string): boolean {
  return VARIABLE_PATTERN.test(str);
}

/**
 * Extract variable names from a string
 */
export function extractVariables(str: string): string[] {
  const variables: string[] = [];
  let match;
  
  // Reset regex state
  const pattern = new RegExp(VARIABLE_PATTERN);
  
  while ((match = pattern.exec(str)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1]);
    }
  }
  
  return variables;
}

/**
 * Merge multiple variable sources (later sources override earlier)
 */
export function mergeVariables(...sources: (Variables | undefined)[]): Variables {
  return sources.reduce<Variables>((acc, source) => {
    if (source) {
      return { ...acc, ...source };
    }
    return acc;
  }, {});
}

/**
 * Parse variables from CLI format (key=value,key2=value2)
 */
export function parseCliVariables(input: string): Variables {
  const variables: Variables = {};
  
  if (!input) return variables;
  
  const pairs = input.split(',');
  for (const pair of pairs) {
    const [key, ...valueParts] = pair.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('='); // Handle values with = in them
      // Try to parse as number or boolean
      if (value === 'true') {
        variables[key.trim()] = true;
      } else if (value === 'false') {
        variables[key.trim()] = false;
      } else if (!isNaN(Number(value))) {
        variables[key.trim()] = Number(value);
      } else {
        variables[key.trim()] = value;
      }
    }
  }
  
  return variables;
}

/**
 * Generate a unique variable name
 */
export function generateVariableName(base: string, existing: string[]): string {
  let name = base;
  let counter = 1;
  
  while (existing.includes(name)) {
    name = `${base}${counter}`;
    counter++;
  }
  
  return name;
}
