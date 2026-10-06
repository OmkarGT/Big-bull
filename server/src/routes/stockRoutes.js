import { Router } from 'express';
import { getStock, getStockHistory, listStocks } from '../controllers/stockController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/', asyncHandler(listStocks));
router.get('/:id', asyncHandler(getStock));
router.get('/:id/history', asyncHandler(getStockHistory));

export default router;
