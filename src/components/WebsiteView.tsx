import { useState } from "react";
import { GeneratedSite } from "../types";
import { 
  Phone, MapPin, MessageSquare, ChevronDown, Check, Sparkles, Wrench, Utensils, HeartPulse, Scale, Briefcase, Home, Camera, Scissors, ShieldCheck
} from "lucide-react";

interface WebsiteViewProps {
  site: GeneratedSite;
}

export default function WebsiteView({ site }: WebsiteViewProps) {
  const [activePage, setActivePage] = useState<"home" | "about" | "services" | "gallery" | "blog" | "contact" | "privacy" | "terms" | "404">("home");

  const getFontFamilyClass = (style: string) => {
    switch (style) {
      case "serif": return "font-serif";
      case "display": return "font-sans tracking-tight font-black";
      case "modern": return "font-sans uppercase tracking-wider font-semibold";
      default: return "font-sans";
    }
  };

  const renderHeaderLogo = () => {
    const logoType = site.logoType || "text";
    if (logoType === "icon") {
      const iconId = site.logoIcon || "Sparkles";
      const logoIcons: Record<string, any> = {
        Sparkles, Wrench, Utensils, HeartPulse, Scale, Briefcase, Home, Camera, Scissors, ShieldCheck
      };
      const SelectedIcon = logoIcons[iconId] || Sparkles;
      return (
        <div className={`text-sm font-bold flex items-center gap-2 ${getFontFamilyClass(site.fontStyle)} cursor-pointer`} style={{ color: site.primaryColor }} onClick={() => setActivePage('home')}>
          <SelectedIcon className="h-5 w-5" style={{ color: site.primaryColor }} />
          <span>{site.businessName}</span>
        </div>
      );
    } else if (logoType === "image" && site.logoUrl) {
      return (
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActivePage('home')}>
          <img src={site.logoUrl} alt={site.businessName} className="h-8 w-auto object-contain max-w-[150px]" referrerPolicy="no-referrer" />
        </div>
      );
    } else {
      return (
        <div className={`text-sm font-bold ${getFontFamilyClass(site.fontStyle)} cursor-pointer`} style={{ color: site.primaryColor }} onClick={() => setActivePage('home')}>
          {site.businessName}
        </div>
      );
    }
  };

  const sectionsOrder = site.sectionsOrder || ["hero", "features", "services", "about", "testimonials", "faqs", "gallery", "blog", "contact"];

  const renderSection = (sectionId: string) => {
    switch (sectionId) {
      case "hero":
        return (
          <section key="hero" className="px-5 py-12 text-center relative overflow-hidden bg-slate-50" style={{ backgroundColor: `${site.primaryColor}05` }}>
            <div className="max-w-xl mx-auto space-y-4">
              <h1 className={`text-2xl sm:text-3xl font-extrabold leading-tight text-slate-900 ${getFontFamilyClass(site.fontStyle)}`} style={{ color: site.primaryColor }}>
                {site.hero.title}
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-sans">
                {site.hero.subtitle}
              </p>
              {site.hero.imageUrl && (
                <div className="my-4 max-w-lg mx-auto rounded-xl overflow-hidden shadow-sm aspect-video border border-slate-200 bg-white">
                  <img src={site.hero.imageUrl} alt="Hero banner illustration" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md cursor-pointer" style={{ backgroundColor: site.accentColor }}>
                  {site.hero.ctaPrimary}
                </button>
                <button className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-700 cursor-pointer">
                  {site.hero.ctaSecondary}
                </button>
              </div>
            </div>
          </section>
        );
      case "features":
        return (
          <section key="features" className="p-6 max-w-2xl mx-auto">
            <h3 className={`text-center text-sm font-bold text-slate-400 uppercase tracking-wider mb-5 ${getFontFamilyClass(site.fontStyle)}`}>
              Why Choose Us
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {site.features?.map((feat, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm text-center space-y-2 dark:bg-slate-950 dark:border-slate-800">
                  <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                    <Check className="h-4.5 w-4.5" />
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white font-sans">{feat.title}</h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed font-sans">{feat.description}</p>
                </div>
              ))}
            </div>
          </section>
        );
      case "services":
        return (
          <section key="services" className="p-6 bg-slate-50/50 max-w-2xl mx-auto border-t border-b border-slate-100/50">
            <h3 className={`text-center text-base font-bold text-slate-800 mb-5 ${getFontFamilyClass(site.fontStyle)}`} style={{ color: site.primaryColor }}>
              Our Specialized Packages
            </h3>
            <div className="space-y-4">
              {site.services?.map((srv, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm flex items-center justify-between dark:bg-slate-950 dark:border-slate-800">
                  <div className="text-left space-y-1 pr-4">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white font-sans">{srv.title}</h4>
                    <p className="text-[10px] text-slate-500 leading-relaxed font-sans">{srv.description}</p>
                  </div>
                  <span className="shrink-0 rounded-lg bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    {srv.price}
                  </span>
                </div>
              ))}
            </div>
          </section>
        );
      case "about":
        return (
          <section key="about" className="p-6 max-w-2xl mx-auto text-center space-y-4">
            <h3 className={`text-base font-bold text-slate-800 ${getFontFamilyClass(site.fontStyle)}`} style={{ color: site.primaryColor }}>
              {site.about.title}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed max-w-lg mx-auto font-sans">
              {site.about.history}
            </p>
            <blockquote className="border-l-4 border-slate-200 pl-4 py-1 italic text-xs text-slate-500 text-left max-w-md mx-auto font-sans" style={{ borderLeftColor: site.accentColor }}>
              "{site.about.mission}"
            </blockquote>
          </section>
        );
      case "gallery":
        return site.gallery && (
          <section key="gallery" className="p-6 max-w-2xl mx-auto">
            <h3 className={`text-center text-base font-bold text-slate-800 mb-5 ${getFontFamilyClass(site.fontStyle)}`} style={{ color: site.primaryColor }}>
              Gallery
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {site.gallery.map((img, i) => (
                <div key={i} className="relative aspect-square overflow-hidden rounded-xl border border-slate-200">
                  <img src={img.url} alt={img.alt} className="object-cover w-full h-full hover:scale-105 transition-transform duration-300" referrerPolicy="no-referrer" />
                </div>
              ))}
            </div>
          </section>
        );
      case "testimonials":
        return site.testimonials && (
          <section key="testimonials" className="p-6 max-w-2xl mx-auto">
            <h3 className={`text-center text-sm font-bold text-slate-800 mb-5 ${getFontFamilyClass(site.fontStyle)}`} style={{ color: site.primaryColor }}>
              What Our Clients Say
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {site.testimonials.map((test, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm text-left dark:bg-slate-950 dark:border-slate-800">
                  <div className="flex items-center gap-1 mb-2">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <svg key={j} className={`w-3.5 h-3.5 ${j < test.rating ? 'text-amber-400' : 'text-slate-200'}`} fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-600 italic mb-2 leading-relaxed font-sans">"{test.review}"</p>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 font-sans">- {test.name}</p>
                </div>
              ))}
            </div>
          </section>
        );
      case "faqs":
        return (
          <section key="faqs" className="p-6 bg-slate-50 max-w-2xl mx-auto rounded-t-2xl">
            <h3 className={`text-center text-sm font-bold text-slate-800 mb-5 ${getFontFamilyClass(site.fontStyle)}`} style={{ color: site.primaryColor }}>
              Frequently Asked Questions
            </h3>
            <div className="space-y-3">
              {site.faqs?.map((faq, i) => (
                <div key={i} className="bg-white rounded-xl p-3.5 shadow-xs text-left dark:bg-slate-950">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white flex items-center justify-between font-sans">
                    <span>{faq.question}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  </h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed mt-1.5 pt-1.5 border-t border-slate-50 font-sans">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </section>
        );
      case "blog":
        return site.blog && (
          <section key="blog" className="p-6 max-w-2xl mx-auto">
            <h3 className={`text-center text-base font-bold text-slate-800 mb-5 ${getFontFamilyClass(site.fontStyle)}`} style={{ color: site.primaryColor }}>
              Latest News &amp; Articles
            </h3>
            <div className="space-y-4">
              {site.blog.map((post, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm text-left dark:bg-slate-950 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-2 block">{post.category}</span>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2 font-sans">{post.title}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-sans">{post.summary}</p>
                  <button className="mt-3 text-[10px] font-bold text-slate-800 dark:text-slate-200 hover:underline">Read More &rarr;</button>
                </div>
              ))}
            </div>
          </section>
        );
      case "contact":
        return site.contactPage && (
          <section key="contact" className="p-6 max-w-2xl mx-auto">
            <h3 className={`text-center text-base font-bold text-slate-800 mb-2 ${getFontFamilyClass(site.fontStyle)}`} style={{ color: site.primaryColor }}>
              {site.contactPage.title}
            </h3>
            <p className="text-xs text-slate-600 text-center mb-6 font-sans">{site.contactPage.description}</p>
            <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm dark:bg-slate-950 dark:border-slate-800">
               <div className="space-y-3">
                 <input type="text" placeholder="Your Name" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs" />
                 <input type="email" placeholder="Email Address" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs" />
                 <textarea placeholder="Your Message" rows={4} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"></textarea>
                 <button className="w-full py-2.5 rounded-xl text-xs font-bold text-white shadow-md cursor-pointer" style={{ backgroundColor: site.accentColor }}>
                    Send Message
                 </button>
               </div>
            </div>
            <div className="mt-6 flex flex-col items-center gap-2 text-xs text-slate-600">
              <div className="flex items-center gap-2 font-sans"><Phone className="h-4 w-4" /> {site.phone}</div>
              <div className="flex items-center gap-2 font-sans"><MapPin className="h-4 w-4" /> {site.address}</div>
              <div className="flex items-center gap-2 font-sans"><MessageSquare className="h-4 w-4" /> {site.contactPage.email}</div>
            </div>
            
            <div className="mt-8 rounded-xl overflow-hidden border border-slate-200 h-48 bg-slate-100 flex items-center justify-center relative">
              <div className="absolute inset-0 opacity-50 bg-[url('https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=800&q=80')] bg-cover bg-center"></div>
              <div className="relative z-10 bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-sm border border-slate-200 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-red-500" />
                <span className="text-xs font-bold text-slate-800 font-sans">{site.businessName}</span>
              </div>
            </div>
          </section>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 w-full flex flex-col h-full overflow-hidden" style={{ backgroundColor: site.backgroundColor, color: site.textColor }}>
      {/* Header Nav */}
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/95 backdrop-blur-sm p-4 flex items-center justify-between shrink-0" style={{ borderBottomColor: `${site.primaryColor}10` }}>
        {renderHeaderLogo()}
        <nav className="flex items-center space-x-4 text-[10px] font-bold text-slate-500 overflow-x-auto whitespace-nowrap scrollbar-none max-w-[60%] sm:max-w-full">
          <button onClick={() => setActivePage('home')} className={`hover:text-slate-900 ${activePage === 'home' ? 'text-slate-900 font-extrabold' : ''} cursor-pointer`}>Home</button>
          {sectionsOrder.includes("about") && <button onClick={() => setActivePage('about')} className={`hover:text-slate-900 ${activePage === 'about' ? 'text-slate-900 font-extrabold' : ''} cursor-pointer`}>About</button>}
          {sectionsOrder.includes("services") && <button onClick={() => setActivePage('services')} className={`hover:text-slate-900 ${activePage === 'services' ? 'text-slate-900 font-extrabold' : ''} cursor-pointer`}>Services</button>}
          {sectionsOrder.includes("gallery") && <button onClick={() => setActivePage('gallery')} className={`hover:text-slate-900 ${activePage === 'gallery' ? 'text-slate-900 font-extrabold' : ''} cursor-pointer`}>Gallery</button>}
          {sectionsOrder.includes("blog") && <button onClick={() => setActivePage('blog')} className={`hover:text-slate-900 ${activePage === 'blog' ? 'text-slate-900 font-extrabold' : ''} cursor-pointer`}>Blog</button>}
          {sectionsOrder.includes("contact") && <button onClick={() => setActivePage('contact')} className={`hover:text-slate-900 ${activePage === 'contact' ? 'text-slate-900 font-extrabold' : ''} cursor-pointer`}>Contact</button>}
        </nav>
        <div className="flex items-center space-x-2.5 shrink-0">
          <a href={`tel:${site.phone}`} className="flex h-7 w-7 items-center justify-center rounded-lg text-white shadow-xs transition-transform hover:scale-105" style={{ backgroundColor: site.accentColor }}>
            <Phone className="h-3.5 w-3.5" />
          </a>
          <a href={`https://wa.me/${site.phone}`} className="flex h-7 w-7 items-center justify-center rounded-lg text-white bg-emerald-500 shadow-xs transition-transform hover:scale-105">
            <MessageSquare className="h-3.5 w-3.5" />
          </a>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="flex-1 overflow-y-auto">
        {activePage === 'home' ? (
          <div className="space-y-0">
            {sectionsOrder.map((sectionId) => renderSection(sectionId))}
          </div>
        ) : (
          <div className="animate-fade-in py-4">
            {activePage === 'about' && (
              <>
                {renderSection('about')}
                {sectionsOrder.includes('testimonials') && renderSection('testimonials')}
              </>
            )}
            {activePage === 'services' && renderSection('services')}
            {activePage === 'gallery' && renderSection('gallery')}
            {activePage === 'blog' && renderSection('blog')}
            {activePage === 'contact' && renderSection('contact')}
            
            {activePage === 'privacy' && site.privacyPolicy && (
              <section className="p-6 max-w-2xl mx-auto text-left">
                <h3 className={`text-base font-bold text-slate-800 mb-4 ${getFontFamilyClass(site.fontStyle)}`} style={{ color: site.primaryColor }}>
                  Privacy Policy
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap font-sans">{site.privacyPolicy}</p>
              </section>
            )}

            {activePage === 'terms' && site.termsOfService && (
              <section className="p-6 max-w-2xl mx-auto text-left">
                <h3 className={`text-base font-bold text-slate-800 mb-4 ${getFontFamilyClass(site.fontStyle)}`} style={{ color: site.primaryColor }}>
                  Terms of Service
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap font-sans">{site.termsOfService}</p>
              </section>
            )}

            {activePage === '404' && site.notFoundPage && (
              <section className="p-12 max-w-2xl mx-auto text-center space-y-4">
                <h3 className={`text-4xl font-black text-slate-800 ${getFontFamilyClass(site.fontStyle)}`} style={{ color: site.primaryColor }}>
                  404
                </h3>
                <h4 className="text-lg font-bold text-slate-700 font-sans">{site.notFoundPage.title}</h4>
                <p className="text-xs text-slate-600 leading-relaxed max-w-lg mx-auto font-sans">
                  {site.notFoundPage.message}
                </p>
                <button onClick={() => setActivePage('home')} className="mt-4 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md cursor-pointer animate-pulse" style={{ backgroundColor: site.accentColor }}>
                  Return to Homepage
                </button>
              </section>
            )}
          </div>
        )}
      </div>

      {/* Footer Block */}
      <footer className="p-8 text-center text-[10px] text-slate-400 border-t border-slate-100 bg-white" style={{ backgroundColor: `${site.primaryColor}05` }}>
        <p className="font-semibold text-slate-700">{site.businessName}</p>
        <p className="mt-1 flex items-center justify-center gap-1"><MapPin className="h-3 w-3" /> {site.address}</p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <button onClick={() => setActivePage('privacy')} className="hover:underline cursor-pointer">Privacy Policy</button>
          <button onClick={() => setActivePage('terms')} className="hover:underline cursor-pointer">Terms of Service</button>
          <button onClick={() => setActivePage('404')} className="hover:underline cursor-pointer">404 Error Preview</button>
        </div>
        <p className="mt-2 text-[9px] text-slate-400">© 2026. Custom layout built instantly by SiteScout AI.</p>
      </footer>
    </div>
  );
}
