import React from "react";
import { Link } from "react-router-dom";

const socialLinks = [
  {
    name: "Facebook",
    className: "home-luxe__social-link--facebook",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M13.5 21v-7h2.35l.4-3h-2.75V9.08c0-.87.24-1.46 1.49-1.46H16.4V4.97c-.24-.03-1.08-.1-2.06-.1-2.04 0-3.44 1.24-3.44 3.53V11H8.6v3h2.3v7h2.6Z" />
      </svg>
    ),
  },
  {
    name: "TikTok",
    className: "home-luxe__social-link--tiktok",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M14.72 3c.22 1.86 1.29 3.38 2.95 4.17a5.3 5.3 0 0 0 2.14.5v2.81a8.12 8.12 0 0 1-4.98-1.72v5.52c0 1.39-.44 2.6-1.3 3.61A5.9 5.9 0 0 1 8.85 20C5.63 20 3 17.45 3 14.33c0-3.01 2.45-5.51 5.52-5.66v2.9a2.76 2.76 0 0 0-1.75.72 2.63 2.63 0 0 0-.85 1.97c0 1.48 1.2 2.69 2.7 2.69 1.62 0 2.76-1.22 2.76-2.95V3h3.34Z" />
      </svg>
    ),
  },
  {
    name: "Instagram",
    className: "home-luxe__social-link--instagram",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <defs>
          <linearGradient id="instagram-gradient" x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f9ce34" />
            <stop offset="45%" stopColor="#ee2a7b" />
            <stop offset="100%" stopColor="#6228d7" />
          </linearGradient>
        </defs>
        <path
          fill="url(#instagram-gradient)"
          d="M7.2 3h9.6A4.2 4.2 0 0 1 21 7.2v9.6a4.2 4.2 0 0 1-4.2 4.2H7.2A4.2 4.2 0 0 1 3 16.8V7.2A4.2 4.2 0 0 1 7.2 3Zm0 1.8A2.4 2.4 0 0 0 4.8 7.2v9.6a2.4 2.4 0 0 0 2.4 2.4h9.6a2.4 2.4 0 0 0 2.4-2.4V7.2a2.4 2.4 0 0 0-2.4-2.4H7.2Zm10.05 1.35a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4ZM12 7.8A4.2 4.2 0 1 1 7.8 12 4.2 4.2 0 0 1 12 7.8Zm0 1.8A2.4 2.4 0 1 0 14.4 12 2.4 2.4 0 0 0 12 9.6Z"
        />
      </svg>
    ),
  },
];

export default function HomePage() {
  return (
    <div className="home-luxe">
      <section className="home-luxe__hero">
        <div className="home-luxe__veil"></div>
        <div className="home-luxe__center">
          <h1 className="home-luxe__title">CONFESSIONVERSE</h1>
          <p className="home-luxe__signature">
            <span>Speak freely.</span>
            <span className="home-luxe__signature-sep">|</span>
            <span>Remain unseen.</span>
          </p>
          <div className="home-luxe__line">
            <span className="home-luxe__seal" aria-hidden="true">
              <span className="home-luxe__seal-core">C</span>
            </span>
          </div>
          <Link to="/confessions" className="home-luxe__enter-btn">
            ENTER
          </Link>
          <div className="home-luxe__presence" aria-label="Online presence">
            <span className="home-luxe__presence-dot" />
            <span className="home-luxe__presence-text">27 people online</span>
          </div>
        </div>
      </section>

      <section className="home-luxe__footer">
        <div className="home-luxe__socials" aria-label="Social media links">
          {socialLinks.map((social) => (
            <a
              key={social.name}
              href={social.href}
              className={`home-luxe__social-link ${social.className}`}
              aria-label={social.name}
              title={social.name}
            >
              {social.icon}
            </a>
          ))}
        </div>
        <p className="home-luxe__copy">(c) 2026 ConfessionVerse. All rights reserved.</p>
      </section>
    </div>
  );
}
