import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PostmanConfig } from "../interfaces/postman-config.interface";
import { PostmanExtractService } from "./postman-extract.service";
import { PostmanSyncService } from "./postman-sync.service";

@Injectable()
export class PostmanService implements OnModuleInit {
  private readonly logger = new Logger(PostmanService.name);

  constructor(
    private readonly extractService: PostmanExtractService,
    private readonly syncService: PostmanSyncService,
    @Inject("POSTMAN_CONFIG") private readonly config: PostmanConfig
  ) {}

  async onModuleInit() {
    if (!this.config) {
      this.logger.warn("PostmanConfig is not provided. Skipping Postman sync.");
      return;
    }

    try {
      const controllerRoutes = await this.extractService.getControllerRoutes();
      this.logger.log(
        `Found ${Object.keys(controllerRoutes).length} controllers to sync`
      );
      await this.syncService.syncWithPostman(controllerRoutes);
    } catch (error) {
      this.logger.error("Failed to sync routes with Postman", error);
    }
  }
}
