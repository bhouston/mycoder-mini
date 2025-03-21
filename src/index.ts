#!/usr/bin/env node

import { Anthropic } from '@anthropic-ai/sdk';
import { spawn } from 'child_process';

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
    
    // Spawn the process
    const childProcess = spawn(command, [], { shell: true });
    
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
  // Define the shell command tool
  const tools = [
    {
      name: 'executeShellCommand',
      description: 'Execute a shell command and return the result',
      input_schema: {
        type: 'object' as const,
        properties: {
          command: {
            type: 'string',
            description: 'The shell command to execute'
          },
          stdinInput: {
            type: 'string',
            description: 'Optional content to pipe to the command as stdin'
          }
        },
        required: ['command']
      }
    }
  ];

  const systemPrompt = `You are an AI agent that can run shell commands to accomplish tasks.
You have access to the executeShellCommand tool that allows you to run shell commands.
Use this tool to complete the user's task.
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
      tools: tools,
      temperature: 0.5,
    });

    // Add the assistant's full message to the conversation history
    messages.push({
      role: 'assistant',
      content: response.content
    });

    // Process each content block from the response
    let hasToolUse = false;
    
    for (const block of response.content) {
      if (block.type === 'text') {
        console.log(`\n🤖 ${block.text}`);
        
        // Check if task is finished
        if (block.text.includes('**TASK FINISHED**')) {
          console.log('\n✅ Task completed!');
          return;
        }
      } else if (block.type === 'tool_use') {
        hasToolUse = true;
        if (block.name === 'executeShellCommand') {
          // Type assertion to access the input properties
          const input = block.input as { command: string; stdinInput?: string };
          
          // Execute the shell command
          const result = await executeShellCommand(input.command, input.stdinInput);
          
          // Add the tool result to messages
          messages.push({
            role: 'user',
            content: [{
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify({
                exitCode: result.exitCode,
                stdout: result.stdout,
                stderr: result.stderr
              })
            }]
          });
        }
      }
    }
    
    // If no tool was used and task is not finished, prompt for next step
    if (!hasToolUse) {
      messages.push({
        role: 'user',
        content: "What's the next step?"
      });
    }
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