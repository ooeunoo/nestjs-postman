import { Controller, Get } from "@nestjs/common";
import { DiscoveryService, MetadataScanner, Reflector } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";
import { PostmanSync } from "../decorators/sync-with-postman.decorator";
import { PostmanExtractService } from "./postman-extract.service";

@Controller("test")
@PostmanSync()
class TestController {
  @Get()
  testMethod() {}
}

describe("PostmanExtractService", () => {
  let service: PostmanExtractService;
  let discoveryService: DiscoveryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostmanExtractService,
        {
          provide: DiscoveryService,
          useValue: {
            getControllers: jest.fn(),
          },
        },
        {
          provide: MetadataScanner,
          useValue: {
            scanFromPrototype: jest.fn(),
          },
        },
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PostmanExtractService>(PostmanExtractService);
    discoveryService = module.get<DiscoveryService>(DiscoveryService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getControllerRoutes", () => {
    it("should return controller routes", async () => {
      const mockController = {
        instance: new TestController(),
      };
      (discoveryService.getControllers as jest.Mock).mockReturnValue([
        mockController,
      ]);
      (service["reflector"].get as jest.Mock).mockReturnValue(true);
      (
        service["metadataScanner"].scanFromPrototype as jest.Mock
      ).mockImplementation((instance, prototype, callback) => {
        callback("testMethod");
      });

      const routes = await service.getControllerRoutes();

      expect(routes).toHaveProperty("test");
      expect(routes.test).toHaveLength(1);
      expect(routes.test[0]).toHaveProperty("method", "GET");
      expect(routes.test[0]).toHaveProperty("path", "/test");
      expect(routes.test[0]).toHaveProperty("name", "testMethod");
    });
  });
});
