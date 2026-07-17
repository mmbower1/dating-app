import { Link } from 'react-router-dom';
import Logo from './Logo';

const Footer = () => (
  <footer className="site-footer">
    <div className="footer-top">
      <div className="footer-brand">
        <Logo size="sm" showText={true} />
        <p className="footer-tagline">Real connections. No disappearing acts.</p>
      </div>
      <div className="footer-links">
        <div className="footer-col">
          <h4>App</h4>
          <Link to="/welcome">About Lockheart</Link>
          <Link to="/welcome">How it works</Link>
        </div>
        <div className="footer-col">
          <h4>Support</h4>
          <a href="mailto:support@lockheartapp.com">Contact Us</a>
        </div>
        <div className="footer-col">
          <h4>Legal</h4>
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms of Service</Link>
        </div>
      </div>
    </div>
    <div className="footer-bottom">
      <span>© {new Date().getFullYear()} Lockheart. All rights reserved.</span>
      <span className="footer-motto">Show up. Stay present.</span>
    </div>
  </footer>
);

export default Footer;
