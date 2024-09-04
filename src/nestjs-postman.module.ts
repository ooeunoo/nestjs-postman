import { DynamicModule, Global, Module } from "@nestjs/common";
import { DiscoveryModule } from "@nestjs/core";
import { PostmanConfig } from "./interfaces/postman-config.interface";
import { PostmanSyncService } from "./services/postman-sync.service";

@Global()
@Module({})
export class NestjsPostmanModule {
  static forRoot(config: PostmanConfig): DynamicModule {
    return {
      module: NestjsPostmanModule,
      imports: [DiscoveryModule],
      providers: [
        {
          provide: "POSTMAN_CONFIG",
          useValue: config,
        },
        PostmanSyncService,
      ],
      exports: [PostmanSyncService],
    };
  }

  static forRootAsync(options: {
    imports?: any[];
    useFactory: (...args: any[]) => Promise<PostmanConfig> | PostmanConfig;
    inject?: any[];
  }): DynamicModule {
    return {
      module: NestjsPostmanModule,
      imports: [...(options.imports || []), DiscoveryModule],
      providers: [
        {
          provide: "POSTMAN_CONFIG",
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        PostmanSyncService,
      ],
      exports: [PostmanSyncService],
    };
  }
}
