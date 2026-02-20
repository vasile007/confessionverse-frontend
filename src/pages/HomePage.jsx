import React from "react";
import { Link } from "react-router-dom";

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
        <p className="home-luxe__copy">(c) 2026 ConfessionVerse. All rights reserved.</p>
      </section>
    </div>
  );
}
