import { eq, and } from "drizzle-orm";
import { users, userCompanies } from "#server/database/schema";
import { db } from "#server/utils/db";
import { requireAdmin, requireCompanyAccess } from "#server/utils/session";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const companyId = query.companyId
    ? parseInt(query.companyId as string)
    : undefined;

  let allUsers;

  if (companyId) {
    requireCompanyAccess(event, companyId);
    // Return users belonging to this company via junction table
    // Expose the global access profile from users.role.
    // Keep companyRole for contextual display when needed.
    allUsers = await db
      .select({
        id: users.id,
        companyId: users.companyId,
        defaultCompanyId: users.defaultCompanyId,
        name: users.name,
        email: users.email,
        document: users.document,
        phone: users.phone,
        role: users.role,
        companyRole: userCompanies.role,
        active: users.active,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .innerJoin(
        userCompanies,
        and(
          eq(userCompanies.userId, users.id),
          eq(userCompanies.companyId, companyId),
        ),
      )
      .all();
  } else {
    // No scoping — only admins may enumerate all users in the system.
    requireAdmin(event);
    allUsers = await db.select().from(users).all();
  }

  return { users: allUsers };
});
