import express from 'express';
import { getMetrics } from '../controllers/metricsController.js';
import { authMiddleware, adminMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Metrics (authenticated)
router.get('/', authMiddleware, adminMiddleware, getMetrics);

export default router;
