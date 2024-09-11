import { Inject, Injectable, Logger } from "@nestjs/common";
import axios from "axios";
import { PostmanConfig } from "../interfaces/postman-config.interface";

@Injectable()
export class PostmanSyncService {
  private readonly logger = new Logger(PostmanSyncService.name);

  constructor(
    @Inject("POSTMAN_CONFIG") private readonly config: PostmanConfig
  ) {}

  async syncWithPostman(controllerRoutes: Record<string, any[]>) {
    try {
      this.logger.log("Starting Postman sync...");

      const collection = await this.getPostmanCollection(
        this.config.collectionId
      );
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
      throw error;
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
          folderItems[existingItemIndex] = {
            ...folderItems[existingItemIndex],
            ...newItem,
          };
        } else {
          folderItems.push(newItem);
        }
      });

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
    const item: any = {
      name: `${route.method.toUpperCase()} ${route.path}`,
      request: {
        method: route.method.toUpperCase(),
        header: this.createHeaders(route.params.headers),
        url: this.createUrl(route.path, route.params.param, route.params.query),
        description: `Auto-generated request for ${route.method.toUpperCase()} ${
          route.path
        }`,
      },
      response: [],
    };

    if (route.params.body) {
      item.request.body = this.createBody(route.params.body);
    }

    return item;
  }

  private createHeaders(headers: any[]): any[] {
    return headers.map((header) => ({
      key: header.data,
      value: `{{${header.data}}}`,
      description: "",
    }));
  }

  private createUrl(path: string, pathParams: any[], queryParams: any[]): any {
    const url: any = {
      raw: `{{baseUrl}}${path}`,
      host: ["{{baseUrl}}"],
      path: path.split("/").filter(Boolean),
    };

    if (pathParams.length > 0) {
      url.variable = pathParams.map((param) => ({
        key: param.data,
        value: `{{${param.data}}}`,
      }));
    }

    if (queryParams.length > 0) {
      url.query = queryParams.map((param) => ({
        key: param.data,
        value: `{{${param.data}}}`,
      }));
    }

    return url;
  }

  private createBody(body: any): any {
    return {
      mode: "raw",
      raw: JSON.stringify({ example: "data" }, null, 2),
      options: {
        raw: {
          language: "json",
        },
      },
    };
  }
}
