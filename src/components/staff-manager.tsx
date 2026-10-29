"use client";

import { useState } from "react";
import { createStaffAction, saveEmployeeTierAction } from "@/app/actions";
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
import { pesos } from "@/lib/money";
import type { Branch, PayTier, Role, StaffMember } from "@/lib/types";

export function StaffManager({
  staff,
  branches,
  tiers,
}: {
  staff: StaffMember[];
  branches: Branch[];
  tiers: PayTier[];
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
            items={[
              { value: "user", label: "Branch user" },
              { value: "admin", label: "Branch admin" },
              { value: "superadmin", label: "Superadmin" },
            ]}
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
          <>
            <BranchField branches={branches} />
            <PayTierField tiers={tiers} />
          </>
        ) : null}
        <Button type="submit" className="h-11">
          Create account
        </Button>
      </form>
      <div className="flex flex-col gap-3">
        {staff.map((member) => (
          <Card key={member.id}>
            <CardContent className="flex flex-col gap-3">
              <div>
                <p className="font-medium">{member.fullName || member.email}</p>
                <p className="text-xs text-muted-foreground">{member.email}</p>
                <p className="mt-1 text-sm capitalize">
                  {member.role}
                  {member.branchName
                    ? ` · ${member.businessName} ${member.branchName}`
                    : ""}
                </p>
              </div>
              {member.role !== "superadmin" ? (
                <MemberTier member={member} tiers={tiers} />
              ) : null}
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
        items={branches.map((branch) => ({
          value: branch.id,
          label: `${branch.businessName} · ${branch.name}`,
        }))}
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

// The closed trigger shows the raw value unless it is given labels, and the
// value here is a tier id.
function tierItems(tiers: PayTier[]) {
  return tiers.map((tier) => ({
    value: tier.id,
    label: `${tier.name} · ${pesos(tier.dailyRate)}`,
  }));
}

function PayTierField({ tiers }: { tiers: PayTier[] }) {
  const [payTierId, setPayTierId] = useState(tiers[0]?.id ?? "");
  return (
    <div className="flex flex-col gap-2">
      <Label>Pay rate</Label>
      <Select
        items={tierItems(tiers)}
        value={payTierId}
        onValueChange={(value) => {
          if (value) setPayTierId(value);
        }}
      >
        <SelectTrigger className="h-11 w-full">
          <SelectValue placeholder="Select pay rate" />
        </SelectTrigger>
        <SelectContent>
          {tiers.map((tier) => (
            <SelectItem key={tier.id} value={tier.id}>
              {tier.name} · {pesos(tier.dailyRate)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <input type="hidden" name="payTierId" value={payTierId} />
    </div>
  );
}

// The Save button only wakes up once the choice has actually changed, so a
// dropdown left alone cannot be submitted back over itself.
function MemberTier({ member, tiers }: { member: StaffMember; tiers: PayTier[] }) {
  const [payTierId, setPayTierId] = useState(member.payTierId ?? "");

  return (
    <form action={saveEmployeeTierAction} className="flex items-center gap-2">
      <input type="hidden" name="branchId" value={member.branchId ?? ""} />
      <input type="hidden" name="profileId" value={member.id} />
      <input type="hidden" name="payTierId" value={payTierId} />
      <Select
        items={tierItems(tiers)}
        value={payTierId}
        onValueChange={(value) => setPayTierId(value ?? "")}
      >
        <SelectTrigger className="h-11 flex-1">
          <SelectValue placeholder="No pay rate" />
        </SelectTrigger>
        <SelectContent>
          {tiers.map((tier) => (
            <SelectItem key={tier.id} value={tier.id}>
              {tier.name} · {pesos(tier.dailyRate)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="submit"
        variant="outline"
        className="h-11"
        disabled={payTierId === (member.payTierId ?? "")}
      >
        Save
      </Button>
    </form>
  );
}
