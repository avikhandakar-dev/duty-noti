import { Request, Response } from "express";
import prisma from "@/src/lib/prisma";
import { BadRequestError, UnAuthenticatedError } from "@/src/errors";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { aiQueue } from "../job/queue";

const sendSchema = z.object({
  title: z.string(),
  body: z.string(),
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

export { sendPushNotification, sendAnalysis };
