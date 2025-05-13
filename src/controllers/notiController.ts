import { Request, Response } from "express";
import prisma from "@/src/lib/prisma";
import { BadRequestError, UnAuthenticatedError } from "@/src/errors";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { aiQueue } from "../job/queue";
import { Reaction } from "@prisma/client";
import { classifyComment } from "../lib/ai.utils";

const sendSchema = z.object({
  title: z.string(),
  body: z.string(),
});

const postReactionSchema = z.object({
  reaction: z.nativeEnum(Reaction),
  analysisId: z.string(),
  userId: z.string(),
});

const commentReactionSchema = z.object({
  reaction: z.nativeEnum(Reaction),
  commentId: z.string(),
  userId: z.string(),
  logo: z.string().optional().nullish().default(""),
});

const commentSchema = z.object({
  user: z.any(),
  userId: z.string(),
  text: z.string(),
  analysisId: z.string(),
  parentId: z.string().optional(),
  logo: z.string().optional().nullish().default(""),
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
  requiredPremium: z.boolean().default(false),
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

const sendPushNotificationToTrialUser = async (req: any, res: Response) => {
  try {
    const { title, body } = sendSchema.parse(req.body);
    console.log(title, body);

    await aiQueue.add(`send-push-notification-to-trial-user`, {
      title,
      body,
      queueType: "SEND-PUSH-NOTIFICATION-TO-TRIAL-USER",
    });

    res.status(StatusCodes.OK).json({ success: true });
  } catch (error: any) {
    console.log(error);
    throw new BadRequestError(error.message || "Something went wrong!");
  }
};

const sendPushNotificationToFreeUser = async (req: any, res: Response) => {
  try {
    const { title, body } = sendSchema.parse(req.body);
    console.log(title, body);

    await aiQueue.add(`send-push-notification-to-free-user`, {
      title,
      body,
      queueType: "SEND-PUSH-NOTIFICATION-TO-FREE-USER",
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
      requiredPremium,
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
        requiredPremium,
      },
    });
    await aiQueue.add(`send-push-notification-analysis`, {
      title,
      message,
      companyName,
      analysisId: analysis.id,
      requiredPremium,
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
    const { user, userId, text, analysisId, parentId } = commentSchema.parse(
      req.body
    );
    const c = await classifyComment(text);
    const shouldBePrivate = c?.toLowerCase().includes("negative");
    const comment = await prisma.analysisComment.create({
      data: {
        user,
        userId,
        text,
        analysisId,
        isPrivate: shouldBePrivate,
        ...(parentId && { parentId }),
      },
    });
    if (parentId) {
      await aiQueue.add(`send-push-notification-comment`, {
        userId,
        analysisId,
        parentId,
        logo: user?.profilePhoto,
        queueType: "SEND-PUSH-NOTIFICATION-COMMENT",
      });
    }
    res.status(StatusCodes.OK).json({ comment });
  } catch (error: any) {
    console.log(error);
    throw new BadRequestError(error.message || "Something went wrong!");
  }
};

const giveReaction = async (req: any, res: Response) => {
  try {
    const { reaction, analysisId, userId } = postReactionSchema.parse(req.body);
    const analysisReact = await prisma.analysisReact.findFirst({
      where: {
        analysisId,
        userId,
      },
    });
    if (analysisReact) {
      await prisma.analysisReact.deleteMany({
        where: {
          analysisId,
          userId,
        },
      });
    }

    if (analysisReact?.reaction !== reaction) {
      await prisma.analysisReact.create({
        data: {
          reaction,
          analysisId,
          userId,
        },
      });
    }
    res.status(StatusCodes.OK).json({ [reaction]: true });
  } catch (error: any) {
    console.log(error);
    throw new BadRequestError(error.message || "Something went wrong!");
  }
};

const giveReactionToComment = async (req: any, res: Response) => {
  try {
    const { reaction, commentId, userId, logo } = commentReactionSchema.parse(
      req.body
    );
    const commentReact = await prisma.analysisCommentReact.findFirst({
      where: {
        commentId,
        userId,
      },
    });
    if (commentReact) {
      await prisma.analysisCommentReact.deleteMany({
        where: {
          commentId,
          userId,
        },
      });
    }

    if (commentReact?.reaction !== reaction) {
      await prisma.analysisCommentReact.create({
        data: {
          reaction,
          commentId,
          userId,
        },
      });
    }
    if (!commentReact) {
      await aiQueue.add(`send-push-notification-reaction`, {
        userId,
        commentId,
        reaction,
        logo,
        queueType: "SEND-PUSH-NOTIFICATION-REACTION",
      });
    }
    res.status(StatusCodes.OK).json({ [reaction]: true });
  } catch (error: any) {
    console.log(error);
    throw new BadRequestError(error.message || "Something went wrong!");
  }
};

const getComments = async (req: any, res: Response) => {
  try {
    const { analysisId } = req.params;
    const { page = 1, limit = 10, userId } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // First, get only root level comments (those without parentId)
    // Build the where condition based on whether userId is provided
    const whereCondition: any = {
      analysisId,
      parentId: null, // Only root comments
    };

    // Only apply privacy filtering if userId is provided
    if (userId) {
      whereCondition.OR = [
        { isPrivate: false }, // Public comments visible to all
        { isPrivate: true, userId: userId as string }, // Private comments visible only to owner
      ];
    } else {
      // If no userId provided, only show public comments
      whereCondition.isPrivate = false;
    }

    const rootComments = await prisma.analysisComment.findMany({
      where: whereCondition,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        _count: {
          select: {
            reacts: true, // Count reactions for each comment
          },
        },
        reacts: userId
          ? {
              where: {
                userId: userId as string,
                reaction: "Like",
              },
            }
          : false,
      },
      skip,
      take: limitNum,
    });

    // Then get all descendants for these root comments
    const commentsWithReplies = await Promise.all(
      rootComments.map(async (comment) => {
        // Fetch all nested replies for this comment
        const replies = await fetchNestedReplies(
          comment.id,
          userId as string | undefined
        );
        return {
          ...comment,
          children: replies,
          likesCount: comment._count.reacts,
          likedByMe: userId ? comment.reacts.length > 0 : false,
          reacts: undefined, // Remove the reacts array from the response
        };
      })
    );

    // Get total count of root comments for pagination
    // Only count comments that the user is allowed to see
    const totalRootComments = await prisma.analysisComment.count({
      where: whereCondition,
    });

    const totalPages = Math.ceil(totalRootComments / limitNum);

    res.status(StatusCodes.OK).json({
      comments: commentsWithReplies,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: totalRootComments,
        itemsPerPage: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPreviousPage: pageNum > 1,
      },
    });
  } catch (error: any) {
    console.log(error);
    throw new BadRequestError(error.message || "Something went wrong!");
  }
};

// Helper function to recursively fetch all nested comments
// Add explicit return type to fix the TypeScript error
async function fetchNestedReplies(
  parentId: string,
  userId?: string
): Promise<any[]> {
  // Build the where condition based on whether userId is provided
  const whereCondition: any = {
    parentId,
  };

  // Only apply privacy filtering if userId is provided
  if (userId) {
    whereCondition.OR = [
      { isPrivate: false }, // Public comments visible to all
      { isPrivate: true, userId: userId }, // Private comments visible only to owner
    ];
  } else {
    // If no userId provided, only show public comments
    whereCondition.isPrivate = false;
  }

  const replies = await prisma.analysisComment.findMany({
    where: whereCondition,
    orderBy: {
      createdAt: "asc", // Show oldest comments first in replies
    },
    include: {
      _count: {
        select: {
          reacts: true, // Count reactions for each reply
        },
      },
      reacts: userId
        ? {
            where: {
              userId: userId,
              reaction: "Like",
            },
          }
        : false,
    },
  });

  // Recursively get nested replies for each reply
  const nestedReplies = await Promise.all(
    replies.map(async (reply) => {
      const children = await fetchNestedReplies(reply.id, userId);
      return {
        ...reply,
        children,
        likesCount: reply._count.reacts,
        likedByMe: userId ? reply.reacts.length > 0 : false,
        reacts: undefined, // Remove the reacts array from the response
      } as any;
    })
  );

  return nestedReplies;
}

export {
  sendPushNotification,
  sendAnalysis,
  addComment,
  giveReaction,
  getComments,
  sendPushNotificationToTrialUser,
  sendPushNotificationToFreeUser,
  giveReactionToComment,
};
