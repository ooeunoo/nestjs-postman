import { applyDecorators, SetMetadata } from "@nestjs/common";

export const SYNC_WITH_POSTMAN_KEY = "sync_with_postman";

export function PostmanSync() {
  return applyDecorators(SetMetadata(SYNC_WITH_POSTMAN_KEY, true));
}
