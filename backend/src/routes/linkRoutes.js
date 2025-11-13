import express from 'express';
import multer from 'multer';
import {
  saveLink,
  getLinks,
  getLinkById,
  updateLink,
  deleteLink,
  incrementClickCount,
  toggleFavorite,
  toggleArchive,
  batchUpdate
} from '../controllers/linkController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Multer para manejar uploads en memoria (no escribe a disco)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB

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
  // Acepta multipart/form-data con campo 'image' o JSON con 'image' URL
  .put(upload.single('image'), updateLink)
  .delete(deleteLink);

// Rutas adicionales
router.post('/:id/click', incrementClickCount);
router.post('/:id/favorite', toggleFavorite);
router.post('/:id/archive', toggleArchive);
// Batch operations
router.post('/batch', batchUpdate);

export default router;
