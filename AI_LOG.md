# AI usage log

## Tools used

| Tool | Used for |
|---|---|
| **Claude Code**  | Planning the 13 build steps, writing the code and tests step by step|
| **Google Gemini** (`gemini-3.5-flash-lite`, free tier) | Inside the product: turns the customer's message into structured line items |

## Most important prompts

These are the prompts I gave Claude Code, lightly cleaned up for spelling.

1. *"Before writing code, analyse the assignment requirements and propose a backend architecture that is easy to maintain, test, and explain. Separate routes, controllers, services, models, middleware, and utilities according to their responsibilities."* 
2. *"Add comments and use Tailwind CSS for styling."*
3. *"Review the complete order-creation workflow and identify potential inconsistencies between order placement, price calculation, and stock deduction"*
4. *"Review the authentication and authorisation flow for shopkeeper operations. Verify JWT signatures and expiry, protect restricted routes with middleware, and ensure that customer-facing endpoints cannot perform shopkeeper-only actions."* 
5. *"Help me write a detailed system prompt for the Google Gemini API used in my Grocery Order Desk application. Gemini should understand natural-language grocery orders written by customers and convert them into structured JSON line items containing the product name, quantity, and unit. It should handle informal language, common spelling mistakes, multiple items in one message, and variations in how customers describe quantities. Include clear rules to avoid guessing missing information."*
6. *"Help me verify that the application handles multiple customers placing orders simultaneously. Design a reproducible test involving 20 concurrent order requests"* 

## Cases where the AI was wrong or poor, and how they were fixed

| # | What went wrong | How it was noticed | Fix |
|---|---|---|---|
| 1 | The AI chose `gemini-2.5-flash`, which Google has **retired for new API keys** | Every order fell back to manual mode; the LLM usage log showed `404 ... no longer available to new users` | Switched models (see 3) |
| 2 | It set `thinkingLevel: 'MINIMAL'`, which Gemini 3 models **reject** | `400 Thinking level MINIMAL is not supported` in the log | Changed to `'LOW'` |
| 3 | It generated the response schema from Zod (`z.toJSONSchema`); Gemini **rejected** it with a bare `400 invalid argument` | Gemini calls failed while plain calls worked; tested one setting at a time to isolate the schema | Wrote the Gemini JSON Schema by hand using `anyOf` for nullable fields; Zod still validates every reply |
| 4 | Its next model, `gemini-3.8-flash`, was correct but took **18 to 30+ s** per message on the free tier | Timed out against our limit; measured in a side-by-side run | Switched to `gemini-3.5-flash-lite` (about 1 to 4 s) |
| 5 | The stock update used an aggregation pipeline that **Mongoose 9 refuses** without an extra option | The new order tests failed with 500 errors | Added `{ updatePipeline: true }` |
| 6 | "Newest first" lists sorted only by `createdAt`, so **records saved in the same millisecond came back in random order** | A test passed several times, then failed once | Added `_id` as a tie-breaker in the sort |
| 7 | During a live check the AI's `kill` stopped only a shell wrapper, so an **old server kept running** and answered with outdated code | New endpoint returned "Route not found" although its tests passed | Found the process on port 5000, stopped it, and used PowerShell to start and stop test servers |
| 8 | The **10 s LLM timeout** it chose was too strict for the free tier: several real calls took about 9.5 to 10 s | Test message 4 timed out; other calls finished just under the limit | Raised `LLM_TIMEOUT_MS` to 25 s |
| 9 | The first UI **looked AI-generated** (emojis as icons, generic layout, a condensed serif font) | My own review of the screens | Redesigned: lucide icons, DM Sans, a forest-green and saffron palette, a new landing page |

## Parts I wrote or substantially changed myself

## My Contributions

- **Project Planning & Architecture:** Organised the implementation into manageable steps and structured the backend using routes, controllers, services, and database models.

- **Backend Development:** Worked on order processing, MongoDB integration, inventory management, price calculations, and service-layer separation.

- **LLM integration and validation:** Worked through how customer messages are converted into structured order items using Gemini, followed by validation, product matching, unit conversion, and database-based price lookup. Helped troubleshoot model compatibility, response schemas, and timeout issues. changed the timeout to 25 seconds.

- **Authentication & Security:** Contributed to the decision to implement password-based shopkeeper authentication using JWT rather than introducing a full customer-account system keeping the implementation focused on the assignment requirements.

- **Testing & Reliability:** Tested order processing, concurrent requests, inventory consistency, sorting behaviour, and API error handling.

- **Frontend & UI/UX:** Built a responsive interface using React, Tailwind CSS, and Lucide icons focusing on usability and consistent styling.


<!-- TODO: fill this in yourself. Only you can say which parts you wrote, edited or decided.
     Things that happened during the build which you may want to list (check and keep only what is true):
     - Changed the LLM timeout from 10 s to 25 s myself (server/.env and the default in llmService.js) after seeing timeouts
     - Decided on ES modules, Tailwind, shopkeeper-only login, and rejected the first UI designs
     - Asked to cut the terminal logging down to the essentials, and later removed the log-file feature
     - Set up MongoDB Atlas and the Gemini API key
     - Anything you edited by hand in the code
-->
