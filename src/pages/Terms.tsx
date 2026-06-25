import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';

const Terms = () => {
  const navigate = useNavigate();
  return (
    <div className="legal-page">
      <div className="legal-header">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <Logo size="sm" showText={true} />
      </div>
      <div className="legal-content">
        <h1>Terms of Service</h1>
        <p className="legal-date">Last updated: June 2026</p>

        <h2>1. Acceptance</h2>
        <p>By creating an account on Pearl, you agree to these Terms of Service. If you do not agree, do not use the app.</p>

        <h2>2. Eligibility</h2>
        <p>You must be at least 18 years old to use Pearl. By registering, you confirm you meet this requirement.</p>

        <h2>3. Your account</h2>
        <p>You are responsible for maintaining the confidentiality of your account credentials. You agree to provide accurate, truthful information and to keep your profile up to date.</p>

        <h2>4. Conduct</h2>
        <p>Pearl is built for genuine connections. You agree not to:</p>
        <ul>
          <li>Harass, abuse, or harm other users</li>
          <li>Create fake profiles or impersonate others</li>
          <li>Use the platform for commercial solicitation</li>
          <li>Attempt to circumvent the accountability system</li>
        </ul>

        <h2>5. Accountability system</h2>
        <p>Pearl's accountability score is intended to encourage respectful behavior. Ghosting, non-response, and abuse of the graceful exit feature may result in score reductions or account suspension.</p>

        <h2>6. Content</h2>
        <p>You retain ownership of content you upload (photos, bio). By uploading content, you grant Pearl a non-exclusive license to display it within the app. You may not upload content that is illegal, explicit without consent, or violates third-party rights.</p>

        <h2>7. Termination</h2>
        <p>We reserve the right to suspend or delete accounts that violate these terms at our sole discretion.</p>

        <h2>8. Disclaimers</h2>
        <p>Pearl is provided "as is." We do not guarantee matches, connections, or outcomes. We are not responsible for the conduct of other users.</p>

        <h2>9. Changes</h2>
        <p>We may update these terms at any time. Continued use of Pearl after changes constitutes acceptance.</p>

        <h2>10. Contact</h2>
        <p>Questions? Reach us at support@pearlapp.com</p>
      </div>
    </div>
  );
};

export default Terms;
