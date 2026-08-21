import { motion } from 'motion/react';
import { Send, CheckCircle } from 'lucide-react';
import React, { useState } from 'react';

export default function Reservation() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <section id="reserve" className="bg-brand-cream py-32 px-4 md:px-12 relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-brand-orange/5 to-transparent z-0" />
      <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-brand-red/[0.03] rounded-full blur-[120px] translate-x-1/3 translate-y-1/3" />

      <div className="max-w-[1400px] mx-auto relative z-10">
        <div className="text-center mb-24">
          <motion.span 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="text-brand-orange text-sm font-black uppercase tracking-[0.6em] block mb-6"
          >
            Reservation
          </motion.span>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-6xl md:text-8xl font-serif font-black text-brand-brown mb-8 italic leading-[0.9]"
          >
            Book Your <br /> 
            <span className="text-brand-red not-italic">Table</span>
          </motion.h2>
          <p className="text-brand-brown/50 font-medium tracking-wide max-w-xl mx-auto text-lg">
            Please fill out the form below to book a table. 
            We look forward to serving you.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {submitted ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-[4rem] p-20 text-center shadow-[0_50px_100px_-20px_rgba(45,27,20,0.15)] border-8 border-brand-cream"
            >
              <div className="w-28 h-28 bg-brand-red/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10">
                <CheckCircle className="w-14 h-14 text-brand-red" />
              </div>
              <h3 className="text-brand-brown text-4xl font-serif font-black mb-6 italic">Inquiry Received</h3>
              <p className="text-brand-brown/60 mb-12 max-w-sm mx-auto text-lg font-medium">
                Our maître d' is reviewing your request and will contact you 
                personally within the hour to finalize your experience.
              </p>
              <button 
                onClick={() => setSubmitted(false)}
                className="bg-brand-brown text-white px-12 py-5 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-brand-orange transition-all shadow-2xl"
              >
                Request Another Table
              </button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-10 bg-white p-12 md:p-24 rounded-[4rem] border border-brand-brown/5 shadow-[0_60px_100px_-30px_rgba(45,27,20,0.15)]">
              <div className="space-y-4">
                <label className="text-brand-brown/40 text-[10px] font-black uppercase tracking-[0.3em] block ml-4">Full Name</label>
                <input 
                  required
                  type="text" 
                  placeholder="John Doe"
                  className="w-full bg-brand-cream/30 border border-brand-brown/10 rounded-[1.5rem] px-8 py-5 text-brand-brown placeholder:text-brand-brown/20 focus:outline-none focus:border-brand-orange focus:bg-white transition-all font-medium text-lg"
                />
              </div>
              <div className="space-y-4">
                <label className="text-brand-brown/40 text-[10px] font-black uppercase tracking-[0.3em] block ml-4">Email Address</label>
                <input 
                  required
                  type="email" 
                  placeholder="john@email.com"
                  className="w-full bg-brand-cream/30 border border-brand-brown/10 rounded-[1.5rem] px-8 py-5 text-brand-brown placeholder:text-brand-brown/20 focus:outline-none focus:border-brand-orange focus:bg-white transition-all font-medium text-lg"
                />
              </div>
              <div className="space-y-4">
                <label className="text-brand-brown/40 text-[10px] font-black uppercase tracking-[0.3em] block ml-4">Number of Guests</label>
                <div className="relative">
                  <select className="w-full bg-brand-cream/30 border border-brand-brown/10 rounded-[1.5rem] px-8 py-5 text-brand-brown focus:outline-none focus:border-brand-orange focus:bg-white transition-all appearance-none cursor-pointer font-medium text-lg">
                    <option value="2">2 People</option>
                    <option value="4">4 People</option>
                    <option value="6">6 People</option>
                    <option value="8">8 People</option>
                  </select>
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-brand-brown/40 text-[10px] font-black uppercase tracking-[0.3em] block ml-4">Date</label>
                <input 
                  required
                  type="date" 
                  className="w-full bg-brand-cream/30 border border-brand-brown/10 rounded-[1.5rem] px-8 py-5 text-brand-brown focus:outline-none focus:border-brand-orange focus:bg-white transition-all font-medium text-lg"
                />
              </div>
              <div className="md:col-span-2 space-y-4">
                <label className="text-brand-brown/40 text-[10px] font-black uppercase tracking-[0.3em] block ml-4">Special Requests</label>
                <textarea 
                  placeholder="Any allergies or special requests..."
                  rows={4}
                  className="w-full bg-brand-cream/30 border border-brand-brown/10 rounded-[2rem] px-8 py-6 text-brand-brown placeholder:text-brand-brown/20 focus:outline-none focus:border-brand-orange focus:bg-white transition-all resize-none font-medium text-lg"
                />
              </div>
              
              <div className="md:col-span-2 pt-8">
                <button 
                  type="submit"
                  className="w-full bg-brand-orange text-white font-black uppercase tracking-[0.4em] py-7 rounded-[2rem] flex items-center justify-center gap-4 hover:bg-brand-red hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_20px_50px_rgba(197,160,89,0.3)]"
                >
                  <span>Book Now</span>
                  <Send className="w-6 h-6" />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
