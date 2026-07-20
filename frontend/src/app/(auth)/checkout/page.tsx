"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useCart, useCheckout } from "@/lib/hooks/use-api";
import { cn } from "@/lib/utils";

const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
];

const STEPS = ["Summary", "Shipping", "Payment"];

export default function CheckoutPage() {
  const { data: cart, isLoading } = useCart();
  const checkout = useCheckout();
  const router = useRouter();

  const [shipping, setShipping] = useState({
    firstName: "",
    lastName: "",
    street: "",
    city: "",
    state: "",
    zip: "",
  });

  const [payment, setPayment] = useState({
    cardholderName: "",
    cardNumber: "",
    expiry: "",
    cvv: "",
  });

  function updateShipping(field: string, value: string) {
    setShipping((prev) => ({ ...prev, [field]: value }));
  }

  function updatePayment(field: string, value: string) {
    setPayment((prev) => ({ ...prev, [field]: value }));
  }

  async function handleCheckout() {
    try {
      const order = await checkout.mutateAsync();
      toast.success("Order placed!");
      router.push(`/orders/${order.id}`);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Checkout failed");
    }
  }

  if (isLoading || !cart) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <p>Loading...</p>
      </div>
    );
  }

  const subtotal = Number(cart.total);
  const shippingCost = 5.99;
  const tax = subtotal * 0.08;
  const total = subtotal + shippingCost + tax;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* ── Step Indicator ── */}
      <div className="flex items-center justify-center gap-0">
        {STEPS.map((step, i) => (
          <div key={step} className="flex items-center">
            <div
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium border-2 shrink-0",
                i === 0
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-muted-foreground/30 text-muted-foreground",
              )}
            >
              {i + 1}
            </div>
            <span
              className={cn(
                "ml-2 text-sm font-medium",
                i === 0 ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {step}
            </span>
            {i < STEPS.length - 1 && <div className="w-12 sm:w-20 h-px bg-border mx-2 sm:mx-3" />}
          </div>
        ))}
      </div>

      {/* ── Empty state ── */}
      {cart.items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Your cart is empty.{" "}
            <Link href="/products" className="text-primary underline">
              Browse products
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* ── Left column: Order Review, Shipping, Payment ── */}
          <div className="lg:col-span-2 space-y-6">
            {/* 1. Order Review */}
            <Card>
              <CardHeader>
                <CardTitle>Order Review</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {cart.items.map((item) => (
                    <div key={item.productId}>
                      <div className="flex items-center gap-4">
                        {/* Thumbnail */}
                        <div className="w-16 h-16 rounded-md bg-muted overflow-hidden flex-shrink-0">
                          {item.imageUrl ? (
                            <Image
                              src={item.imageUrl}
                              alt={item.name}
                              width={64}
                              height={64}
                              className="object-cover w-full h-full"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                              No img
                            </div>
                          )}
                        </div>
                        {/* Item info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            ${Number(item.price).toFixed(2)} &times; {item.quantity}
                          </p>
                        </div>
                        {/* Line total */}
                        <p className="font-medium text-sm whitespace-nowrap">
                          ${(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                      <Separator className="mt-4" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 2. Shipping Information */}
            <Card>
              <CardHeader>
                <CardTitle>Shipping Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      placeholder="John"
                      value={shipping.firstName}
                      onChange={(e) => updateShipping("firstName", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      placeholder="Doe"
                      value={shipping.lastName}
                      onChange={(e) => updateShipping("lastName", e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-2">
                    <Label htmlFor="street">Street Address</Label>
                    <Input
                      id="street"
                      placeholder="123 Main Street"
                      value={shipping.street}
                      onChange={(e) => updateShipping("street", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      placeholder="San Francisco"
                      value={shipping.city}
                      onChange={(e) => updateShipping("city", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Select
                      value={shipping.state}
                      onValueChange={(value) => updateShipping("state", value ?? "")}
                    >
                      <SelectTrigger id="state">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {US_STATES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zip">ZIP Code</Label>
                    <Input
                      id="zip"
                      placeholder="94102"
                      value={shipping.zip}
                      onChange={(e) => updateShipping("zip", e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 3. Payment Information */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Information</CardTitle>
                <CardDescription>
                  This is a demo &mdash; no real payment will be processed.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2 space-y-2">
                    <Label htmlFor="cardholderName">Cardholder Name</Label>
                    <Input
                      id="cardholderName"
                      placeholder="John Doe"
                      value={payment.cardholderName}
                      onChange={(e) => updatePayment("cardholderName", e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-2">
                    <Label htmlFor="cardNumber">Card Number</Label>
                    <Input
                      id="cardNumber"
                      placeholder="4242 4242 4242 4242"
                      value={payment.cardNumber}
                      onChange={(e) => updatePayment("cardNumber", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expiry">Expiry Date</Label>
                    <Input
                      id="expiry"
                      placeholder="MM/YY"
                      value={payment.expiry}
                      onChange={(e) => updatePayment("expiry", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cvv">CVV</Label>
                    <Input
                      id="cvv"
                      placeholder="123"
                      value={payment.cvv}
                      onChange={(e) => updatePayment("cvv", e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Right column: Order Summary sidebar ── */}
          <div className="space-y-6">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>${shippingCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Estimated Tax</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <Button
                  onClick={handleCheckout}
                  disabled={checkout.isPending || cart.items.length === 0}
                  className="w-full mt-2"
                >
                  {checkout.isPending ? "Processing..." : "Place Order"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
