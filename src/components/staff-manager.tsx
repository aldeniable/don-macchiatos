"use client";

import { useState } from "react";
import { createStaffAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Branch, Role, StaffMember } from "@/lib/types";

export function StaffManager({
  staff,
  branches,
}: {
  staff: StaffMember[];
  branches: Branch[];
}) {
  const [role, setRole] = useState<Role>("user");

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold">Staff</h1>
      <form action={createStaffAction} className="flex flex-col gap-3 rounded-xl border p-4">
        <p className="font-medium">Invite account</p>
        <div className="flex flex-col gap-2">
          <Label htmlFor="fullName">Name</Label>
          <Input id="fullName" name="fullName" required className="h-11" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required className="h-11" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" required className="h-11" />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Role</Label>
          <Select
            value={role}
            onValueChange={(value) => {
              if (value) setRole(value as Role);
            }}
          >
            <SelectTrigger className="h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">Branch user</SelectItem>
              <SelectItem value="admin">Branch admin</SelectItem>
              <SelectItem value="superadmin">Superadmin</SelectItem>
            </SelectContent>
          </Select>
          <input type="hidden" name="role" value={role} />
        </div>
        {role !== "superadmin" ? (
          <BranchField branches={branches} />
        ) : null}
        <Button type="submit" className="h-11">
          Create account
        </Button>
      </form>
      <div className="flex flex-col gap-3">
        {staff.map((member) => (
          <Card key={member.id}>
            <CardContent>
              <p className="font-medium">{member.fullName || member.email}</p>
              <p className="text-xs text-muted-foreground">{member.email}</p>
              <p className="mt-1 text-sm capitalize">
                {member.role}
                {member.branchName
                  ? ` · ${member.businessName} ${member.branchName}`
                  : ""}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function BranchField({ branches }: { branches: Branch[] }) {
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  return (
    <div className="flex flex-col gap-2">
      <Label>Branch</Label>
      <Select
            value={branchId}
            onValueChange={(value) => {
              if (value) setBranchId(value);
            }}
          >
        <SelectTrigger className="h-11 w-full">
          <SelectValue placeholder="Select branch" />
        </SelectTrigger>
        <SelectContent>
          {branches.map((branch) => (
            <SelectItem key={branch.id} value={branch.id}>
              {branch.businessName} · {branch.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <input type="hidden" name="branchId" value={branchId} />
    </div>
  );
}
