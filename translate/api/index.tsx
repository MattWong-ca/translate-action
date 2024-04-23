import { Frog } from "frog";
import { devtools } from "frog/dev";
import { serveStatic } from "frog/serve-static";
import { neynar as neynarHub } from "frog/hubs";
import { neynar } from "frog/middlewares";
import { handle } from "frog/vercel";
import { CastParamType, NeynarAPIClient } from "@neynar/nodejs-sdk";
import { vars } from "../lib/ui.js";
import OpenAI from "openai";

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY!;
const neynarClient = new NeynarAPIClient(NEYNAR_API_KEY);

const ADD_URL =
  "https://warpcast.com/~/add-cast-action?name=Translate+to+English&icon=comment&actionType=post&postUrl=https://translate-action.vercel.app/api/english";

export const app = new Frog({
  assetsPath: "/",
  basePath: "/api",
  ui: { vars },
  hub: neynarHub({ apiKey: NEYNAR_API_KEY }),
  browserLocation: ADD_URL,
}).use(
  neynar({
    apiKey: NEYNAR_API_KEY,
    features: ["interactor", "cast"],
  })
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, dangerouslyAllowBrowser: true });

// Cast action handler
app.hono.post("/english", async (c) => {
  const {
    trustedData: { messageBytes },
  } = await c.req.json();

  const result = await neynarClient.validateFrameAction(messageBytes);
  if (result.valid) {
    const cast = await neynarClient.lookUpCastByHashOrWarpcastUrl(
      result.action.cast.hash,
      CastParamType.Hash
    );
    const {
      cast: {
        // author: { fid, username },
        text,
        hash
      },
    } = cast;

    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: 'You are a translation bot that translates text to English. If the text is already in English, please respond appropriately.' },
        { role: "user", content: `Translate this to English: ${text}` }
      ],
      model: "gpt-3.5-turbo",
    });

    let openaiResponse = completion.choices[0].message.content;
    if (openaiResponse && openaiResponse.length > 320) {
      const replyOne = await neynarClient.publishCast(
        process.env.SIGNER_UUID!,
        openaiResponse.slice(0, 320),
        {
          replyTo: hash,
        }
      );
      await neynarClient.publishCast(
        process.env.SIGNER_UUID!,
        openaiResponse.slice(320),
        {
          replyTo: replyOne.hash,
        }
      );
    } else {
      await neynarClient.publishCast(
        process.env.SIGNER_UUID!,
        openaiResponse!,
        {
          replyTo: hash,
        }
      );
    }

    // let message = completion.choices[0].message.content;
    // if (message && message.length > 30) {
    //   message = "Upthumbed!";
    // }

    return c.json({ message: "Translated! ✅" });
  } else {
    return c.json({ message: "Error, please try again!" }, 401);
  }
});

// Frame handlers
// app.frame("/", (c) => {
//   return c.res({
//     image: (
//       <Box
//         grow
//         alignVertical="center"
//         backgroundColor="white"
//         padding="32"
//         border="1em solid rgb(138, 99, 210)"
//       >
//         <VStack gap="4">
//           <Heading color="fcPurple" align="center" size="64">
//             Upthumbs 👍
//           </Heading>
//         </VStack>
//       </Box>
//     ),
//     intents: [
//       <Button.Link href={ADD_URL}>Add Action</Button.Link>,
//       <Button value="leaderboard" action="/leaderboard">
//         🏆 Leaderboard
//       </Button>,
//       <Button value="start" action="/upthumbs">
//         👍 My Upthumbs
//       </Button>,
//     ],
//   });
// });

// @ts-ignore
const isEdgeFunction = typeof EdgeFunction !== "undefined";
const isProduction = isEdgeFunction || import.meta.env?.MODE !== "development";
devtools(app, isProduction ? { assetsPath: "/.frog" } : { serveStatic });

export const GET = handle(app);
export const POST = handle(app);
