# Sharma General Store · AI Order Desk

A web app where customers type grocery orders the way they would text them, in English, Hindi (Roman script) or a mix, for example *"bhaiya 2 kilo atta, ek dozen ande aur 2 packet doodh bhej do"*. An LLM (Google Gemini) reads the message, our own code turns it into a priced order that the customer reviews and confirms, and the shopkeeper manages orders and the catalog from a dashboard.

**The key design decision:** the LLM only *reads* the message and says which product, how much and in what unit. Matching to real products, unit conversion, prices and stock are all plain, tested code. The LLM never sets a price, checks stock or saves anything.

## Features

**Customer**
- Free-text order box (English, Hinglish or mixed), with example messages
- Review screen: unit price, quantity, line total and order total; ambiguous items ("oil" → Mustard or Sunflower) and unmatched items ("dhaniya") are flagged for the customer to resolve, never guessed
- Change quantities, add or remove items, then confirm
- Can't confirm more than the stock; the maximum available is suggested
- If the LLM is slow, down or returns garbage: a clear message, and the order is built by picking products from a list
- Past orders with one-click **Reorder**

**Shopkeeper** (password login)
- Catalog: add, edit, remove products; low-stock items highlighted
- Orders dashboard: newest first, customer's original message next to the parsed items, status New → Packed → Delivered or Cancelled (cancel returns items to stock)
- LLM usage log: calls, success rate, average time and tokens, with the latest messages

## Tech stack and why

| Part | Choice | Why |
|---|---|---|
| Database | MongoDB Atlas (free M0) + Mongoose 9 | Free hosted database; schemas and simple queries |
| Backend | Node.js 24 + Express 5 | One language across the stack; Express 5 forwards errors from `async` routes automatically |
| Validation | Zod 4 | One schema per input, clear field-level error messages |
| LLM | Google Gemini free tier (`@google/genai`), model `gemini-3.5-flash-lite` | Free; supports JSON output in a fixed schema; fastest of the Gemini models we tried (see [DESIGN.md](DESIGN.md#llm-choice)) |
| Auth | JWT (`jsonwebtoken`) | Stateless shopkeeper login, no session store |
| Frontend | React 19 + Vite 8 + React Router 8 | Fast dev server and simple routing |
| Styling | Tailwind CSS 4 + lucide-react icons | Styles in the markup; colours defined once as tokens |
| Tests | Jest 30 + Supertest + mongodb-memory-server | Real HTTP tests against a throwaway in-memory database, with a fake LLM |

The API follows **Route → Controller → Service → Model**: controllers only handle HTTP; services hold all business rules and are the only layer that touches the database or Gemini. See [DESIGN.md](DESIGN.md).

## Setup (5 commands)

Needs Node.js 20+ (built with 24), a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) cluster and a free [Gemini API key](https://aistudio.google.com/apikey).

```bash
git clone https://github.com/yuvk018/grocery-desk.git
cd grocery-desk
npm run setup     # installs root, server and client packages; creates server/.env from .env.example
npm run seed      # after filling in server/.env: loads the 20 sample products
npm run dev       # starts the API (http://localhost:5000) and the website (http://localhost:5173)
```

Open http://localhost:5173. Customers enter a name; the shopkeeper signs in with `SHOPKEEPER_PASSWORD`.

### Environment variables (`server/.env`)

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | yes | Atlas connection string ending in the database name, e.g. `.../grocery` |
| `GEMINI_API_KEY` | yes | From https://aistudio.google.com/apikey. Without it, every order uses manual picking |
| `SHOPKEEPER_PASSWORD` | yes | Password for the shopkeeper login |
| `JWT_SECRET` | yes | Long random string used to sign login tokens |
| `GEMINI_MODEL` | no | Default `gemini-3.5-flash-lite` |
| `LLM_TIMEOUT_MS` | no | Give up on Gemini after this many ms and offer manual ordering. Default `25000` |
| `PORT` | no | API port. Default `5000` |
| `CLIENT_URL` | no | Website origin allowed by CORS. Default `http://localhost:5173` |
| `DNS_SERVERS` | no | e.g. `8.8.8.8,1.1.1.1`. Only needed if connecting to Atlas fails with `querySrv ECONNREFUSED` (see Known issues) |

All of them are listed with comments in [`server/.env.example`](server/.env.example). `.env` is git-ignored.

### Seeding

`npm run seed` deletes all products and inserts the 20 from the brief with the exact prices and stock (plus our extra `aliases` and `packSize` fields). Run it any time to reset the catalog. Orders are not touched.

### Tests

```bash
npm test
```

100 automated tests in `server/tests/` (about 10 seconds). They use an in-memory MongoDB and a fake Gemini, so they need no `.env`, no internet and no API quota. The first run downloads a MongoDB binary.

| Area required by the brief | File |
|---|---|
| LLM output validation (bad JSON, wrong shape, timeout, Gemini errors) | `server/tests/llmOutput.test.js` |
| Unit conversion (half kg, 500 gm, 1.5 litre, ek dozen, 2 packet, "3 litre eggs") | `server/tests/units.test.js` |
| Stock reduction on confirm, including 20 simultaneous buyers of the last 8 units | `server/tests/orders.test.js` |

Also covered: all 12 test messages with a fake LLM (`parse.test.js`), the catalog API, shopkeeper auth and the usage log.

**Results of the 12 test messages** with the real Gemini model: [docs/TEST_RESULTS.md](docs/TEST_RESULTS.md).

## Project structure

```
server/   Express API
  src/routes/       URL → controller
  src/controllers/  read request, call service, send response
  src/services/     business rules: products, LLM, parsing, orders, auth, usage log
  src/models/       Product, Order, LlmLog (Mongoose)
  src/validators/   Zod schemas, including the LLM output schema
  src/prompts/      the Gemini prompt
  src/utils/        unit conversion, AppError
  src/middleware/   shopkeeper guard, error handler
  tests/            Jest + Supertest
client/   React app (Vite + Tailwind)
  src/pages/        Home, customer order page, shopkeeper orders / catalog / usage
  src/components/   review line, product picker, forms, header
docs/     test message results
```

## Known issues

- **Gemini free tier is slow at times and rate-limited.** Most replies took 1 to 4 s, but some took about 10 s or more. The timeout is 25 s (`LLM_TIMEOUT_MS`); past it, the customer gets manual ordering. The free tier also allows only a few requests per minute; when it runs out, orders fall back to manual picking until the limit resets.
- **LLM answers are not always identical.** The same message can occasionally be parsed slightly differently; anything uncertain is flagged for the customer rather than guessed.
- **Customers have no password.** "Your past orders" is looked up by name, so anyone typing the same name sees those orders. Acceptable for this assignment; real accounts would fix it.
- **No database transaction for multi-item orders.** Stock is taken item by item and given back if any item fails. If the server crashed in the middle of a confirm, the stock already taken for that order would not be returned.
- **Windows + some home routers:** Node can fail to look up Atlas's `mongodb+srv` address (`querySrv ECONNREFUSED`). Setting `DNS_SERVERS=8.8.8.8,1.1.1.1` in `server/.env` fixes it.
- Not deployed yet (optional stretch goal).

No API keys were committed to this repository.
