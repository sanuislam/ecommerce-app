/**
 * Who may do what in the admin panel. Used by the proxy (pages and APIs),
 * by route handlers and by the navigation. No server-only imports: the proxy
 * and client components use it too.
 *
 * The owner (role ADMIN) may do everything. Staff (role STAFF) get the
 * permissions of their `staffRole`.
 */
export const PERMISSIONS = {
  orders: "Orders: view, create, edit, ship, print, couriers, SMS",
  refunds: "Send money back (gateway and recorded refunds)",
  returns: "Returns and exchanges",
  products: "Products, categories, import / export",
  inventory: "Stock levels and adjustments",
  coupons: "Coupons",
  customers: "Customer list",
  content: "Legal pages, SEO",
  reports: "Sales reports, revenue and profit",
  marketing: "Abandoned carts, SMS campaigns",
  owner: "Settings, payments, couriers, SMS setup, tracking pixels, staff, audit log",
} as const;
export type Permission = keyof typeof PERMISSIONS;

export const STAFF_ROLES = {
  manager: {
    label: "Manager",
    description: "Runs the shop day to day: everything except settings and staff.",
    perms: ["orders", "refunds", "returns", "products", "inventory", "coupons", "customers", "content", "reports", "marketing"],
  },
  orders: {
    label: "Order staff",
    description: "Confirms, packs and ships orders; handles returns. Can't send refunds.",
    perms: ["orders", "returns", "customers"],
  },
  inventory: {
    label: "Inventory staff",
    description: "Products, stock and imports.",
    perms: ["products", "inventory"],
  },
  content: {
    label: "Content staff",
    description: "Products, coupons, legal pages, SEO and marketing.",
    perms: ["products", "coupons", "content", "marketing"],
  },
} as const satisfies Record<string, { label: string; description: string; perms: readonly Permission[] }>;
export type StaffRole = keyof typeof STAFF_ROLES;
export const STAFF_ROLE_IDS = Object.keys(STAFF_ROLES) as StaffRole[];

export function isStaffRole(v: unknown): v is StaffRole {
  return typeof v === "string" && v in STAFF_ROLES;
}

/** Can a user with this role (and staff role) do `perm`? */
export function can(role: string | null | undefined, staffRole: string | null | undefined, perm: Permission): boolean {
  if (role === "ADMIN") return true;
  if (role !== "STAFF" || !isStaffRole(staffRole)) return false;
  return (STAFF_ROLES[staffRole].perms as readonly Permission[]).includes(perm);
}

/** May use the admin panel at all (owner or staff with a known role). */
export const isAdminUser = (role: string | null | undefined, staffRole: string | null | undefined) =>
  role === "ADMIN" || (role === "STAFF" && isStaffRole(staffRole));

// Path → permission. The first prefix that matches wins (most specific first).
const PAGE_RULES: [string, Permission | "any"][] = [
  ["/admin/products/import", "products"],
  ["/admin/products", "products"],
  ["/admin/categories", "products"],
  ["/admin/inventory", "inventory"],
  ["/admin/orders", "orders"],
  ["/admin/returns", "returns"],
  ["/admin/coupons", "coupons"],
  ["/admin/users", "customers"],
  ["/admin/customers", "customers"],
  ["/admin/messages", "customers"],
  ["/admin/reports", "reports"],
  ["/admin/carts", "marketing"],
  ["/admin/campaigns", "marketing"],
  ["/admin/tracking", "owner"],
  ["/admin/policies", "content"],
  ["/admin/seo", "content"],
  ["/admin/security", "any"],
  ["/admin/payments", "owner"],
  ["/admin/couriers", "owner"],
  ["/admin/sms", "owner"],
  ["/admin/order-rules", "owner"],
  ["/admin/settings", "owner"],
  ["/admin/staff", "owner"],
  ["/admin/audit", "owner"],
  ["/print/orders", "orders"],
  ["/admin", "any"],
];

const API_RULES: [string, Permission | "any"][] = [
  ["/api/admin/payments/bkash/refund", "refunds"],
  ["/api/admin/payments/upay/refund", "refunds"],
  ["/api/admin/payments", "owner"],
  ["/api/admin/couriers/settings", "owner"],
  ["/api/admin/couriers/test", "owner"],
  ["/api/admin/couriers", "orders"],
  ["/api/admin/sms/send", "orders"],
  ["/api/admin/sms", "owner"],
  ["/api/admin/orders", "orders"],
  ["/api/admin/customers/export", "customers"],
  ["/api/admin/customer-sms", "customers"],
  ["/api/admin/messages", "customers"],
  ["/api/admin/customers", "orders"],
  ["/api/admin/returns", "returns"],
  ["/api/admin/inventory", "inventory"],
  ["/api/admin/products/search", "orders"],
  ["/api/admin/products", "products"],
  ["/api/admin/categories", "products"],
  ["/api/admin/uploads", "products"],
  ["/api/admin/demo-products", "products"],
  ["/api/admin/coupons", "coupons"],
  ["/api/admin/policies", "content"],
  ["/api/admin/seo", "content"],
  ["/api/admin/reports", "reports"],
  ["/api/admin/carts", "marketing"],
  ["/api/admin/campaigns", "marketing"],
  ["/api/admin/security", "any"],
  ["/api/admin", "owner"],
];

function rule(rules: [string, Permission | "any"][], path: string) {
  const p = path.toLowerCase();
  return rules.find(([prefix]) => p === prefix || p.startsWith(`${prefix}/`))?.[1] ?? null;
}

/** The permission a page or admin API path needs (null = not an admin path). */
export function permissionForPath(path: string): Permission | "any" | null {
  return path.toLowerCase().startsWith("/api/") ? rule(API_RULES, path) : rule(PAGE_RULES, path);
}

export function canAccessPath(role: string | null | undefined, staffRole: string | null | undefined, path: string) {
  const need = permissionForPath(path);
  if (need === null) return true;
  if (!isAdminUser(role, staffRole)) return false;
  return need === "any" || can(role, staffRole, need);
}
