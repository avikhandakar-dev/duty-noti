import { nanoid } from "nanoid";
import nodemailer from "nodemailer";

type EAddress = "noreply@dutyai.app";

interface ISendMail {
  from: EAddress;
  fromName?: string;
  to: string | string[];
  subject: string;
  html: string;
  attachments?: any;
}

export interface ISendMailCustom {
  senderEmail: string;
  senderName: string;
  host: string;
  port: number;
  username: string;
  password: string;
}

const getTransporter = (sendFrom: EAddress) => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: true,
    auth: {
      user: sendFrom,
      pass: process.env.SMTP_PASSWORD,
    },
  });
};

const sendMail = async ({
  from,
  fromName = "Duty AI",
  to,
  subject,
  html,
  attachments,
}: ISendMail) => {
  const messageId = `${nanoid()}@dutyai.app`;

  const mailOptions = {
    from: `"${fromName}" <${from}>`,
    to: process.env.NODE_ENV === "production" ? to : "avikhandakar@gmail.com",
    subject: subject,
    html: html,
    ...(attachments && {
      attachments: attachments,
    }),
    messageId,
  };
  const transporter = getTransporter(from);
  await new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, function (err, info) {
      if (err) {
        console.log(err);
        reject(err);
      } else {
        resolve(info);
      }
    });
  });
};

export { sendMail };
