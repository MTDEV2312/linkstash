import express from 'express';
import { getSummary } from '../controllers/dashboardController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Summary
router.get('/summary', authMiddleware, getSummary);

export default router;
