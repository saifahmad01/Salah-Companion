import express from 'express';
import { getAppReleaseInfo } from '../controllers/appController.js';

export const appRouter = express.Router();

appRouter.get('/version', getAppReleaseInfo);
appRouter.get('/release', getAppReleaseInfo);
