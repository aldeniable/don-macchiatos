"use client";

import { useState } from "react";
import {
  createStaffAction,
  saveEmployeeTierAction,
  saveStaffBranchesAction,
} from "@/app/actions";
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
            <div className="flex flex-col gap-2">
              <Label>Stores</Label>
              <BranchChecklist branches={branches} />
            </div>
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
                <p className="mt-1 text-sm capitalize">{member.role}</p>
                {member.role !== "superadmin" ? (
                  <p className="text-xs text-muted-foreground">
                    {member.branches.length
                      ? member.branches
                          .map((branch) => `${branch.businessName} ${branch.name}`)
                          .join(" · ")
                      : "No store yet"}
                  </p>
                ) : null}
              </div>
              {member.role !== "superadmin" ? (
                <>
                  <MemberBranches member={member} branches={branches} />
                  <MemberTier member={member} tiers={tiers} />
                </>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// One person can work several counters, so stores are ticked rather than
// picked. Grouped by business, because the same branch name shows up under
// more than one of them.
function BranchChecklist({
  branches,
  selected,
  onToggle,
}: {
  branches: Branch[];
  selected?: string[];
  onToggle?: (branchId: string, checked: boolean) => void;
}) {
  const businessNames = [
    ...new Set(branches.map((branch) => branch.businessName)),
  ];
  return (
    <div className="flex flex-col gap-3 rounded-xl border p-3">
      {businessNames.map((businessName) => (
        <div key={businessName} className="flex flex-col gap-1">
          <p className="text-xs font-medium text-muted-foreground">
            {businessName}
          </p>
          {branches
            .filter((branch) => branch.businessName === businessName)
            .map((branch) => (
              <label
                key={branch.id}
                className="flex min-h-11 items-center gap-3 text-sm"
              >
                <input
                  type="checkbox"
                  name="branchIds"
                  value={branch.id}
                  className="size-5 accent-primary"
                  {...(selected
                    ? {
                        checked: selected.includes(branch.id),
                        onChange: (event) =>
                          onToggle?.(branch.id, event.target.checked),
                      }
                    : {})}
                />
                {branch.name}
              </label>
            ))}
        </div>
      ))}
    </div>
  );
}

// Same Save-once-it-changed rule as the pay rate below, so a list left alone
// cannot be submitted back over itself.
function MemberBranches({
  member,
  branches,
}: {
  member: StaffMember;
  branches: Branch[];
}) {
  const original = member.branches.map((branch) => branch.id);
  const [selected, setSelected] = useState(original);
  const unchanged =
    selected.length === original.length &&
    original.every((id) => selected.includes(id));

  return (
    <form action={saveStaffBranchesAction} className="flex flex-col gap-2">
      <input type="hidden" name="profileId" value={member.id} />
      <Label className="text-xs text-muted-foreground">Stores</Label>
      <BranchChecklist
        branches={branches}
        selected={selected}
        onToggle={(branchId, checked) =>
          setSelected((current) =>
            checked
              ? [...current, branchId]
              : current.filter((id) => id !== branchId),
          )
        }
      />
      <Button
        type="submit"
        variant="outline"
        className="h-11"
        disabled={unchanged || selected.length === 0}
      >
        Save stores
      </Button>
    </form>
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
