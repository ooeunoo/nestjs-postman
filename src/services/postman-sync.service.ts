import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ModulesContainer, Reflector } from "@nestjs/core";
import axios from "axios";
import { SYNC_WITH_POSTMAN_KEY } from "../decorators/sync-with-postman.decorator";
import { PostmanConfig } from "../interfaces/postman-config.interface";

@Injectable()
export class PostmanSyncService implements OnModuleInit {
  private readonly logger = new Logger(PostmanSyncService.name);

  constructor(
    private readonly modulesContainer: ModulesContainer,
    private readonly reflector: Reflector,
    @Inject("POSTMAN_CONFIG") private readonly config: PostmanConfig
  ) {}

  async onModuleInit() {
    if (!this.config) {
      this.logger.warn("PostmanConfig is not provided. Skipping Postman sync.");
      return;
    }

    try {
      const controllerRoutes = await this.getControllerRoutes();
      this.logger.log(
        `Found ${Object.keys(controllerRoutes).length} controllers to sync`
      );
      await this.syncWithPostman(controllerRoutes);
    } catch (error) {
      this.logger.error("Failed to sync routes with Postman", error);
    }
  }
  private async getControllerRoutes(): Promise<Record<string, any[]>> {
    const controllerRoutes: Record<string, any[]> = {};

    this.modulesContainer.forEach((module) => {
      const controllers = module.controllers;
      controllers.forEach((controller) => {
        const instance = controller.instance;
        if (!instance || !this.shouldSyncController(controller)) return;

        const controllerName = instance.constructor.name;
        const basePath = this.getControllerBasePath(controller);
        const routes = this.scanControllerMethods(instance, basePath);

        if (routes.length > 0) {
          controllerRoutes[basePath || controllerName] = routes;
        }
      });
    });

    return controllerRoutes;
  }

  private shouldSyncController(controller: any): boolean {
    return this.reflector.get(
      SYNC_WITH_POSTMAN_KEY,
      controller.instance.constructor
    );
  }

  private getControllerBasePath(controller: any): string {
    return Reflect.getMetadata("path", controller.instance.constructor) || "";
  }

  private scanControllerMethods(instance: any, basePath: string): any[] {
    const routes = [];
    const prototype = Object.getPrototypeOf(instance);
    const methodNames = Object.getOwnPropertyNames(prototype).filter(
      (prop) => prop !== "constructor" && typeof prototype[prop] === "function"
    );

    for (const methodName of methodNames) {
      const method = Reflect.getMetadata("method", instance[methodName]);
      const path = Reflect.getMetadata("path", instance[methodName]);
      if (method !== undefined) {
        routes.push({
          method: this.getHttpMethod(method),
          path: `/${basePath}/${path || ""}`
            .replace(/\/+/g, "/")
            .replace(/\/$/, ""),
          name: methodName,
        });
      }
    }

    return routes;
  }
  private getHttpMethod(method: number): string {
    const methods = [
      "GET",
      "POST",
      "PUT",
      "DELETE",
      "PATCH",
      "OPTIONS",
      "HEAD",
    ];
    return methods[method] || "GET";
  }

  private async syncWithPostman(controllerRoutes: Record<string, any[]>) {
    try {
      this.logger.log("Starting Postman sync...");

      const collection = await this.getPostmanCollection(
        this.config.collectionId
      );
      console.log("herer: ", collection);
      this.logger.log("Retrieved collection details");

      const updatedItems = this.updateCollectionItems(
        collection.item,
        controllerRoutes
      );
      this.logger.log(`Updated items: ${updatedItems.length}`);

      await this.updatePostmanCollection(this.config.collectionId, {
        ...collection,
        item: updatedItems,
      });

      this.logger.log("Successfully synced routes with Postman collection");
    } catch (error) {
      this.logger.error("Failed to sync routes with Postman", error);
    }
  }

  private async getPostmanCollection(collectionId: string) {
    const response = await axios.get(
      `https://api.getpostman.com/collections/${collectionId}`,
      {
        headers: { "X-Api-Key": this.config.apiKey },
      }
    );
    return response.data.collection;
  }

  private async updatePostmanCollection(
    collectionId: string,
    updatedCollection: any
  ) {
    await axios.put(
      `https://api.getpostman.com/collections/${collectionId}`,
      { collection: updatedCollection },
      {
        headers: {
          "X-Api-Key": this.config.apiKey,
          "Content-Type": "application/json",
        },
      }
    );
  }

  private updateCollectionItems(
    existingItems: any[],
    controllerRoutes: Record<string, any[]>
  ): any[] {
    const updatedItems = [...existingItems];

    for (const [folderName, routes] of Object.entries(controllerRoutes)) {
      let folderIndex = updatedItems.findIndex(
        (item) => item.name === folderName && item.item
      );

      if (folderIndex === -1) {
        // Create new folder for controller
        updatedItems.push({
          name: folderName,
          item: [],
        });
        folderIndex = updatedItems.length - 1;
      }

      const folderItems = updatedItems[folderIndex].item;

      // Mark all existing items as potentially removed
      folderItems.forEach((item) => {
        if (!item.name.endsWith("(REMOVED)")) {
          item.name += " (REMOVED)";
        }
      });

      routes.forEach((route) => {
        const existingItemIndex = folderItems.findIndex(
          (item) =>
            item.request?.url?.raw === `{{baseUrl}}${route.path}` &&
            item.request?.method === route.method.toUpperCase()
        );

        if (existingItemIndex === -1) {
          // Add new item
          folderItems.push(this.createNewItem(route));
        } else {
          // Update existing item: remove '(REMOVED)' mark if present
          folderItems[existingItemIndex].name = folderItems[
            existingItemIndex
          ].name.replace(" (REMOVED)", "");
        }
      });
    }

    return updatedItems;
  }

  private createNewItem(route: any): any {
    return {
      name: `${route.method.toUpperCase()} ${route.path}`,
      request: {
        method: route.method.toUpperCase(),
        header: [],
        url: {
          raw: `{{baseUrl}}${route.path}`,
          host: ["{{baseUrl}}"],
          path: route.path.split("/").filter(Boolean),
        },
        description: `Auto-generated request for ${route.method.toUpperCase()} ${
          route.path
        }`,
      },
      response: [],
    };
  }
}
