"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ClaimBusinessPanel } from "@/features/business/claim-business-panel";

export function ClaimBusinessButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="secondary" className="w-full py-2.5 text-sm" onClick={() => setIsOpen(true)}>
        Claim a business
      </Button>
      {isOpen && <ClaimBusinessPanel onClose={() => setIsOpen(false)} />}
    </>
  );
}
