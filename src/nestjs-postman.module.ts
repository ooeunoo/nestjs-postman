import { DynamicModule, Global, Module } from "@nestjs/common";
import { DiscoveryModule } from "@nestjs/core";
import { PostmanConfig } from "./interfaces/postman-config.interface";
import { PostmanSyncService } from "./services/postman-sync.service";

export const POSTMAN_CONFIG = "POSTMAN_CONFIG";

@Global()
@Module({})
export class NestjsPostmanModule {
  static forRoot(config: PostmanConfig): DynamicModule {
    return {
      module: NestjsPostmanModule,
      imports: [DiscoveryModule],
      providers: [
        {
          provide: POSTMAN_CONFIG,
          useValue: config,
        },
        PostmanSyncService,
      ],
      exports: [PostmanSyncService, POSTMAN_CONFIG],
    };
  }
}
