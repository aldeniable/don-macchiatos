import { notFound } from "next/navigation";
import { DayEntryForm } from "@/components/day-entry-form";
import { getDayEntry } from "@/lib/data";
import { isFutureDate } from "@/lib/dates";

export default async function DayPage({
  params,
}: {
  params: Promise<{ branchId: string; date: string }>;
}) {
  const { branchId, date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isFutureDate(date)) notFound();
  const entry = await getDayEntry(branchId, date);
  return <DayEntryForm branchId={branchId} entry={entry} />;
}
