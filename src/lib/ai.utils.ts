import OpenAI from "openai";
import prisma from "../lib/prisma";

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

export { chatCompletion, openai, generateTitle };
