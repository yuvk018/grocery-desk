// productRoutes.js - maps URLs + HTTP methods to controller functions.
// In app.js this router is mounted at /api/products, so "/" here means /api/products
// and "/:id" means /api/products/<some id>.
//
// Anyone may LIST products (customers need them for manual ordering).
// Only the logged-in shopkeeper may add, edit or remove them: requireShopkeeper runs first.

import { Router } from 'express';
import * as productController from '../controllers/productController.js';
import requireShopkeeper from '../middleware/requireShopkeeper.js';

const router = Router();

router.get('/', productController.getProducts); // list all products (public)
router.post('/', requireShopkeeper, productController.createProduct); // add a product
router.put('/:id', requireShopkeeper, productController.updateProduct); // edit a product
router.delete('/:id', requireShopkeeper, productController.deleteProduct); // remove a product

export default router;
