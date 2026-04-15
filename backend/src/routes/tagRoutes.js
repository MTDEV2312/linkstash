import express from 'express';
import Tag from '../models/Tag.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { getLogger } from '../utils/logger.js';

const router = express.Router();
const logger = getLogger('TagRoutes');

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// @desc    Obtener todas las etiquetas del usuario
// @route   GET /api/tags
// @access  Private
const getTags = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      search = '',
      popular = 'false',
      all = 'false',
      page = 1,
      limit = 5
    } = req.query;

    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 5, 1), 5);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);

    const searchCriteria = { userId };
    if (search) {
      searchCriteria.name = { $regex: search, $options: 'i' };
    }

    const sort = popular === 'true' ? { linkCount: -1, name: 1 } : { name: 1 };
    const totalTags = await Tag.countDocuments(searchCriteria);

    let query = Tag.find(searchCriteria).sort(sort);

    if (all !== 'true') {
      query = query.skip((safePage - 1) * safeLimit).limit(safeLimit);
    }

    const tags = await query.exec();
    const totalPages = all === 'true' ? 1 : Math.ceil(totalTags / safeLimit);

    res.json({
      success: true,
      data: {
        tags,
        pagination: {
          currentPage: all === 'true' ? 1 : safePage,
          totalPages,
          totalTags,
          itemsPerPage: all === 'true' ? totalTags : safeLimit,
          hasNextPage: all === 'true' ? false : safePage < totalPages,
          hasPrevPage: all === 'true' ? false : safePage > 1
        }
      }
    });

  } catch (error) {
    logger.error('Error en getTags', error, { userId: req.user?._id });
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Crear nueva etiqueta
// @route   POST /api/tags
// @access  Private
const createTag = async (req, res) => {
  try {
    const { name, color, description } = req.body;
    const userId = req.user._id;

    // Validar nombre requerido
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'El nombre de la etiqueta es obligatorio'
      });
    }

    // Verificar si la etiqueta ya existe
    const existingTag = await Tag.findOne({ 
      userId, 
      name: name.toLowerCase().trim() 
    });

    if (existingTag) {
      // Si ya existe, retornamos el recurso existente en vez de crear duplicado
      return res.status(200).json({
        success: true,
        message: 'Etiqueta ya existente',
        data: { tag: existingTag.getFullInfo ? existingTag.getFullInfo() : existingTag }
      });
    }

    // Crear nueva etiqueta
    const tag = new Tag({
      userId,
      name: name.toLowerCase().trim(),
      color: color || '#3B82F6',
      description: description || ''
    });

    await tag.save();

    logger.info(`Etiqueta creada: ${tag.name}`, { userId: req.user?._id });

    res.status(201).json({
      success: true,
      message: 'Etiqueta creada exitosamente',
      data: { tag: tag.getFullInfo() }
    });

  } catch (error) {
    logger.error('Error en createTag', error, { userId: req.user?._id });
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join('. ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Obtener etiqueta por ID
// @route   GET /api/tags/:id
// @access  Private
const getTagById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const tag = await Tag.findOne({ _id: id, userId });

    if (!tag) {
      return res.status(404).json({
        success: false,
        message: 'Etiqueta no encontrada'
      });
    }

    res.json({
      success: true,
      data: { tag: tag.getFullInfo() }
    });

  } catch (error) {
    logger.error('Error en getTagById', error, { tagId: req.params?.id, userId: req.user?._id });
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Actualizar etiqueta
// @route   PUT /api/tags/:id
// @access  Private
const updateTag = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const { name, color, description } = req.body;

    const tag = await Tag.findOne({ _id: id, userId });

    if (!tag) {
      return res.status(404).json({
        success: false,
        message: 'Etiqueta no encontrada'
      });
    }

    // Verificar si el nuevo nombre ya existe (si se está cambiando)
    if (name && name.toLowerCase().trim() !== tag.name) {
      const existingTag = await Tag.findOne({ 
        userId, 
        name: name.toLowerCase().trim(),
        _id: { $ne: id }
      });

      if (existingTag) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe una etiqueta con este nombre'
        });
      }

      tag.name = name.toLowerCase().trim();
    }

    // Actualizar otros campos
    if (color !== undefined) tag.color = color;
    if (description !== undefined) tag.description = description;

    await tag.save();

    logger.info(`Etiqueta actualizada: ${tag.name}`, { tagId: id });

    res.json({
      success: true,
      message: 'Etiqueta actualizada exitosamente',
      data: { tag: tag.getFullInfo() }
    });

  } catch (error) {
    logger.error('Error en updateTag', error, { tagId: req.params?.id, userId: req.user?._id });
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join('. ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Eliminar etiqueta
// @route   DELETE /api/tags/:id
// @access  Private
const deleteTag = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Validar que el ID no sea undefined o inválido
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({
        success: false,
        message: 'ID de etiqueta no válido'
      });
    }

    const tag = await Tag.findOne({ _id: id, userId });

    if (!tag) {
      return res.status(404).json({
        success: false,
        message: 'Etiqueta no encontrada'
      });
    }

    // Verificar si la etiqueta está siendo usada
    if (tag.linkCount > 0) {
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar la etiqueta "${tag.name}" porque está siendo usada en ${tag.linkCount} enlace(s)`
      });
    }

    await Tag.deleteOne({ _id: id });

    logger.info(`Etiqueta eliminada: ${tag.name}`, { tagId: id });

    res.json({
      success: true,
      message: 'Etiqueta eliminada exitosamente'
    });

  } catch (error) {
    logger.error('Error en deleteTag', error, { tagId: req.params?.id, userId: req.user?._id });
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Obtener estadísticas de etiquetas
// @route   GET /api/tags/stats
// @access  Private
const getTagStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const stats = await Tag.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          totalTags: { $sum: 1 },
          totalLinks: { $sum: '$linkCount' },
          avgLinksPerTag: { $avg: '$linkCount' },
          mostUsedTag: { $max: '$linkCount' }
        }
      }
    ]);

    const result = stats[0] || {
      totalTags: 0,
      totalLinks: 0,
      avgLinksPerTag: 0,
      mostUsedTag: 0
    };

    res.json({
      success: true,
      data: { stats: result }
    });

  } catch (error) {
    logger.error('Error en getTagStats', error, { userId: req.user?._id });
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Configurar rutas
router.get('/', getTags);
router.post('/', createTag);
router.get('/stats', getTagStats);
router.get('/:id', getTagById);
router.put('/:id', updateTag);
router.delete('/:id', deleteTag);

export default router;
