"use client";

import { useState } from "react";
import { savePriceAction, saveProductAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { pesos } from "@/lib/money";
import type { Product } from "@/lib/types";

export function ProductManager({
  branchId,
  products,
}: {
  branchId: string;
  products: Product[];
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Products</h1>
        <Button
          className="h-11"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          Add product
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Catalog is shared across this business. Prices below are for this branch only.
      </p>
      {products.map((product) => (
        <Card key={product.id}>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{product.name}</p>
                <p className="text-xs text-muted-foreground">
                  {product.isActive ? "Active" : "Hidden"} · {pesos(product.price ?? 0)}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(product);
                  setOpen(true);
                }}
              >
                Edit
              </Button>
            </div>
            <form action={savePriceAction} className="flex items-center gap-2">
              <input type="hidden" name="branchId" value={branchId} />
              <input type="hidden" name="productId" value={product.id} />
              <Input
                name="price"
                type="number"
                min={0}
                step="0.01"
                defaultValue={product.price ?? 0}
                className="h-11 text-base"
              />
              <Button type="submit" variant="secondary" className="h-11">
                Save price
              </Button>
            </form>
          </CardContent>
        </Card>
      ))}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form
            action={async (formData) => {
              await saveProductAction(formData);
              setOpen(false);
            }}
            className="flex flex-col gap-3"
          >
            <DialogHeader>
              <DialogTitle>{editing ? "Update product" : "Add product"}</DialogTitle>
            </DialogHeader>
            <input type="hidden" name="branchId" value={branchId} />
            {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required defaultValue={editing?.name} className="h-11" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="price">Branch price</Label>
              <Input
                id="price"
                name="price"
                type="number"
                min={0}
                step="0.01"
                defaultValue={editing?.price ?? 0}
                className="h-11"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={editing?.isActive ?? true}
              />
              Active
            </label>
            <DialogFooter>
              <Button type="submit" className="h-11 w-full">
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
