import { Response } from 'express';
import * as db from '../db';
import { AuthRequest } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/response';

/**
 * Get all routes with optional filtering
 */
export async function getRoutes(req: AuthRequest, res: Response) {
  try {
    const { wall_section, color, active } = req.query;
    const filter: any = {};

    if (wall_section) filter.wall_section = wall_section as string;
    if (color) filter.color = color as string;
    if (active !== undefined) filter.active = active === 'true';

    const routes = await db.getRoutes(filter);
    return sendSuccess(res, { data: routes });
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
}

/**
 * Get a single route by ID
 */
export async function getRoute(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const route = await db.getRouteById(Number(id));

    if (!route) {
      return sendError(res, 'Route not found', 404);
    }

    return sendSuccess(res, { data: route });
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
}

/**
 * Create a new route (admin only)
 */
export async function createRoute(req: AuthRequest, res: Response) {
  try {
    const { wall_section, section_number, color, position_order, label_x, label_y, label_positions, notes, dropbox_link } = req.body;

    if (!wall_section || !color) {
      return sendError(res, 'wall_section and color are required', 400);
    }

    // Auto-assign numbers if not provided
    const sectionNum = section_number !== undefined
      ? section_number
      : await db.getNextSectionNumber(wall_section);

    const globalNum = await db.getNextGlobalNumber();
    const posOrder = position_order !== undefined ? position_order : sectionNum;

    const route = await db.createRoute({
      wall_section,
      section_number: sectionNum,
      global_number: globalNum,
      color,
      position_order: posOrder,
      label_x,
      label_y,
      label_positions,
      notes,
      dropbox_link
    });

    return sendSuccess(res, { data: route }, 201);
  } catch (err: any) {
    return sendError(res, err.message, 400);
  }
}

/**
 * Update a route (admin only)
 */
export async function updateRoute(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { section_number, color, position_order, label_x, label_y, label_positions, route_drawings, notes, dropbox_link } = req.body;

    const updates: any = {};
    if (section_number !== undefined) updates.section_number = section_number;
    if (color !== undefined) updates.color = color;
    if (position_order !== undefined) updates.position_order = position_order;
    if (label_x !== undefined) updates.label_x = label_x;
    if (label_y !== undefined) updates.label_y = label_y;
    if (label_positions !== undefined) updates.label_positions = label_positions;
    if (route_drawings !== undefined) updates.route_drawings = route_drawings;
    if (notes !== undefined) updates.notes = notes;
    if (dropbox_link !== undefined) updates.dropbox_link = dropbox_link;

    const route = await db.updateRoute(Number(id), updates);

    if (!route) {
      return sendError(res, 'Route not found', 404);
    }

    return sendSuccess(res, { data: route });
  } catch (err: any) {
    return sendError(res, err.message, 400);
  }
}

/**
 * Archive a route (admin only)
 */
export async function deleteRoute(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const route = await db.archiveRoute(Number(id));

    if (!route) {
      return sendError(res, 'Route not found', 404);
    }

    return sendSuccess(res, { message: 'Route archived successfully', route });
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
}

/**
 * Bulk import routes from wallTotals setting (admin only)
 */
export async function bulkImportRoutes(req: AuthRequest, res: Response) {
  try {
    const wallTotals = await db.getSetting('wallTotals');

    if (!wallTotals) {
      return sendError(res, 'wallTotals setting not found', 404);
    }

    const createdRoutes = [];
    let globalNumber = await db.getNextGlobalNumber();

    // Iterate through each wall section
    for (const [wallSection, colorCounts] of Object.entries(wallTotals)) {
      const counts = colorCounts as any;
      let sectionNumber = await db.getNextSectionNumber(wallSection);

      // Define color order: green -> blue -> yellow -> orange -> red -> black
      const colorOrder = ['green', 'blue', 'yellow', 'orange', 'red', 'black'];

      // Iterate through colors in the specified order
      for (const color of colorOrder) {
        const numRoutes = counts[color] as number;
        if (!numRoutes || numRoutes === 0) continue;

        // Create N routes for this color
        for (let i = 0; i < numRoutes; i++) {
          const route = await db.createRoute({
            wall_section: wallSection,
            section_number: sectionNumber,
            global_number: globalNumber,
            color: color,
            position_order: sectionNumber
          });

          createdRoutes.push(route);
          sectionNumber++;
          globalNumber++;
        }
      }
    }

    return sendSuccess(res, {
      message: `Successfully created ${createdRoutes.length} routes`,
      routes: createdRoutes
    });
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
}

/**
 * Delete all routes (admin only)
 */
export async function deleteAllRoutes(req: AuthRequest, res: Response) {
  try {
    const result = await db.deleteAllRoutes();
    return sendSuccess(res, {
      message: `Successfully deleted all routes`,
      deletedCount: result
    });
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
}

/**
 * Create a route-based session
 */
export async function createRouteSession(req: AuthRequest, res: Response) {
  try {
    const { climberId, date, routeIds, notes } = req.body;

    if (!climberId || !date || !routeIds || !Array.isArray(routeIds)) {
      return sendError(res, 'climberId, date, and routeIds (array) are required', 400);
    }

    if (routeIds.length === 0) {
      return sendError(res, 'At least one route must be selected', 400);
    }

    const session = await db.addRouteSession({
      climberId: Number(climberId),
      date,
      routeIds: routeIds.map(Number),
      notes
    });

    return sendSuccess(res, session, 201);
  } catch (err: any) {
    return sendError(res, err.message, 400);
  }
}

/**
 * Get route completions for a session
 */
export async function getSessionRoutes(req: AuthRequest, res: Response) {
  try {
    const { sessionId } = req.params;
    const routes = await db.getRouteCompletions(Number(sessionId));

    return sendSuccess(res, routes);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
}
