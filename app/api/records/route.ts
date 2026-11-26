import { and, eq, sql } from "drizzle-orm";
import {
  accountRecordId,
  accountSchema,
  defaultAccounts,
  previousWalletName,
  renameWalletFields,
} from "../../accounts-data";
import { getAppUser } from "../../auth";
import { budgetSchema, templateSchema, transactionSchema } from "../../budget-data";
import { billPlanSchema, billSchema } from "../../bills-data";
import { getDb } from "../../../db";
import { records } from "../../../db/schema";

export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

type RecordRow = {
  id: string;
  kind: string;
  payload: any;
  version: number;
};

export async function GET() {
  const user = await getAppUser();
  if (!user) return json({ error: "Please sign in again." }, 401);
  const db = getDb();

  const read = async (): Promise<RecordRow[]> => {
    const rows = await db
      .select({
        id: records.id,
        kind: records.kind,
        payload: records.payload,
        version: records.version,
      })
      .from(records)
      .where(eq(records.userId, user.userId));
    return rows.map((row) => ({ ...row, payload: JSON.parse(row.payload) }));
  };

  const current = await read();
  const updates: { id: string; payload: string; version: number }[] = [];
  for (const record of current) {
    const payload = renameWalletFields(record.kind, record.payload);
    if (payload === record.payload) continue;
    updates.push({
      id: record.id,
      payload: JSON.stringify(payload),
      version: record.version,
    });
  }

  if (updates.length) {
    await db.transaction(async (tx) => {
      for (const update of updates) {
        await tx
          .update(records)
          .set({ payload: update.payload, version: sql`${records.version} + 1` })
          .where(
            and(
              eq(records.userId, user.userId),
              eq(records.id, update.id),
              eq(records.version, update.version),
            ),
          );
      }
    });
  }

  return json({ records: updates.length ? await read() : current });
}

export async function POST(request: Request) {
  const user = await getAppUser();
  if (!user) return json({ error: "Please sign in again." }, 401);
  const db = getDb();

  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return json({ error: "Invalid origin." }, 403);
  }
  if (Number(request.headers.get("content-length") || 0) > 12000) {
    return json({ error: "Request too large." }, 413);
  }

  let b: any;
  try {
    const raw = await request.text();
    if (raw.length > 12000) return json({ error: "Request too large." }, 413);
    b = JSON.parse(raw);
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  if (
    !b ||
    typeof b.id !== "string" ||
    !/^[a-zA-Z0-9-]{1,80}$/.test(b.id) ||
    !Number.isSafeInteger(b.version) ||
    b.version < 0
  ) {
    return json({ error: "Invalid record." }, 400);
  }

  const findOne = async (id: string, kind: string) => {
    const rows = await db
      .select({ payload: records.payload })
      .from(records)
      .where(
        and(
          eq(records.userId, user.userId),
          eq(records.id, id),
          eq(records.kind, kind),
        ),
      )
      .limit(1);
    return rows[0];
  };

  if (b.action === "delete") {
    const deleted = await db
      .delete(records)
      .where(
        and(
          eq(records.userId, user.userId),
          eq(records.id, b.id),
          eq(records.version, b.version),
        ),
      )
      .returning({ id: records.id });
    return deleted.length
      ? json({ ok: true })
      : json(
          { error: "This record changed on another device. Refresh and try again." },
          409,
        );
  }

  if (b.action !== "save") return json({ error: "Invalid action." }, 400);

  const schema =
    b.kind === "transaction"
      ? transactionSchema
      : b.kind === "template"
        ? templateSchema
        : b.kind === "budget"
          ? budgetSchema
          : b.kind === "bill"
            ? billSchema
            : b.kind === "billplan"
              ? billPlanSchema
              : b.kind === "account"
                ? accountSchema
                : null;
  const parsed = schema?.safeParse(renameWalletFields(b.kind, b.payload));
  if (!parsed?.success) {
    return json({ error: "Check the amount, category, and date." }, 400);
  }
  if (b.kind === "budget" && b.id !== `budget-${(parsed.data as any).month}`) {
    return json({ error: "Invalid budget month." }, 400);
  }
  if (b.kind === "billplan" && b.id !== `billplan-${(parsed.data as any).month}`) {
    return json({ error: "Invalid plan month." }, 400);
  }

  if (b.kind === "bill" && (parsed.data as any).transactionId) {
    const linked = await findOne((parsed.data as any).transactionId, "transaction");
    if (!linked || JSON.parse(linked.payload).group !== "Bills") {
      return json(
        { error: "Choose an existing Bills transaction from your account." },
        400,
      );
    }
  }

  if (b.kind === "account") {
    const name = (parsed.data as any).name;
    if (
      [...defaultAccounts, previousWalletName].some(
        (account) => account.toLowerCase() === name.toLowerCase(),
      ) ||
      b.id !== (await accountRecordId(name))
    ) {
      return json({ error: "Choose a unique account name." }, 400);
    }
  }

  const data = parsed.data as any;
  for (const account of [data.account, data.fromAccount, data.toAccount].filter(Boolean)) {
    if (!defaultAccounts.includes(account)) {
      const custom = await findOne(await accountRecordId(account), "account");
      if (!custom || JSON.parse(custom.payload).name !== account) {
        return json(
          { error: "Choose an account saved in your account list." },
          400,
        );
      }
    }
  }

  const payload = JSON.stringify(parsed.data);

  // A retry after a lost response must not create another quick expense.
  if (
    b.version === 0 &&
    (b.kind === "account" ||
      (b.kind === "transaction" &&
        ((parsed.data as any).templateId ||
          (parsed.data as any).status === "pending" ||
          (parsed.data as any).group === "Transfer")))
  ) {
    const existing = await findOne(b.id, b.kind);
    if (existing && existing.payload === payload) return json({ ok: true });
  }

  if (b.kind === "bill" && b.version > 0) {
    const current = await findOne(b.id, "bill");
    if (current) {
      const old = JSON.parse(current.payload);
      const next = parsed.data as any;
      if (
        old.installments &&
        (JSON.stringify(old.installments) !== JSON.stringify(next.installments) ||
          old.name !== next.name ||
          old.month !== next.month ||
          old.category !== next.category)
      ) {
        return json(
          {
            error:
              "The payment schedule is locked. Update payment status to change the remaining count.",
          },
          400,
        );
      }
    }
  }

  if (b.version === 0) {
    const inserted = await db
      .insert(records)
      .values({
        userId: user.userId,
        id: b.id,
        kind: b.kind,
        payload,
        version: 1,
      })
      .onConflictDoNothing()
      .returning({ id: records.id });
    return inserted.length
      ? json({ ok: true })
      : json(
          { error: "This record changed on another device. Refresh before saving again." },
          409,
        );
  }

  const updated = await db
    .update(records)
    .set({ payload, version: sql`${records.version} + 1` })
    .where(
      and(
        eq(records.userId, user.userId),
        eq(records.id, b.id),
        eq(records.kind, b.kind),
        eq(records.version, b.version),
      ),
    )
    .returning({ id: records.id });

  return updated.length
    ? json({ ok: true })
    : json(
        { error: "This record changed on another device. Refresh before saving again." },
        409,
      );
}
