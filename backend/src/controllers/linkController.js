import Link from '../models/Link.js';
import Tag from '../models/Tag.js';
import scraperService from '../services/scraperService.js';
import cloudinaryService from '../services/cloudinaryService.js';
import { getNextDefaultImage } from '../config/defaults.js';
import scraperQueue from '../services/scraperQueue.js';

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
    const provisionalTitle = title && title.trim() ? title.trim() : scraperService.extractDomainFromUrl(url) || '';
    const provisionalDescription = description || (title ? '' : 'Procesando...');

    const linkData = {
      userId,
      url,
      title: provisionalTitle,
      description: provisionalDescription,
      needsDescription: false,
      tags: tags.map(tag => tag.toLowerCase().trim()).filter(Boolean),
      status: title ? 'completed' : 'processing',
      scrapingError: null,
      scrapingAttempts: 0
    };

    // Guardado inmediato
    const link = new Link(linkData);
    await link.save();

    // Actualizar contadores de etiquetas si se proporcionaron
    if (linkData.tags.length > 0) {
      await updateTagsCount(userId, linkData.tags, 'increment');
    }

    console.log(`✅ Enlace guardado (provisional): ${link.title} - status=${link.status}`);

    // Si requiere scraping en segundo plano, encolamos la tarea (no await)
    if (link.status === 'processing') {
      const job = async () => {
        try {
          console.log(`[Worker] Procesando scraping para link ${link._id} -> ${url}`);

          const scrapingResult = await scraperService.scrapeUrl(url);

          if (scrapingResult && scrapingResult.success) {
            const scraped = scrapingResult.data || {};

            // Preparar actualizaciones
            const updates = {
              title: scraped.title || provisionalTitle,
              description: scraped.description || '',
              status: 'completed',
              $inc: { scrapingAttempts: 1 }
            };

            // Manejo básico de imagen (intentar subir a Cloudinary si aplica)
            const scrapedImage = scraped.image || '';
            if (scrapedImage) {
              try {
                const up = await cloudinaryService.uploadImageFromUrl(scrapedImage);
                if (up && up.success) {
                  updates.image = up.url;
                  updates.imagePublicId = up.public_id;
                  updates.imageIsCloudinary = true;
                } else {
                  updates.image = scrapedImage;
                  updates.imagePublicId = '';
                  updates.imageIsCloudinary = false;
                }
              } catch (e) {
                updates.image = scrapedImage;
                updates.imagePublicId = '';
                updates.imageIsCloudinary = false;
              }
            } else {
              // Si no trajo imagen, intentar usar DEFAULT_IMAGE_URL o next default
              const defaultImg = process.env.DEFAULT_IMAGE_URL || getNextDefaultImage();
              if (defaultImg) {
                try {
                  const up = await cloudinaryService.uploadImageFromUrl(defaultImg);
                  if (up && up.success) {
                    updates.image = up.url;
                    updates.imagePublicId = up.public_id;
                    updates.imageIsCloudinary = true;
                  } else {
                    updates.image = defaultImg;
                    updates.imagePublicId = '';
                    updates.imageIsCloudinary = false;
                  }
                } catch (e) {
                  updates.image = defaultImg;
                  updates.imagePublicId = '';
                  updates.imageIsCloudinary = false;
                }
              }
            }

            // Si el scraper generó etiquetas automáticas y el link no tenía tags, agregarlas
            if ((!linkData.tags || linkData.tags.length === 0) && Array.isArray(scraped.tags) && scraped.tags.length > 0) {
              updates.tags = scraped.tags.map(t => t.toLowerCase().trim()).filter(Boolean);
            }

            // Aplicar las actualizaciones (sin eliminar campos existentes si no vienen)
            const applied = await Link.findByIdAndUpdate(link._id, updates, { new: true });

            // Si agregamos tags automáticos, actualizar contadores
            if (updates.tags && updates.tags.length > 0) {
              await updateTagsCount(userId, updates.tags, 'increment');
            }

            console.log(`[Worker] Scraping completado para link ${link._id}`);
            return applied;
          } else {
            // Marcar como failed y registrar intento
            await Link.findByIdAndUpdate(link._id, {
              status: 'failed',
              scrapingError: (scrapingResult && scrapingResult.error) ? scrapingResult.error : 'Scraping failed',
              $inc: { scrapingAttempts: 1 }
            });
            console.error(`[Worker] Scraping falló para link ${link._id}`);
          }
        } catch (err) {
          console.error(`[Worker] Error procesando scraping para link ${link._id}:`, err);
          try {
            await Link.findByIdAndUpdate(link._id, {
              status: 'failed',
              scrapingError: err.message || String(err),
              $inc: { scrapingAttempts: 1 }
            });
          } catch (u) {
            console.error('Error actualizando estado del link tras fallo:', u);
          }
        }
      };

      // Encolar sin esperar (procesado en background por la cola in-process)
      try {
        scraperQueue.enqueue(job).catch(e => console.error('Error en cola de scraping:', e));
      } catch (e) {
        console.error('No se pudo encolar job de scraping:', e);
      }
    }

    // Responder inmediatamente
    return res.status(link.status === 'processing' ? 202 : 201).json({
      success: true,
      message: link.status === 'processing' ? 'Link guardado, procesando metadata...' : 'Enlace guardado exitosamente',
      data: { link }
    });

  } catch (error) {
    console.error('Error en saveLink:', error);
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
      limit = 20,
      search = '',
      tags = '',
      archived = 'false',
      favorite = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const options = {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 50), // Máximo 50 por página
      sortBy,
      sortOrder: sortOrder === 'desc' ? -1 : 1,
      isArchived: archived === 'true',
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
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
    console.error('Error en getLinks:', error);
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
    console.error('Error en getLinkById:', error);
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
  const { title, description, image, tags = [], isFavorite, isArchived } = req.body;
    // Determinar si se pidió subida a Cloudinary (form fields vienen como strings en multipart)
    const uploadToCloudinary = (req.body.uploadToCloudinary === 'true' || req.body.uploadToCloudinary === true);

    // Debug: log corto para entender por qué req.file podría no llegar
    console.log(`updateLink: id=${id}, user=${userId}, uploadToCloudinary=${uploadToCloudinary}, hasFile=${!!req.file}`);
    if (!req.file) {
      console.log('updateLink: req.body keys =', Object.keys(req.body));
      console.log('updateLink: content-type =', req.headers['content-type']);
    }

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
      if (link.imageIsCloudinary && link.imagePublicId) {
        try { await cloudinaryService.deleteImage(link.imagePublicId); } catch (e) { console.error('Error deleting old cloud image:', e); }
      }

      if (!uploadToCloudinary) {
        return res.status(400).json({ success: false, message: 'Para subir un archivo multipart debe enviar uploadToCloudinary=true' });
      }

      // Subir buffer a Cloudinary
      const up = await cloudinaryService.uploadImageFromBuffer(req.file.buffer);
      if (up && up.success) {
        link.image = up.url;
        link.imagePublicId = up.public_id;
        link.imageIsCloudinary = true;
      } else {
        console.error('Error subiendo imagen multipart a Cloudinary:', up && up.error ? up.error : up);
        return res.status(500).json({ success: false, message: 'No se pudo subir la imagen a Cloudinary' });
      }
    } else if (image !== undefined) {
      // Si la imagen cambia y la anterior estaba en Cloudinary, eliminarla
      if (link.imageIsCloudinary && link.imagePublicId) {
        try { await cloudinaryService.deleteImage(link.imagePublicId); } catch (e) { console.error('Error deleting old cloud image:', e); }
      }

      // Si se proporciona una URL y pide subida a Cloudinary, intentar subir desde URL
      if (uploadToCloudinary && image) {
        const up = await cloudinaryService.uploadImageFromUrl(image);
        if (up && up.success) {
          link.image = up.url;
          link.imagePublicId = up.public_id;
          link.imageIsCloudinary = true;
        } else {
          // Fallback: guardar la URL tal cual
          link.image = image;
          link.imagePublicId = '';
          link.imageIsCloudinary = false;
        }
      } else {
        // No subir a cloudinary: simplemente actualizar URL/flag
        link.image = image;
        link.imagePublicId = '';
        link.imageIsCloudinary = false;
      }
    }
    if (isFavorite !== undefined) link.isFavorite = isFavorite;
    if (isArchived !== undefined) link.isArchived = isArchived;
    
    if (tags !== undefined) {
      link.tags = tags.map(tag => tag.toLowerCase().trim()).filter(Boolean);
      
      // Actualizar contadores de etiquetas
      await updateTagsCount(userId, oldTags, 'decrement');
      await updateTagsCount(userId, link.tags, 'increment');
    }

    await link.save();

    console.log(`✅ Enlace actualizado: ${link.title}`);

    res.json({
      success: true,
      message: 'Enlace actualizado exitosamente',
      data: { link }
    });

  } catch (error) {
    console.error('Error en updateLink:', error);
    
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
    if (link.imageIsCloudinary && link.imagePublicId) {
      try {
        await cloudinaryService.deleteImage(link.imagePublicId);
      } catch (e) {
        console.error('Error eliminando imagen en Cloudinary:', e);
      }
    }

    await Link.deleteOne({ _id: id });

    console.log(`✅ Enlace eliminado: ${link.title}`);

    res.json({
      success: true,
      message: 'Enlace eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error en deleteLink:', error);
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
    console.error('Error en incrementClickCount:', error);
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
    console.error('Error en toggleFavorite:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Función auxiliar para actualizar contadores de etiquetas
const updateTagsCount = async (userId, tags, operation) => {
  for (const tagName of tags) {
    let tag = await Tag.findOne({ userId, name: tagName });
    
    if (!tag && operation === 'increment') {
      // Crear nueva etiqueta
      tag = new Tag({ userId, name: tagName, linkCount: 1 });
      await tag.save();
    } else if (tag) {
      if (operation === 'increment') {
        await tag.incrementLinkCount();
      } else if (operation === 'decrement') {
        await tag.decrementLinkCount();
        
        // Eliminar etiqueta si no tiene enlaces
        if (tag.linkCount === 0) {
          await Tag.deleteOne({ _id: tag._id });
        }
      }
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
    console.error('Error en toggleArchive:', error);
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
        result = await Link.updateMany({ _id: { $in: linkIds }, userId }, { $addToSet: { tags: tag.toLowerCase().trim() } });
        // Update tag counts (approximate: increment by number of modified docs)
        if (result && result.modifiedCount > 0) {
          await updateTagsCount(userId, [tag.toLowerCase().trim()], 'increment');
        }
        break;

      default:
        return res.status(400).json({ success: false, message: 'Unknown action' });
    }

    return res.json({ success: true, modified: result.modifiedCount || result.deletedCount || 0, action });
  } catch (error) {
    console.error('Error en batchUpdate:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

export { batchUpdate };
