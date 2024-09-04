# NestJS Postman Sync

NestJS Postman Sync is a library that automatically synchronizes your NestJS controller routes with a Postman collection. This makes API testing easier during development by keeping your Postman collection up-to-date with your NestJS routes.

## Installation

```bash
npm install nestjs-postman
```

## Usage

1. Import the `NestjsPostmanModule` in your `app.module.ts`:

```typescript
import { NestjsPostmanModule } from "nestjs-postman";

@Module({
  imports: [
    NestjsPostmanModule.forRoot({
      apiKey: "your-postman-api-key",
      collectionId: "your-collection-id",
    }),
    // ... other imports
  ],
})
export class AppModule {}
```

2. Use the `@SyncWithPostman()` decorator on controllers you want to sync:

```typescript
import { Controller, Get } from "@nestjs/common";
import { SyncWithPostman } from "nestjs-postman";

@Controller("users")
@SyncWithPostman()
export class UsersController {
  @Get()
  findAll() {
    return "This route will be synced with Postman";
  }
}
```

## Configuration

The `NestjsPostmanModule.forRoot()` method accepts a configuration object with the following properties:

- `apiKey`: Your Postman API key
- `collectionId`: The ID of the Postman collection you want to sync with
- `baseUrl` (optional): The base URL for your API endpoints

## How it works

When your NestJS application starts, the library scans all controllers decorated with `@SyncWithPostman()`. It then updates the specified Postman collection with the routes found in these controllers.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.
