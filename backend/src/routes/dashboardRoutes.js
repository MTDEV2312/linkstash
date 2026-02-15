import express from 'express';
import { getOverview } from '../controllers/dashboardController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Overview (single call with summary + topTags + recent links + domains)
router.get('/overview', authMiddleware, getOverview);

export default router;
