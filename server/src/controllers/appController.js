import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const releaseConfigPath = path.resolve(__dirname, '../data/releaseConfig.json');

function readReleaseConfig() {
  try {
    if (fs.existsSync(releaseConfigPath)) {
      const data = fs.readFileSync(releaseConfigPath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('[AppController] Error reading releaseConfig.json:', err.message);
  }
  return {
    version: '1.0.0',
    buildNumber: 100,
    releaseDate: '2026-11-04',
    releaseNotes: [
      'Automated missed Salah tracking with astronomical sunset & sunrise deadlines',
      'Qada recovery management: 1-click fulfillment of elapsed prayers with authentic Hadith forgiveness reminders',
      'High-DPI offline Quran PDF reader with 30 Para navigation, quick jump, and page bookmarks',
      'Top 600 Arabic Vocabulary flashcards with review tracking and search',
      'Great Circle Qibla compass with EMA sensor smoothing and Kaaba alignment haptics',
      'OpenStreetMap Overpass nearby Mosque finder with distance routing',
      'Production Web Push and Capacitor native prayer start & 30-minute reminder alarms',
    ],
    apkDownloadUrl: null,
    minSupportedVersion: '1.0.0',
    isMandatoryUpdate: false,
    updatedAt: new Date().toISOString(),
  };
}

function writeReleaseConfig(config) {
  const dir = path.dirname(releaseConfigPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(releaseConfigPath, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * GET /api/app/version
 * Public endpoint returning the latest application release metadata
 */
export async function getAppReleaseInfo(req, res) {
  try {
    const config = readReleaseConfig();
    return res.status(200).json({
      success: true,
      data: config,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve application release information.',
    });
  }
}

/**
 * POST /api/admin/app/version
 * Admin endpoint to update the official application release metadata
 */
export async function updateAppReleaseInfo(req, res) {
  try {
    const {
      version,
      buildNumber,
      releaseDate,
      releaseNotes,
      apkDownloadUrl,
      minSupportedVersion,
      isMandatoryUpdate,
    } = req.body;

    // Validate version format
    if (!version || typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version.trim().replace(/^v/, ''))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid version format. Expected semantic version like 1.0.1 or v1.0.1.',
      });
    }

    const cleanVersion = version.trim().replace(/^v/, '');

    // Validate APK download URL if provided: MUST be a valid HTTPS URL
    let cleanApkUrl = null;
    if (apkDownloadUrl && typeof apkDownloadUrl === 'string' && apkDownloadUrl.trim().length > 0) {
      const trimmedUrl = apkDownloadUrl.trim();
      try {
        const parsed = new URL(trimmedUrl);
        if (parsed.protocol !== 'https:') {
          return res.status(400).json({
            success: false,
            error: 'Official APK download URL must use secure HTTPS protocol.',
          });
        }
        if (!trimmedUrl.toLowerCase().endsWith('.apk')) {
          return res.status(400).json({
            success: false,
            error: 'Official APK download URL must point to a valid .apk package file.',
          });
        }
        cleanApkUrl = trimmedUrl;
      } catch {
        return res.status(400).json({
          success: false,
          error: 'Invalid APK download URL format. Must be a valid HTTPS URL.',
        });
      }
    }

    // Clean release notes
    let cleanNotes = [];
    if (Array.isArray(releaseNotes)) {
      cleanNotes = releaseNotes
        .map((n) => String(n).trim())
        .filter((n) => n.length > 0);
    }

    const current = readReleaseConfig();
    const updated = {
      ...current,
      version: cleanVersion,
      buildNumber: typeof buildNumber === 'number' ? buildNumber : (current.buildNumber + 1),
      releaseDate: releaseDate && typeof releaseDate === 'string' ? releaseDate.trim() : new Date().toISOString().split('T')[0],
      releaseNotes: cleanNotes.length > 0 ? cleanNotes : current.releaseNotes,
      apkDownloadUrl: cleanApkUrl,
      minSupportedVersion: minSupportedVersion && typeof minSupportedVersion === 'string' ? minSupportedVersion.trim().replace(/^v/, '') : current.minSupportedVersion,
      isMandatoryUpdate: Boolean(isMandatoryUpdate),
      updatedAt: new Date().toISOString(),
      updatedBy: req.user?.email || 'admin',
    };

    writeReleaseConfig(updated);

    console.log(`[AppController] Admin ${req.user?.email} updated app release to version ${updated.version}`);

    return res.status(200).json({
      success: true,
      message: `Successfully published application release v${updated.version}`,
      data: updated,
    });
  } catch (err) {
    console.error('[AppController] Error updating release metadata:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to update application release metadata.',
    });
  }
}
