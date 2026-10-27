import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, type LegalSection } from '../../../components/site/LegalPage';
import { SITE } from '../../../lib/site';
import s from '../site.module.css';

export const metadata: Metadata = {
  title: 'Privacy Policy · Mediqo',
  description: 'How Mediqo collects, uses, shares and protects your personal and health information.',
};

const email = <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>;

const SECTIONS: LegalSection[] = [
  {
    id: 'who-we-are',
    title: 'Who we are',
    body: (
      <>
        <p>
          {SITE.name} (“Mediqo”, “we”, “us”) runs the Mediqo mobile app, this website and the Mediqo dashboard used by hospitals,
          clinics, doctors and reception staff (together, the “Service”). This policy explains what information we collect, why,
          who we share it with and the choices you have.
        </p>
        <p>Questions about privacy can be sent to {email}.</p>
      </>
    ),
  },
  {
    id: 'what-we-collect',
    title: 'Information we collect',
    body: (
      <>
        <h3>Information you give us</h3>
        <ul>
          <li><strong>Account details:</strong> your name, email address, phone number (optional for patients) and password. We store only a secure hash of your password, never the password itself.</li>
          <li><strong>Appointment details:</strong> the doctor, hospital or clinic, date and time you book, the status of each visit, and any reason for the visit you choose to enter. A reason for a visit can include health information.</li>
          <li><strong>Assistant messages:</strong> the symptoms and questions you type into the in-app assistant.</li>
          <li><strong>For hospitals, clinics and doctors:</strong> facility name, address and map location, departments, doctor names, specialties, qualifications and registration details, fees and timings, and staff accounts.</li>
        </ul>
        <h3>Information collected automatically</h3>
        <ul>
          <li><strong>Location:</strong> if you allow it, the app reads your device’s location while you use it to show doctors near you, and saves it to your profile. You can choose a city instead and never share your precise location.</li>
          <li><strong>Technical data:</strong> our servers record basic request information such as IP address, device and browser type and timestamps, which we use for security, rate limiting and troubleshooting.</li>
          <li><strong>Browser notifications (dashboard only):</strong> if a dashboard user turns on desktop alerts, we store that browser’s push subscription.</li>
        </ul>
        <p>We do not use advertising identifiers, we do not show ads, and the mobile app does not send push notifications.</p>
      </>
    ),
  },
  {
    id: 'how-we-use',
    title: 'How we use your information',
    body: (
      <ul>
        <li>To create and secure your account and sign you in.</li>
        <li>To show doctors, hospitals and clinics near you and the times they are available.</li>
        <li>To send your booking to the doctor or facility, and to keep everyone updated with in-app notifications and visit reminders.</li>
        <li>To generate assistant replies and suggest a suitable specialist.</li>
        <li>To review and verify hospitals, clinics and doctors before they appear to patients.</li>
        <li>To keep the Service safe, prevent abuse and fix problems.</li>
        <li>To meet legal obligations and respond to lawful requests.</li>
      </ul>
    ),
  },
  {
    id: 'ai-assistant',
    title: 'The AI assistant',
    body: (
      <>
        <p>
          The assistant is powered by Claude, a model provided by Anthropic. When you use it, the messages in your current conversation
          (and, for “Suggest a specialist”, a summary of your symptoms) are sent to Anthropic to generate a reply. Mediqo does not save
          assistant conversations on its servers; a conversation lives only in the app until you close it or start a new chat.
        </p>
        <p>
          The assistant gives general information only. It does not diagnose, prescribe or replace a doctor. Avoid typing information
          you do not want processed for this purpose, such as your full name, ID numbers or other people’s details.
        </p>
      </>
    ),
  },
  {
    id: 'sharing',
    title: 'Who we share information with',
    body: (
      <>
        <p>We never sell your personal information. We share it only as follows:</p>
        <ul>
          <li><strong>The doctor and facility you book:</strong> your name, phone number, the visit time and any reason you entered are shared with the doctor and, for hospitals, the hospital’s reception staff and administrators, so they can manage your visit.</li>
          <li><strong>Service providers</strong> that run parts of the Service for us, under contracts that limit their use of the data:</li>
        </ul>
        <div className={s.tableWrap}>
          <table>
            <thead>
              <tr><th>Provider</th><th>Purpose</th></tr>
            </thead>
            <tbody>
              <tr><td>MongoDB Atlas</td><td>Database hosting for accounts, facilities and appointments</td></tr>
              <tr><td>Vercel</td><td>Hosting for the API, this website and the dashboard</td></tr>
              <tr><td>Anthropic</td><td>AI model for the in-app assistant</td></tr>
              <tr><td>Google (Maps, Play)</td><td>Maps and location search; app distribution</td></tr>
            </tbody>
          </table>
        </div>
        <ul>
          <li><strong>Legal reasons:</strong> when required by law, court order or a competent authority, or to protect the safety of people or the Service.</li>
          <li><strong>Business changes:</strong> if Mediqo is merged or acquired, your information may transfer to the new owner under this policy.</li>
        </ul>
        <p>Some of these providers process data outside {SITE.country}. We use providers that apply industry-standard security.</p>
      </>
    ),
  },
  {
    id: 'retention',
    title: 'How long we keep information',
    body: (
      <ul>
        <li>Account and appointment data are kept while your account is active.</li>
        <li>When a patient deletes their account, we delete their profile, appointments and notifications right away. Backups are overwritten on a rolling basis.</li>
        <li>Facility and doctor records may be kept after an account closes where we need them for legal, accounting or dispute purposes.</li>
        <li>Server logs are kept for a short period for security and troubleshooting.</li>
      </ul>
    ),
  },
  {
    id: 'delete-account',
    title: 'Deleting your account',
    body: (
      <>
        <p><strong>Patients</strong> can delete their account at any time in the app: <strong>Profile → Delete account</strong>. This permanently removes your profile, visit history and notifications, and cancels any upcoming visits (the doctor or facility is told the visit was cancelled).</p>
        <p>
          If you can’t access the app, email {email} from the address on your account with the subject “Delete my account”. We will verify
          the request and delete your account and data within 30 days.
        </p>
        <p><strong>Doctors, hospitals, clinics and staff</strong> can request account closure by emailing {email}.</p>
      </>
    ),
  },
  {
    id: 'security',
    title: 'Security',
    body: (
      <p>
        Data is sent over encrypted HTTPS connections. Passwords are hashed with bcrypt, sign-in uses signed tokens stored in your device’s
        secure storage, and access to data is limited by role (a hospital only sees its own patients’ bookings). No system is perfectly
        secure, so please use a strong password and tell us at {email} if you suspect misuse of your account.
      </p>
    ),
  },
  {
    id: 'your-rights',
    title: 'Your choices and rights',
    body: (
      <ul>
        <li><strong>Access and correction:</strong> you can view and update your name and phone number in the app, or ask us for a copy of your data.</li>
        <li><strong>Location:</strong> you can turn off location access in your phone’s settings and pick a city instead.</li>
        <li><strong>Notifications:</strong> you can switch appointment updates off in Profile.</li>
        <li><strong>Deletion:</strong> see “Deleting your account” above.</li>
      </ul>
    ),
  },
  {
    id: 'children',
    title: 'Children',
    body: (
      <p>
        The Service is meant for people aged 18 and over. A parent or guardian may book a visit for their child using their own account.
        We do not knowingly create accounts for children; if you believe a child has an account, contact {email} and we will delete it.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    body: (
      <p>
        We may update this policy. We will change the “Last updated” date above and, for significant changes, tell you in the app or by email
        before they take effect. See also our <Link href="/terms">Terms &amp; Conditions</Link>.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Contact us',
    body: <p>For privacy questions or requests, email {email}.</p>,
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={<>We collect only what we need to help you find and book doctors. We never sell your data, and you can delete your account from the app at any time.</>}
      sections={SECTIONS}
    />
  );
}
