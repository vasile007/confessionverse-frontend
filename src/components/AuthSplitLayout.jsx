import React from "react";

export default function AuthSplitLayout({
  reverse = false,
  primary,
  secondary,
  primaryClassName = "card card-body",
  secondaryClassName = "card card-soft card-body space-y-6",
}) {
  return (
    <div className="page">
      <div className={`grid gap-8 ${reverse ? "md:grid-cols-[0.9fr_1.1fr]" : "md:grid-cols-[1.1fr_0.9fr]"}`}>
        <div className={primaryClassName}>{primary}</div>
        <div className={secondaryClassName}>{secondary}</div>
      </div>
    </div>
  );
}
