import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { DiscoveryService, MetadataScanner, Reflector } from "@nestjs/core";
import axios from "axios";
import { SYNC_WITH_POSTMAN_KEY } from "../decorators/sync-with-postman.decorator";
import { PostmanConfig } from "../interfaces/postman-config.interface";

@Injectable()
export class PostmanSyncService implements OnModuleInit {
  private readonly logger = new Logger(PostmanSyncService.name);

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
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
    const controllers = this.discoveryService.getControllers();
    const controllerRoutes: Record<string, any[]> = {};

    for (const controller of controllers) {
      if (!this.shouldSyncController(controller)) continue;

      const controllerName = controller.instance.constructor.name;
      const basePath = this.getControllerBasePath(controller);
      const routes = this.scanControllerMethods(controller, basePath);

      if (routes.length > 0) {
        controllerRoutes[basePath || controllerName] = routes;
      }
    }

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
  private scanControllerMethods(controller: any, basePath: string): any[] {
    const routes = [];
    const instance = controller.instance;
    const prototype = Object.getPrototypeOf(instance);

    this.metadataScanner.scanFromPrototype(
      instance,
      prototype,
      (methodKey: string) => {
        const method = Reflect.getMetadata("method", instance[methodKey]);
        const path = Reflect.getMetadata("path", instance[methodKey]);
        if (method !== undefined) {
          routes.push({
            method: this.getHttpMethod(method),
            path: `/${basePath}/${path || ""}`
              .replace(/\/+/g, "/")
              .replace(/\/$/, ""),
            name: methodKey,
          });
        }
      }
    );

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

      routes.forEach((route) => {
        const existingItemIndex = folderItems.findIndex(
          (item) =>
            item.request?.url?.raw === `{{baseUrl}}${route.path}` &&
            item.request?.method === route.method.toUpperCase()
        );

        const newItem = this.createNewItem(route);

        if (existingItemIndex !== -1) {
          // Update existing item
          folderItems[existingItemIndex] = {
            ...folderItems[existingItemIndex],
            ...newItem,
          };
        } else {
          // Add new item
          folderItems.push(newItem);
        }
      });

      // Remove items that are no longer in routes
      updatedItems[folderIndex].item = folderItems.filter((item) =>
        routes.some(
          (route) =>
            item.request?.url?.raw === `{{baseUrl}}${route.path}` &&
            item.request?.method === route.method.toUpperCase()
        )
      );
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
