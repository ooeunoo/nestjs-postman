import { DynamicModule, Global, Module } from "@nestjs/common";
import { DiscoveryModule, ModulesContainer, Reflector } from "@nestjs/core";
import { PostmanConfig } from "./interfaces/postman-config.interface";
import { PostmanSyncService } from "./services/postman-sync.service";

@Global()
@Module({})
export class NestjsPostmanModule {
  static forRoot(config: PostmanConfig): DynamicModule {
    return this.createDynamicModule({
      useFactory: () => config,
    });
  }

  static forRootAsync(options: {
    imports?: any[];
    useFactory: (...args: any[]) => Promise<PostmanConfig> | PostmanConfig;
    inject?: any[];
  }): DynamicModule {
    return this.createDynamicModule(options);
  }

  private static createDynamicModule(options: {
    imports?: any[];
    useFactory: (...args: any[]) => Promise<PostmanConfig> | PostmanConfig;
    inject?: any[];
  }): DynamicModule {
    return {
      module: NestjsPostmanModule,
      imports: [DiscoveryModule, ...(options.imports || [])],
      providers: [
        {
          provide: "POSTMAN_CONFIG",
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        PostmanSyncService,
        {
          provide: ModulesContainer,
          useFactory: () => new ModulesContainer(),
        },
        Reflector,
      ],
      exports: [PostmanSyncService],
    };
  }
}
