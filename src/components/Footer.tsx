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
          <a href="#">About Atlas</a>
          <a href="#">How it works</a>
          <a href="#">Accountability Score</a>
        </div>
        <div className="footer-col">
          <h4>Support</h4>
          <a href="#">Help Center</a>
          <a href="#">Safety Tips</a>
          <a href="#">Contact Us</a>
        </div>
        <div className="footer-col">
          <h4>Legal</h4>
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
          <a href="#">Cookie Policy</a>
        </div>
      </div>
    </div>
    <div className="footer-bottom">
      <span>© {new Date().getFullYear()} Atlas. All rights reserved.</span>
      <span className="footer-motto">Show up. Stay present.</span>
    </div>
  </footer>
);

export default Footer;
