"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ClaimBusinessPanel } from "@/features/business/claim-business-panel";

export function ClaimBusinessButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button type="button" className="h-12 w-full text-[1rem] font-semibold" onClick={() => setIsOpen(true)}>
        Claim a Business
      </Button>
      {isOpen && <ClaimBusinessPanel onClose={() => setIsOpen(false)} />}
    </>
  );
}
