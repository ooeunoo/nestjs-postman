import { applyDecorators, SetMetadata, UsePipes } from "@nestjs/common";
import { PostmanSyncPipe } from "../pipes/postman-sync-pipe";

export const SYNC_WITH_POSTMAN_KEY = "sync_with_postman";

export function PostmanSync() {
  return applyDecorators(
    SetMetadata(SYNC_WITH_POSTMAN_KEY, true),
    UsePipes(PostmanSyncPipe)
  );
}
