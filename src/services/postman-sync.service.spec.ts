import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { DiscoveryModule } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";
import { PostmanSync } from "../decorators/sync-with-postman.decorator";
import { PostmanSyncService } from "./postman-sync.service";

import { Delete, Headers, Put } from "@nestjs/common";

import {
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

export class CreateUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsNumber()
  @Min(18)
  @Max(100)
  age: number;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsNumber()
  @Min(18)
  @Max(100)
  age?: number;
}

export class UserQueryDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}
@Controller("users")
@PostmanSync()
export class UserController {
  @Get()
  getUsers(
    @Query() query: UserQueryDto,
    @Headers("Authorization") auth: string
  ) {
    return { message: "Get all users", query };
  }

  @Post()
  createUser(
    @Body() userData: CreateUserDto,
    @Headers("Content-Type") contentType: string
  ) {
    return { message: "User created", user: userData };
  }

  @Get(":id")
  getUser(@Param("id") id: string, @Headers("Authorization") auth: string) {
    return { message: "Get user", id };
  }

  @Put(":id")
  updateUser(@Param("id") id: string, @Body() updateData: UpdateUserDto) {
    return { message: "User updated", id, updateData };
  }

  @Delete(":id")
  deleteUser(@Param("id") id: string, @Headers("Authorization") auth: string) {
    return { message: "User deleted", id };
  }

  @Post(":id/profile-picture")
  uploadProfilePicture(@Param("id") id: string, @Body() file: any) {
    return { message: "Profile picture uploaded", id };
  }

  @Get("search")
  searchUsers(@Query("name") name: string, @Query("email") email: string) {
    return { message: "Search users", name, email };
  }
}

const apiKey =
  "PMAK-66d7bb876c71e90001fc5f11-38820cf94f8197b64933efb4d5961b8af9";
const collectionId = "25577466-fe4c70db-7257-4a12-ba43-cf8e5195b17c";

describe("PostmanSyncService Integration", () => {
  let service: PostmanSyncService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [DiscoveryModule],
      controllers: [UserController],
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
  });
});
