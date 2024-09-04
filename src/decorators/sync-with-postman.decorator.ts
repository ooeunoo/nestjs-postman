import { SetMetadata } from "@nestjs/common";

export const SYNC_WITH_POSTMAN_KEY = "sync_with_postman";
export const SyncWithPostman = () => SetMetadata(SYNC_WITH_POSTMAN_KEY, true);
