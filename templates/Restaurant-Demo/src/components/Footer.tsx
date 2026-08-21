import { motion } from 'motion/react';
import { Mail, Phone, MapPin, Instagram, Facebook, Twitter, Utensils, Send, ExternalLink } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-brand-cream pt-24 pb-12 px-4 md:px-12 border-t border-brand-brown/5">
      <div className="max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 mb-20">
          {/* Contact Details */}
          <div>
            <div className="flex items-center space-x-3 mb-10">
              <Utensils className="w-10 h-10 text-brand-red" />
              <span className="text-3xl font-serif font-bold text-brand-brown tracking-widest">{new URLSearchParams(window.location.search).get('name') || "ÉTOILE"}</span>
            </div>
            
            <p className="text-brand-brown/40 max-w-sm mb-12 font-light leading-relaxed">
              Serving delicious meals with passion and care.
            </p>

            <div className="space-y-8">
              <div className="flex items-start space-x-6">
                <div className="w-12 h-12 rounded-2xl bg-white border border-brand-brown/5 flex items-center justify-center shrink-0 shadow-sm">
                  <MapPin className="w-6 h-6 text-brand-red" />
                </div>
                <div>
                  <h5 className="text-brand-brown/40 text-[10px] uppercase tracking-widest font-bold mb-2">Location</h5>
                  <p className="text-brand-brown/70 text-sm">123 Gastronomy Drive, Epicurean District<br />Paris, France 75001</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-6">
                <div className="w-12 h-12 rounded-2xl bg-white border border-brand-brown/5 flex items-center justify-center shrink-0 shadow-sm">
                  <Phone className="w-6 h-6 text-brand-orange" />
                </div>
                <div>
                  <h5 className="text-brand-brown/40 text-[10px] uppercase tracking-widest font-bold mb-2">Reservations</h5>
                  <p className="text-brand-brown/70 text-sm">+33 1 23 45 67 89</p>
                </div>
              </div>

              <div className="flex items-start space-x-6">
                <div className="w-12 h-12 rounded-2xl bg-white border border-brand-brown/5 flex items-center justify-center shrink-0 shadow-sm">
                  <Mail className="w-6 h-6 text-brand-red" />
                </div>
                <div>
                  <h5 className="text-brand-brown/40 text-[10px] uppercase tracking-widest font-bold mb-2">Contact</h5>
                  <p className="text-brand-brown/70 text-sm">concierge@etoile.paris</p>
                </div>
              </div>
            </div>

            <div className="flex space-x-4 mt-12">
              {[Instagram, Facebook, Twitter].map((Icon, idx) => (
                <a key={idx} href="#" className="w-10 h-10 rounded-full border border-brand-brown/10 flex items-center justify-center text-brand-brown/40 hover:text-brand-orange hover:border-brand-orange transition-all">
                  <Icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Delivery & Map Info */}
          <div>
            <div className="bg-white rounded-[3rem] p-10 border border-brand-brown/5 mb-8 shadow-xl">
              <h4 className="text-brand-brown text-xl font-serif mb-6 italic">Order Delivery</h4>
              <p className="text-brand-brown/40 text-sm mb-8 font-light">Enjoy our food from the comfort of your own home.</p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button className="flex-1 bg-brand-red text-white py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-brand-orange transition-all font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-brand-red/20">
                  UberEats <ExternalLink className="w-4 h-4" />
                </button>
                <button className="flex-1 border border-brand-brown/10 text-brand-brown py-4 rounded-2xl flex items-center justify-center gap-3 hover:border-brand-orange hover:text-brand-orange transition-all font-bold uppercase tracking-widest text-[10px]">
                  Deliveroo <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="relative h-64 rounded-[3rem] overflow-hidden border border-brand-brown/5 group shadow-xl">
              {/* Simulated Map */}
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2624.9916256937595!2d2.2922926156743817!3d48.858370066063!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47e66e2964e34e2d%3A0x8ddca9ee380ef7e0!2sEiffel%20Tower!5e0!3m2!1sen!2sus!4v1655301542125!5m2!1sen!2sus" 
                width="100%" 
                height="100%" 
                style={{ border: 0 }} 
                allowFullScreen={true}
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
              <div className="absolute inset-0 bg-brand-brown/5 pointer-events-none" />
              <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full border border-brand-brown/10 pointer-events-none">
                <span className="text-brand-orange text-[10px] uppercase font-bold tracking-widest">Find Us Here</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-brand-brown/5 pt-12 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-brand-brown/40 text-xs tracking-widest uppercase">&copy; 2026 {new URLSearchParams(window.location.search).get('name') || "Étoile Gastronomie"}. All rights reserved.</p>
          <div className="flex space-x-8">
            <a href="#" className="text-brand-brown/40 text-[10px] uppercase tracking-widest hover:text-brand-red transition-colors">Privacy Policy</a>
            <a href="#" className="text-brand-brown/40 text-[10px] uppercase tracking-widest hover:text-brand-red transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
