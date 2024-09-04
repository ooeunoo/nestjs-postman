import {
  ArgumentMetadata,
  Injectable,
  PipeTransform,
  Type,
} from "@nestjs/common";
import { plainToClass } from "class-transformer";

export interface PostmanSyncMetadata {
  type: string;
  properties?: Record<string, { type: string }>;
}

@Injectable()
export class PostmanSyncPipe implements PipeTransform<any> {
  private static metadata: Record<string, PostmanSyncMetadata> = {};

  async transform(value: any, metadata: ArgumentMetadata) {
    const { metatype, type, data } = metadata;
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    const object = plainToClass(metatype, value);
    const metadataKey = `${type}:${data || "body"}`;

    PostmanSyncPipe.metadata[metadataKey] = this.extractMetadata(metatype);

    return object;
  }

  private toValidate(metatype: Type<any>): boolean {
    const types: Type<any>[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  private extractMetadata(metatype: Type<any>): PostmanSyncMetadata {
    const metadata: PostmanSyncMetadata = {
      type: metatype.name,
      properties: {},
    };

    for (const propertyKey in metatype.prototype) {
      const propertyType = Reflect.getMetadata(
        "design:type",
        metatype.prototype,
        propertyKey
      );
      metadata.properties[propertyKey] = {
        type: propertyType?.name || "unknown",
      };
    }

    return metadata;
  }

  static getMetadata(): Record<string, PostmanSyncMetadata> {
    return PostmanSyncPipe.metadata;
  }

  static clearMetadata(): void {
    PostmanSyncPipe.metadata = {};
  }
}
