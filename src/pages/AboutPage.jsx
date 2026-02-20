import React from "react";

export default function AboutPage() {
  return (
    <div className="about-luxe">
      <section className="about-luxe__hero">
        <div className="about-luxe__veil" />
        <div className="about-luxe__center">
          <p className="about-luxe__kicker">ABOUT</p>
          <h1 className="about-luxe__title">ConfessionVerse</h1>

          <div className="about-luxe__line about-luxe__line--top">
            <span className="about-luxe__line-dot" aria-hidden="true" />
          </div>

          <div className="about-luxe__copy" aria-label="About ConfessionVerse text">
            <p>ConfessionVerse was created for the thoughts we never say out loud.</p>
            <p>For the stories that need silence, not exposure.</p>
            <p>For stories that are heard but never exposed.</p>
          </div>

          <div className="about-luxe__line about-luxe__line--bottom">
            <span className="about-luxe__seal" aria-hidden="true">
              <span className="about-luxe__seal-core">C</span>
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
