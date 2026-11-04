import React, { useState, useEffect } from 'react';
import {
  Smartphone,
    CheckCircle2,
  AlertCircle,
    Save,
  Plus,
  Trash2,
  Sparkles,
  } from 'lucide-react';
import { adminApi } from '../../services/backendApi';
import { CURRENT_APP_VERSION, type AppReleaseMetadata } from '../../config/version';

export const AppReleaseManagementView: React.FC<{
  onNotification?: (type: 'success' | 'error', message: string) => void;
}> = ({ onNotification }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [releaseInfo, setReleaseInfo] = useState<AppReleaseMetadata>({
    version: CURRENT_APP_VERSION,
    buildNumber: 100,
    releaseDate: new Date().toISOString().split('T')[0],
    releaseNotes: [],
    apkDownloadUrl: null,
    minSupportedVersion: '1.0.0',
    isMandatoryUpdate: false,
  });

  const [formVersion, setFormVersion] = useState(CURRENT_APP_VERSION);
  const [formBuildNumber, setFormBuildNumber] = useState(100);
  const [formReleaseDate, setFormReleaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [formApkUrl, setFormApkUrl] = useState('');
  const [formMinVersion, setFormMinVersion] = useState('1.0.0');
  const [formNotes, setFormNotes] = useState<string[]>([]);
  const [newNoteInput, setNewNoteInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchRelease = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getAppReleaseInfo();
      if (res?.success && res.data) {
        setReleaseInfo(res.data);
        setFormVersion(res.data.version || CURRENT_APP_VERSION);
        setFormBuildNumber(res.data.buildNumber || 100);
        setFormReleaseDate(res.data.releaseDate || new Date().toISOString().split('T')[0]);
        setFormApkUrl(res.data.apkDownloadUrl || '');
        setFormMinVersion(res.data.minSupportedVersion || '1.0.0');
        setFormNotes(res.data.releaseNotes || []);
      }
    } catch (err: any) {
      console.error('[AppRelease] Failed to load release info:', err);
      setError(err?.message || 'Could not fetch current release information.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRelease();
  }, []);

  const handleAddNote = () => {
    if (!newNoteInput.trim()) return;
    setFormNotes([...formNotes, newNoteInput.trim()]);
    setNewNoteInput('');
  };

  const handleRemoveNote = (idx: number) => {
    setFormNotes(formNotes.filter((_, i) => i !== idx));
  };

  const handleSaveRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validate semver
    if (!/^\d+\.\d+\.\d+$/.test(formVersion.trim().replace(/^v/, ''))) {
      setError('Version must follow semantic versioning (e.g., 1.0.1 or 2.0.0).');
      return;
    }

    // Validate APK URL if present
    if (formApkUrl.trim()) {
      try {
        const u = new URL(formApkUrl.trim());
        if (u.protocol !== 'https:') {
          setError('Official APK download URL must use HTTPS.');
          return;
        }
        if (!formApkUrl.trim().toLowerCase().endsWith('.apk')) {
          setError('APK download URL must point to a file ending in .apk');
          return;
        }
      } catch {
        setError('Invalid APK download URL. Must be a valid HTTPS URL.');
        return;
      }
    }

    setSaving(true);
    try {
      const res = await adminApi.updateAppReleaseInfo({
        version: formVersion.trim().replace(/^v/, ''),
        buildNumber: Number(formBuildNumber) || releaseInfo.buildNumber + 1,
        releaseDate: formReleaseDate.trim(),
        releaseNotes: formNotes,
        apkDownloadUrl: formApkUrl.trim() || null,
        minSupportedVersion: formMinVersion.trim().replace(/^v/, '') || '1.0.0',
      });

      if (res?.success) {
        setSuccess(`Release v${res.data.version} published successfully!`);
        setReleaseInfo(res.data);
        if (onNotification) onNotification('success', `Published application release v${res.data.version}`);
      } else {
        throw new Error(res?.message || 'Failed to update release.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to update application release.');
      if (onNotification) onNotification('error', err?.message || 'Failed to update release.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-emerald-300 animate-pulse text-xs">
        Loading application release metadata...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#082E22] border border-emerald-800/60 shadow-lg text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-950 p-2 border border-emerald-600/40 flex items-center justify-center text-amber-300">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Application Releases & Distribution</h2>
            <p className="text-xs text-emerald-300/80 mt-0.5">
              Publish production version updates, manage APK download links, and write changelogs.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-emerald-200/90 font-mono bg-[#07241A] px-3 py-1 rounded-xl border border-emerald-700/50">
            Active: <strong>v{releaseInfo.version}</strong> (Build {releaseInfo.buildNumber})
          </span>
        </div>
      </div>

      {/* Notifications */}
      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/60 text-rose-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Release Form */}
      <form onSubmit={handleSaveRelease} className="p-5 rounded-2xl bg-[#082E22] border border-emerald-800/60 shadow-lg text-white space-y-4">
        <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          <span>Publish New Version Metadata</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-emerald-200/90 mb-1">
              Version Number (Semver)
            </label>
            <input
              type="text"
              required
              value={formVersion}
              onChange={(e) => setFormVersion(e.target.value)}
              placeholder="1.0.1"
              className="w-full px-3 py-2 bg-[#07241A] rounded-xl border border-emerald-800 text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-emerald-200/90 mb-1">
              Build Number
            </label>
            <input
              type="number"
              required
              value={formBuildNumber}
              onChange={(e) => setFormBuildNumber(Number(e.target.value))}
              placeholder="101"
              className="w-full px-3 py-2 bg-[#07241A] rounded-xl border border-emerald-800 text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-emerald-200/90 mb-1">
              Release Date
            </label>
            <input
              type="date"
              required
              value={formReleaseDate}
              onChange={(e) => setFormReleaseDate(e.target.value)}
              className="w-full px-3 py-2 bg-[#07241A] rounded-xl border border-emerald-800 text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-emerald-200/90 mb-1">
            Official Signed APK Download URL (HTTPS Only)
          </label>
          <input
            type="url"
            value={formApkUrl}
            onChange={(e) => setFormApkUrl(e.target.value)}
            placeholder="https://github.com/saifahmad01/Salah-Companion/releases/download/v1.0.1/salah-companion-v1.0.1-release.apk"
            className="w-full px-3 py-2 bg-[#07241A] rounded-xl border border-emerald-800 text-white font-mono text-xs focus:border-amber-400 focus:outline-none placeholder-emerald-800"
          />
          <p className="text-[10px] text-emerald-400/80 mt-1">
            Must be a secure HTTPS link to a production-signed APK. Leave empty if distributing exclusively via Web App / PWA.
          </p>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-emerald-200/90 mb-1">
            Minimum Supported Version
          </label>
          <input
            type="text"
            value={formMinVersion}
            onChange={(e) => setFormMinVersion(e.target.value)}
            placeholder="1.0.0"
            className="w-full sm:w-48 px-3 py-2 bg-[#07241A] rounded-xl border border-emerald-800 text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
          />
        </div>

        {/* Release Notes */}
        <div className="space-y-2 pt-2 border-t border-emerald-900/60">
          <label className="block text-[11px] font-semibold text-emerald-200/90">
            Release Notes (Changelog Highlights)
          </label>

          <div className="flex gap-2">
            <input
              type="text"
              value={newNoteInput}
              onChange={(e) => setNewNoteInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddNote();
                }
              }}
              placeholder="e.g. Added responsive PDF reader zoom and 30 Para jump controls"
              className="flex-1 px-3 py-2 bg-[#07241A] rounded-xl border border-emerald-800 text-white text-xs focus:border-amber-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAddNote}
              className="px-3.5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          <ul className="space-y-1.5 mt-2">
            {formNotes.map((note, idx) => (
              <li
                key={idx}
                className="flex items-center justify-between p-2 rounded-xl bg-[#07241A] border border-emerald-900/80 text-xs text-emerald-100"
              >
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 font-bold">•</span>
                  <span>{note}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveNote(idx)}
                  className="text-stone-400 hover:text-rose-400 transition cursor-pointer p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="pt-3 border-t border-emerald-900/60 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#072118] text-xs font-bold shadow-md cursor-pointer transition flex items-center gap-2 active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Publishing Release...' : 'Publish Release'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
