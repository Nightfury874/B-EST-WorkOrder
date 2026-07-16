import type { PropertyInfo, TenantInfo, TenantInfoFile } from "./types";

export const fallbackTenantInfo: TenantInfoFile = {
  version: 1,
  purpose: "MVP P141 tenant-session fixture used when tenant_info.json is missing or invalid.",
  default_language: "en",
  current_tenant_id: "tenant-p141-miguel",
  tenants: [
    {
      tenant_id: "tenant-p141-miguel",
      name: "Miguel Gomez Jr.",
      email: "m92gomez@gmail.com",
      whitelisted: true,
      display_label: "Miguel Gomez Jr.",
      contact_preferences: {
        preferred_method: "phone",
        phone: "(346) 283-8757",
      },
      property_ids: ["P141"],
    },
    {
      tenant_id: "tenant-p141-elizabeth",
      name: "Elizabeth Lopez",
      email: "Yaya86lopez@gmail.com",
      whitelisted: true,
      display_label: "Elizabeth Lopez",
      contact_preferences: {
        preferred_method: "phone",
        phone: "(346) 801-8367",
      },
      property_ids: ["P141"],
    },
  ],
  properties: [
    {
      property_id: "P141",
      address: "2526 Valley Forest, Missouri City, TX 77489",
      unit: "",
      active: true,
      notes: "MVP fixture. Production integration should resolve this from the authenticated tenant session.",
    },
  ],
};

export function getCurrentTenant(data: TenantInfoFile) {
  const configured = data.current_tenant_id
    ? data.tenants.find((tenant) => tenant.tenant_id === data.current_tenant_id)
    : undefined;
  return configured ?? data.tenants.find((tenant) => tenant.whitelisted) ?? data.tenants[0];
}

export function getPropertiesForTenant(tenant: TenantInfo, properties: PropertyInfo[]) {
  return properties.filter((property) => tenant.property_ids.includes(property.property_id) && property.active);
}
