import { Button, Frog } from "frog";
import { devtools } from "frog/dev";
import { serveStatic } from "frog/serve-static";
import { neynar as neynarHub } from "frog/hubs";
import { neynar } from "frog/middlewares";
import { handle } from "frog/vercel";
import { CastParamType, NeynarAPIClient } from "@neynar/nodejs-sdk";
// import { Box, Heading, Text, VStack, vars } from "../lib/ui.js";

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY ?? "";
const neynarClient = new NeynarAPIClient(NEYNAR_API_KEY);

const ADD_URL =
  "https://warpcast.com/~/add-cast-action?name=Upthumb&icon=thumbsup&actionType=post&postUrl=https://upthumbs.app/api/upthumb";

export const app = new Frog({
  assetsPath: "/",
  basePath: "/api",
  ui: undefined,
  hub: neynarHub({ apiKey: NEYNAR_API_KEY }),
  browserLocation: ADD_URL,
}).use(
  neynar({
    apiKey: NEYNAR_API_KEY,
    features: ["interactor", "cast"],
  })
);

// Cast action handler
app.hono.post("/upthumb", async (c) => {
  const {
    trustedData: { messageBytes },
  } = await c.req.json();

  const result = await neynarClient.validateFrameAction(messageBytes);
  if (result.valid) {
    const cast = await neynarClient.lookUpCastByHashOrWarpcastUrl(
      result.action.cast.hash,
      CastParamType.Hash
    );
    // TODO: Get the cast's text
    const {
      cast: {
        author: { fid, username },
      },
    } = cast;
    // TODO: Send text to OpenAI API

    // TODO: Post OpenAI's response using Neynar API

    let message = "Translated! ✅";
    return c.json({ message });
  } else {
    return c.json({ message: "Error" }, 401);
  }
});

// @ts-ignore
// const isEdgeFunction = typeof EdgeFunction !== "undefined";
// const isProduction = isEdgeFunction || import.meta.env?.MODE !== "development";
// devtools(app, isProduction ? { assetsPath: "/.frog" } : { serveStatic });

export const GET = handle(app);
export const POST = handle(app);