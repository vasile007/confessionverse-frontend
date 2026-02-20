import React from "react";

export default function StatsGrid({
  stats,
  className = "",
  itemClassName = "",
  labelClassName = "",
  valueClassName = "",
}) {
  return (
    <section className={`grid gap-4 md:grid-cols-3 ${className}`.trim()}>
      {stats.map((stat) => (
        <div key={stat.label} className={`card card-body ${itemClassName}`.trim()}>
          <div className={`text-sm text-slate-500 ${labelClassName}`.trim()}>{stat.label}</div>
          <div className={`text-2xl font-semibold text-slate-900 ${valueClassName}`.trim()}>{stat.value}</div>
        </div>
      ))}
    </section>
  );
}
