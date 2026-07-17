import { useNavigate } from 'react-router-dom';

const Privacy = () => {
  const navigate = useNavigate();
  return (
    <div className="legal-page">
      <div className="legal-header">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
      </div>
      <div className="legal-content">
        <h1>Privacy Policy</h1>
        <p className="legal-date">Last updated: June 2026</p>

        <h2>1. Information we collect</h2>
        <p>We collect information you provide directly:</p>
        <ul>
          <li>Name, email, phone number, age, gender</li>
          <li>Profile photos and bio</li>
          <li>Messages you send to matches</li>
          <li>Behavioral data (response rate, match interactions)</li>
        </ul>

        <h2>2. How we use your information</h2>
        <ul>
          <li>To operate and improve Lockheart</li>
          <li>To calculate and display your accountability score</li>
          <li>To send push notifications about matches and messages</li>
          <li>To enforce our Terms of Service</li>
        </ul>

        <h2>3. Data storage</h2>
        <p>Your data is stored on MongoDB Atlas servers. Profile photos are stored on Cloudinary. We use industry-standard security practices.</p>

        <h2>4. Data sharing</h2>
        <p>We do not sell your personal data. We do not share your data with third parties except as required to operate the service (hosting, storage) or by law.</p>

        <h2>5. Your profile visibility</h2>
        <p>Your name, age, photos, bio, and accountability score are visible to other Lockheart users. Your email, phone number, and exact location are never shared with other users.</p>

        <h2>6. Push notifications</h2>
        <p>If you opt in to push notifications, we store your device subscription to deliver match and message alerts. You can revoke this at any time in your device settings.</p>

        <h2>7. Data deletion</h2>
        <p>You may request deletion of your account and all associated data by contacting us at support@lockheartapp.com. We will process requests within 30 days.</p>

        <h2>8. Children</h2>
        <p>Lockheart is not intended for users under 18. We do not knowingly collect data from minors.</p>

        <h2>9. Changes</h2>
        <p>We may update this policy. We will notify users of material changes via the app.</p>

        <h2>10. Contact</h2>
        <p>Privacy questions: support@lockheartapp.com</p>
      </div>
    </div>
  );
};

export default Privacy;
