import { Router } from 'express';
import { getProfile, resetCapital, updateProfile } from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(protect); // every route below needs a valid JWT

router.get('/profile', asyncHandler(getProfile));
router.put('/profile', asyncHandler(updateProfile));
router.post('/reset-capital', asyncHandler(resetCapital));

export default router;
