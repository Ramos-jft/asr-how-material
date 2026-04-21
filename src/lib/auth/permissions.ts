export const PERMISSIONS = {
  DASHBOARD_READ: "dashboard.read",
  REPORTS_READ: "reports.read",
  REPORTS_EXPORT: "reports.export",
  PRODUCTS_READ: "products.read",
  PRODUCTS_CREATE: "products.create",
  PRODUCTS_UPDATE: "products.update",
  PRODUCTS_IMAGES_UPLOAD: "products.images.upload",
  STOCK_READ: "stock.read",
  STOCK_ADJUST: "stock.adjust",
  CUSTOMERS_READ: "customers.read",
  CUSTOMERS_APPROVE: "customers.approve",
  ORDERS_READ: "orders.read",
  ORDERS_UPDATE_STATUS: "orders.update_status",
  ORDERS_CANCEL_RELEASE: "orders.cancel_release",
  PAYMENTS_CONFIRM_PIX: "payments.confirm_pix",
  PDV_CREATE_ORDER: "pdv.create_order",
  STORE_WINDOW_MANAGE: "store_window.manage",
  NOTIFICATIONS_SEND: "notifications.send",
} as const;

export type PermissionName =
  (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLES = {
  ADMIN: "ADMIN",
  PDV_OPERATOR: "PDV_OPERATOR",
  STOCK_OPERATOR: "STOCK_OPERATOR",
  SUPPORT: "SUPPORT",
  CUSTOMER: "CUSTOMER",
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

export function hasPermission(
  userPermissions: readonly string[],
  permission: PermissionName,
): boolean {
  return userPermissions.includes(permission);
}
