import React from 'react';
import "./Footer.css"

const Footer = () => {
	return (
		<footer className="footer">
			<div className="footer-content">
				<div className="footer-logo">Flyx</div>
				
				<p className="footer-text">
					Experience the future of entertainment. Discover movies, shows, and anime 
					with cutting-edge technology and immersive design.
				</p>
				
				<div className="footer-links">
					<a href="#" className="footer-link">About</a>
					<a href="#" className="footer-link">Privacy</a>
					<a href="#" className="footer-link">Terms</a>
					<a href="#" className="footer-link">Contact</a>
					<a href="#" className="footer-link">Support</a>
				</div>
				
				<div className="footer-social">
					<a href="#" className="social-icon" title="Twitter">🐦</a>
					<a href="#" className="social-icon" title="Discord">💬</a>
					<a href="#" className="social-icon" title="GitHub">⚡</a>
				</div>
				
				<div className="tech-credits">
					<div className="tech-stack">
						<span className="tech-badge">NextJS 14</span>
						<span className="tech-badge">React</span>
						<span className="tech-badge">TMDB API</span>
						<span className="tech-badge">CSS3</span>
						<span className="tech-badge">Glassmorphism</span>
					</div>
				</div>
				
				<div className="footer-copyright">
					<p>© 2025 Flyx • Made with ♥ by Vynx • Educational purposes only</p>
					<p style={{ fontSize: '0.75rem', marginTop: '0.5rem', opacity: 0.7 }}>
						All content displayed is not hosted on this site. This platform is for educational purposes only.
					</p>
				</div>
			</div>
		</footer>
	);
};

export default Footer;
