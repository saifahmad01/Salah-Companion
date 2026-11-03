import { prisma } from '../db/prisma.js';

/**
 * GET /api/quran/resources
 * Returns active Quran and study PDF resources for client readers
 */
export async function getQuranResources(req, res) {
  try {
    const resources = await prisma.quranResource.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    // Format bigints to numbers/strings for JSON serialization
    const formatted = resources.map((r) => ({
      ...r,
      fileSize: Number(r.fileSize),
    }));

    return res.json({
      success: true,
      data: formatted,
    });
  } catch (err) {
    console.error('[QuranResourceController] Error fetching resources:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve Quran resources',
    });
  }
}

/**
 * GET /api/quran/resources/:key
 * Returns metadata and public URL for a specific resource key
 */
export async function getQuranResourceByKey(req, res) {
  try {
    const { key } = req.params;
    const resource = await prisma.quranResource.findUnique({
      where: { resourceKey: key },
    });

    if (!resource || !resource.isActive) {
      return res.status(404).json({
        success: false,
        error: `Resource '${key}' not found or inactive`,
      });
    }

    return res.json({
      success: true,
      data: {
        ...resource,
        fileSize: Number(resource.fileSize),
      },
    });
  } catch (err) {
    console.error(`[QuranResourceController] Error fetching resource ${req.params.key}:`, err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve resource',
    });
  }
}

/**
 * GET /api/admin/quran/resources
 * List all resources (including inactive) for admin console
 */
export async function getAdminQuranResources(req, res) {
  try {
    const resources = await prisma.quranResource.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      success: true,
      data: resources.map((r) => ({
        ...r,
        fileSize: Number(r.fileSize),
      })),
    });
  } catch (err) {
    console.error('[QuranResourceController] Error in admin list:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch admin resources',
    });
  }
}

/**
 * POST /api/admin/quran/resources
 * Register or update a Quran PDF resource metadata
 */
export async function upsertQuranResource(req, res) {
  try {
    const { resourceKey, title, fileName, storagePath, fileSize, publicUrl, metadata, isActive } = req.body;

    if (!resourceKey || !title || !fileName || !storagePath || !publicUrl) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: resourceKey, title, fileName, storagePath, publicUrl',
      });
    }

    const existing = await prisma.quranResource.findUnique({
      where: { resourceKey },
    });

    let resource;
    if (existing) {
      resource = await prisma.quranResource.update({
        where: { resourceKey },
        data: {
          title,
          fileName,
          storagePath,
          fileSize: BigInt(fileSize || existing.fileSize),
          version: existing.version + 1,
          publicUrl,
          metadata: metadata || existing.metadata,
          isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
          updatedAt: new Date(),
        },
      });
    } else {
      resource = await prisma.quranResource.create({
        data: {
          resourceKey,
          title,
          fileName,
          storagePath,
          fileSize: BigInt(fileSize || 0),
          version: 1,
          publicUrl,
          metadata: metadata || null,
          isActive: isActive !== undefined ? Boolean(isActive) : true,
        },
      });
    }

    return res.json({
      success: true,
      message: `Resource '${resourceKey}' saved successfully`,
      data: {
        ...resource,
        fileSize: Number(resource.fileSize),
      },
    });
  } catch (err) {
    console.error('[QuranResourceController] Error upserting resource:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to save resource',
    });
  }
}

/**
 * PATCH /api/admin/quran/resources/:id/status
 * Toggle active/inactive status
 */
export async function toggleResourceStatus(req, res) {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (isActive === undefined) {
      return res.status(400).json({ success: false, error: 'isActive boolean required' });
    }

    const updated = await prisma.quranResource.update({
      where: { id },
      data: { isActive: Boolean(isActive), updatedAt: new Date() },
    });

    return res.json({
      success: true,
      message: `Resource status updated to ${isActive ? 'active' : 'inactive'}`,
      data: {
        ...updated,
        fileSize: Number(updated.fileSize),
      },
    });
  } catch (err) {
    console.error('[QuranResourceController] Error toggling status:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to update resource status',
    });
  }
}
