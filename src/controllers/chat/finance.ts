import { Request, Response } from "express";
import { nanoid } from "nanoid";
import { FinanceAgent } from "@/src/agents/finance";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";

// Polyfill for structuredClone if not available (React Native compatibility)
if (typeof globalThis.structuredClone === "undefined") {
  globalThis.structuredClone = (obj: any) => {
    return JSON.parse(JSON.stringify(obj));
  };
}

// Fixed version for Express - addresses timeout issues
const financeChatStream = async (req: Request, res: Response) => {
  try {
    const { messages } = req.body;

    const result = streamText({
      model: openai("gpt-4o-mini"),
      messages,
    });

    // Use toDataStreamResponse for proper React Native compatibility
    const streamResponse = result.toDataStreamResponse();

    // Set the correct headers for data stream
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    if (!streamResponse.body) {
      throw new Error("No response body");
    }

    const reader = streamResponse.body.getReader();

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        if (res.destroyed || res.closed) {
          break;
        }

        // Write the raw data stream format (includes separators)
        res.write(value);
      }
    } finally {
      reader.releaseLock();
    }

    res.end();
  } catch (error: any) {
    console.error("Finance chat stream error:", error);

    if (!res.headersSent) {
      res.status(500).json({
        error: error.message || "Something went wrong!",
        conversationId: req.body?.conversationId,
      });
    } else {
      res.end();
    }
  }
};

// Alternative using AI SDK's toDataStreamResponse but properly handled for Express
const financeChatStreamWithDataResponse = async (
  req: Request,
  res: Response
) => {
  try {
    const { messages } = req.body;

    const result = streamText({
      model: openai("gpt-4o-mini"),
      messages,
    });

    // Get the data stream response
    const streamResponse = result.toDataStreamResponse();

    // Copy headers from the stream response
    streamResponse.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    if (!streamResponse.body) {
      throw new Error("No response body");
    }

    const reader = streamResponse.body.getReader();

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        if (res.destroyed || res.closed) {
          break;
        }

        res.write(value);
      }
    } finally {
      reader.releaseLock();
    }

    res.end();
  } catch (error: any) {
    console.error("Finance chat stream error:", error);

    if (!res.headersSent) {
      res.status(500).json({
        error: error.message || "Something went wrong!",
        conversationId: req.body?.conversationId,
      });
    } else {
      res.end();
    }
  }
};

// Most robust version with proper error handling and timeout prevention
const financeChatStreamRobust = async (req: Request, res: Response) => {
  // Prevent Express from timing out
  req.setTimeout(0);
  res.setTimeout(0);

  let streamStarted = false;

  try {
    const {
      query = "Hi",
      conversationId = nanoid(),
      username = "User",
      userId = "default_user",
    } = req.body;

    const messageId = nanoid();

    const agent = new FinanceAgent(
      query,
      messageId,
      conversationId,
      username,
      userId
    );

    const streamResult = await agent.createStream();

    // Use toDataStreamResponse for React Native compatibility
    const streamResponse = streamResult.toDataStreamResponse();

    // Set proper headers for data stream
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("X-Conversation-ID", conversationId);
    res.setHeader("X-Message-ID", messageId);

    streamStarted = true;

    if (!streamResponse.body) {
      throw new Error("No response body");
    }

    const reader = streamResponse.body.getReader();

    // Handle client disconnect gracefully
    const cleanup = () => {
      console.log("Client disconnected, cleaning up");
      reader.releaseLock();
      if (!res.destroyed && !res.closed) {
        res.end();
      }
    };

    req.on("close", cleanup);
    req.on("aborted", cleanup);

    // Stream the response with proper data format
    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        if (res.destroyed || res.closed || req.destroyed) {
          console.log("Connection closed, stopping stream");
          break;
        }

        // Write the data stream format (includes separators)
        res.write(value);
      }
    } catch (streamError: any) {
      console.error("Streaming error:", streamError);
      if (!res.destroyed && !res.closed) {
        res.write(`\n\ndata: {"error":"${streamError.message}"}\n\n`);
      }
    } finally {
      reader.releaseLock();
    }

    if (!res.destroyed && !res.closed) {
      res.end();
    }
  } catch (error: any) {
    console.error("Finance chat stream error:", error);

    if (!streamStarted && !res.headersSent) {
      res.status(500).json({
        error: error.message || "Something went wrong!",
        conversationId: req.body?.conversationId,
      });
    } else if (!res.destroyed && !res.closed) {
      res.write(
        `\n\ndata: {"error":"${error.message || "Something went wrong!"}"}\n\n`
      );
      res.end();
    }
  }
};

// Alternative: Custom streaming without AI SDK's toDataStreamResponse
const financeChatStreamCustom = async (req: Request, res: Response) => {
  try {
    const { messages } = req.body;

    // Set headers for Server-Sent Events format
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");

    const result = streamText({
      model: openai("gpt-4o-mini"),
      messages,
    });

    // Custom data stream format that React Native can parse
    let isFirstChunk = true;

    for await (const chunk of result.textStream) {
      if (res.destroyed || res.closed) {
        break;
      }

      // Format as AI SDK data stream
      if (isFirstChunk) {
        res.write(`0:"${chunk.replace(/"/g, '\\"')}"\n`);
        isFirstChunk = false;
      } else {
        res.write(`0:"${chunk.replace(/"/g, '\\"')}"\n`);
      }
    }

    // End the stream
    res.write("d\n");
    res.end();
  } catch (error: any) {
    console.error("Finance chat stream error:", error);

    if (!res.headersSent) {
      res.status(500).json({
        error: error.message || "Something went wrong!",
        conversationId: req.body?.conversationId,
      });
    } else {
      res.end();
    }
  }
};

// Express middleware to handle streaming routes
const setupStreamingMiddleware = (app: any) => {
  // Add structuredClone polyfill globally for the app
  if (typeof globalThis.structuredClone === "undefined") {
    globalThis.structuredClone = (obj: any) => {
      return JSON.parse(JSON.stringify(obj));
    };
  }

  // Increase timeout for streaming routes
  app.use("/api/stream/*", (req: Request, res: Response, next: any) => {
    req.setTimeout(0); // Disable request timeout
    res.setTimeout(0); // Disable response timeout
    next();
  });
};

export {
  financeChatStream,
  financeChatStreamWithDataResponse,
  financeChatStreamRobust,
  financeChatStreamCustom,
  setupStreamingMiddleware,
};
