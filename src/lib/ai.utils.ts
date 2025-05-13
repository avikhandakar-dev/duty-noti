import OpenAI from "openai";
import prisma from "../lib/prisma";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const chatCompletion = async (prompt: string) => {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
  });
  return response.choices[0].message.content;
};

const generateTitle = async (answer: string) => {
  const prompt = `Generate a short title in plain text for the following answer: ${answer} \n\n Include proper one emoji in the begining of the title`;
  const response = await chatCompletion(prompt);
  return response;
};

const classifyComment = async (comment: string) => {
  const prompt = `You are a comment moderation AI for a stock market analysis app. Your task is to monitor and filter user comments before they are published. Please follow these rules carefully:

Reject all comments that:

Contain negative opinions about the app's performance, analysis, quizzes, or AI predictions.

Directly or indirectly damage the platform’s reputation or reduce user trust.

Could potentially discourage or demotivate other users, even if they are written politely.

Include complaints like “this quiz is useless,” “your analysis is wrong,” “AI gave wrong signals,” or any similar phrases in any language (Bangla, English, etc.).

Accept only those comments that:

Are positive, appreciative, or praising the app, analysis, or quiz.

Are neutral or general, such as asking a question or giving feedback without any negative tone.

Do not mention anything that could harm the platform’s credibility or user confidence.

If a comment seems unclear or neutral, analyze its tone and context carefully. If there is any chance it might create doubt or negativity among users, do not accept it.

Always prioritize maintaining the platform's reputation and user confidence.

Answer should be in one word. Classify the following comment as either "positive", "negative", or "neutral": ${comment}`;
  const response = await chatCompletion(prompt);
  return response;
};

export { chatCompletion, openai, generateTitle, classifyComment };
