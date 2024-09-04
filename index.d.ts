import { DynamicModule } from "@nestjs/common";

export interface PostmanConfig {
  apiKey: string;
  collectionId: string;
  baseUrl?: string;
}

export declare class NestjsPostmanModule {
  static forRoot(config: PostmanConfig): DynamicModule;
}

export declare function SyncWithPostman(): ClassDecorator;
