import { DynamicModule, Global, Module, OnModuleInit } from "@nestjs/common";
import { ModuleRef, Reflector } from "@nestjs/core";
import { PostmanConfig } from "./interfaces/postman-config.interface";
import { PostmanSyncService } from "./services/postman-sync.service";

@Global()
@Module({})
export class NestjsPostmanModule implements OnModuleInit {
  constructor(private moduleRef: ModuleRef) {}

  onModuleInit() {
    const postmanSyncService = this.moduleRef.get(PostmanSyncService);
    postmanSyncService.onModuleInit();
  }

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
      imports: [...(options.imports || [])],
      providers: [
        {
          provide: "POSTMAN_CONFIG",
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        PostmanSyncService,
        Reflector,
      ],
      exports: [PostmanSyncService],
    };
  }
}
