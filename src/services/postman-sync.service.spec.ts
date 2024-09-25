import { Controller, Delete, Get, Post, Put } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { SyncWithPostman } from "../decorators/sync-with-postman.decorator";
import { NestjsPostmanModule } from "../nestjs-postman.module";
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

  @Put(":ids")
  updateUser() {}

  @Delete(":id")
  deleteUser() {}
}

const apiKey =
  "PMAK-66f3bf2f29254f0001f9d744-32599dc17f69d4eec701dcead417b752e7";
const collectionId = "25577466-4bb8ee87-1794-4b0e-9994-eb685fcc129d";

describe("PostmanSyncService Integration", () => {
  let service: PostmanSyncService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        NestjsPostmanModule.forRoot({
          apiKey,
          collectionId,
        }),
      ],
      controllers: [UserController, WalletController],
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
