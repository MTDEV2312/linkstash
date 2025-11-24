import express from 'express';
import { getMetrics } from '../controllers/metricsController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Metrics (authenticated)
router.get('/', authMiddleware, getMetrics);

export default router;
