# Web Reaper

A powerful React Flow Testing Tool that lets you **record**, **replay**, and **assert** user flows for React applications. Built with Playwright for reliable browser automation and integrated with React internals for component-aware testing.

```
╦ ╦╔═╗╔╗   ╦═╗╔═╗╔═╗╔═╗╔═╗╦═╗
║║║║╣ ╠╩╗  ╠╦╝║╣ ╠═╣╠═╝║╣ ╠╦╝
╚╩╝╚═╝╚═╝  ╩╚═╚═╝╩ ╩╩  ╚═╝╩╚═
React Flow Testing Tool v0.1.0
```

## Overview

Web Reaper solves the challenge of testing React applications by:

1. **Recording user interactions** - Open your app, perform actions, and Web Reaper generates test flows
2. **Storing tests as JSON** - Human-readable, version-controllable, with variable interpolation
3. **Running tests with assertions** - Execute flows and verify success via DOM assertions
4. **Generating detailed reports** - HTML/JSON reports with screenshots on failure

### Key Differentiators

- **React-Aware**: Extracts React component names and source file paths using React fiber internals
- **Smart Locators**: Multiple fallback strategies (testId → role → component → css) for resilient tests
- **No Code Required**: Record tests by clicking, typing, and interacting - no programming needed
- **Variable Interpolation**: Use `{{variable}}` syntax for dynamic test data
- **Auth State Reuse**: Record login once, reuse cookies/storage across all tests

---

## Features

| Feature | Description |
|---------|-------------|
| **Record & Replay** | Playwright-powered recording with React component detection |
| **React-Aware Locators** | Extracts component names via react-grab integration |
| **20+ Actions** | navigate, click, fill, upload, select, check, press, wait... |
| **17 Assertions** | visible, textContains, urlMatches, consoleContains... |
| **Variable Interpolation** | `{{email}}`, `{{password}}` syntax for dynamic data |
| **Auth Persistence** | Save/load cookies & localStorage between flows |
| **Screenshots on Failure** | Automatic capture for debugging |
| **HTML Reports** | Beautiful dark-themed reports with pass rates |
| **JSON Schema** | IDE autocompletion for flow files |
| **Console Verification** | Monitor console logs for action verification |

---

## Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd web-reaper

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Verify installation
node packages/cli/dist/index.js --help
```

### Requirements

- Node.js >= 18.0.0
- pnpm (recommended) or npm

---

## Quick Start

### 1. Initialize in your project

```bash
npx web-reaper init
```

This creates:
```
your-project/
├── web-reaper.config.json    # Configuration
├── flows/                    # Test flow files
│   └── example-login.flow.json
├── auth/                     # Authentication state
└── reports/                  # Generated reports
```

### 2. Record a test flow

```bash
npx web-reaper record -u http://localhost:3000 -f login
```

A browser window opens. Perform your test actions:
- Click buttons, fill forms, upload files
- Web Reaper captures everything with React component info
- Click **"Stop Recording"** in the floating panel when done
- Flow saved to `flows/login.flow.json`

### 3. Run tests

```bash
# Run a single flow
npx web-reaper run -f login

# Run all flows
npx web-reaper run --all

# Run in headed mode (watch the browser)
npx web-reaper run -f login --headed

# Override variables
npx web-reaper run -f login --vars email=other@test.com,password=newpass
```

### 4. Generate reports

```bash
# HTML report (default)
npx web-reaper report

# JSON report
npx web-reaper report -f json
```

---

## CLI Reference

```bash
web-reaper [command] [options]
```

### Commands

| Command | Description |
|---------|-------------|
| `init` | Initialize web-reaper in your project |
| `record` | Record a new test flow |
| `run` | Run test flow(s) |
| `report` | Generate test report |

### Record Options

```bash
npx web-reaper record [options]

  -u, --url <url>         Base URL to start recording (required)
  -f, --flow <name>       Name of the flow to record (required)
  --load-auth <file>      Load authentication state from file
  --save-auth <file>      Save authentication state after recording
  -o, --output <dir>      Output directory (default: "./flows")
```

### Run Options

```bash
npx web-reaper run [options]

  -f, --flow <name>       Name of flow to run
  -a, --all               Run all flows
  -u, --url <url>         Override base URL
  --headed                Run in headed mode (show browser)
  --vars <variables>      Variables in key=value,key2=value2 format
  -d, --dir <dir>         Flows directory (default: "./flows")
  --retries <count>       Number of retries for failed tests
```

### Report Options

```bash
npx web-reaper report [options]

  -f, --format <format>   Report format: html, json (default: "html")
  -o, --output <file>     Output file path
  -d, --dir <dir>         Reports directory (default: "./reports")
```

---

## Flow File Format

Flows are JSON files with IDE autocompletion via JSON Schema:

```json
{
  "$schema": "./flow.schema.json",
  "name": "Login Flow",
  "description": "Test successful user login",
  "baseUrl": "http://localhost:3000",
  "variables": {
    "email": "test@example.com",
    "password": "password123"
  },
  "tags": ["auth", "login"],
  "timeout": 30000,
  "steps": [
    {
      "id": "step-1",
      "action": "navigate",
      "url": "/login",
      "description": "Go to login page"
    },
    {
      "id": "step-2",
      "action": "fill",
      "locator": {
        "strategies": [
          { "type": "testId", "value": "email-input" },
          { "type": "placeholder", "value": "Email" }
        ]
      },
      "value": "{{email}}",
      "description": "Enter email"
    },
    {
      "id": "step-3",
      "action": "fill",
      "locator": {
        "strategies": [
          { "type": "testId", "value": "password-input" }
        ]
      },
      "value": "{{password}}"
    },
    {
      "id": "step-4",
      "action": "click",
      "locator": {
        "strategies": [
          { "type": "testId", "value": "login-button" },
          { "type": "role", "value": "button", "name": "Log In" }
        ]
      }
    },
    {
      "id": "step-5",
      "action": "waitForNavigation",
      "url": "/dashboard",
      "timeout": 10000
    }
  ],
  "assertions": [
    {
      "id": "assert-1",
      "type": "urlContains",
      "value": "/dashboard"
    },
    {
      "id": "assert-2",
      "type": "visible",
      "locator": {
        "strategies": [
          { "type": "testId", "value": "welcome-message" }
        ]
      }
    },
    {
      "id": "assert-3",
      "type": "textContains",
      "locator": {
        "strategies": [
          { "type": "testId", "value": "user-greeting" }
        ]
      },
      "expected": "Welcome"
    }
  ],
  "onSuccess": {
    "saveAuth": true,
    "authFile": "auth/logged-in.json"
  }
}
```

---

## Supported Actions

### Navigation & Waiting

| Action | Parameters | Description |
|--------|------------|-------------|
| `navigate` | `url` | Navigate to URL |
| `waitForSelector` | `locator`, `state?` | Wait for element (visible/hidden/attached/detached) |
| `waitForNavigation` | `url?`, `waitUntil?` | Wait for URL change |
| `waitForNetwork` | `urlPattern`, `type?` | Wait for network request/response |
| `waitForTimeout` | `duration` | Wait for fixed time (ms) |

### Interactions

| Action | Parameters | Description |
|--------|------------|-------------|
| `click` | `locator`, `modifiers?`, `button?` | Click element |
| `dblclick` | `locator` | Double-click element |
| `hover` | `locator` | Hover over element |
| `focus` | `locator` | Focus element |
| `blur` | `locator` | Blur element |
| `scroll` | `locator?`, `x?`, `y?` | Scroll to element or position |

### Form Inputs

| Action | Parameters | Description |
|--------|------------|-------------|
| `fill` | `locator`, `value` | Fill input (clears first) |
| `type` | `locator`, `text`, `delay?` | Type text character by character |
| `clear` | `locator` | Clear input field |
| `select` | `locator`, `value`, `by?` | Select dropdown option |
| `check` | `locator` | Check checkbox |
| `uncheck` | `locator` | Uncheck checkbox |
| `upload` | `locator`, `files` | Upload file(s) |
| `press` | `key`, `locator?` | Press keyboard key |

### Utilities

| Action | Parameters | Description |
|--------|------------|-------------|
| `screenshot` | `name`, `fullPage?`, `locator?` | Take screenshot |
| `evaluate` | `script`, `args?` | Execute JavaScript in page |

---

## Supported Assertions

### Element State

| Type | Parameters | Description |
|------|------------|-------------|
| `visible` | `locator` | Element is visible |
| `hidden` | `locator` | Element is hidden |
| `enabled` | `locator` | Element is enabled |
| `disabled` | `locator` | Element is disabled |
| `checked` | `locator` | Checkbox is checked |
| `unchecked` | `locator` | Checkbox is unchecked |

### Content

| Type | Parameters | Description |
|------|------------|-------------|
| `textContains` | `locator`, `expected`, `ignoreCase?` | Element contains text |
| `textEquals` | `locator`, `expected`, `ignoreCase?` | Element text matches exactly |
| `hasValue` | `locator`, `expected` | Input has value |
| `hasAttribute` | `locator`, `attribute`, `value?` | Element has attribute |
| `hasClass` | `locator`, `className` | Element has CSS class |
| `elementCount` | `locator`, `count`, `operator?` | Count of matching elements |

### Page State

| Type | Parameters | Description |
|------|------------|-------------|
| `urlMatches` | `pattern` | URL matches regex pattern |
| `urlContains` | `value` | URL contains string |
| `titleContains` | `expected` | Page title contains text |
| `titleEquals` | `expected` | Page title matches exactly |
| `consoleContains` | `message`, `level?` | Console logged message |

---

## Locator Strategies

Locators support multiple strategies tried in order. This provides resilient element selection:

```json
{
  "locator": {
    "strategies": [
      { "type": "testId", "value": "submit-btn" },
      { "type": "role", "value": "button", "name": "Submit" },
      { "type": "component", "value": "SubmitButton", "file": "src/components/SubmitButton.tsx" },
      { "type": "css", "value": "button[type='submit']" }
    ]
  }
}
```

### Strategy Priority (Recommended Order)

| Priority | Strategy | Example | Description |
|----------|----------|---------|-------------|
| 1 | `testId` | `data-testid="login-btn"` | Most stable, recommended |
| 2 | `role` | `role="button"` + name | Accessibility-based |
| 3 | `label` | `aria-label` | For form elements |
| 4 | `placeholder` | `placeholder="Email"` | For inputs |
| 5 | `text` | Button text content | For buttons/links |
| 6 | `component` | React component name | From react-grab |
| 7 | `css` | CSS selector | Fallback |
| 8 | `xpath` | XPath expression | Last resort |

---

## Configuration

### `web-reaper.config.json`

```json
{
  "baseUrl": "http://localhost:3000",
  "flowsDir": "./flows",
  "authDir": "./auth",
  "reportsDir": "./reports",
  "screenshotsOnFailure": true,
  "timeout": 30000,
  "retries": 0,
  "parallel": 1,
  "injectReactGrab": true,
  "actionVerification": true,
  "headless": true,
  "browser": "chromium",
  "viewport": {
    "width": 1280,
    "height": 720
  },
  "defaultVariables": {
    "baseEmail": "test@example.com"
  }
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `baseUrl` | string | - | Default base URL for flows |
| `flowsDir` | string | `./flows` | Directory for flow files |
| `authDir` | string | `./auth` | Directory for auth state |
| `reportsDir` | string | `./reports` | Directory for reports |
| `screenshotsOnFailure` | boolean | `true` | Capture screenshots on failure |
| `timeout` | number | `30000` | Default action timeout (ms) |
| `retries` | number | `0` | Retry count for failed tests |
| `parallel` | number | `1` | Parallel test workers |
| `headless` | boolean | `true` | Run in headless mode |
| `browser` | string | `chromium` | Browser (chromium/firefox/webkit) |
| `viewport` | object | `{width:1280,height:720}` | Viewport size |
| `defaultVariables` | object | `{}` | Default variables for all flows |

---

## Authentication Reuse

### Recording with Auth

```bash
# Record login flow and save auth state
npx web-reaper record -u http://localhost:3000 -f login --save-auth auth/logged-in.json

# Record authenticated flow using saved state
npx web-reaper record -u http://localhost:3000 -f checkout --load-auth auth/logged-in.json
```

### In Flow Files

```json
{
  "name": "Dashboard Test",
  "baseUrl": "http://localhost:3000",
  "requiresAuth": true,
  "authFile": "auth/logged-in.json",
  "steps": [
    { "id": "step-1", "action": "navigate", "url": "/dashboard" }
  ],
  "assertions": [
    { "id": "assert-1", "type": "visible", "locator": { "strategies": [{ "type": "testId", "value": "user-menu" }] } }
  ]
}
```

### Auto-save Auth on Success

```json
{
  "name": "Login Flow",
  "onSuccess": {
    "saveAuth": true,
    "authFile": "auth/logged-in.json"
  }
}
```

---

## React Integration

Web Reaper injects a bridge script into your React app that:

1. **Extracts React component info** - Component names, file paths, line numbers via React fiber
2. **Monitors actions** - Exposes `window.__webReaper` API for verification
3. **Captures console logs** - For assertion verification

### Optional: Action Verification in Your App

Add action signals for deeper verification:

```typescript
// In your React component
const handleLogin = async () => {
  try {
    await loginUser(email, password);
    
    // Signal to Web Reaper that login succeeded
    if (window.__webReaper) {
      window.__webReaper.actionCompleted('login', { 
        success: true, 
        userId: user.id 
      });
    }
  } catch (error) {
    if (window.__webReaper) {
      window.__webReaper.actionCompleted('login', { 
        success: false, 
        error: error.message 
      });
    }
  }
};
```

Then assert in your flow:

```json
{
  "id": "assert-login",
  "type": "consoleContains",
  "message": "[WEB-REAPER] Action: login",
  "description": "Verify login action was triggered"
}
```

### TypeScript Declaration

Add to your project's type definitions:

```typescript
// global.d.ts
declare global {
  interface Window {
    __webReaper?: {
      actionCompleted(name: string, payload?: any): void;
      getActions(): Array<{ name: string; payload: any; timestamp: number }>;
      clearActions(): void;
    };
  }
}
```

---

## Test Reports

### HTML Report

Beautiful dark-themed HTML report with:
- Pass/fail summary with percentages
- Expandable step details
- Assertion results
- Screenshots on failure
- Console log capture

```bash
npx web-reaper report
# Opens: reports/report.html
```

### JSON Report

Machine-readable JSON for CI/CD integration:

```bash
npx web-reaper report -f json
```

```json
{
  "meta": {
    "version": "0.1.0",
    "generatedAt": 1706000000000,
    "baseUrl": "http://localhost:3000"
  },
  "summary": {
    "total": 5,
    "passed": 4,
    "failed": 1,
    "skipped": 0,
    "duration": 12340
  },
  "results": [...]
}
```

### Console Output

```
╔══════════════════════════════════════════════════════════════════╗
║                     WEB-REAPER TEST REPORT                       ║
╠══════════════════════════════════════════════════════════════════╣
║  SUMMARY                                                         ║
║  Total: 5   Passed: 4   Failed: 1   Duration: 12.3s             ║
╠══════════════════════════════════════════════════════════════════╣
║  RESULTS                                                         ║
║  ✓ Login Flow                                          2.3s     ║
║  ✓ Signup Flow                                         4.1s     ║
║  ✗ Reset Password Flow                                 1.2s     ║
║    └─ Assertion failed: element not visible                     ║
║  ✓ File Upload Flow                                    3.8s     ║
║  ✓ File Delete Flow                                    2.1s     ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## Project Architecture

```
web-reaper/
├── packages/
│   ├── cli/                      # CLI entry point
│   │   └── src/
│   │       ├── index.ts          # Commander.js CLI
│   │       └── commands/
│   │           ├── init.ts       # Initialize project
│   │           ├── record.ts     # Record flows
│   │           ├── run.ts        # Run tests
│   │           └── report.ts     # Generate reports
│   │
│   ├── core/                     # Core engine
│   │   └── src/
│   │       ├── types/
│   │       │   ├── action.ts     # 20+ action types with Zod schemas
│   │       │   ├── assertion.ts  # 17 assertion types
│   │       │   ├── locator.ts    # Locator strategies
│   │       │   ├── flow.ts       # Flow schema
│   │       │   └── result.ts     # Test results & config
│   │       ├── recorder/
│   │       │   └── index.ts      # Playwright recording + react-grab
│   │       ├── runner/
│   │       │   └── index.ts      # Step executor + assertion engine
│   │       └── utils/
│   │           ├── variables.ts  # {{variable}} interpolation
│   │           └── locator.ts    # Locator helpers
│   │
│   ├── browser-injector/         # Injected into React apps
│   │   └── src/
│   │       └── index.ts          # React fiber extraction, action API
│   │
│   └── reporter/                 # Report generation
│       └── src/
│           └── index.ts          # HTML/JSON/Console reporters
│
├── flows/
│   ├── flow.schema.json          # JSON Schema for IDE support
│   └── example-login.flow.json   # Example flow
│
├── auth/                         # Authentication state (gitignored)
├── reports/                      # Generated reports (gitignored)
├── web-reaper.config.json        # Configuration
├── package.json                  # Monorepo root
├── pnpm-workspace.yaml           # pnpm workspaces
└── turbo.json                    # Turborepo build config
```

---

## Development

### Building

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Build with watch mode
pnpm dev
```

### Running CLI Locally

```bash
# Run CLI directly
node packages/cli/dist/index.js --help

# Or use the workspace script
pnpm reaper --help
```

### Package Dependencies

```
@web-reaper/cli
    └── @web-reaper/core
            └── playwright, zod
    └── commander, chalk, ora

@web-reaper/reporter
    └── @web-reaper/core

@web-reaper/browser-injector
    └── esbuild (build only)
```

---

## Best Practices

### 1. Use `data-testid` Attributes

```tsx
// In your React components
<button data-testid="submit-button">Submit</button>
<input data-testid="email-input" type="email" />
```

### 2. Keep Flows Focused

- One flow per user journey (login, checkout, etc.)
- Keep flows short (5-15 steps)
- Use descriptive step names

### 3. Use Variables for Dynamic Data

```json
{
  "variables": {
    "email": "test-{{timestamp}}@example.com",
    "productId": "prod-123"
  }
}
```

### 4. Reuse Authentication

- Record login once with `--save-auth`
- Load auth in other flows with `authFile`

### 5. Add Descriptions

```json
{
  "id": "step-3",
  "action": "click",
  "locator": { ... },
  "description": "Click submit button to complete registration"
}
```

---

## Troubleshooting

### Recording not capturing clicks

- Ensure your React app is running on the specified URL
- Check browser console for errors
- Try refreshing the page in the recorder

### Locator not found

- Add `data-testid` attributes to your elements
- Use multiple strategies for fallback
- Increase timeout in config or step

### Auth state not persisting

- Ensure the `auth/` directory exists
- Check file permissions
- Verify cookies are not httpOnly for cross-domain

### Tests pass locally but fail in CI

- Use `headless: true` in config
- Ensure same viewport size
- Check for timing issues (add wait steps)

---

## Roadmap

- [ ] Parallel test execution
- [ ] Video recording of test runs
- [ ] Visual diff comparison (screenshot matching)
- [ ] Custom reporter plugins
- [ ] GitHub Actions integration
- [ ] VS Code extension for flow editing

---

## License

MIT

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `pnpm build` to verify
5. Submit a pull request

---

Built with Playwright, React, TypeScript, and Turborepo.
