import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.1.0",
    info: {
      title: "ShopFlow API",
      version: "1.0.0",
      description: "Mini e-commerce backend with Clean Architecture, event-driven order processing, and RabbitMQ workers.",
    },
    servers: [{ url: "http://localhost:4000", description: "Development" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            error: {
              type: "object",
              properties: {
                code: { type: "string" },
                message: { type: "string" },
              },
            },
          },
        },
        User: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            email: { type: "string", format: "email" },
            name: { type: "string" },
            role: { type: "string", enum: ["customer", "admin"] },
          },
        },
        Product: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            slug: { type: "string" },
            description: { type: "string", nullable: true },
            price: { type: "number" },
            stock: { type: "integer" },
            categoryId: { type: "string", format: "uuid", nullable: true },
            imageUrl: { type: "string", nullable: true },
            isActive: { type: "boolean" },
            category: {
              type: "object",
              properties: {
                id: { type: "string", format: "uuid" },
                name: { type: "string" },
                slug: { type: "string" },
              },
              nullable: true,
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Category: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            slug: { type: "string" },
            description: { type: "string", nullable: true },
          },
        },
        Cart: {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  productId: { type: "string", format: "uuid" },
                  quantity: { type: "integer" },
                  name: { type: "string" },
                  price: { type: "number" },
                  imageUrl: { type: "string", nullable: true },
                },
              },
            },
            total: { type: "number" },
          },
        },
        Order: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            userId: { type: "string", format: "uuid" },
            status: { type: "string", enum: ["pending", "paid", "packing", "shipping", "completed", "cancelled"] },
            totalAmount: { type: "number" },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  productName: { type: "string" },
                  quantity: { type: "integer" },
                  productPrice: { type: "number" },
                  subtotal: { type: "number" },
                },
              },
            },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Notification: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            title: { type: "string" },
            body: { type: "string", nullable: true },
            type: { type: "string" },
            read: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Analytics: {
          type: "object",
          properties: {
            revenue: { type: "number" },
            totalOrders: { type: "integer" },
            dailyRevenue: { type: "number" },
            bestSellers: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  productId: { type: "string" },
                  score: { type: "number" },
                },
              },
            },
          },
        },
        PaginatedProducts: {
          type: "object",
          properties: {
            data: { type: "array", items: { $ref: "#/components/schemas/Product" } },
            total: { type: "integer" },
            page: { type: "integer" },
            limit: { type: "integer" },
          },
        },
        PaginatedOrders: {
          type: "object",
          properties: {
            data: { type: "array", items: { $ref: "#/components/schemas/Order" } },
            total: { type: "integer" },
            page: { type: "integer" },
            limit: { type: "integer" },
          },
        },
        PaginatedNotifications: {
          type: "object",
          properties: {
            data: { type: "array", items: { $ref: "#/components/schemas/Notification" } },
            total: { type: "integer" },
          },
        },
        AuthResponse: {
          type: "object",
          properties: {
            user: { $ref: "#/components/schemas/User" },
            accessToken: { type: "string" },
            refreshToken: { type: "string" },
          },
        },
      },
    },
  },
  apis: ["./src/presentation/routes/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
