# MyCoder-Mini

A minimal TypeScript command line tool for agentic coding powered by Anthropic's Claude.  Less than 200 lines of code.

For background on creating your own Agentic Coder, please see my Ottawa Forward JS talk [Building an Agentic Coder from Scratch](https://benhouston3d.com/blog/building-an-agentic-code-from-scratch) and my write-up of this experiment: [What is the Most Minimal Agentic Coder You Can Write?](https://benhouston3d.com/blog/minimal-agentic-coder)

> [!NOTE]
> If you are looking for a full-featured agentic coder, please see the full [MyCoder](https://github.com/drivecore/mycoder) project.

## Features

- Uses Anthropic Claude SDK with native tool calling support
- Provides two tools:
  - `shellCommand`: the ability to run shell commands
  - `finished`: signals task completion
- Automatically stops when the agent calls the `finished` tool
- 10-second timeout on shell commands to prevent hangs
- Displays Claude's thinking process and command execution in real-time

## Quick Start

To get going using this:

```bash
# checkout and build
git checkout git@github.com:bhouston/mycoder-mini.git
npm install
npm run build
# install globally
npm link

# use anywhere!
mycoder-mini "Insert your prompt here"
```

## How It Works

1. The tool takes your prompt and sends it to Claude
2. Claude analyzes the task and decides what shell commands to run using native tool calling
3. The tool executes the commands and returns the results to Claude
4. Claude continues this loop until it determines the task is complete
5. The agent stops when it calls the `finished` tool

The implementation uses Claude's native tool calling API, which provides a more structured way for the AI to invoke tools compared to parsing text responses. This results in a more reliable and cleaner interaction between the AI and the shell commands.

## Developer setup

```bash
# clone repo
git checkout git@github.com:bhouston/mycoder-minimal.git
# install deps
npm install
# build
npm run build
# start cli tool
npm start "Insert your prompt here"
```

## Usage

Set your Anthropic API key as an environment variable:

```bash
export ANTHROPIC_API_KEY=your_api_key_here
```

Then run the tool with a prompt:

```bash
# If you've linked the package globally
mycoder-mini "Write a simple hello world program in Python"

# Or run directly
npm start "Write a simple hello world program in Python"

# Or with Node directly
node dist/index.js "Write a simple hello world program in Python"
```

## License

MIT
