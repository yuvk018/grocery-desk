// llmLogRoutes.js - URLs under /api/llm-logs. Shopkeeper only: the messages are customers' orders.

import { Router } from 'express';
import * as llmLogController from '../controllers/llmLogController.js';
import requireShopkeeper from '../middleware/requireShopkeeper.js';

const router = Router();

router.get('/summary', requireShopkeeper, llmLogController.getSummary); // totals + latest calls

export default router;
