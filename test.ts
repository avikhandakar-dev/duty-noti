// @ts-nocheck
// test-agent.ts - Comprehensive test file for Finance Agent
import { CoreMessage } from "ai";
import dotenv from "dotenv";
import { FinanceAgent, tools } from "./src/agents/finance";

// Load environment variables
dotenv.config();

// Test data and configurations
const TEST_USER_ID = "test_user_123";
const TEST_USERNAME = "TestUser";
const TEST_CONVERSATION_ID = "test_conv_123";
const TEST_MESSAGE_ID = "test_msg_123";

// Test queries
const TEST_QUERIES = {
  stockAnalysis: "Give me a detailed analysis of AAPL stock",
  stockNews: "What are the latest news about Tesla?",
  marketIndex: "How is the Bangladesh stock market performing today?",
  topGainers: "Show me top gainers in Bangladesh market",
  weeklyHigh: "What are the 52 week high stocks in BD?",
  banglaQuery: "গ্রামীণফোনের শেয়ার সম্পর্কে বিশ্লেষণ দিন",
  invalidQuery: "",
  complexQuery:
    "Compare AAPL and MSFT stocks, give me buy/sell recommendations with risk management",
};

// Mock conversation history
const mockMemory: CoreMessage[] = [
  {
    role: "user",
    content: "Hello, I want to invest in stocks",
  },
  {
    role: "assistant",
    content:
      "Hello! I'm here to help you with stock market analysis and investment decisions. What specific stock would you like to analyze?",
  },
];

// Color codes for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

// Utility functions for testing
const log = (message: string, color: string = colors.reset) => {
  console.log(`${color}${message}${colors.reset}`);
};

const logSuccess = (message: string) => log(`✅ ${message}`, colors.green);
const logError = (message: string) => log(`❌ ${message}`, colors.red);
const logInfo = (message: string) => log(`ℹ️  ${message}`, colors.blue);
const logWarning = (message: string) => log(`⚠️  ${message}`, colors.yellow);
const logHeader = (message: string) =>
  log(`\n${colors.bright}=== ${message} ===${colors.reset}`, colors.cyan);

// Test environment setup
const testEnvironmentSetup = (): boolean => {
  logHeader("Testing Environment Setup");

  const requiredEnvVars = ["OPENAI_API_KEY", "REDIS_URL", "SERPER_API_KEY"];

  let allSet = true;

  requiredEnvVars.forEach((envVar) => {
    if (process.env[envVar]) {
      logSuccess(`${envVar} is set`);
    } else {
      logError(`${envVar} is missing`);
      allSet = false;
    }
  });

  return allSet;
};

// Test agent creation
const testAgentCreation = (): FinanceAgent => {
  logHeader("Testing Agent Creation");

  try {
    const agent = new FinanceAgent(
      TEST_QUERIES.stockAnalysis,
      mockMemory,
      TEST_MESSAGE_ID,
      TEST_CONVERSATION_ID,
      TEST_USERNAME,
      TEST_USER_ID
    );

    logSuccess("FinanceAgent created successfully");
    return agent;
  } catch (error) {
    logError(
      `Failed to create FinanceAgent: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
    throw error;
  }
};

// Test individual tools
const testTools = async () => {
  logHeader("Testing Individual Tools");

  const toolTests = [
    {
      name: "getStockNews",
      params: { name: "GP" },
      tool: tools.getStockNews,
    },
    {
      name: "getFinanceData",
      params: { name: "ROBI" },
      tool: tools.getFinanceData,
    },
    {
      name: "getIndexData",
      params: { country: "BD" },
      tool: tools.getIndexData,
    },
    {
      name: "getTopGainers",
      params: { name: "Bangladesh" },
      tool: tools.getTopGainers,
    },
  ];

  for (const test of toolTests) {
    try {
      logInfo(`Testing ${test.name}...`);
      const startTime = Date.now();

      const result = await test.tool.execute(test.params as any);
      const endTime = Date.now();

      logSuccess(
        `${test.name} executed successfully in ${endTime - startTime}ms`
      );

      // Log result preview
      if (typeof result === "string") {
        log(
          `   Result preview: ${result.substring(0, 100)}...`,
          colors.magenta
        );
      } else if (Array.isArray(result)) {
        log(`   Result: Array with ${result.length} items`, colors.magenta);
      } else if (typeof result === "object") {
        log(
          `   Result: Object with keys: ${Object.keys(result || {}).join(
            ", "
          )}`,
          colors.magenta
        );
      }
    } catch (error) {
      logError(
        `${test.name} failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
};

// Test streaming response
const testStreamingResponse = async (agent: FinanceAgent) => {
  logHeader("Testing Streaming Response");

  try {
    logInfo("Creating stream...");
    const streamResult = await agent.createStream();

    logInfo("Processing stream...");
    let fullResponse = "";
    let chunkCount = 0;

    // Set up stream handlers
    streamResult.onFinish((event) => {
      logSuccess(`Stream finished. Total chunks: ${chunkCount}`);
      log(
        `Final response length: ${event.text?.length || 0} characters`,
        colors.magenta
      );
    });

    // Process the stream
    for await (const chunk of streamResult.textStream) {
      fullResponse += chunk;
      chunkCount++;

      // Log every 10th chunk to avoid spam
      if (chunkCount % 10 === 0) {
        logInfo(`Processed ${chunkCount} chunks...`);
      }
    }

    if (fullResponse.length > 0) {
      logSuccess("Streaming response completed successfully");
      log(
        `Response preview: ${fullResponse.substring(0, 200)}...`,
        colors.magenta
      );

      // Check for required elements in response
      const hasChartLink = fullResponse.includes("[Show Chart]");
      const hasBanglaText = /[\u0980-\u09FF]/.test(fullResponse);
      const hasRating = /Score:?\s*\d+\.?\d*/i.test(fullResponse);

      logInfo(`Chart link present: ${hasChartLink}`);
      logInfo(`Bangla text present: ${hasBanglaText}`);
      logInfo(`Rating system present: ${hasRating}`);
    } else {
      logWarning("Stream completed but no content received");
    }
  } catch (error) {
    logError(
      `Streaming test failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
};

// Test non-streaming response
const testNonStreamingResponse = async (agent: FinanceAgent) => {
  logHeader("Testing Non-Streaming Response");

  try {
    logInfo("Generating response...");
    const startTime = Date.now();

    const response = await agent.createGeneration();
    const endTime = Date.now();

    if (response && response.length > 0) {
      logSuccess(
        `Non-streaming response completed in ${endTime - startTime}ms`
      );
      log(`Response length: ${response.length} characters`, colors.magenta);
      log(`Response preview: ${response.substring(0, 200)}...`, colors.magenta);

      // Validate response structure
      const hasAnalysisStructure =
        response.includes("###") || response.includes("##");
      const hasRecommendation = /buy|sell|hold/i.test(response);
      const hasNumericData = /\d+\.?\d*/.test(response);

      logInfo(`Analysis structure present: ${hasAnalysisStructure}`);
      logInfo(`Recommendation present: ${hasRecommendation}`);
      logInfo(`Numeric data present: ${hasNumericData}`);
    } else {
      logWarning("Non-streaming response completed but no content received");
    }
  } catch (error) {
    logError(
      `Non-streaming test failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
};

// Test different query types
const testDifferentQueries = async () => {
  logHeader("Testing Different Query Types");

  const queries = [
    { name: "Stock Analysis", query: TEST_QUERIES.stockAnalysis },
    { name: "Stock News", query: TEST_QUERIES.stockNews },
    { name: "Market Index", query: TEST_QUERIES.marketIndex },
    { name: "Bangla Query", query: TEST_QUERIES.banglaQuery },
    { name: "Complex Query", query: TEST_QUERIES.complexQuery },
  ];

  for (const testCase of queries) {
    try {
      logInfo(`Testing ${testCase.name}...`);

      const agent = new FinanceAgent(
        testCase.query,
        [],
        `test_msg_${Date.now()}`,
        `test_conv_${Date.now()}`,
        TEST_USERNAME,
        TEST_USER_ID
      );

      const startTime = Date.now();
      const response = await agent.createGeneration();
      const endTime = Date.now();

      if (response && response.length > 0) {
        logSuccess(`${testCase.name} completed in ${endTime - startTime}ms`);
        log(
          `   Response length: ${response.length} characters`,
          colors.magenta
        );
      } else {
        logWarning(`${testCase.name} returned empty response`);
      }
    } catch (error) {
      logError(
        `${testCase.name} failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
};

// Test error handling
const testErrorHandling = async () => {
  logHeader("Testing Error Handling");

  try {
    // Test with invalid query
    logInfo("Testing with empty query...");
    const agent = new FinanceAgent(
      "",
      [],
      TEST_MESSAGE_ID,
      TEST_CONVERSATION_ID,
      TEST_USERNAME,
      TEST_USER_ID
    );

    const response = await agent.createGeneration();
    logInfo(
      `Empty query handled: ${response.length > 0 ? "Success" : "No response"}`
    );
  } catch (error) {
    logInfo(
      `Empty query error handled: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }

  try {
    // Test with very long query
    logInfo("Testing with very long query...");
    const longQuery = "A".repeat(10000);
    const agent = new FinanceAgent(
      longQuery,
      [],
      TEST_MESSAGE_ID,
      TEST_CONVERSATION_ID,
      TEST_USERNAME,
      TEST_USER_ID
    );

    const response = await agent.createGeneration();
    logInfo(
      `Long query handled: ${response.length > 0 ? "Success" : "No response"}`
    );
  } catch (error) {
    logInfo(
      `Long query error handled: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
};

// Performance test
const testPerformance = async () => {
  logHeader("Testing Performance");

  const testCases = 3;
  const results: number[] = [];

  for (let i = 0; i < testCases; i++) {
    try {
      logInfo(`Performance test ${i + 1}/${testCases}...`);

      const agent = new FinanceAgent(
        TEST_QUERIES.stockAnalysis,
        [],
        `perf_msg_${i}`,
        `perf_conv_${i}`,
        TEST_USERNAME,
        TEST_USER_ID
      );

      const startTime = Date.now();
      const response = await agent.createGeneration();
      const endTime = Date.now();

      const duration = endTime - startTime;
      results.push(duration);

      logSuccess(`Test ${i + 1} completed in ${duration}ms`);
    } catch (error) {
      logError(
        `Performance test ${i + 1} failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  if (results.length > 0) {
    const avgTime = results.reduce((a, b) => a + b, 0) / results.length;
    const minTime = Math.min(...results);
    const maxTime = Math.max(...results);

    logInfo(`Performance Summary:`);
    logInfo(`  Average: ${avgTime.toFixed(2)}ms`);
    logInfo(`  Min: ${minTime}ms`);
    logInfo(`  Max: ${maxTime}ms`);
  }
};

// Main test function
const main = async () => {
  logHeader("Starting Finance Agent Tests");

  try {
    // Test environment
    const envOk = testEnvironmentSetup();
    if (!envOk) {
      logError("Environment setup failed. Please check your .env file.");
      return;
    }

    // Test agent creation
    const agent = testAgentCreation();

    // Test individual tools
    await testTools();

    // Test streaming response
    await testStreamingResponse(agent);

    // Test non-streaming response
    await testNonStreamingResponse(agent);

    // Test different query types
    await testDifferentQueries();

    // Test error handling
    await testErrorHandling();

    // Test performance
    await testPerformance();

    logHeader("All Tests Completed");
    logSuccess("Finance Agent testing completed successfully!");
  } catch (error) {
    logError(
      `Test suite failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
    console.error(error);
  } finally {
    // Cleanup if needed
    process.exit(0);
  }
};

main();
