import { Router } from 'express';
import { getPrayerTimesHandler, logPrayerHandler } from '../controllers/prayerController.js';

export const prayerRouter = Router();

// GET /api/prayers?lat={lat}&lng={lng}&method={method}&madhab={madhab}
prayerRouter.get('/prayers', getPrayerTimesHandler);

// POST /api/prayer/log
prayerRouter.post('/prayer/log', logPrayerHandler);
