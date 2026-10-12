/**
 * @file apps/api/src/routes/index.ts
 * @description Root API router — mounts all sub-routers under /api/v1.
 * Route groups correspond exactly to the API specification in Section 6.
 */

import { Router } from "express";
import { authRouter } from "./auth.routes.js";
import { farmerRouter } from "./farmer.routes.js";
import { lotRouter } from "./lot.routes.js";
import { batchRouter } from "./batch.routes.js";
import { labTestRouter } from "./lab-test.routes.js";
import { buyerRouter } from "./buyer.routes.js";
import { shipmentRouter } from "./shipment.routes.js";
import { buyerPortalRouter } from "./buyer-portal.routes.js";
import { dashboardRouter } from "./dashboard.routes.js";
import { orgRouter } from "./org.routes.js";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/farmers", farmerRouter);
apiRouter.use("/lots", lotRouter);
apiRouter.use("/batches", batchRouter);
apiRouter.use("/lab-tests", labTestRouter);
apiRouter.use("/buyers", buyerRouter);
apiRouter.use("/shipments", shipmentRouter);
apiRouter.use("/buyer-portal", buyerPortalRouter);
apiRouter.use("/dashboard", dashboardRouter);
apiRouter.use("/org", orgRouter);
