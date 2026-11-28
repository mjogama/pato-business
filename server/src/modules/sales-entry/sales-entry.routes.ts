import { Router } from "express";

import { validate } from "@shared/middlewares/validate";
import { requireAuth } from "@shared/middlewares/requireAuth";
import type { SalesEntryController } from "./sales-entry.controller";
import {
  getSalesEntrySchemas,
  listSalesEntriesSchemas,
  createSalesEntrySchemas,
  deleteSalesEntrySchemas,
  updateSalesEntrySchemas,
} from "./sales-entry.schema";

export class SalesEntryRouter {
  readonly router: Router = Router();

  constructor(controller: SalesEntryController) {
    // Every route is the owner's: entries are the bakery's revenue.
    this.router.get("/", requireAuth, validate(listSalesEntriesSchemas), controller.list);
    // Before "/:id", so "product-suggestions" is not read as an id.
    this.router.get("/product-suggestions", requireAuth, controller.productSuggestions);
    this.router.get("/:id", requireAuth, validate(getSalesEntrySchemas), controller.getById);
    this.router.post("/", requireAuth, validate(createSalesEntrySchemas), controller.create);
    this.router.put("/:id", requireAuth, validate(updateSalesEntrySchemas), controller.update);
    this.router.delete("/:id", requireAuth, validate(deleteSalesEntrySchemas), controller.delete);
  }
}
