import express from 'express';
import {
  saveLink,
  getLinks,
  getLinkById,
  updateLink,
  deleteLink,
  incrementClickCount,
  toggleFavorite,
  toggleArchive
} from '../controllers/linkController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Rutas CRUD básicas
router.route('/')
  .get(getLinks)
  .post(saveLink); // Ruta alternativa para compatibilidad

router.route('/save-link')
  .post(saveLink);

router.route('/:id')
  .get(getLinkById)
  .put(updateLink)
  .delete(deleteLink);

// Rutas adicionales
router.post('/:id/click', incrementClickCount);
router.post('/:id/favorite', toggleFavorite);
router.post('/:id/archive', toggleArchive);

export default router;
