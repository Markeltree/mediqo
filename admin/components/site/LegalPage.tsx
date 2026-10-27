import type { ReactNode } from 'react';
import { SITE } from '../../lib/site';
import s from '../../app/(site)/site.module.css';

export type LegalSection = { id: string; title: string; body: ReactNode };

/** Terms / Privacy layout: title band, a sticky table of contents, and the numbered sections. */
export function LegalPage({ title, intro, sections }: { title: string; intro: ReactNode; sections: LegalSection[] }) {
  return (
    <>
      <div className={s.legalHero}>
        <div className={s.container}>
          <h1>{title}</h1>
          <p>Last updated: {SITE.legalUpdated}</p>
        </div>
      </div>
      <div className={`${s.container} ${s.legal}`}>
        <nav className={s.toc} aria-label="On this page">
          <p>On this page</p>
          <ol>
            {sections.map((sec) => (
              <li key={sec.id}><a href={`#${sec.id}`}>{sec.title}</a></li>
            ))}
          </ol>
        </nav>
        <article className={s.prose}>
          <div className={s.callout}>{intro}</div>
          {sections.map((sec, i) => (
            <section key={sec.id}>
              <h2 id={sec.id}>{i + 1}. {sec.title}</h2>
              {sec.body}
            </section>
          ))}
        </article>
      </div>
    </>
  );
}
