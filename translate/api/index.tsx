import { Button, Frog } from "frog";
import { devtools } from "frog/dev";
import { serveStatic } from "frog/serve-static";
import { neynar as neynarHub } from "frog/hubs";
import { neynar } from "frog/middlewares";
import { handle } from "frog/vercel";
import { vars } from "../lib/ui.js";
import OpenAI from "openai";

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY!;

export const app = new Frog({
  assetsPath: "/",
  basePath: "/api",
  ui: { vars },
  hub: neynarHub({ apiKey: NEYNAR_API_KEY }),
}).use(
  neynar({
    apiKey: NEYNAR_API_KEY,
    features: ["interactor", "cast"],
  })
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, dangerouslyAllowBrowser: true });

app.castAction("/english", c => {
  return c.frame({ path: '/view' })
},
  { name: "Translate to English", icon: "comment" }
);

app.frame('/view', async (c) => {
  const castText = c.var.cast?.text;

  const completion = await openai.chat.completions.create({
    messages: [
      { role: "system", content: 'You are a translation bot that translates text to English. If the text is already in English, please respond appropriately.' },
      { role: "user", content: `Translate this to English: ${castText}` }
    ],
    model: "gpt-3.5-turbo",
  });

  let openaiResponse = completion.choices[0].message.content;

  return c.res({
    image: (
      <div
        style={{
          alignItems: 'center',
          background: 'black',
          backgroundSize: '100% 100%',
          display: 'flex',
          flexDirection: 'column',
          flexWrap: 'nowrap',
          height: '100%',
          justifyContent: 'center',
          textAlign: 'center',
          width: '100%',
        }}
      >
        <div
          style={{
            color: 'white',
            fontSize: 34,
            fontStyle: 'normal',
            letterSpacing: '-0.025em',
            lineHeight: 1,
            marginTop: 10,
            padding: '0 60px',
            whiteSpace: 'pre-wrap',
          }}
        >
          {`${openaiResponse}`}
        </div>
      </div>
    ),
    intents: [
      <Button.Link href={`https://translate.google.com/?sl=auto&tl=en&text=${castText}&op=translate`}>View on Google Translate</Button.Link>,
    ],
  })
})

// @ts-ignore
const isEdgeFunction = typeof EdgeFunction !== "undefined";
const isProduction = isEdgeFunction || import.meta.env?.MODE !== "development";
devtools(app, isProduction ? { assetsPath: "/.frog" } : { serveStatic });

export const GET = handle(app);
export const POST = handle(app);
