#!/usr/bin/env node

import { Anthropic } from '@anthropic-ai/sdk';
import { spawn } from 'child_process';
import { promisify } from 'util';

// Check for API key
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('Error: ANTHROPIC_API_KEY environment variable is required');
  process.exit(1);
}

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Shell command execution tool
interface ShellCommandResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

const executeShellCommand = async (
  command: string, 
  stdinInput?: string, 
  timeout: number = 10000
): Promise<ShellCommandResult> => {
  return new Promise((resolve) => {
    console.log(`\n🔧 Executing shell command: ${command}`);
    
    // Split the command into arguments
    const args = command.split(' ');
    const cmd = args.shift() || '';
    
    // Spawn the process
    const childProcess = spawn(cmd, args, { shell: true });
    
    let stdout = '';
    let stderr = '';
    
    // Set up timeout
    const timeoutId = setTimeout(() => {
      console.log(`\n⏱️ Command timed out after ${timeout/1000} seconds`);
      childProcess.kill();
    }, timeout);
    
    // Collect stdout
    childProcess.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      process.stdout.write(output);
    });
    
    // Collect stderr
    childProcess.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      process.stderr.write(output);
    });
    
    // Handle process completion
    childProcess.on('close', (code) => {
      clearTimeout(timeoutId);
      resolve({
        stdout,
        stderr,
        exitCode: code
      });
    });
    
    // Provide stdin input if specified
    if (stdinInput) {
      childProcess.stdin.write(stdinInput);
      childProcess.stdin.end();
    }
  });
};

// Function to run the agent loop
const runAgentLoop = async (initialPrompt: string) => {
  const systemPrompt = `You are an AI agent that can run shell commands to accomplish tasks. 
You have access to a single tool:
- executeShellCommand(command: string, stdinInput?: string): Runs a shell command and returns the result

When you need to use this tool, format your response as:
\`\`\`
THINKING: Your reasoning about what command to run and why
COMMAND: The exact shell command to execute
STDIN: (Optional) Content to pipe to the command
\`\`\`

After seeing the result, continue your reasoning and run more commands as needed.
When the task is complete, respond with "**TASK FINISHED**".`;

  let messages: any[] = [
    {
      role: 'user',
      content: initialPrompt
    }
  ];

  while (true) {
    // Get response from Claude
    console.log('\n🤔 Thinking...');
    const response = await anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 4000,
      messages: messages,
      system: systemPrompt,
      temperature: 0.5,
    });

    // Extract text content from the response
    const assistantMessage = response.content[0].type === 'text' 
      ? response.content[0].text 
      : 'No text response received';
    console.log(`\n🤖 ${assistantMessage}`);

    // Check if task is finished
    if (assistantMessage.includes('**TASK FINISHED**')) {
      console.log('\n✅ Task completed!');
      break;
    }

    // Parse the command from the response
    const thinkingMatch = assistantMessage.match(/THINKING:(.*?)(?=COMMAND:|$)/s);
    const commandMatch = assistantMessage.match(/COMMAND:(.*?)(?=STDIN:|$)/s);
    const stdinMatch = assistantMessage.match(/STDIN:(.*?)(?=$)/s);

    const thinking = thinkingMatch ? thinkingMatch[1].trim() : '';
    const command = commandMatch ? commandMatch[1].trim() : '';
    const stdin = stdinMatch ? stdinMatch[1].trim() : undefined;

    if (!command) {
      console.log('\n❌ No command found in the response. Adding clarification to the conversation.');
      messages.push({
        role: 'assistant',
        content: assistantMessage
      });
      messages.push({
        role: 'user',
        content: 'I couldn\'t find a command to execute. Please format your response with COMMAND: followed by the shell command you want to run.'
      });
      continue;
    }

    // Execute the shell command
    const result = await executeShellCommand(command, stdin);

    // Add the assistant's message and the result to the conversation
    messages.push({
      role: 'assistant',
      content: assistantMessage
    });
    
    messages.push({
      role: 'user',
      content: `Command result:
Exit code: ${result.exitCode}
Stdout: ${result.stdout}
Stderr: ${result.stderr}

What's the next step?`
    });
  }
};

// Main function
const main = async () => {
  try {
    // Get the prompt from command line arguments
    const prompt = process.argv.slice(2).join(' ');
    
    if (!prompt) {
      console.error('Error: Please provide a prompt as the first argument');
      process.exit(1);
    }
    
    console.log(`\n🚀 Starting agentic coder with prompt: "${prompt}"`);
    await runAgentLoop(prompt);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

// Run the main function
main();