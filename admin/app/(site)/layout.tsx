import type { ReactNode } from 'react';
import Link from 'next/link';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { Logo } from '../../components/site/Logo';
import { SITE } from '../../lib/site';
import s from './site.module.css';

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-jakarta' });

export default function SiteLayout({ children }: { children: ReactNode }) {
  const year = new Date().getFullYear();
  return (
    <div className={`${s.site} ${jakarta.variable}`}>
      <header className={s.header}>
        <div className={`${s.container} ${s.headerInner}`}>
          <Link href="/" aria-label="Mediqo home"><Logo /></Link>
          <nav className={s.navLinks} aria-label="Main">
            <Link href="/#features">Features</Link>
            <Link href="/#how-it-works">How it works</Link>
            <Link href="/#partners">For hospitals</Link>
          </nav>
          <div className={s.headerActions}>
            <Link href="/login" className={`${s.btn} ${s.btnGhost} ${s.hideSm}`}>Log in</Link>
            <Link href="/dashboard" className={`${s.btn} ${s.btnPrimary}`}>Dashboard</Link>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className={s.footer}>
        <div className={s.container}>
          <div className={s.footerGrid}>
            <div className={s.footerBrand}>
              <Logo light />
              <p>{SITE.tagline}. Verified doctors, hospitals and clinics, all in one app.</p>
            </div>
            <div>
              <h5>Product</h5>
              <ul>
                <li><Link href="/#features">Features</Link></li>
                <li><Link href="/#how-it-works">How it works</Link></li>
                <li>{SITE.playStoreUrl ? <a href={SITE.playStoreUrl}>Get the Android app</a> : 'Android app (coming soon)'}</li>
              </ul>
            </div>
            <div>
              <h5>For partners</h5>
              <ul>
                <li><Link href="/register">Register a hospital or clinic</Link></li>
                <li><Link href="/login">Partner log in</Link></li>
                <li><Link href="/dashboard">Dashboard</Link></li>
              </ul>
            </div>
            <div>
              <h5>Company</h5>
              <ul>
                <li><Link href="/terms">Terms &amp; Conditions</Link></li>
                <li><Link href="/privacy">Privacy Policy</Link></li>
                <li><a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a></li>
              </ul>
            </div>
          </div>
          <div className={s.footerBottom}>
            <span>© {year} {SITE.name}. All rights reserved.</span>
            <span>Not for emergencies. In a medical emergency, call 1122 or go to the nearest hospital.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
