import { calculatePrayers } from '../services/prayerService.js';
import { recordPrayerLog } from '../services/logService.js';
import { getHadithByStatus } from '../services/hadithService.js';

/**
 * Controller to calculate prayer times using adhan
 * GET /api/prayers?lat={lat}&lng={lng}&method={method}&madhab={madhab}&date={date}
 */
export async function getPrayerTimesHandler(req, res, next) {
  try {
    const { lat, lng, method, madhab, date } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: 'Missing query parameters: "lat" (latitude) and "lng" (longitude) are required.',
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || latitude < -90 || latitude > 90) {
      return res.status(400).json({
        success: false,
        error: 'Invalid "lat" parameter. Must be a valid latitude between -90 and 90.',
      });
    }

    if (isNaN(longitude) || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        error: 'Invalid "lng" parameter. Must be a valid longitude between -180 and 180.',
      });
    }

    const targetDate = date ? new Date(date) : new Date();

    const result = calculatePrayers({
      latitude,
      longitude,
      method: method || 'Karachi',
      madhab: madhab || 'Hanafi',
      targetDate,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Controller to evaluate and save prayer log
 * POST /api/prayer/log
 * Body: { userId, prayerName, prayerStartTime, prayerEndTime, logTimestamp, overrideStatus, notes }
 */
export async function logPrayerHandler(req, res, next) {
  try {
    const {
      userId,
      prayerName,
      prayerStartTime,
      prayerEndTime,
      logTimestamp,
      status, // Optional manual override
      notes,
    } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Field "userId" is required.',
      });
    }

    if (!prayerName) {
      return res.status(400).json({
        success: false,
        error: 'Field "prayerName" is required (e.g. fajr, dhuhr, asr, maghrib, isha).',
      });
    }

    if (!prayerStartTime || !prayerEndTime) {
      return res.status(400).json({
        success: false,
        error: 'Both "prayerStartTime" and "prayerEndTime" ISO timestamp strings are required.',
      });
    }

    const { record, evaluation } = recordPrayerLog({
      userId,
      prayerName,
      prayerStartTime,
      prayerEndTime,
      logTimestamp: logTimestamp || new Date().toISOString(),
      overrideStatus: status,
      notes,
    });

    // Provide immediate relevant Hadith for the evaluated status
    const hadithInfo = getHadithByStatus(evaluation.status);

    return res.status(201).json({
      success: true,
      message: `Prayer ${prayerName} logged successfully as "${evaluation.status}".`,
      data: {
        record,
        evaluation,
        relevantHadith: hadithInfo.hadith,
      },
    });
  } catch (err) {
    next(err);
  }
}
