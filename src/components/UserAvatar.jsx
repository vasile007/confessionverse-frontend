import React from "react";
import { getAvatarForUser } from "../services/avatarService.js";

const SIZE_MAP = {
  sm: 28,
  md: 42,
  lg: 56,
  xl: 132,
};

export default function UserAvatar({ user, size = "md", className = "" }) {
  const avatar = getAvatarForUser(user);
  const px = SIZE_MAP[size] || SIZE_MAP.md;

  return (
    <span
      className={`user-avatar ${className}`.trim()}
      aria-hidden="true"
      style={{ width: `${px}px`, height: `${px}px`, fontSize: `${Math.round(px * 0.68)}px` }}
    >
      {avatar.icon}
    </span>
  );
}
