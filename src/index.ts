#!/usr/bin/env node

import { Anthropic } from "@anthropic-ai/sdk";
import { MessageParam } from "@anthropic-ai/sdk/resources";
import { exec } from "child_process";
import { promisify } from "util";

// Promisified exec function
const execPromise = promisify(exec);

// Check for API key
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("Error: ANTHROPIC_API_KEY environment variable is required");
  process.exit(1);
}

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Define tool schemas
const shellCommandSchema = {
  name: "shellCommand",
  description: "Execute a shell command and return the result",
  input_schema: {
    type: "object" as const,
    properties: {
      command: {
        type: "string",
        description: "The shell command to execute",
      },
    },
    required: ["command"],
  },
};

// Simplified executeShellCommand function using promisify with exec
const shellCommand = async (
  command: string,
  timeout: number = 10000
) => {
  console.log(`\n🔧 Executing shell command: ${command}`);
  
  try {
    // Execute the command with timeout
    const { stdout, stderr } = await execPromise(command, { timeout });
    return {
      stdout,
      stderr,
      exitCode: 0,
    };
  } catch (error: any) {
    // Handle errors, including timeouts
    if (error.signal === 'SIGTERM') {
      console.log(`\n⏱️ Command timed out after ${timeout / 1000} seconds`);
    }
    
    return {
      stdout: error.stdout || "",
      stderr: error.stderr || error.message || "Unknown error occurred",
      exitCode: error.code || 1,
    };
  }
};


const finishedSchema = {
  name: "finished",
  description:
    "Call this tool when the task is complete to end the conversation",
  input_schema: {
    type: "object" as const,
    properties: {},
    required: [],
  },
};

// Function to run the agent loop
const runAgentLoop = async (initialPrompt: string) => {
  // Use the defined tool schemas
  const tools = [shellCommandSchema, finishedSchema];

  const systemPrompt =
    `You are an AI agent that can run shell commands to accomplish tasks.\n` +
    `Use the provided tools to complete the user's task.\n` +
    `When the task is complete, call the finished tool to indicate completion.`;

  let messages: MessageParam[] = [
    {
      role: "user",
      content: initialPrompt,
    },
  ];

  while (true) {
    // Get response from Claude
    console.log("\n🤔 Thinking...");
    const response = await anthropic.messages.create({
      model: "claude-3-opus-20240229",
      max_tokens: 4000,
      messages: messages,
      system: systemPrompt,
      tools: tools,
      temperature: 0.5,
    });

    // Add the assistant's full message to the conversation history
    messages.push({
      role: "assistant",
      content: response.content,
    });

    // Process each content block from the response
    let hasToolUse = false;

    for (const block of response.content) {
      if (block.type === "text") {
        console.log(`\n🤖 ${block.text}`);
        continue;
      }

      if (block.type === "tool_use") {
        hasToolUse = true;
        switch (block.name) {
          case "shellCommand": {
            // Type assertion to access the input properties
            const input = block.input as { command: string };
            // Execute the shell command
            const result = await shellCommand(input.command);
            // Add the tool result to messages
            messages.push({
              role: "user",
              content: [
                {
                  type: "tool_result",
                  tool_use_id: block.id,
                  content: JSON.stringify(result),
                },
              ],
            });
            break;
          }
          case "finished":
            console.log("\\n✅ Task completed!");
            return;
        }
      }
      continue;
    }

    // If no tool was used and task is not finished, prompt for next step
    if (!hasToolUse) {
      messages.push({
        role: "user",
        content: "What's the next step?",
      });
    }
  }
};

// Main function
const main = async () => {
  try {
    // Get the prompt from command line arguments
    const prompt = process.argv.slice(2).join(" ");

    if (!prompt) {
      console.error("Error: Please provide a prompt as the first argument");
      process.exit(1);
    }

    console.log(`\n🚀 Starting agentic coder with prompt: "${prompt}"`);
    await runAgentLoop(prompt);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
};

// Run the main function
main();