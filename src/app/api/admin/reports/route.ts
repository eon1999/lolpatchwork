import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { ok, fail } from "@/lib/api";

function authorized(req: Request): boolean {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return false;
  return req.headers.get("authorization") === `Bearer ${token}`;
}

export async function GET(req: Request) {
  if (!authorized(req)) return fail("FORBIDDEN", "Bad admin token.", 401);

  const reportedCreations = (
    await db.execute<{
      id: string;
      name: string;
      author: string;
      report_count: number;
      is_hidden: boolean;
      created_at: string;
    }>(sql`
      select c.id, c.name, u.display_name as author, c.report_count, c.is_hidden, c.created_at
      from creations c join users u on u.id = c.user_id
      where c.report_count > 0
      order by c.report_count desc, c.created_at desc limit 100
    `)
  );

  const reportedComments = (
    await db.execute<{
      id: string;
      body: string;
      author: string;
      report_count: number;
      is_hidden: boolean;
      created_at: string;
    }>(sql`
      select bc.id, bc.body, u.display_name as author,
        (select count(*) from reports r where r.target_type = 'comment' and r.target_id = bc.id)::int as report_count,
        bc.is_hidden, bc.created_at
      from battle_comments bc join users u on u.id = bc.user_id
      where exists (select 1 from reports r where r.target_type = 'comment' and r.target_id = bc.id)
      order by report_count desc, bc.created_at desc limit 100
    `)
  );

  return ok({ reportedCreations, reportedComments });
}
