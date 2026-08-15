import Link from '../models/Link.js';
import Tag from '../models/Tag.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('DashboardController');

// @desc    Obtener overview optimizado para dashboard (con métricas)
// @route   GET /api/dashboard/overview
// @access  Private
const getOverview = async (req, res) => {
  try {
    const userId = req.user.supabaseId || req.user._id.toString();

    // Ejecutar consultas en paralelo para reducir latencia
    const [summaryAgg, topTags, recentLinks, domainAgg] = await Promise.all([
      Link.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: null,
            totalLinks: { $sum: 1 },
            favorites: { $sum: { $cond: ['$isFavorite', 1, 0] } },
            archived: { $sum: { $cond: ['$isArchived', 1, 0] } },
            totalClicks: { $sum: '$clickCount' }
          }
        },
        { $project: { _id: 0, totalLinks: 1, favorites: 1, archived: 1, totalClicks: 1 } }
      ]).exec(),
      Tag.getPopularTags(userId, 6),
      Link.find({ userId }).sort({ createdAt: -1 }).limit(8).select('url title image clickCount createdAt isFavorite tags').lean().exec(),
      Link.aggregate([
        { $match: { userId } },
        { $project: { domain: { $arrayElemAt: [{ $split: ['$url', '/'] }, 2] } } },
        { $group: { _id: '$domain', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]).exec()
    ]);

    const summary = (summaryAgg && summaryAgg[0]) || { totalLinks: 0, favorites: 0, archived: 0, totalClicks: 0 };

    // needsDescription para el overview
    const defaultDesc = (process.env.DEFAULT_DESCRIPTION || '').trim();
    const needsDescQuery = {
      userId,
      $or: [
        { needsDescription: true },
        { description: { $in: ['', null] } },
        { description: { $regex: '^\\s*$' } }
      ]
    };
    if (defaultDesc) needsDescQuery.$or.push({ description: defaultDesc });

    const needsDescriptionCount = await Link.countDocuments(needsDescQuery).exec();
    summary.needsDescription = needsDescriptionCount;

    const popularDomains = (domainAgg || []).map(d => ({ domain: d._id, count: d.count }));

    res.json({
      success: true,
      data: {
        summary: { ...summary },
        topTags,
        recentLinks,
        popularDomains
      }
    });

  } catch (error) {
    logger.error('Error en dashboard.getOverview', error, { userId: req.user?._id });
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

export { getOverview };
