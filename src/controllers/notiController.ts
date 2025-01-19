import { Request, Response } from "express";
import prisma from "@/src/lib/prisma";
import { BadRequestError, UnAuthenticatedError } from "@/src/errors";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { aiQueue } from "../job/queue";
import { Reaction } from "@prisma/client";

const sendSchema = z.object({
  title: z.string(),
  body: z.string(),
});

const commentReactionSchema = z.object({
  reaction: z.nativeEnum(Reaction),
  analysisId: z.string(),
  userId: z.string(),
});

const commentSchema = z.object({
  user: z.any(),
  userId: z.string(),
  text: z.string(),
  analysisId: z.string(),
});

const sendAnalysisSchema = z.object({
  title: z.string(),
  message: z.string(),
  companyName: z.string(),
  price: z.string().optional().nullish().default(""),
  changePer: z.string().optional().nullish().default(""),
  photoDark: z.string().optional().nullish().default(""),
  photoLight: z.string().optional().nullish().default(""),
  content: z.string().optional().nullish().default(""),
  country: z.string().default("BD"),
});

const sendPushNotification = async (req: any, res: Response) => {
  try {
    const { title, body } = sendSchema.parse(req.body);
    console.log(title, body);

    await aiQueue.add(`send-push-notification`, {
      title,
      body,
      queueType: "SEND-PUSH-NOTIFICATION",
    });

    res.status(StatusCodes.OK).json({ success: true });
  } catch (error: any) {
    console.log(error);
    throw new BadRequestError(error.message || "Something went wrong!");
  }
};

const sendAnalysis = async (req: any, res: Response) => {
  try {
    const {
      title,
      message,
      companyName,
      price,
      changePer,
      photoDark,
      photoLight,
      content,
      country,
    } = sendAnalysisSchema.parse(req.body);
    const analysis = await prisma.analysis.create({
      data: {
        title,
        message,
        companyName,
        price,
        changePer,
        photoDark,
        photoLight,
        content,
        country,
      },
    });
    await aiQueue.add(`send-push-notification-analysis`, {
      title,
      message,
      companyName,
      analysisId: analysis.id,
      queueType: "SEND-PUSH-NOTIFICATION-ANALYSIS",
    });

    res.status(StatusCodes.OK).json({ success: true });
  } catch (error: any) {
    console.log(error);
    throw new BadRequestError(error.message || "Something went wrong!");
  }
};

const addComment = async (req: any, res: Response) => {
  try {
    const { user, userId, text, analysisId } = commentSchema.parse(req.body);
    const comment = await prisma.analysisComment.create({
      data: {
        user,
        userId,
        text,
        analysisId,
      },
    });
    res.status(StatusCodes.OK).json({ comment });
  } catch (error: any) {
    console.log(error);
    throw new BadRequestError(error.message || "Something went wrong!");
  }
};

const giveReaction = async (req: any, res: Response) => {
  try {
    const { reaction, analysisId, userId } = commentReactionSchema.parse(
      req.body
    );
    const analysisReact = await prisma.analysisReact.findUnique({
      where: {
        userId_reaction_analysisId: {
          userId,
          reaction,
          analysisId,
        },
      },
    });
    if (analysisReact && analysisReact.reaction === reaction) {
      await prisma.analysisReact.delete({
        where: {
          userId_reaction_analysisId: {
            userId,
            reaction,
            analysisId,
          },
        },
      });
      return res.status(StatusCodes.OK).json({ [reaction]: false });
    }
    await prisma.analysisReact.upsert({
      where: {
        userId_reaction_analysisId: {
          userId,
          reaction,
          analysisId,
        },
      },
      create: {
        reaction,
        analysisId,
        userId,
      },
      update: {
        reaction,
      },
    });
    res.status(StatusCodes.OK).json({ [reaction]: true });
  } catch (error: any) {
    console.log(error);
    throw new BadRequestError(error.message || "Something went wrong!");
  }
};

const getComments = async (req: any, res: Response) => {
  try {
    const { analysisId } = req.params;
    const comments = await prisma.analysisComment.findMany({
      where: {
        analysisId,
      },
      include: {
        reacts: {
          select: {
            reaction: true,
            userId: true,
          },
        },
      },
    });
    res.status(StatusCodes.OK).json({ comments });
  } catch (error: any) {
    console.log(error);
    throw new BadRequestError(error.message || "Something went wrong!");
  }
};

export {
  sendPushNotification,
  sendAnalysis,
  addComment,
  giveReaction,
  getComments,
};
