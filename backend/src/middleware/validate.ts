import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issue = error.issues[0];
        const errorMessage = issue ? `${issue.path.join('.') ? issue.path.join('.') + ': ' : ''}${issue.message}` : 'Validation error';
        return res.status(400).json({ error: errorMessage, details: error.issues });
      }
      return res.status(400).json({ error: 'Invalid payload request format' });
    }
  };
};

export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issue = error.issues[0];
        const errorMessage = issue ? `${issue.path.join('.') ? issue.path.join('.') + ': ' : ''}${issue.message}` : 'Validation error';
        return res.status(400).json({ error: errorMessage, details: error.issues });
      }
      return res.status(400).json({ error: 'Invalid query parameters' });
    }
  };
};
