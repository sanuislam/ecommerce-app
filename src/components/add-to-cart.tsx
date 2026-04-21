"use client";

import { Button } from "@/components/ui/button";
import { useCart, type CartLine } from "@/store/cart";
import { ShoppingCart, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { motion } from "framer-motion";

export function AddToCart({ product }: { product: CartLine }) {
  const add = useCart((s) => s.add);
  const [quantity, setQuantity] = useState(1);

  const handleAdd = () => {
    if (product.stock != null && product.stock <= 0) {
      toast.error("Out of stock");
      return;
    }
    add({ ...product, quantity });
    toast.success(`${product.name} added to cart`);
  };

  return (
    <div className="flex items-center gap-3">
      <div className="inline-flex items-center rounded-md border">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          aria-label="Decrease quantity"
        >
          <Minus className="size-3.5" />
        </Button>
        <span className="w-8 text-center text-sm font-medium">{quantity}</span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setQuantity((q) => q + 1)}
          aria-label="Increase quantity"
        >
          <Plus className="size-3.5" />
        </Button>
      </div>
      <motion.div whileTap={{ scale: 0.96 }} className="flex-1">
        <Button onClick={handleAdd} size="lg" className="w-full">
          <ShoppingCart className="size-4" />
          Add to cart
        </Button>
      </motion.div>
    </div>
  );
}
