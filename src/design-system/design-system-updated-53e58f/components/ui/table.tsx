import * as React from "react";
import { cn } from "@/design-system/design-system-updated-53e58f/lib/utils";

type TableVariant = "deck" | "document";

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  variant?: TableVariant;
}

export const Table = ({ variant = "deck", className, ...props }: TableProps) => (
  <table className={cn(variant === "deck" ? "table-deck" : "table-document", className)} {...props} />
);
export const THead = (p: React.HTMLAttributes<HTMLTableSectionElement>) => <thead {...p} />;
export const TBody = (p: React.HTMLAttributes<HTMLTableSectionElement>) => <tbody {...p} />;
export const TR = (p: React.HTMLAttributes<HTMLTableRowElement>) => <tr {...p} />;
export const TH = (p: React.ThHTMLAttributes<HTMLTableCellElement>) => <th {...p} />;
export const TD = (p: React.TdHTMLAttributes<HTMLTableCellElement>) => <td {...p} />;