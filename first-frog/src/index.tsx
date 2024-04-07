import { Button, Frog } from "frog";
import { devtools } from "frog/dev";
import { serveStatic } from "frog/serve-static";
import { neynar as neynarHub } from "frog/hubs";
import { neynar } from "frog/middlewares";
import { handle } from "frog/vercel";
import { CastParamType, NeynarAPIClient } from "@neynar/nodejs-sdk";
// import { upthumb } from "../lib/upthumb.js";
// import { Box, Heading, Text, VStack, vars } from "../lib/ui.js";

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY ?? "";
const neynarClient = new NeynarAPIClient(process.env.NEYNAR_API_KEY!);

const ADD_URL =
  "https://warpcast.com/~/add-cast-action?name=Translate+to+English&icon=comment&actionType=post&postUrl=https://translate-action.vercel.app/translate";

export const app = new Frog({
  assetsPath: "/",
  basePath: "/api",
  // ui: { vars },
  hub: neynarHub({ apiKey: NEYNAR_API_KEY }),
  browserLocation: ADD_URL,
}).use(
  neynar({
    apiKey: NEYNAR_API_KEY,
    features: ["interactor", "cast"],
  })
);

// Cast action handler
app.hono.post("/translate", async (c) => {
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
        author: { fid, username },
      },
    } = cast;
    if (result.action.interactor.fid === fid) {
      return c.json({ message: "Nice try." }, 400);
    }

    // await upthumb(fid, username);

    let message = `You upthumbed ${username}`;
    if (message.length > 30) {
      message = "Upthumbed!";
    }

    return c.json({ message });
  } else {
    return c.json({ message: "Unauthorized" }, 401);
  }
});

// @ts-ignore
// const isEdgeFunction = typeof EdgeFunction !== "undefined";
// const isProduction = isEdgeFunction || import.meta.env?.MODE !== "development";
// devtools(app, isProduction ? { assetsPath: "/.frog" } : { serveStatic });

export const GET = handle(app);
export const POST = handle(app);