# MyCoder Minimal

A minimal TypeScript command line tool for agentic coding powered by Anthropic's Claude.

## Features

- Uses Anthropic Claude SDK with native tool calling support
- Provides a single tool: the ability to run shell commands
- Supports piping stdin to commands
- Automatically stops when the agent returns "**TASK FINISHED**"
- 10-second timeout on shell commands to prevent hangs
- Displays Claude's thinking process and command execution in real-time

## Installation

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Build the project:
   ```
   npm run build
   ```
4. (Optional) Link the package globally:
   ```
   npm link
   ```

## Usage

Set your Anthropic API key as an environment variable:

```bash
export ANTHROPIC_API_KEY=your_api_key_here
```

Then run the tool with a prompt:

```bash
# If you've linked the package globally
mycoder "Write a simple hello world program in Python"

# Or run directly
npm start "Write a simple hello world program in Python"

# Or with Node directly
node dist/index.js "Write a simple hello world program in Python"
```

## How It Works

1. The tool takes your prompt and sends it to Claude
2. Claude analyzes the task and decides what shell commands to run using native tool calling
3. The tool executes the commands and returns the results to Claude
4. Claude continues this loop until it determines the task is complete
5. The agent stops when it returns "**TASK FINISHED**"

The implementation uses Claude's native tool calling API, which provides a more structured way for the AI to invoke tools compared to parsing text responses. This results in a more reliable and cleaner interaction between the AI and the shell commands.

## Development

For development, you can use:

```bash
npm run dev "Your prompt here"
```

This will run the TypeScript code directly using ts-node.

## License

ISC