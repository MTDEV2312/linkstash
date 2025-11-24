import express from 'express';
import { getSummary, getOverview } from '../controllers/dashboardController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Summary
router.get('/summary', authMiddleware, getSummary);
// Overview (single call with summary + topTags + recent links + domains)
router.get('/overview', authMiddleware, getOverview);

export default router;
