# AI usage log

## Tools used

| Tool | Used for |
|---|---|
| **Claude Code** (Anthropic, in VS Code) | Planning the 13 build steps, writing most of the code and tests step by step (each step approved before it was written), explaining each file, debugging, and drafting these docs |
| **Google Gemini** (`gemini-3.5-flash-lite`, free tier) | Inside the product: turns the customer's message into structured line items |
| <!-- TODO: add any other tool you used, e.g. ChatGPT, Copilot --> | |

## Most important prompts

These are the prompts I gave Claude Code, lightly cleaned up for spelling.

1. *"This is the document I have been asked to make for an interview. Create this assignment using the MERN stack and the Google Gemini free tier API for the LLM. Create the files step by step and ask me before each step, strictly follow the rules given in the doc, and add a service layer in the API so the API does not interact with the DB directly. Build it so that, as a beginner, I can explain the project."* (with the assignment PDF attached)
2. *"Add comments and use Tailwind CSS for styling."*
3. *"Use ES modules for imports, not CommonJS. Change it wherever you used CommonJS."*
4. *"I want authentication for the role switch. Should we do it? First tell me."* → chose a shopkeeper-only password login (JWT) over full customer accounts, to stay within the deadline.
5. *"Make the UI not look like it was made by AI. Make it responsive, aesthetic and professional."*, then *"use the lucide library instead of SVG icons"* and *"I didn't like the landing page"*, until the current design.
6. *"Where is the logic where the LLM understands '2 kg atta' as wheat flour?"* → walked through prompt → Gemini → validation → matching → unit conversion → database price.
7. *"How do I show 2–3 customers ordering at the same time?"* → the concurrency test (20 simultaneous buyers) and a two-window browser check.
8. *"Should we add Grok results as a sample without testing to show Gemini is better?"* → no; untested results would be invented data. Kept only the Gemini models we actually measured.

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

<!-- TODO: fill this in yourself. Only you can say which parts you wrote, edited or decided.
     Things that happened during the build which you may want to list (check and keep only what is true):
     - Changed the LLM timeout from 10 s to 25 s myself (server/.env and the default in llmService.js) after seeing timeouts
     - Decided on ES modules, Tailwind, shopkeeper-only login, and rejected the first UI designs
     - Asked to cut the terminal logging down to the essentials, and later removed the log-file feature
     - Set up MongoDB Atlas and the Gemini API key
     - Anything you edited by hand in the code
-->
