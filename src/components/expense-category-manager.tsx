"use client";

import { useState } from "react";
import { saveExpenseCategoryAction } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
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
import type { ExpenseCategory } from "@/lib/types";

export function ExpenseCategoryManager({
  branchId,
  categories,
  canRestrict,
}: {
  branchId: string;
  categories: ExpenseCategory[];
  // Only a superadmin can mark a type as superadmin-only, and only a superadmin
  // is ever handed one of those types to list here.
  canRestrict: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseCategory | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Expense types</h1>
        <Button
          className="h-11"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          Add type
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        These categories are shared across all branches of this business.
      </p>
      {categories.map((category) => (
        <Card key={category.id}>
          <CardContent className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">{category.name}</p>
              <p className="text-xs text-muted-foreground">
                {category.isActive ? "Active" : "Hidden"}
              </p>
              {category.isSuperadminOnly ? (
                <Badge variant="secondary" className="mt-1">
                  Superadmin only
                </Badge>
              ) : null}
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setEditing(category);
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
              await saveExpenseCategoryAction(formData);
              setOpen(false);
            }}
            className="flex flex-col gap-3"
          >
            <DialogHeader>
              <DialogTitle>{editing ? "Update expense" : "Add expense"}</DialogTitle>
            </DialogHeader>
            <input type="hidden" name="branchId" value={branchId} />
            {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required defaultValue={editing?.name} className="h-11" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={editing?.isActive ?? true}
              />
              Active
            </label>
            {canRestrict ? (
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  name="isSuperadminOnly"
                  defaultChecked={editing?.isSuperadminOnly ?? false}
                  className="mt-1"
                />
                <span>
                  Superadmin only
                  <span className="block text-xs text-muted-foreground">
                    Admins and staff cannot see or record this type. The amount
                    still counts toward their expense totals.
                  </span>
                </span>
              </label>
            ) : null}
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
