import type { IOrderRepository } from "../../../domain/orders/repositories/order-repository";
import type { ICartRepository } from "../../../domain/cart/repositories/cart-repository";
import { createOrder, createOrderItem } from "../../../domain/orders/entities/order";
import { publishEvent } from "../../../config/rabbitmq";

export function createOrderUseCase(orderRepo: IOrderRepository, cartRepo: ICartRepository) {
  return async (userId: string) => {
    const cart = await cartRepo.findByUserId(userId);
    if (cart.items.length === 0) throw new Error("Cart is empty");
    const order = createOrder({ userId, totalAmount: cart.total });
    await orderRepo.save(order);
    for (const item of cart.items) {
      const orderItem = createOrderItem({ orderId: order.id, productId: item.productId, productName: item.name, productPrice: item.price, quantity: item.quantity });
      await orderRepo.saveItem(orderItem);
    }
    await cartRepo.clear(userId);
    await publishEvent("order.created", { orderId: order.id, userId, items: cart.items.map(i => ({ productId: i.productId, quantity: i.quantity, price: i.price })), totalAmount: cart.total });
    return orderRepo.findById(order.id);
  };
}
