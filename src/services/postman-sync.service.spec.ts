import { Test, TestingModule } from "@nestjs/testing";
import axios from "axios";
import { PostmanConfig } from "../interfaces/postman-config.interface";
import { PostmanSyncService } from "./postman-sync.service";

jest.mock("axios");

const apiKey =
  "PMAK-66d7bb876c71e90001fc5f11-38820cf94f8197b64933efb4d5961b8af9";
const collectionId = "25577466-5ce0c7d7-3a73-41e2-bdb6-f4cb280c3e79";

describe("PostmanSyncService", () => {
  let service: PostmanSyncService;
  const mockConfig: PostmanConfig = {
    apiKey,
    collectionId,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostmanSyncService,
        {
          provide: "POSTMAN_CONFIG",
          useValue: mockConfig,
        },
      ],
    }).compile();

    service = module.get<PostmanSyncService>(PostmanSyncService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("syncWithPostman", () => {
    it("should sync routes with Postman", async () => {
      const mockCollection = {
        info: { name: "Test Collection" },
        item: [],
      };
      const mockControllerRoutes = {
        test: [
          {
            method: "GET",
            path: "/test",
            name: "testMethod",
            params: { query: [], param: [], headers: [] },
          },
        ],
      };

      (axios.get as jest.Mock).mockResolvedValue({
        data: { collection: mockCollection },
      });
      (axios.put as jest.Mock).mockResolvedValue({});

      await service.syncWithPostman(mockControllerRoutes);

      expect(axios.get).toHaveBeenCalledWith(
        `https://api.getpostman.com/collections/${mockConfig.collectionId}`,
        { headers: { "X-Api-Key": mockConfig.apiKey } }
      );
      expect(axios.put).toHaveBeenCalledWith(
        `https://api.getpostman.com/collections/${mockConfig.collectionId}`,
        expect.anything(),
        expect.anything()
      );
    });

    it("should handle errors during sync", async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error("API Error"));

      await expect(service.syncWithPostman({})).rejects.toThrow("API Error");
    });
  });
});
