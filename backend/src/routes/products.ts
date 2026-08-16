import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

// Get all products for a tailor (public route)
router.get('/tailor/:tailorId', async (req, res) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { tailorId } = req.params;

    const products = await prisma.product.findMany({
      where: { tailorId },
      include: {
        images: true,
        colors: true,
        options: true,
      },
    });

    res.json({ products });
  } catch (error) {
    console.error('Get tailor products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new product (tailor only)
router.post('/', authenticate, authorize('tailor'), async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const tailorId = req.userId!;
    const { name, description, basePrice, images, colors, options } = req.body;

    if (!name || basePrice === undefined) {
      return res.status(400).json({ error: 'Name and base price are required' });
    }

    const product = await prisma.product.create({
      data: {
        name,
        description: description || '',
        basePrice,
        tailorId,
        images: {
          create: images?.map((img: any) => ({
            url: img.url,
            isPrimary: img.isPrimary || false,
          })) || [],
        },
        colors: {
          create: colors?.map((color: any) => ({
            name: color.name,
            hexCode: color.hexCode,
          })) || [],
        },
        options: {
          create: options?.map((opt: any) => ({
            name: opt.name,
            values: JSON.stringify(opt.values || []),
          })) || [],
        },
      },
      include: {
        images: true,
        colors: true,
        options: true,
      },
    });

    res.status(201).json({ product });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a product (tailor only)
router.put('/:id', authenticate, authorize('tailor'), async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const tailorId = req.userId!;
    const { id } = req.params;
    const { name, description, basePrice, images, colors, options } = req.body;

    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (existingProduct.tailorId !== tailorId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Since images, colors, options are relations, we delete existing and recreate
    // For a robust system, we might want to do upsert or specific updates, 
    // but delete/create is simplest for full replacements.
    await prisma.$transaction([
      prisma.productImage.deleteMany({ where: { productId: id } }),
      prisma.productColor.deleteMany({ where: { productId: id } }),
      prisma.designOption.deleteMany({ where: { productId: id } }),
    ]);

    const product = await prisma.product.update({
      where: { id },
      data: {
        name,
        description: description || existingProduct.description,
        basePrice: basePrice !== undefined ? basePrice : existingProduct.basePrice,
        images: {
          create: images?.map((img: any) => ({
            url: img.url,
            isPrimary: img.isPrimary || false,
          })) || [],
        },
        colors: {
          create: colors?.map((color: any) => ({
            name: color.name,
            hexCode: color.hexCode,
          })) || [],
        },
        options: {
          create: options?.map((opt: any) => ({
            name: opt.name,
            values: JSON.stringify(opt.values || []),
          })) || [],
        },
      },
      include: {
        images: true,
        colors: true,
        options: true,
      },
    });

    res.json({ product });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a product (tailor only)
router.delete('/:id', authenticate, authorize('tailor'), async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const tailorId = req.userId!;
    const { id } = req.params;

    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (existingProduct.tailorId !== tailorId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await prisma.product.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
