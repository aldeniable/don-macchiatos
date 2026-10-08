"use client";

import { useState } from "react";
import { saveStockItemAction } from "@/app/actions";
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
import type { StockItem } from "@/lib/types";

export function StockManager({
  branchId,
  items,
}: {
  branchId: string;
  items: StockItem[];
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StockItem | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Stocks</h1>
        <Button
          className="h-11"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          Add stock
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        These items are shared across all branches of this business. Each branch
        keeps its own running quantity from its daily entries.
      </p>
      {items.map((item) => (
        <Card key={item.id}>
          <CardContent className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium">{item.name}</p>
              <p className="text-xs text-muted-foreground">
                {item.isActive ? "Active" : "Hidden"}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setEditing(item);
                setOpen(true);
              }}
            >
              Edit
            </Button>
          </CardContent>
        </Card>
      ))}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form
            action={async (formData) => {
              await saveStockItemAction(formData);
              setOpen(false);
            }}
            className="flex flex-col gap-3"
          >
            <DialogHeader>
              <DialogTitle>{editing ? "Update stock" : "Add stock"}</DialogTitle>
            </DialogHeader>
            <input type="hidden" name="branchId" value={branchId} />
            {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                required
                defaultValue={editing?.name}
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
