"use client";

import React, { useState, useEffect } from "react";
import { FiGithub, FiTwitter, FiInstagram, FiCpu } from "react-icons/fi";

export default function Footer() {
  const [businessName, setBusinessName] = useState("MARVELEXA");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const name = new URLSearchParams(window.location.search).get("name");
      if (name) {
        setBusinessName(name.toUpperCase());
      }
    }
  }, []);

  return (
    <footer 
      className="relative py-20 bg-slate-50 overflow-hidden border-t border-slate-200"
    >
      <div className="absolute bottom-0 inset-x-0 h-[200px] bg-gradient-to-t from-accent-blue/5 to-transparent pointer-events-none blur-[60px]" />
      
      <div className="max-w-7xl mx-auto px-6 md:px-8 relative z-10">
        
        {/* Top Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-12 mb-16">
          {/* Logo & Desc */}
          <div className="col-span-2 space-y-6">
            <a href="#" className="flex items-center gap-1.5 select-none group">
              <span className="w-2 h-2 rounded-full bg-accent-blue" />
              <span className="font-sans font-black tracking-[0.25em] text-sm uppercase text-slate-800">
                {businessName}
              </span>
            </a>
            <p className="font-sans text-[10px] text-slate-500 max-w-xs leading-relaxed uppercase tracking-wider font-light">
              Reimagining premium comfortwear, custom silk nightwear, and designer pastel bottomwear.
            </p>
            {/* Socials */}
            <div className="flex items-center gap-4">
              {[
                { icon: FiTwitter, link: "https://x.com/marvelexa" },
                { icon: FiInstagram, link: "https://instagram.com/marvelexa" },
                { icon: FiGithub, link: "https://github.com/marvelexa" }
              ].map((soc, idx) => (
                <a
                  key={idx}
                  href={soc.link}
                  target="_blank"
                  rel="noreferrer"
                  className="p-3 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-accent-blue hover:border-accent-blue/20 transition-all duration-300 cursor-pointer group shadow-sm"
                >
                  <soc.icon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick links columns */}
          {[
            {
              title: "Catalog",
              links: ["New Arrivals", "Night Suits", "Palazzos", "Streetwear"]
            },
            {
              title: "Company",
              links: ["Our Story", "Fabric Detail", "Surat Artisans"]
            },
            {
              title: "Customer Portal",
              links: ["Size Analyzer", "Easy Exchanges", "Global Courier Logs"]
            }
          ].map((col, idx) => (
            <div key={idx} className="space-y-4 text-left">
              <h4 className="font-outfit font-bold text-xs uppercase tracking-widest text-slate-800">
                {col.title}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="font-sans text-[10px] uppercase tracking-wider text-slate-500 hover:text-slate-800 transition-colors duration-300"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-200 pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <span className="font-sans text-[8px] uppercase tracking-[0.25em] text-slate-400">
            © 2026 {businessName} STORE. ALL COLLECTION DESIGN SCHEMES PROTECTED.
          </span>
          <div className="flex items-center gap-1.5 text-slate-500 font-sans text-[9px] uppercase tracking-widest">
            <FiCpu className="w-3.5 h-3.5 text-accent-blue" /> STATUS: PRESTIGE LUXURY
          </div>
        </div>

      </div>
    </footer>
  );
}
