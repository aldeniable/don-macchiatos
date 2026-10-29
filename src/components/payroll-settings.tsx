"use client";

import { useState } from "react";
import {
  saveEmployeeTierAction,
  saveOvertimeRateAction,
  savePayTierAction,
  saveShiftHoursAction,
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
import { Separator } from "@/components/ui/separator";
import { pesos } from "@/lib/money";
import type { Branch, BranchEmployee, PaySettings, PayTier } from "@/lib/types";

export function PayrollSettings({
  branch,
  employees,
  tiers,
  settings,
}: {
  branch: Branch;
  employees: BranchEmployee[];
  tiers: PayTier[];
  settings: PaySettings;
}) {
  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          {branch.name}
        </h2>
        <Card>
          <CardContent>
            <form action={saveShiftHoursAction} className="flex flex-col gap-3">
              <input type="hidden" name="branchId" value={branch.id} />
              <div className="flex flex-col gap-2">
                <Label htmlFor="standardShiftHours">Standard shift</Label>
                <Input
                  id="standardShiftHours"
                  name="standardShiftHours"
                  type="number"
                  inputMode="decimal"
                  min={1}
                  max={24}
                  step="0.5"
                  defaultValue={branch.standardShiftHours}
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">
                  Hours in a full shift, lunch included. Anything past it is
                  overtime.
                </p>
              </div>
              <Button type="submit" className="h-11">
                Save shift length
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          Who gets which rate
        </h2>
        {employees.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nobody is assigned to this branch yet.
          </p>
        ) : (
          employees.map((employee) => (
            <EmployeeTier
              key={employee.id}
              branchId={branch.id}
              employee={employee}
              tiers={tiers}
            />
          ))
        )}
      </section>

      <Separator />

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">Pay rates</h2>
        <p className="text-xs text-muted-foreground">
          These apply to every branch. A shift already approved keeps the rate it
          was approved at, so changing an amount here only affects what is
          approved from now on.
        </p>
        {tiers.map((tier) => (
          <Card key={tier.id}>
            <CardContent>
              <form action={savePayTierAction} className="flex flex-col gap-3">
                <input type="hidden" name="branchId" value={branch.id} />
                <input type="hidden" name="id" value={tier.id} />
                <div className="flex gap-2">
                  <div className="flex flex-1 flex-col gap-2">
                    <Label htmlFor={`name-${tier.id}`}>Name</Label>
                    <Input
                      id={`name-${tier.id}`}
                      name="name"
                      defaultValue={tier.name}
                      className="h-11"
                    />
                  </div>
                  <div className="flex w-32 flex-col gap-2">
                    <Label htmlFor={`rate-${tier.id}`}>Per day</Label>
                    <Input
                      id={`rate-${tier.id}`}
                      name="dailyRate"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.01"
                      defaultValue={tier.dailyRate}
                      className="h-11 text-base"
                    />
                  </div>
                </div>
                <Button type="submit" variant="outline" className="h-11">
                  Save rate
                </Button>
              </form>
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardContent>
            <form action={saveOvertimeRateAction} className="flex flex-col gap-3">
              <input type="hidden" name="branchId" value={branch.id} />
              <div className="flex flex-col gap-2">
                <Label htmlFor="overtimeHourlyRate">Overtime, per hour</Label>
                <Input
                  id="overtimeHourlyRate"
                  name="overtimeHourlyRate"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  defaultValue={settings.overtimeHourlyRate}
                  className="h-11 text-base"
                />
                <p className="text-xs text-muted-foreground">
                  The same for every rate, counted by the minute past the
                  standard shift.
                </p>
              </div>
              <Button type="submit" variant="outline" className="h-11">
                Save overtime rate
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

// The Save button only wakes up once the choice has actually changed, so a
// dropdown left alone cannot be submitted back over itself.
function EmployeeTier({
  branchId,
  employee,
  tiers,
}: {
  branchId: string;
  employee: BranchEmployee;
  tiers: PayTier[];
}) {
  const [payTierId, setPayTierId] = useState(employee.payTierId ?? "");

  return (
    <Card size="sm">
      <CardContent className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{employee.fullName}</p>
          <p className="text-[11px] text-muted-foreground capitalize">
            {employee.role}
          </p>
        </div>
        <form action={saveEmployeeTierAction} className="flex items-center gap-2">
          <input type="hidden" name="branchId" value={branchId} />
          <input type="hidden" name="profileId" value={employee.id} />
          <input type="hidden" name="payTierId" value={payTierId} />
          <Select
            items={tiers.map((tier) => ({
              value: tier.id,
              label: `${tier.name} · ${pesos(tier.dailyRate)}`,
            }))}
            value={payTierId}
            onValueChange={(value) => setPayTierId(value ?? "")}
          >
            <SelectTrigger className="h-10 w-40">
              <SelectValue placeholder="No rate" />
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
            size="sm"
            disabled={payTierId === (employee.payTierId ?? "")}
          >
            Save
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
