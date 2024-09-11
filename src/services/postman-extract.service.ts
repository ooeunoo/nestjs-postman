import { Injectable, Logger } from "@nestjs/common";
import { ROUTE_ARGS_METADATA } from "@nestjs/common/constants";
import { RouteParamtypes } from "@nestjs/common/enums/route-paramtypes.enum";
import { DiscoveryService, MetadataScanner, Reflector } from "@nestjs/core";
import { SYNC_WITH_POSTMAN_KEY } from "../decorators/sync-with-postman.decorator";

@Injectable()
export class PostmanExtractService {
  private readonly logger = new Logger(PostmanExtractService.name);

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    private readonly reflector: Reflector
  ) {}

  async getControllerRoutes(): Promise<Record<string, any[]>> {
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
        const routeArgs =
          Reflect.getMetadata(
            ROUTE_ARGS_METADATA,
            instance.constructor,
            methodKey
          ) || {};

        if (method !== undefined) {
          routes.push({
            method: this.getHttpMethod(method),
            path: `/${basePath}/${path || ""}`
              .replace(/\/+/g, "/")
              .replace(/\/$/, ""),
            name: methodKey,
            params: this.extractParameters(routeArgs),
          });
        }
      }
    );

    return routes;
  }

  private extractParameters(routeArgs: Record<string, any>) {
    const params = {
      body: null,
      query: [],
      param: [],
      headers: [],
    };

    for (const key in routeArgs) {
      const { index, data, pipes } = routeArgs[key];
      const [paramtype, paramIndex] = key.split(":").map(Number);

      switch (paramtype) {
        case RouteParamtypes.BODY:
          params.body = { index, data, pipes };
          break;
        case RouteParamtypes.QUERY:
          params.query.push({ index, data, pipes });
          break;
        case RouteParamtypes.PARAM:
          params.param.push({ index, data, pipes });
          break;
        case RouteParamtypes.HEADERS:
          params.headers.push({ index, data, pipes });
          break;
      }
    }

    return params;
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
}
