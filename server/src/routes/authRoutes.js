// authRoutes.js - URLs under /api/auth.

import { Router } from 'express';
import * as authController from '../controllers/authController.js';

const router = Router();

router.post('/login', authController.login); // shopkeeper password -> token

export default router;
