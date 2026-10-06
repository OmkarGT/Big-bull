import { Router } from 'express';
import { buy, getPortfolioSummary, getTrades, sell } from '../controllers/tradeController.js';
import { protect } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/portfolio', protect, asyncHandler(getPortfolioSummary));
router.get('/trades', protect, asyncHandler(getTrades));

router.post('/trades/buy', protect, asyncHandler(buy));
router.post('/trades/sell', protect, asyncHandler(sell));

export default router;
