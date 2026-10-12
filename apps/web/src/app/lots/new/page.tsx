"use client";

import React from "react";
import { AppLayout } from "../../../components/layout/AppLayout";
import { MobileLotWizard } from "../../../components/procurement/MobileLotWizard";

export default function NewLotPage() {
  return (
    <AppLayout>
      <div className="py-2">
        <MobileLotWizard />
      </div>
    </AppLayout>
  );
}
