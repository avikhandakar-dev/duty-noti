import { Request, Response } from "express";
import prisma from "@/src/lib/prisma";
import { BadRequestError, UnAuthenticatedError } from "@/src/errors";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { Reaction } from "@prisma/client";
import { nanoid } from "nanoid";
import { FinanceAgent } from "@/src/agents/finance";
import { CoreMessage } from "ai";

const financeChatStream = async (req: any, res: Response) => {
  try {
    const {
      query,
      conversationId = nanoid(),
      username = "User",
      userId = "default_user",
    } = req.body;
    const messageId = nanoid();
    // let memory: CoreMessage[] = [];
    const agent = new FinanceAgent(
      query,
      // memory,
      messageId,
      conversationId,
      username,
      userId
    );
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Conversation-ID", conversationId);
    res.setHeader("X-Message-ID", messageId);

    // Get the stream
    const streamResult = await agent.createStream();
    const stream = streamResult.toDataStreamResponse();

    // Pipe the stream to response
    stream.body?.pipeTo(
      new WritableStream({
        write(chunk) {
          res.write(chunk);
        },
        close() {
          res.end();
        },
        abort(err) {
          console.error("Stream aborted:", err);
          res.end();
        },
      })
    );
  } catch (error: any) {
    console.log(error);
    throw new BadRequestError(error.message || "Something went wrong!");
  }
};

export { financeChatStream };
