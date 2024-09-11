import { Test, TestingModule } from "@nestjs/testing";
import { PostmanExtractService } from "./postman-extract.service";
import { PostmanSyncService } from "./postman-sync.service";
import { PostmanService } from "./postman.service";

const apiKey =
  "PMAK-66d7bb876c71e90001fc5f11-38820cf94f8197b64933efb4d5961b8af9";
const collectionId = "25577466-5ce0c7d7-3a73-41e2-bdb6-f4cb280c3e79";

describe("PostmanService", () => {
  let service: PostmanService;
  let extractService: PostmanExtractService;
  let syncService: PostmanSyncService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostmanService,
        {
          provide: PostmanExtractService,
          useValue: {
            getControllerRoutes: jest.fn(),
          },
        },
        {
          provide: PostmanSyncService,
          useValue: {
            syncWithPostman: jest.fn(),
          },
        },
        {
          provide: "POSTMAN_CONFIG",
          useValue: {
            apiKey,
            collectionId,
          },
        },
      ],
    }).compile();

    service = module.get<PostmanService>(PostmanService);
    extractService = module.get<PostmanExtractService>(PostmanExtractService);
    syncService = module.get<PostmanSyncService>(PostmanSyncService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("onModuleInit", () => {
    it("should extract routes and sync with Postman", async () => {
      const mockRoutes = { test: [{ method: "GET", path: "/test" }] };
      (extractService.getControllerRoutes as jest.Mock).mockResolvedValue(
        mockRoutes
      );

      await service.onModuleInit();

      expect(extractService.getControllerRoutes).toHaveBeenCalled();
      expect(syncService.syncWithPostman).toHaveBeenCalledWith(mockRoutes);
    });

    it("should handle errors during initialization", async () => {
      (extractService.getControllerRoutes as jest.Mock).mockRejectedValue(
        new Error("Extract Error")
      );

      await service.onModuleInit();

      expect(extractService.getControllerRoutes).toHaveBeenCalled();
      expect(syncService.syncWithPostman).not.toHaveBeenCalled();
    });

    it("should skip sync if config is not provided", async () => {
      const moduleRef = await Test.createTestingModule({
        providers: [
          PostmanService,
          {
            provide: PostmanExtractService,
            useValue: {
              getControllerRoutes: jest.fn(),
            },
          },
          {
            provide: PostmanSyncService,
            useValue: {
              syncWithPostman: jest.fn(),
            },
          },
          {
            provide: "POSTMAN_CONFIG",
            useValue: null,
          },
        ],
      }).compile();

      const serviceWithoutConfig =
        moduleRef.get<PostmanService>(PostmanService);

      await serviceWithoutConfig.onModuleInit();

      expect(extractService.getControllerRoutes).not.toHaveBeenCalled();
      expect(syncService.syncWithPostman).not.toHaveBeenCalled();
    });
  });
});
