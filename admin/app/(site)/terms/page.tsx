import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, type LegalSection } from '../../../components/site/LegalPage';
import { SITE } from '../../../lib/site';

export const metadata: Metadata = {
  title: 'Terms & Conditions · Mediqo',
  description: 'The terms that apply when you use the Mediqo app, website and dashboard.',
};

const email = <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>;

const SECTIONS: LegalSection[] = [
  {
    id: 'agreement',
    title: 'Agreement to these terms',
    body: (
      <p>
        These Terms &amp; Conditions (“Terms”) apply to the Mediqo mobile app, this website and the Mediqo dashboard (together, the “Service”),
        operated by {SITE.name} (“Mediqo”, “we”, “us”). By creating an account or using the Service you agree to these Terms and to our{' '}
        <Link href="/privacy">Privacy Policy</Link>. If you do not agree, please do not use the Service.
      </p>
    ),
  },
  {
    id: 'not-medical-advice',
    title: 'Mediqo is not a healthcare provider',
    body: (
      <>
        <p>
          Mediqo is a booking platform. It helps you find doctors, hospitals and clinics and request appointments with them. Mediqo does not
          provide medical care, diagnosis or treatment. Medical services are provided solely by the independent doctors and facilities you book,
          who are responsible for the care they give.
        </p>
        <p>
          The in-app assistant gives general information to help you choose a type of specialist. It may be incomplete or wrong, it is not a
          substitute for professional advice, and you should not rely on it for diagnosis or treatment decisions.
        </p>
        <p><strong>Not for emergencies.</strong> If you think you have a medical emergency, call your local emergency number (such as 1122 in Pakistan, 911 in the US or 999 in the UK) or go to the nearest hospital immediately.</p>
      </>
    ),
  },
  {
    id: 'eligibility',
    title: 'Eligibility and accounts',
    body: (
      <ul>
        <li>You must be at least 18 years old to create an account. A parent or guardian may book for a child using their own account.</li>
        <li>Give accurate information and keep it up to date.</li>
        <li>Keep your password confidential. You are responsible for activity on your account; tell us at {email} if you think it has been misused.</li>
        <li>Staff accounts created by a hospital are for that person only and must not be shared.</li>
      </ul>
    ),
  },
  {
    id: 'bookings',
    title: 'Appointments',
    body: (
      <>
        <ul>
          <li>A booking is a request. It is confirmed only when the hospital’s reception or, for a clinic, the doctor confirms it.</li>
          <li>Fees shown in the app are set by the doctor or facility and are paid to them directly unless we tell you otherwise. Fees may change before your visit is confirmed.</li>
          <li>Please arrive on time. If you can’t attend, cancel in the app before the visit starts so the slot can go to someone else.</li>
          <li>Doctors and facilities may cancel or reschedule visits, for example in an emergency. We will show the update in the app, but we are not responsible for their decisions or for waiting times at the facility.</li>
          <li>Repeated no-shows or misuse of bookings may lead us to limit or close an account.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'providers',
    title: 'Terms for hospitals, clinics and doctors',
    body: (
      <ul>
        <li>Facilities and doctors appear to patients only after Mediqo approves the facility and verifies each doctor. We may ask for documents such as a valid medical registration (for example PMDC in Pakistan) and may refuse or remove a listing at our discretion.</li>
        <li>You confirm that every doctor you list is properly qualified, licensed and authorised to practise, and that the fees, timings and details you publish are accurate and kept up to date.</li>
        <li>You are solely responsible for the medical services you provide, for your staff, and for complying with all laws that apply to you, including medical, consumer and data protection laws.</li>
        <li>Patient information you receive through Mediqo may be used only to provide and manage that patient’s care, must be kept confidential and secure, and must not be used for marketing.</li>
        <li>Respond to booking requests promptly and keep your availability current so patients are not left waiting.</li>
      </ul>
    ),
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable use',
    body: (
      <>
        <p>You agree not to:</p>
        <ul>
          <li>make fake, duplicate or abusive bookings, or impersonate another person or a doctor;</li>
          <li>post false information about qualifications, facilities or fees;</li>
          <li>access data you are not authorised to see, scrape the Service, or interfere with its security or operation;</li>
          <li>use the Service for any unlawful purpose or in a way that harms patients, providers or Mediqo.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'ip',
    title: 'Our content and your content',
    body: (
      <p>
        The Service, including its design, software and the Mediqo name and logo, belongs to Mediqo and is protected by law. You may use it only
        as these Terms allow. Information you submit (such as facility details and photos) remains yours; you give Mediqo a licence to host,
        display and process it as needed to run the Service.
      </p>
    ),
  },
  {
    id: 'availability',
    title: 'Availability and changes',
    body: (
      <p>
        We work to keep the Service available and accurate but provide it “as is” and “as available”. Listings and availability come from
        providers and may contain errors. We may change, suspend or discontinue parts of the Service, and we may update these Terms; if a change
        is significant we will notify you in the app or by email. Continuing to use the Service after changes take effect means you accept them.
      </p>
    ),
  },
  {
    id: 'liability',
    title: 'Limitation of liability',
    body: (
      <p>
        To the fullest extent permitted by law, Mediqo is not liable for the acts, omissions or medical services of any doctor or facility,
        for decisions you make based on information in the Service (including the assistant), or for indirect or consequential losses. Nothing
        in these Terms limits liability that cannot be limited by law.
      </p>
    ),
  },
  {
    id: 'termination',
    title: 'Suspension and termination',
    body: (
      <p>
        You can stop using the Service and, as a patient, delete your account at any time from <strong>Profile → Delete account</strong>
        (see the <Link href="/privacy#delete-account">Privacy Policy</Link>). We may suspend or close accounts that break these Terms or put
        patients, providers or the Service at risk.
      </p>
    ),
  },
  {
    id: 'law',
    title: 'Governing law',
    body: (
      <p>
        These Terms are governed by the laws of {SITE.country}. Disputes will be handled by the competent courts of {SITE.country}, unless the law
        where you live gives you the right to bring a claim elsewhere.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Contact us',
    body: <p>Questions about these Terms can be sent to {email}.</p>,
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms & Conditions"
      intro={<>Mediqo helps you find and book doctors. It is not a healthcare provider and is not for emergencies. In an emergency, call your local emergency number.</>}
      sections={SECTIONS}
    />
  );
}
