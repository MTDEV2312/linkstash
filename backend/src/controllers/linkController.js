import Link from '../models/Link.js';
import Tag from '../models/Tag.js';
import scraperService from '../services/scraperService.js';
import cloudinaryService from '../services/cloudinaryService.js';
import { getNextDefaultImage } from '../config/defaults.js';

// @desc    Guardar nuevo enlace
// @route   POST /api/links/save-link
// @access  Private
const saveLink = async (req, res) => {
  try {
    const { url, title, description, tags = [] } = req.body;
    const userId = req.user._id;

    // Validar URL
    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'La URL es obligatoria'
      });
    }

    // Verificar si el enlace ya existe para este usuario
    const existingLink = await Link.findOne({ userId, url: { $eq: url } });
    if (existingLink) {
      return res.status(400).json({
        success: false,
        message: 'Este enlace ya está guardado'
      });
    }

    let linkData = {
      userId,
      url,
      title: title || '',
      description: description || '',
      needsDescription: false,
      tags: tags.map(tag => tag.toLowerCase().trim()).filter(Boolean)
    };

    // Si no se proporcionó título, hacer scraping
    if (!title) {
      // Usamos los helpers del scraperService (isValidUrl e isSafeUrl)
      if (!scraperService.isValidUrl(url) || !(await scraperService.isSafeUrl(url))) {
        return res.status(400).json({
          success: false,
          message: 'La URL no es válida o no está permitida'
        });
      }

  console.log(`🕷️ Haciendo scraping de: ${url}`);
  const scrapingResult = await scraperService.scrapeUrl(url);
      
      if (scrapingResult.success) {
        linkData.title = scrapingResult.data.title;
        // Si no hay descripción, usar la encontrada por el scraper o una por defecto configurable
        const foundDesc = scrapingResult.data.description || '';
        linkData.description = linkData.description || foundDesc || process.env.DEFAULT_DESCRIPTION || '';
        // Si el scraping trae una imagen, intentar subirla a Cloudinary y guardar la referencia
        const scrapedImage = scrapingResult.data.image || '';
        if (scrapedImage) {
          // Si la imagen es una ruta local servida por el backend (/defaults/...),
          // intentamos subirla a Cloudinary (cloudinaryService manejará la conversión
          // a URL pública o la lectura local si BACKEND_BASE_URL no está definida).
          if (typeof scrapedImage === 'string' && scrapedImage.startsWith('/')) {
            try {
              const up = await cloudinaryService.uploadImageFromUrl(scrapedImage);
              if (up && up.success) {
                linkData.image = up.url;
                linkData.imagePublicId = up.public_id;
                linkData.imageIsCloudinary = true;
              } else {
                // No se pudo subir: mantener la ruta relativa como fallback
                linkData.image = scrapedImage;
                linkData.imageIsCloudinary = false;
                linkData.imagePublicId = '';
              }
            } catch (e) {
              linkData.image = scrapedImage;
              linkData.imageIsCloudinary = false;
              linkData.imagePublicId = '';
            }
          } else {
            try {
              const up = await cloudinaryService.uploadImageFromUrl(scrapedImage);
              if (up && up.success) {
                linkData.image = up.url;
                linkData.imagePublicId = up.public_id;
                linkData.imageIsCloudinary = true;
              } else {
                // Si falla subida, usar la URL original
                linkData.image = scrapedImage;
                linkData.imageIsCloudinary = false;
                linkData.imagePublicId = '';
              }
            } catch (e) {
              linkData.image = scrapedImage;
              linkData.imageIsCloudinary = false;
              linkData.imagePublicId = '';
            }
          }
        } else {
          // No se encontró imagen en el scraping: usar la imagen por defecto y
          // tratar de subirla a Cloudinary (si falla, guardamos la ruta relativa).
          const defaultImg = process.env.DEFAULT_IMAGE_URL || '';
          const chosen = defaultImg || getNextDefaultImage();
          if (chosen) {
            try {
              const up = await cloudinaryService.uploadImageFromUrl(chosen);
              if (up && up.success) {
                linkData.image = up.url;
                linkData.imagePublicId = up.public_id;
                linkData.imageIsCloudinary = true;
              } else {
                linkData.image = chosen;
                linkData.imageIsCloudinary = false;
                linkData.imagePublicId = '';
              }
            } catch (e) {
              linkData.image = chosen;
              linkData.imageIsCloudinary = false;
              linkData.imagePublicId = '';
            }
          }
        }
        // Si no hay descripción y la configuración pide al usuario, marcar needsDescription
        if (!linkData.description && (process.env.ASK_FOR_DESCRIPTION || 'false').toLowerCase() === 'true') {
          linkData.needsDescription = true;
        }
        
        // Generar etiquetas automáticas si no se proporcionaron
        if (tags.length === 0) {
          const autoTags = scraperService.generateAutoTags(scrapingResult.data);
          linkData.tags = autoTags;
        }
      } else {
        // Usar dominio como título si el scraping falla
        linkData.title = scraperService.extractDomainFromUrl(url);
        // Si el scraping falla, asignar imagen por defecto (si no fue proporcionada por el usuario)
        if (!linkData.image) {
          const defaultImg = process.env.DEFAULT_IMAGE_URL || '';
          const chosen = defaultImg || getNextDefaultImage();
          // Si la imagen por defecto es relativa (/defaults/...), intentar subirla a Cloudinary
          if (typeof chosen === 'string' && chosen.startsWith('/')) {
            try {
              const up = await cloudinaryService.uploadImageFromUrl(chosen);
              if (up && up.success) {
                linkData.image = up.url;
                linkData.imagePublicId = up.public_id;
                linkData.imageIsCloudinary = true;
              } else {
                // Si no se pudo subir, guardar la ruta relativa como fallback
                linkData.image = chosen;
                linkData.imageIsCloudinary = false;
                linkData.imagePublicId = '';
              }
            } catch (e) {
              linkData.image = chosen;
              linkData.imageIsCloudinary = false;
              linkData.imagePublicId = '';
            }
          } else {
            // imagen absoluta: intentar subirla (o usarla si DEFAULT_IMAGE_URL proporcionada)
            if (chosen) {
              try {
                const up = await cloudinaryService.uploadImageFromUrl(chosen);
                if (up && up.success) {
                  linkData.image = up.url;
                  linkData.imagePublicId = up.public_id;
                  linkData.imageIsCloudinary = true;
                } else {
                  linkData.image = chosen;
                  linkData.imageIsCloudinary = false;
                  linkData.imagePublicId = '';
                }
              } catch (e) {
                linkData.image = chosen;
                linkData.imageIsCloudinary = false;
                linkData.imagePublicId = '';
              }
            }
          }
        }
        // Y descripción por defecto si no se proporcionó. Si ASK_FOR_DESCRIPTION está activo, marcar needsDescription
        if (process.env.ASK_FOR_DESCRIPTION && process.env.ASK_FOR_DESCRIPTION.toLowerCase() === 'true') {
          linkData.needsDescription = true;
        }
        linkData.description = linkData.description || process.env.DEFAULT_DESCRIPTION || '';
      }
    }

    // Crear el enlace
    const link = new Link(linkData);
    await link.save();

    // Actualizar o crear etiquetas
    if (linkData.tags.length > 0) {
      await updateTagsCount(userId, linkData.tags, 'increment');
    }

    console.log(`✅ Enlace guardado: ${linkData.title}`);

    res.status(201).json({
      success: true,
      message: 'Enlace guardado exitosamente',
      data: { link }
    });

  } catch (error) {
    console.error('Error en saveLink:', error);
    
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
