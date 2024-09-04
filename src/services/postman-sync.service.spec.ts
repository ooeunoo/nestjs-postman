import { Controller, Delete, Get, Post, Put } from "@nestjs/common";
import { DiscoveryModule } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";
import { SyncWithPostman } from "../decorators/sync-with-postman.decorator";
import { PostmanSyncService } from "./postman-sync.service";

// Mock Controller
@Controller("users")
@SyncWithPostman()
class UserController {
  @Get()
  getUsers() {}

  @Post()
  createUser() {}

  @Put(":id")
  updateUser() {}

  @Delete(":id")
  deleteUser() {}
}

@Controller("wallets")
@SyncWithPostman()
class WalletController {
  @Get()
  getUsers() {}

  @Post()
  createUser() {}

  @Put(":id")
  updateUser() {}

  @Delete(":id")
  deleteUser() {}
}

const apiKey =
  "PMAK-66d7bb876c71e90001fc5f11-38820cf94f8197b64933efb4d5961b8af9";
const collectionId = "25577466-fe4c70db-7257-4a12-ba43-cf8e5195b17c";

describe("PostmanSyncService Integration", () => {
  let service: PostmanSyncService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [DiscoveryModule],
      controllers: [UserController, WalletController],
      providers: [
        PostmanSyncService,
        {
          provide: "POSTMAN_CONFIG",
          useValue: {
            apiKey: apiKey,
            collectionId: collectionId,
          },
        },
      ],
    }).compile();

    service = module.get<PostmanSyncService>(PostmanSyncService);
  });

  it("should sync mock controller routes with Postman collection", async () => {
    // Trigger the sync process
    await service.onModuleInit();

    // Use the service to get the updated collection
    const collection = await (service as any).getPostmanCollection(
      collectionId
    );
  });
});
