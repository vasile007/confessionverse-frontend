import React from "react";
import { Link } from "react-router-dom";
import UserAvatar from "./UserAvatar.jsx";

export default function UserIdentity({
  user,
  username,
  size = "sm",
  prefix = "",
  className = "",
  textClassName = "",
  to = "",
}) {
  const resolvedUser = user || (username ? { username } : null);
  const displayName = username || user?.username || "Anonymous";
  const isPro =
    !!user?.premium ||
    String(user?.planType || "").toUpperCase() === "PRO" ||
    String(user?.subscriptionPlan || "").toUpperCase() === "PRO";
  const content = (
    <>
      <UserAvatar user={resolvedUser} size={size} />
      <span className={textClassName}>{`${prefix}${displayName}`}</span>
      {isPro && <span className="user-identity__pro-badge">PRO</span>}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={`user-identity user-identity--link ${className}`.trim()}>
        {content}
      </Link>
    );
  }

  return <span className={`user-identity ${className}`.trim()}>{content}</span>;
}
