import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Github, 
  Search, 
  Mail, 
  Star, 
  Globe, 
  Terminal, 
  CheckCircle2, 
  ShieldAlert, 
  Cpu, 
  Zap,
  Layers,
  Database
} from "lucide-react";
import { motion } from "motion/react";

export function LeadverseGuide() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"github" | "maps">("github");

  return (
    <div className="min-h-screen w-full bg-[#0a0a0c] text-gray-100 flex flex-col font-sans relative overflow-hidden py-12 px-6">
      {/* Background Glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/10 blur-[120px] pointer-events-none" />

      <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col">
        {/* Header Navigation */}
        <div className="flex items-center justify-between mb-12 shrink-0">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white transition-colors bg-white/5 border border-white/10 px-4 py-2 rounded-full cursor-pointer hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-blue-400">
            <Cpu className="w-3.5 h-3.5 animate-pulse" /> Leadverse.ai Documentation
          </div>
        </div>

        {/* Title Section */}
        <div className="text-center max-w-2xl mx-auto mb-16 shrink-0">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-400">
            Leadverse AI Engine
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            Discover how our automated B2B lead generation system mining algorithm finds active clients, extracts profiles, and scrapes public emails from GitHub and Google Maps.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex justify-center mb-10 shrink-0">
          <div className="flex gap-2 p-1.5 bg-white/5 border border-white/10 rounded-xl max-w-md w-full">
            <button
              onClick={() => setActiveTab("github")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === "github" 
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/20" 
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Github className="w-4 h-4" />
              GitHub Prospecting
            </button>
            <button
              onClick={() => setActiveTab("maps")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === "maps" 
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/20" 
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Globe className="w-4 h-4" />
              Google Maps B2B
            </button>
          </div>
        </div>

        {/* Content Section */}
        <div className="flex-1">
          {activeTab === "github" ? (
            <motion.div 
              key="github-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-12"
            >
              {/* Architecture Grid */}
              <div className="grid md:grid-cols-3 gap-6">
                <CardStep 
                  number="01" 
                  title="Intent Mining" 
                  icon={<Search className="w-5 h-5 text-blue-400" />}
                  description="We query the GitHub Search API using high-intent keywords like 'website needed', 'need web designer', or 'looking for developer'. This pulls active issues, discussions, and repository descriptions from people looking for web services."
                />
                <CardStep 
                  number="02" 
                  title="Git Commit Scraping" 
                  icon={<Mail className="w-5 h-5 text-emerald-400" />}
                  description="Secret Sauce: Most developers hide their public email. Leadverse bypasses this by scraping the user's public repository commit logs, reading raw git patches, and parsing author metadata where emails are automatically saved."
                />
                <CardStep 
                  number="03" 
                  title="Credibility Grading" 
                  icon={<Star className="w-5 h-5 text-yellow-400" />}
                  description="The engine reads repository stargazers count and comment activity to evaluate the budget and scale of the project, assigning a star-based rating score (e.g. ⭐ 24) to prioritize high-value client leads."
                />
              </div>

              {/* Technical Code Walkthrough */}
              <div className="bg-[#121216] border border-white/10 rounded-2xl p-6 md:p-8 space-y-6">
                <div className="flex items-center gap-3">
                  <Terminal className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-lg font-bold text-white">Under the Hood: GitHub Email Extraction Algorithm</h3>
                </div>
                
                <p className="text-gray-400 text-xs leading-relaxed">
                  How does Leadverse extract contact emails from GitHub when a profile lists "No public email"? Our backend executes a multi-layered extraction technique:
                </p>

                <div className="grid md:grid-cols-2 gap-6 items-start">
                  {/* Pseudo Logic */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" /> Step-by-Step Logic
                    </h4>
                    <ul className="space-y-3 text-xs text-gray-400 list-none pl-0">
                      <li className="flex gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span><strong>User Profile Scan:</strong> First checks the standard profile <code>user.email</code> API endpoint.</span>
                      </li>
                      <li className="flex gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span><strong>Event Stream Query:</strong> Queries public events (e.g., <code>/users/username/events/public</code>) to locate PushEvents.</span>
                      </li>
                      <li className="flex gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span><strong>Commit Logs Scrape:</strong> Parses the PushEvent payload commits. Checks <code>commit.author.email</code> metadata.</span>
                      </li>
                      <li className="flex gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span><strong>Issue Body Parsing:</strong> Runs RegExp matching across issue text to extract emails, websites, or Discord tags.</span>
                      </li>
                    </ul>
                  </div>

                  {/* Code Block Visual */}
                  <div className="bg-[#08080a] rounded-xl border border-white/5 p-4 font-mono text-[10px] text-gray-300 overflow-x-auto space-y-1.5 leading-relaxed">
                    <div className="text-gray-500">// Leadverse.ai Git Scraper Hook</div>
                    <div><span className="text-indigo-400">const</span> emailRegex = <span className="text-emerald-400">/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]&#123;2,&#125;/g</span>;</div>
                    <div><span className="text-indigo-400">async function</span> <span className="text-blue-400">extractEmail</span>(username, token) &#123;</div>
                    <div className="pl-4 text-gray-500">// Fetch user's public event streams</div>
                    <div className="pl-4"><span className="text-indigo-400">const</span> res = <span className="text-indigo-400">await</span> fetch(<span className="text-emerald-400">`users/$&#123;username&#125;/events/public`</span>);</div>
                    <div className="pl-4"><span className="text-indigo-400">const</span> events = <span className="text-indigo-400">await</span> res.json();</div>
                    <div className="pl-4"><span className="text-indigo-400">for</span> (<span className="text-indigo-400">const</span> event <span className="text-indigo-400">of</span> events) &#123;</div>
                    <div className="pl-8"><span className="text-indigo-400">if</span> (event.type === <span className="text-emerald-400">'PushEvent'</span>) &#123;</div>
                    <div className="pl-12"><span className="text-indigo-400">const</span> email = event.payload.commits?.[0]?.author?.email;</div>
                    <div className="pl-12"><span className="text-indigo-400">if</span> (email && !email.includes(<span className="text-emerald-400">'noreply'</span>)) &#123;</div>
                    <div className="pl-16"><span className="text-indigo-400">return</span> email; <span className="text-gray-500">// Email extracted!</span></div>
                    <div className="pl-12">&#125;</div>
                    <div className="pl-8">&#125;</div>
                    <div className="pl-4">&#125;</div>
                    <div className="pl-4"><span className="text-indigo-400">return</span> <span className="text-gray-500">'No public email'</span>;</div>
                    <div>&#125;</div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="maps-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-12"
            >
              {/* Architecture Grid */}
              <div className="grid md:grid-cols-3 gap-6">
                <CardStep 
                  number="01" 
                  title="Multi-City Query Splitting" 
                  icon={<Layers className="w-5 h-5 text-blue-400" />}
                  description="To bypass Google Places API's 60-result limitation, Leadverse dynamically splits target regions (e.g. 'India' or 'Texas') into clusters of top cities, executing parallel scrapers to fetch up to 300+ leads per run."
                />
                <CardStep 
                  number="02" 
                  title="Missing Site Audit" 
                  icon={<ShieldAlert className="w-5 h-5 text-red-400" />}
                  description="The crawler audits each business lead and filters out those with NO website or a broken link. This isolates business owners who desperately need modern, professional website development."
                />
                <CardStep 
                  number="03" 
                  title="Website Content Scraper" 
                  icon={<Database className="w-5 h-5 text-purple-400" />}
                  description="For leads that have a website, Leadverse crawlers crawl their homepage and contact page in the background, extracting public emails, phone numbers, and social links (Facebook, Instagram, LinkedIn)."
                />
              </div>

              {/* Workflow Details */}
              <div className="bg-[#121216] border border-white/10 rounded-2xl p-8 space-y-6">
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-lg font-bold text-white">B2B Local Lead Gen Engine Under the Hood</h3>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4 text-xs text-gray-400 leading-relaxed">
                    <p>
                      Our local business prospecting system combines <strong>Google Places API</strong> crawling and <strong>Puppeteer-driven website scrapers</strong>.
                    </p>
                    <p>
                      Once the Places API returns basic business details, a lightweight background job visits the business's homepage. It scans the page source for B2B contact patterns, collecting email addresses, social profiles, and phone numbers.
                    </p>
                    <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl text-blue-400 flex gap-2">
                      <Zap className="w-5 h-5 shrink-0 mt-0.5" />
                      <span><strong>Outreach Opportunity:</strong> By identifying which local businesses lack responsive websites or have broken contact details, our CRM generates highly customized demo video previews and landing pages automatically.</span>
                    </div>
                  </div>

                  <div className="bg-[#08080a] rounded-xl border border-white/5 p-5 space-y-4">
                    <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Scraped Fields Structure</h4>
                    <div className="space-y-2.5 text-xs">
                      <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-gray-400">Business Name</span>
                        <span className="font-semibold text-gray-200">e.g., Downtown Dental Care</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-gray-400">Address / Location</span>
                        <span className="font-semibold text-gray-200">Full physical street address</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-gray-400">Website Status</span>
                        <span className="font-semibold text-red-400">No Website / Has Website</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-gray-400">Phone Number</span>
                        <span className="font-semibold text-gray-200">Formats sanitized (e.g., +1...)</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-gray-400">Contact Email</span>
                        <span className="font-semibold text-emerald-400">Extracted via web crawler</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function CardStep({ number, title, icon, description }: { number: string; title: string; icon: React.ReactNode; description: string }) {
  return (
    <div className="bg-[#121216] border border-white/5 hover:border-white/10 rounded-2xl p-6 space-y-4 transition-all hover:translate-y-[-2px]">
      <div className="flex items-center justify-between">
        <div className="p-2.5 bg-white/5 rounded-xl border border-white/5">
          {icon}
        </div>
        <span className="text-2xl font-black text-white/10 tracking-widest">{number}</span>
      </div>
      <h3 className="text-lg font-bold text-white">{title}</h3>
      <p className="text-gray-400 text-xs leading-relaxed">{description}</p>
    </div>
  );
}
