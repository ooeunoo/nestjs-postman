import {
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
  Optional,
} from "@nestjs/common";
import { DiscoveryService, MetadataScanner, Reflector } from "@nestjs/core";
import axios, { AxiosError } from "axios";
import { SYNC_WITH_POSTMAN_KEY } from "../decorators/sync-with-postman.decorator";
import { PostmanConfig } from "../interfaces/postman-config.interface";
import { POSTMAN_CONFIG } from "../nestjs-postman.module";

@Injectable()
export class PostmanSyncService implements OnModuleInit {
  private readonly logger = new Logger(PostmanSyncService.name);

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    private readonly reflector: Reflector,
    @Optional() @Inject(POSTMAN_CONFIG) private readonly config?: PostmanConfig
  ) {}

  async onModuleInit() {
    if (!this.config) {
      console.warn("PostmanConfig is not provided. Skipping Postman sync.");
      return;
    }

    try {
      const controllers = this.discoveryService.getControllers();
      const routes = [];

      for (const controller of controllers) {
        const instance = controller.instance;
        const prototype = Object.getPrototypeOf(instance);

        const syncWithPostman = this.reflector.get(
          SYNC_WITH_POSTMAN_KEY,
          instance.constructor
        );
        if (!syncWithPostman) continue;

        const basePath =
          Reflect.getMetadata("path", instance.constructor) || "";

        this.metadataScanner.scanFromPrototype(
          instance,
          prototype,
          (methodKey: string) => {
            const method = Reflect.getMetadata("method", instance[methodKey]);
            const path = Reflect.getMetadata("path", instance[methodKey]);
            if (method && path) {
              routes.push({
                method,
                path: `${basePath}/${path}`.replace("//", "/"),
                name: methodKey,
              });
            }
          }
        );
      }

      await this.syncWithPostman(routes);
    } catch (error) {
      this.logger.error("Failed to sync routes with Postman", error);
    }
  }

  private async syncWithPostman(routes: any[]) {
    try {
      const response = await axios.get(
        `https://api.getpostman.com/collections/${this.config.collectionId}`,
        {
          headers: {
            "X-Api-Key": this.config.apiKey,
          },
        }
      );

      const collection = response.data.collection;
      const updatedItems = this.updateCollectionItems(collection.item, routes);

      await axios.put(
        `https://api.getpostman.com/collections/${this.config.collectionId}`,
        {
          collection: {
            ...collection,
            item: updatedItems,
          },
        },
        {
          headers: {
            "X-Api-Key": this.config.apiKey,
            "Content-Type": "application/json",
          },
        }
      );

      this.logger.log("Successfully synced routes with Postman collection");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        this.logger.error(
          `Failed to sync routes with Postman: ${axiosError.message}`,
          axiosError.response?.data
        );
      } else {
        this.logger.error("Failed to sync routes with Postman", error);
      }
      throw error; // Re-throw the error for the calling code to handle if needed
    }
  }

  private updateCollectionItems(existingItems: any[], newRoutes: any[]): any[] {
    const updatedItems = [...existingItems];

    newRoutes.forEach((route) => {
      const existingItemIndex = updatedItems.findIndex(
        (item) =>
          item.request?.url?.path === route.path &&
          item.request?.method === route.method.toUpperCase()
      );

      const newItem = {
        name: `${route.method.toUpperCase()} ${route.path}`,
        request: {
          method: route.method.toUpperCase(),
          header: [],
          url: {
            raw: `{{baseUrl}}${route.path}`,
            host: ["{{baseUrl}}"],
            path: route.path.split("/").filter(Boolean),
          },
        },
        response: [],
      };

      if (existingItemIndex !== -1) {
        // Update existing item
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          ...newItem,
        };
      } else {
        // Add new item
        updatedItems.push(newItem);
      }
    });

    // Remove items that are no longer in routes
    return updatedItems.filter((item) =>
      newRoutes.some(
        (route) =>
          item.request?.url?.path === route.path &&
          item.request?.method === route.method.toUpperCase()
      )
    );
  }
}
