import { NextResponse } from "next/server";
import { fallbackTenantInfo } from "@/lib/tenantData";
import type { TenantInfoFile } from "@/lib/types";
import tenantInfo from "../../../../tenant_info.json";

export async function GET() {
  const data = tenantInfo as TenantInfoFile;
  if (!data.tenants?.length || !data.properties?.length) {
    return NextResponse.json({ ...fallbackTenantInfo, source: "fallback_empty_tenant_info" });
  }

  return NextResponse.json({ ...data, source: "tenant_info_json" });
}
