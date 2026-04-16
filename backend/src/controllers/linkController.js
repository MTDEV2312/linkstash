import Link from '../models/Link.js';
import Tag from '../models/Tag.js';
import scraperService from '../services/scraperService.js';
import storageService from '../services/StorageService.js';
import { getNextDefaultImageWithStorage } from '../config/defaults.js';
import queue from '../config/queue.js';
import { getLogger } from '../utils/logger.js';
import { asyncHandler } from '../utils/customErrors.js';

const logger = getLogger('LinkController');

const normalizeTags = (tags = []) => {
  if (!Array.isArray(tags)) return [];
  return [...new Set(tags.map(tag => String(tag || '').toLowerCase().trim().replace(/\s+/g, ' ')).filter(Boolean))];
};

const keepExistingTagsOnly = async (userId, tags = []) => {
  const normalizedTags = normalizeTags(tags);
  if (normalizedTags.length === 0) return [];

  const existingTags = await Tag.find({ userId, name: { $in: normalizedTags } }).select('name').lean();
  const allowed = new Set(existingTags.map(tag => tag.name));
  return normalizedTags.filter(tag => allowed.has(tag));
};

const parseTagsQuery = (tags) => {
  if (Array.isArray(tags)) {
    return normalizeTags(tags);
  }

  if (typeof tags === 'string') {
    return normalizeTags(tags.split(','));
  }

  return [];
};

// @desc    Guardar nuevo enlace
// @route   POST /api/links/save-link
// @access  Private
const saveLink = async (req, res) => {
  try {
    const { url, title, description, tags = [] } = req.body;
    const userId = req.user._id;

    // Validar URL
    if (!url) {
      return res.status(400).json({ success: false, message: 'La URL es obligatoria' });
    }

    // Verificar si el enlace ya existe para este usuario
    const existingLink = await Link.findOne({ userId, url: { $eq: url } });
    if (existingLink) {
      return res.status(400).json({ success: false, message: 'Este enlace ya está guardado' });
    }

    // Validar sintaxis y seguridad de la URL de forma temprana
    if (!scraperService.isValidUrl(url) || !(await scraperService.isSafeUrl(url))) {
      return res.status(400).json({ success: false, message: 'La URL no es válida o no está permitida' });
    }

    // Preparar datos provisionales
    let provisionalTitle = '';
    if (title && title.trim()) {
      provisionalTitle = title.trim();
    } else {
      try {
        provisionalTitle = scraperService.extractDomainFromUrl(url) || new URL(url).hostname || 'Sin título';
      } catch (_) {
        provisionalTitle = url.substring(0, 100) || 'Sin título';
      }
    }
    const provisionalDescription = description || (title ? '' : 'Procesando...');
    
    // Si el usuario proporciona título, usar imagen predeterminada
    let provisionalImage = '';
    let fallback = { url: '', publicId: '', isStored: false };
    if (title && title.trim()) {
      fallback = await getNextDefaultImageWithStorage();
      const rawImage = fallback.url;
      if (rawImage && /^(https?:\/\/.+|\/[\S].*)/i.test(rawImage)) {
        provisionalImage = rawImage;
      } else {
        logger.warn(`Imagen por defecto inválida ignorada: "${rawImage}"`);
        if (rawImage && !rawImage.startsWith('http') && !rawImage.startsWith('/')) {
          provisionalImage = `/${rawImage}`;
        } else {
          provisionalImage = '';
        }
      }
    }

    const validTags = await keepExistingTagsOnly(userId, tags);

    const linkData = {
      userId,
      url,
      title: provisionalTitle,
      description: provisionalDescription,
      image: provisionalImage,
      imagePublicId: provisionalImage && fallback.url === provisionalImage ? fallback.publicId : '',
      imageIsStored: provisionalImage && fallback.url === provisionalImage ? fallback.isStored : false,
      needsDescription: false,
      tags: validTags,
      status: title ? 'completed' : 'processing',
      scrapingError: null,
      scrapingAttempts: 0
    };

    logger.debug('Guardando nuevo enlace', { linkData });

    // Guardado inmediato
    const link = new Link(linkData);
    await link.save();

    // Actualizar contadores de etiquetas si se proporcionaron
    if (linkData.tags.length > 0) {
      await updateTagsCount(userId, linkData.tags, 'increment');
    }

    logger.info(`Enlace guardado (provisional): ${link.title}`, { status: link.status, linkId: link._id });

    // Si requiere scraping en segundo plano, encolamos la tarea (no await)
    if (link.status === 'processing') {
      try {
        // Añadimos job a la cola (BullMQ si está configurado, sino in-process)
        if (queue && typeof queue.addJob === 'function') {
          await queue.addJob({ linkId: link._id.toString(), url, userId: req.user._id }, { maxAttempts: 3, backoff: 2000 });
        } else if (queue && typeof queue.add === 'function') {
          // compatibilidad por si la implementación exporta add
          await queue.add('scrape', { linkId: link._id.toString(), url, userId: req.user._id }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
        } else {
          logger.warn('No hay cola disponible para encolar job de scraping');
        }
      } catch (e) {
        logger.error('No se pudo encolar job de scraping', e);
      }
    }

    // Responder inmediatamente
    return res.status(link.status === 'processing' ? 202 : 201).json({
      success: true,
      message: link.status === 'processing' ? 'Link guardado, procesando metadata...' : 'Enlace guardado exitosamente',
      data: { link }
    });

  } catch (error) {
    logger.error('Error en saveLink', error, { url: req.body?.url, userId: req.user?._id });
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ success: false, message: messages.join('. ') });
    }
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// @desc    Obtener todos los enlaces del usuario
// @route   GET /api/links
// @access  Private
const getLinks = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      page = 1,
      limit = 6,
      search = '',
      tags = '',
      archived = 'false',
      favorite = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const options = {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 6), // Máximo 6 por página
      sortBy,
      sortOrder: sortOrder === 'desc' ? -1 : 1,
      isArchived: archived === 'true',
      tags: parseTagsQuery(tags),
      isFavorite: favorite === 'true' ? true : favorite === 'false' ? false : null
    };

    const links = await Link.searchLinks(userId, search, options);
    const totalLinks = await Link.countDocuments({
      userId,
      isArchived: options.isArchived,
      ...(search && { $text: { $search: search } }),
      ...(options.tags.length > 0 && { tags: { $in: options.tags } }),
      ...(options.isFavorite !== null && { isFavorite: options.isFavorite })
    });

    const totalPages = Math.ceil(totalLinks / options.limit);

    res.json({
      success: true,
      data: {
        links,
        pagination: {
          currentPage: options.page,
          totalPages,
          totalLinks,
          hasNextPage: options.page < totalPages,
          hasPrevPage: options.page > 1
        }
      }
    });

  } catch (error) {
    logger.error('Error en getLinks', error, { userId: req.user?._id, query: req.query });
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Obtener enlace por ID
// @route   GET /api/links/:id
// @access  Private
const getLinkById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

  const link = await Link.findOne({ _id: id, userId });

    if (!link) {
      return res.status(404).json({
        success: false,
        message: 'Enlace no encontrado'
      });
    }

    res.json({
      success: true,
      data: { link }
    });

  } catch (error) {
    logger.error('Error en getLinkById', error, { linkId: req.params?.id, userId: req.user?._id });
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Actualizar enlace
// @route   PUT /api/links/:id
// @access  Private
const updateLink = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
  const { title, description, image, isFavorite, isArchived } = req.body;
    // Normalizar tags: en multipart con un solo tag viene como string, no array
    let tags = req.body.tags;
    if (tags === undefined || tags === null) {
      tags = [];
    } else if (typeof tags === 'string') {
      tags = [tags];
    } else if (!Array.isArray(tags)) {
      tags = [];
    }
    // Mantener compatibilidad: uploadToCloudinary (legado) y uploadToStorage (nuevo)
    const uploadToStorage =
      req.body.uploadToStorage === 'true' ||
      req.body.uploadToStorage === true ||
      req.body.uploadToCloudinary === 'true' ||
      req.body.uploadToCloudinary === true;

    // Debug: log corto para entender por qué req.file podría no llegar
    logger.debug('updateLink invocado', { id, userId: userId.toString(), uploadToStorage, hasFile: !!req.file, bodyKeys: Object.keys(req.body), contentType: req.headers['content-type'] });

    const link = await Link.findOne({ _id: id, userId });

    if (!link) {
      return res.status(404).json({
        success: false,
        message: 'Enlace no encontrado'
      });
    }

    const oldTags = link.tags;
    
    // Actualizar campos
    if (title !== undefined) link.title = title;
    if (description !== undefined) {
      link.description = description;
      // Si el usuario proporciona una descripción, limpiar needsDescription
      if (link.needsDescription) link.needsDescription = false;
    }
  // Manejar subida de archivo multipart (req.file) o URL en field 'image'

    if (req.file) {
      // Si la imagen anterior estaba en Cloudinary, eliminarla antes
      if ((link.imageIsStored || link.imageIsCloudinary) && link.imagePublicId) {
        try { await storageService.deleteImage(link.imagePublicId); } catch (e) { logger.error('Error eliminando imagen previa del storage', e, { publicId: link.imagePublicId }); }
      }

      if (!uploadToStorage) {
        return res.status(400).json({ success: false, message: 'Para subir un archivo multipart debe enviar uploadToStorage=true (o uploadToCloudinary=true por compatibilidad)' });
      }

      // Subir buffer a InsForge Storage
      const up = await storageService.uploadImageFromBuffer(req.file.buffer, { mimeType: req.file.mimetype });
      if (up && up.success) {
        link.image = up.url;
        link.imagePublicId = up.public_id;
        link.imageIsStored = true;
      } else {
        logger.error('Error subiendo imagen multipart a InsForge Storage', up?.error || up);
        return res.status(500).json({ success: false, message: 'No se pudo subir la imagen al storage' });
      }
    } else if (image !== undefined) {
      // Si la imagen cambia y la anterior estaba en Cloudinary, eliminarla
      if ((link.imageIsStored || link.imageIsCloudinary) && link.imagePublicId) {
        try { await storageService.deleteImage(link.imagePublicId); } catch (e) { logger.error('Error eliminando imagen previa del storage', e, { publicId: link.imagePublicId }); }
      }

      // Si se proporciona una URL y pide subida al storage, intentar subir desde URL
      if (uploadToStorage && image) {
        const up = await storageService.uploadImageFromUrl(image);
        if (up && up.success) {
          link.image = up.url;
          link.imagePublicId = up.public_id;
          link.imageIsStored = true;
        } else {
          // Fallback: guardar la URL tal cual
          link.image = image;
          link.imagePublicId = '';
          link.imageIsStored = false;
        }
      } else {
        // No subir al storage: simplemente actualizar URL/flag
        link.image = image;
        link.imagePublicId = '';
        link.imageIsStored = false;
      }
    }
    if (isFavorite !== undefined) link.isFavorite = isFavorite;
    if (isArchived !== undefined) link.isArchived = isArchived;
    
    if (tags !== undefined) {
      link.tags = await keepExistingTagsOnly(userId, tags);
      
      // Actualizar contadores de etiquetas
      await updateTagsCount(userId, oldTags, 'decrement');
      await updateTagsCount(userId, link.tags, 'increment');
    }

    // Limpiar el estado de scraping previo para que una edición manual retire la alerta vieja.
    link.status = 'completed';
    link.scrapingError = null;
    link.scrapingErrorType = null;
    link.scrapingAttempts = 0;

    await link.save();

    logger.info(`Enlace actualizado: ${link.title}`, { linkId: id });

    res.json({
      success: true,
      message: 'Enlace actualizado exitosamente',
      data: { link }
    });

  } catch (error) {
    logger.error('Error en updateLink', error, { linkId: req.params?.id, userId: req.user?._id });
    
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

// @desc    Eliminar enlace
// @route   DELETE /api/links/:id
// @access  Private
const deleteLink = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const link = await Link.findOne({ _id: id, userId });

    if (!link) {
      return res.status(404).json({
        success: false,
        message: 'Enlace no encontrado'
      });
    }

    // Actualizar contadores de etiquetas
    if (link.tags.length > 0) {
      await updateTagsCount(userId, link.tags, 'decrement');
    }

    // Si la imagen está en Cloudinary, eliminarla
    if ((link.imageIsStored || link.imageIsCloudinary) && link.imagePublicId) {
      try {
        await storageService.deleteImage(link.imagePublicId);
      } catch (e) {
        logger.error('Error eliminando imagen en storage', e, { publicId: link.imagePublicId });
      }
    }

    await Link.deleteOne({ _id: id });

    logger.info(`Enlace eliminado: ${link.title}`, { linkId: id });

    res.json({
      success: true,
      message: 'Enlace eliminado exitosamente'
    });

  } catch (error) {
    logger.error('Error en deleteLink', error, { linkId: req.params?.id, userId: req.user?._id });
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Incrementar contador de clics
// @route   POST /api/links/:id/click
// @access  Private
const incrementClickCount = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const link = await Link.findOne({ _id: id, userId });

    if (!link) {
      return res.status(404).json({
        success: false,
        message: 'Enlace no encontrado'
      });
    }

    await link.incrementClickCount();

    res.json({
      success: true,
      message: 'Contador actualizado',
      data: { clickCount: link.clickCount }
    });

  } catch (error) {
    logger.error('Error en incrementClickCount', error, { linkId: req.params?.id, userId: req.user?._id });
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Alternar favorito
// @route   POST /api/links/:id/favorite
// @access  Private
const toggleFavorite = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const link = await Link.findOne({ _id: id, userId });

    if (!link) {
      return res.status(404).json({
        success: false,
        message: 'Enlace no encontrado'
      });
    }

    await link.toggleFavorite();

    res.json({
      success: true,
      message: `Enlace ${link.isFavorite ? 'añadido a' : 'eliminado de'} favoritos`,
      data: { isFavorite: link.isFavorite }
    });

  } catch (error) {
    logger.error('Error en toggleFavorite', error, { linkId: req.params?.id, userId: req.user?._id });
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Función auxiliar para actualizar contadores de etiquetas
const updateTagsCount = async (userId, tags, operation) => {
  const normalizedTags = normalizeTags(tags);
  if (normalizedTags.length === 0) return;
  
  for (const normalizedTagName of normalizedTags) {
    if (normalizedTagName.length < 2) {
      logger.warn(`Tag inválido o demasiado corto: "${normalizedTagName}"`);
      continue;
    }
    
    try {
      let tag = await Tag.findOne({ userId, name: normalizedTagName });
      
      if (tag) {
        if (operation === 'increment') {
          await tag.incrementLinkCount();
        } else if (operation === 'decrement') {
          await tag.decrementLinkCount();
          
          // Eliminar etiqueta si no tiene enlaces
          if (tag.linkCount === 0) {
            await Tag.deleteOne({ _id: tag._id });
            logger.info(`Etiqueta eliminada (sin referencias): ${normalizedTagName}`);
          }
        }
      }
    } catch (err) {
      logger.error(`Error procesando tag "${normalizedTagName}"`, err);
      // Continuar con otros tags si uno falla
      continue;
    }
  }
};

// @desc    Alternar archivado
// @route   POST /api/links/:id/archive
// @access  Private
const toggleArchive = async (req, res) => {
  try{
    const { id } = req.params;
    const userId = req.user._id;

    const link = await Link.findOne({ _id: id, userId });
    if (!link) {
      return res.status(404).json({
        success: false,
        message: 'Enlace no encontrado'
      });
    }

    await link.toggleArchive();

    res.json({
      success: true,
      message: `Enlace ${link.isArchived ? 'archivado' : 'desarchivado'} exitosamente`,
      data: { archived: link.isArchived }
    });

  }catch(error){
    logger.error('Error en toggleArchive', error, { linkId: req.params?.id, userId: req.user?._id });
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

export {
  saveLink,
  getLinks,
  getLinkById,
  updateLink,
  deleteLink,
  incrementClickCount,
  toggleFavorite,
  toggleArchive
};

// @desc    Operaciones en lote sobre enlaces (delete, archive, unarchive, addTag)
// @route   POST /api/links/batch
// @access  Private
const batchUpdate = async (req, res) => {
  try {
    const { action, linkIds, tag } = req.body;
    const userId = req.user._id;

    if (!action || !Array.isArray(linkIds) || linkIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid batch request' });
    }

    // Limitar tamaño razonable por request
    const MAX_BATCH = parseInt(process.env.MAX_BATCH_SIZE || '100', 10);
    if (linkIds.length > MAX_BATCH) {
      return res.status(400).json({ success: false, message: `Batch too large (max ${MAX_BATCH})` });
    }

    let result;
    switch (action) {
      case 'delete':
        // Obtener links para actualizar counters antes de borrar
        const linksToDelete = await Link.find({ _id: { $in: linkIds }, userId }).select('tags').lean();
        // Decrement tag counts
        for (const l of linksToDelete) {
          if (Array.isArray(l.tags) && l.tags.length > 0) {
            await updateTagsCount(userId, l.tags, 'decrement');
          }
        }
        result = await Link.deleteMany({ _id: { $in: linkIds }, userId });
        break;

      case 'archive':
        result = await Link.updateMany({ _id: { $in: linkIds }, userId }, { $set: { isArchived: true } });
        break;

      case 'unarchive':
        result = await Link.updateMany({ _id: { $in: linkIds }, userId }, { $set: { isArchived: false } });
        break;

      case 'addTag':
        if (!tag || typeof tag !== 'string') {
          return res.status(400).json({ success: false, message: 'Tag is required for addTag action' });
        }
        {
          const normalizedTag = normalizeTags([tag])[0];
          if (!normalizedTag) {
            return res.status(400).json({ success: false, message: 'Tag inválido' });
          }

          const existingTag = await Tag.findOne({ userId, name: normalizedTag }).select('_id').lean();
          if (!existingTag) {
            return res.status(400).json({ success: false, message: 'La etiqueta no existe. Creala desde la pestaña Etiquetas.' });
          }

          result = await Link.updateMany({ _id: { $in: linkIds }, userId }, { $addToSet: { tags: normalizedTag } });
        }
        // Update tag counts (approximate: increment by number of modified docs)
        if (result && result.modifiedCount > 0) {
          await updateTagsCount(userId, [normalizeTags([tag])[0]], 'increment');
        }
        break;

      default:
        return res.status(400).json({ success: false, message: 'Unknown action' });
    }

    return res.json({ success: true, modified: result.modifiedCount || result.deletedCount || 0, action });
  } catch (error) {
    logger.error('Error en batchUpdate', error, { action: req.body?.action, userId: req.user?._id });
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

export { batchUpdate };
