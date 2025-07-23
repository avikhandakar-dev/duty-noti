import { Request, Response } from "express";
import prisma from "@/src/lib/prisma";
import { BadRequestError, UnAuthenticatedError } from "@/src/errors";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { aiQueue } from "../job/queue";
import { Reaction } from "@prisma/client";
import { classifyComment } from "../lib/ai.utils";
import { redisCache } from "../lib/redis";

const updateNews = async (req: any, res: Response) => {
  try {
    await aiQueue.add(`update-news`, {
      queueType: "UPDATE-NEWS",
    });
    res.status(StatusCodes.OK).json({ success: true });
  } catch (error: any) {
    console.log(error);
    throw new BadRequestError(error.message || "Something went wrong!");
  }
};

const getNewsBySymbol = async (req: any, res: Response) => {
  try {
    const { symbol } = req.params;
    if (!symbol) throw new BadRequestError("Symbol is required");
    const news = await prisma.news.findMany({
      where: {
        symbol,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    });
    res.status(StatusCodes.OK).json({ news });
  } catch (error: any) {
    console.log(error);
    throw new BadRequestError(error.message || "Something went wrong!");
  }
};

export { updateNews, getNewsBySymbol };
