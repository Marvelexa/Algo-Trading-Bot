import { motion } from 'motion/react';
import { Calendar, Users, Clock, ArrowRight } from 'lucide-react';

export default function Reservation() {
  return (
    <section id="reservations" className="py-24 lg:py-32 bg-white text-charcoal relative overflow-hidden font-sans">
      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold mb-6 text-primary"
          >
            Reserve Your Experience
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-charcoal/70 text-lg max-w-2xl mx-auto"
          >
            Join us for an unforgettable culinary experience. Book a table for your remote work session, casual meeting, or weekend brunch.
          </motion.p>
        </div>

        <div className="grid lg:grid-cols-2 gap-0 items-stretch rounded-[2.5rem] overflow-hidden shadow-2xl bg-[#F6F5F2]">
          {/* Image Side */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative h-full min-h-[400px] lg:min-h-full"
          >
            <div className="absolute inset-0 bg-primary/20 mix-blend-multiply z-10"></div>
            <img 
              src="https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=1000&h=1200" 
              alt="Cafe ambiance" 
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Info Overlay */}
            <div className="absolute inset-0 z-20 p-10 flex flex-col justify-end text-white bg-gradient-to-t from-charcoal/90 via-charcoal/40 to-transparent">
               <div className="space-y-6 max-w-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30">
                        <Clock className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h4 className="font-sans font-bold text-lg tracking-wide mb-0.5">Opening Hours</h4>
                        <p className="text-white/80 text-sm">Mon-Sun: 7:00 AM - 8:00 PM</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30">
                        <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h4 className="font-sans font-bold text-lg tracking-wide mb-0.5">Large Groups</h4>
                        <p className="text-white/80 text-sm">For parties of 6+, please call directly.</p>
                    </div>
                  </div>
               </div>
            </div>
          </motion.div>

          {/* Form Side */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="p-8 md:p-12 lg:p-16 relative flex flex-col justify-center"
          >
            <form 
              className="space-y-6" 
              onSubmit={(e) => { 
                e.preventDefault(); 
                alert("Thank you! Your reservation request has been submitted. We will contact you shortly to confirm."); 
              }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-charcoal/60 uppercase tracking-widest flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-accent" /> Date
                  </label>
                  <input type="date" required className="w-full p-4 bg-white border-none rounded-xl focus:ring-2 focus:ring-accent outline-none transition-shadow shadow-sm font-medium text-charcoal" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-charcoal/60 uppercase tracking-widest flex items-center gap-2">
                      <Clock className="w-4 h-4 text-accent" /> Time
                  </label>
                  <select required className="w-full p-4 bg-white border-none rounded-xl focus:ring-2 focus:ring-accent outline-none transition-shadow shadow-sm font-medium text-charcoal appearance-none cursor-pointer">
                    <option value="">Select time</option>
                    <option value="08:00">8:00 AM</option>
                    <option value="10:00">10:00 AM</option>
                    <option value="12:00">12:00 PM</option>
                    <option value="14:00">2:00 PM</option>
                    <option value="18:00">6:00 PM</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-charcoal/60 uppercase tracking-widest flex items-center gap-2">
                    <Users className="w-4 h-4 text-accent" /> Guests
                </label>
                <select required className="w-full p-4 bg-white border-none rounded-xl focus:ring-2 focus:ring-accent outline-none transition-shadow shadow-sm font-medium text-charcoal appearance-none cursor-pointer">
                  <option value="">Select party size</option>
                  <option value="1">1 Person</option>
                  <option value="2">2 People</option>
                  <option value="3">3 People</option>
                  <option value="4">4 People</option>
                  <option value="5+">5+ People</option>
                </select>
              </div>
              <div className="space-y-2">
                  <label className="text-xs font-bold text-charcoal/60 uppercase tracking-widest">Full Name</label>
                  <input type="text" placeholder="John Doe" required className="w-full p-4 bg-white border-none rounded-xl focus:ring-2 focus:ring-accent outline-none transition-shadow shadow-sm font-medium text-charcoal" />
              </div>
              <div className="space-y-2">
                  <label className="text-xs font-bold text-charcoal/60 uppercase tracking-widest">Email</label>
                  <input type="email" placeholder="john@example.com" required className="w-full p-4 bg-white border-none rounded-xl focus:ring-2 focus:ring-accent outline-none transition-shadow shadow-sm font-medium text-charcoal" />
              </div>
              <button type="submit" className="mt-8 flex items-center justify-between w-full p-5 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all uppercase tracking-widest text-sm touch-manipulation group shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5">
                <span>Confirm Reservation</span>
                <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white group-hover:text-primary transition-colors">
                   <ArrowRight className="w-4 h-4" />
                </span>
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
