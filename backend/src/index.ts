import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { env } from "./config/env";
import { errorHandler } from "./presentation/middleware/error-handler";
import authRoutes from "./presentation/routes/auth";
import categoryRoutes from "./presentation/routes/categories";
import productRoutes from "./presentation/routes/products";
import cartRoutes from "./presentation/routes/cart";
import checkoutRoutes from "./presentation/routes/checkout";
import orderRoutes from "./presentation/routes/orders";
import notificationRoutes from "./presentation/routes/notifications";
import adminRoutes from "./presentation/routes/admin";
import { requestLogger } from "./presentation/middleware/request-logger";
import { startWorkers } from "./infrastructure/workers";
import { closeRabbit } from "./config/rabbitmq";

const app = express();

app.use(helmet());
app.use(cors({ origin: ["http://localhost:3000", "http://localhost:5173"], credentials: true }));
app.use(compression());
app.use(express.json());
app.use(requestLogger);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/auth", authRoutes);
app.use("/categories", categoryRoutes);
app.use("/products", productRoutes);
app.use("/cart", cartRoutes);
app.use("/checkout", checkoutRoutes);
app.use("/orders", orderRoutes);
app.use("/notifications", notificationRoutes);
app.use("/admin", adminRoutes);

app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`Server running on port ${env.port}`);
  startWorkers().catch(console.error);
});

process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down...");
  await closeRabbit();
  process.exit(0);
});
process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down...");
  await closeRabbit();
  process.exit(0);
});

export default app;
