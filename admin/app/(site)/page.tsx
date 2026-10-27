import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon, type IconName } from '../../components/site/Icon';
import { SITE } from '../../lib/site';
import s from './site.module.css';

export const metadata: Metadata = {
  title: 'Mediqo · Find and book doctors near you',
  description: 'Find verified doctors, hospitals and clinics near you, see open slots and book a visit in seconds. Hospitals and clinics manage bookings from the Mediqo dashboard.',
};

const FEATURES: { icon: IconName; title: string; text: string; fg: string; bg: string }[] = [
  { icon: 'pin', title: 'Doctors near you', text: 'See doctors, hospitals and clinics around you, sorted by distance, with fees and experience up front.', fg: '#0b8a83', bg: '#e3f4f2' },
  { icon: 'calendar', title: 'Book open slots', text: 'Pick a time from real availability. No calls, no waiting on hold, and no double bookings.', fg: '#2557c7', bg: '#e8f0fe' },
  { icon: 'sparkles', title: 'AI symptom assistant', text: 'Describe how you feel and get guidance on which specialist to see, plus doctors nearby.', fg: '#6d3fc4', bg: '#f1eafd' },
  { icon: 'shield', title: 'Verified doctors only', text: 'Every doctor’s credentials are checked by the Mediqo team before patients can book them.', fg: '#c2571a', bg: '#fdefe6' },
];

const STEPS = [
  { title: 'Find the right doctor', text: 'Search by specialty, hospital or name, or ask the assistant which specialist fits your symptoms.' },
  { title: 'Choose a time', text: 'See open slots for each doctor at each hospital or clinic they work at, and send your request.' },
  { title: 'Get confirmed', text: 'Reception or the doctor confirms, and you’ll see updates and a reminder in the app before your visit.' },
];

const PARTNER_POINTS = [
  { title: 'Hospitals', text: 'Add departments, doctors with fees and OPD timings, and reception staff who confirm bookings.' },
  { title: 'Clinics', text: 'Run your own clinic: set your fee and weekly timings and confirm your own bookings.' },
  { title: 'Doctors at several places', text: 'Sit at your clinic and a hospital; a booked slot blocks you everywhere automatically.' },
  { title: 'Live notifications', text: 'New requests appear instantly in the dashboard, with optional browser alerts for your desk.' },
];

function PlayButton({ className }: { className: string }) {
  if (SITE.playStoreUrl) {
    return (
      <a href={SITE.playStoreUrl} className={className}>
        <Icon name="play" size={18} /> Get it on Google Play
      </a>
    );
  }
  return (
    <span className={className} aria-disabled="true" style={{ cursor: 'default' }}>
      <Icon name="play" size={18} /> Coming soon on Google Play
    </span>
  );
}

export default function LandingPage() {
  return (
    <>
      <section className={s.hero}>
        <div className={`${s.container} ${s.heroInner}`}>
          <div>
            <span className={s.eyebrow}><span className={s.eyebrowDot} /> Doctors, hospitals and clinics in one app</span>
            <h1 className={s.heroTitle}>Healthcare that’s easy to book.</h1>
            <p className={s.heroText}>
              Mediqo helps you find trusted, verified doctors near you, see when they’re free and book a visit in seconds.
              Not sure who to see? Our assistant points you to the right specialist.
            </p>
            <div className={s.heroCtas}>
              <PlayButton className={`${s.btn} ${s.btnLg} ${s.btnWhite}`} />
              <Link href="/register" className={`${s.btn} ${s.btnLg} ${s.btnOutlineWhite}`}>
                List your hospital or clinic
              </Link>
            </div>
            <div className={s.heroStats}>
              <div className={s.heroStat}><strong>100%</strong><span>verified doctors</span></div>
              <div className={s.heroStat}><strong>24/7</strong><span>symptom assistant</span></div>
              <div className={s.heroStat}><strong>Live</strong><span>open slots</span></div>
            </div>
          </div>
          <div className={s.phones} aria-hidden="true">
            <div className={`${s.phone} ${s.phoneBack}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/screens/assistant.webp" alt="" width={540} height={1170} />
            </div>
            <div className={`${s.phone} ${s.phoneFront}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/screens/home.webp" alt="" width={540} height={1170} />
            </div>
          </div>
        </div>
      </section>

      <section id="features" className={s.section}>
        <div className={s.container}>
          <div className={s.sectionHead}>
            <div className={s.kicker}>Why Mediqo</div>
            <h2 className={s.h2}>Everything you need to see a doctor</h2>
            <p className={s.lead}>From finding the right specialist to walking in on time, Mediqo keeps it simple.</p>
          </div>
          <div className={s.features}>
            {FEATURES.map((f) => (
              <div key={f.title} className={s.feature}>
                <div className={s.featureIcon} style={{ background: f.bg }}>
                  <Icon name={f.icon} color={f.fg} />
                </div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className={`${s.section} ${s.sectionAlt}`}>
        <div className={s.container}>
          <div className={s.split}>
            <div>
              <div className={s.kicker}>How it works</div>
              <h2 className={s.h2}>Book a visit in three steps</h2>
              <p className={s.lead}>No phone queues. Your visits, updates and history stay in one place.</p>
              <div className={s.steps} style={{ gridTemplateColumns: '1fr', marginTop: 32, gap: 16 }}>
                {STEPS.map((step, i) => (
                  <div key={step.title} className={s.step} style={{ display: 'flex', gap: 18, padding: 22 }}>
                    <div className={s.stepNum} style={{ marginBottom: 0, flexShrink: 0 }}>{i + 1}</div>
                    <div>
                      <h3>{step.title}</h3>
                      <p>{step.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className={s.shot}>
              <div className={s.phone}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/screens/visits.webp" alt="The Visits screen in the Mediqo app, showing a confirmed appointment" width={540} height={1170} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="partners" className={s.section}>
        <div className={s.container}>
          <div className={s.split}>
            <div>
              <div className={s.kicker}>For hospitals &amp; clinics</div>
              <h2 className={s.h2}>Fill your OPD, not your phone lines</h2>
              <p className={s.lead}>
                Register your hospital or clinic, get approved by the Mediqo team, and patients nearby can book you from the app.
                Manage everything from one dashboard.
              </p>
              <ul className={s.checks}>
                {['Sign up online and go live once the Mediqo team approves you', 'Bookings arrive in your dashboard instantly', 'You stay in control: confirm, complete or cancel'].map((t) => (
                  <li key={t}>
                    <span className={s.checkIcon}><Icon name="check" size={16} color="#0b8a83" strokeWidth={2.6} /></span>
                    {t}
                  </li>
                ))}
              </ul>
              <div className={s.ctaButtons} style={{ justifyContent: 'flex-start' }}>
                <Link href="/register" className={`${s.btn} ${s.btnLg} ${s.btnPrimary}`}>
                  Register now <Icon name="arrow" size={18} />
                </Link>
                <Link href="/login" className={`${s.btn} ${s.btnLg} ${s.btnGhost}`}>Partner log in</Link>
              </div>
            </div>
            <div className={s.partnerCard}>
              {PARTNER_POINTS.map((p) => (
                <div key={p.title} className={s.partnerItem}>
                  <h4>{p.title}</h4>
                  <p>{p.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={s.section} style={{ paddingTop: 0 }}>
        <div className={s.container}>
          <div className={s.cta}>
            <h2 className={s.h2}>Your next appointment is a few taps away</h2>
            <p className={s.lead}>Download Mediqo, find a verified doctor near you and book a time that suits you.</p>
            <div className={s.ctaButtons}>
              <PlayButton className={`${s.btn} ${s.btnLg} ${s.btnWhite}`} />
              <Link href="/dashboard" className={`${s.btn} ${s.btnLg} ${s.btnOutlineWhite}`}>Open dashboard</Link>
            </div>
          </div>
          <div style={{ marginTop: 40 }}>
            <div className={s.disclaimer}>
              <Icon name="alert" size={20} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>
                Mediqo helps you find and book doctors. It does not provide medical diagnosis or treatment, and the assistant is not a substitute
                for a doctor. In an emergency, call your local emergency number or go to the nearest hospital.
              </span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
