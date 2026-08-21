import { Coffee, MapPin, Phone, Mail, Instagram, Facebook, Twitter } from 'lucide-react';

export default function Footer() {
  return (
    <footer id="location" className="bg-charcoal text-white pt-24 pb-12">
      <div className="w-full max-w-none px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12 lg:gap-16 mb-20">
          <div>
            <div className="flex items-center gap-2 mb-6">
                <Coffee className="w-7 h-7 text-accent" />
                <span className="font-serif font-bold text-3xl tracking-tight">{new URLSearchParams(window.location.search).get('name') || "The Roastery"}</span>
            </div>
            <p className="text-white/60 mb-8 font-sans leading-relaxed">
              Seattle's premier artisanal cafe and coffee roastery. Ethically sourced, locally roasted, and crafted with passion for our local community.
            </p>
            <div className="flex gap-4">
                <a href="#" aria-label="Instagram" className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center hover:bg-accent transition-colors"><Instagram className="w-5 h-5 text-white" /></a>
                <a href="#" aria-label="Facebook" className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center hover:bg-accent transition-colors"><Facebook className="w-5 h-5 text-white" /></a>
                <a href="#" aria-label="Twitter" className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center hover:bg-accent transition-colors"><Twitter className="w-5 h-5 text-white" /></a>
            </div>
          </div>
          
          <div>
            <h3 className="font-serif text-2xl font-semibold mb-8 tracking-wide">Contact & Location</h3>
            <ul className="space-y-6 text-white/70">
                <li className="flex items-start gap-4">
                    <MapPin className="w-6 h-6 text-accent shrink-0 mt-1" />
                    <span className="leading-relaxed">123 Pike Place Market<br/>Seattle, WA 98101<br/>USA</span>
                </li>
                <li className="flex items-center gap-4 group">
                    <Phone className="w-6 h-6 text-accent shrink-0" />
                    <a href="tel:+12065550199" className="hover:text-accent transition-colors">(206) 555-0199</a>
                </li>
                <li className="flex items-center gap-4 group">
                    <Mail className="w-6 h-6 text-accent shrink-0" />
                    <a href="mailto:hello@theroastery-seattle.com" className="hover:text-accent transition-colors">hello@theroastery-seattle.com</a>
                </li>
            </ul>
          </div>

          <div className="lg:col-span-1 md:col-span-2">
             <h3 className="font-serif text-2xl font-semibold mb-8 tracking-wide">About Our Cafe</h3>
             <p className="text-white/50 text-sm leading-relaxed mb-4">
                Searching for the "best coffee near me"? The Artisan Roastery stands as Seattle's consistently high-rated cafe offering online food ordering, specialty espresso drinks, local bakery delivery, and reliable weekend brunch reservations. 
             </p>
             <p className="text-white/50 text-sm leading-relaxed">
                Whether you need a quick pick-me-up, artisanal pastries, or a serene workspace with free Wi-Fi, our USA coffee shop delivers exceptional quality and service.
             </p>
          </div>
        </div>
        
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-white/40 font-medium">
             <p>&copy; 2026 {new URLSearchParams(window.location.search).get('name') || "The Artisan Roastery"}. All rights reserved.</p>
            <div className="flex gap-8">
                <a href="#" className="hover:text-accent transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-accent transition-colors">Terms of Service</a>
            </div>
        </div>
      </div>
    </footer>
  );
}
