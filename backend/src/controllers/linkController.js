import Link from '../models/Link.js';
import Tag from '../models/Tag.js';
import scraperService from '../services/scraperService.js';

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
        linkData.description = linkData.description || scrapingResult.data.description;
        linkData.image = scrapingResult.data.image;
        
        // Generar etiquetas automáticas si no se proporcionaron
        if (tags.length === 0) {
          const autoTags = scraperService.generateAutoTags(scrapingResult.data);
          linkData.tags = autoTags;
        }
      } else {
        // Usar URL como título si el scraping falla
        linkData.title = scraperService.extractDomainFromUrl(url);
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
    const { title, description, tags = [], isFavorite, isArchived } = req.body;

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
    if (description !== undefined) link.description = description;
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
