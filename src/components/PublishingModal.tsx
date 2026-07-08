import React, { useState } from "react";
import { GeneratedSite } from "../types";
import { 
  Globe, ShieldCheck, CheckCircle2, Copy, ExternalLink, RefreshCw, 
  Server, Cpu, FileText, Smartphone, Monitor, Check, AlertCircle, Layers
} from "lucide-react";

interface PublishingModalProps {
  site: GeneratedSite;
  onClose: () => void;
  onSavePublish: (updatedSite: GeneratedSite) => void;
}

export default function PublishingModal({ site, onClose, onSavePublish }: PublishingModalProps) {
  const [subdomain, setSubdomain] = useState(
    site.publishing?.subdomain || site.businessName.toLowerCase().replace(/[^a-z0-9]/g, "")
  );
  const [customDomain, setCustomDomain] = useState(site.publishing?.customDomain || "");
  const [hostingProvider, setHostingProvider] = useState(site.publishing?.hostingProvider || "SiteScout Global CDN");
  const [sslActive, setSslActive] = useState(site.publishing?.sslActive ?? true);
  const [activeTab, setActiveTab] = useState<"domain" | "hosting" | "seo" | "sitemap">("domain");
  const [isPublishing, setIsPublishing] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [copied, setCopied] = useState(false);

  const siteSlug = subdomain || "mysite";
  const finalPublishedUrl = customDomain ? `https://${customDomain}` : `https://${siteSlug}.sitescout.app`;

  const handlePublishAction = () => {
    setIsPublishing(true);
    setTimeout(() => {
      setIsPublishing(false);
      const updated: GeneratedSite = {
        ...site,
        publishedUrl: finalPublishedUrl,
        publishing: {
          customDomain,
          subdomain,
          hostingProvider,
          sslActive,
          sitemapUrl: `${finalPublishedUrl}/sitemap.xml`,
          lastPublished: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }),
          status: "published"
        }
      };
      onSavePublish(updated);
      setSuccessMessage("Site successfully published with active SSL and auto-generated sitemap!");
      setTimeout(() => setSuccessMessage(""), 4000);
    }, 1200);
  };

  const copySitemapLink = () => {
    navigator.clipboard.writeText(`${finalPublishedUrl}/sitemap.xml`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Globe className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Publishing & Deployment Center</h2>
              <p className="text-xs text-slate-500">Configure custom domains, subdomains, SSL certificates, and auto-generated sitemaps.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 gap-6 text-xs font-bold">
          {[
            { id: "domain", label: "Domains & SSL", icon: Globe },
            { id: "hosting", label: "Hosting Providers", icon: Server },
            { id: "seo", label: "SEO & Responsiveness", icon: Monitor },
            { id: "sitemap", label: "Sitemap & Robots.txt", icon: FileText },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-3.5 border-b-2 transition-all cursor-pointer ${
                  isActive 
                    ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400" 
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/30 dark:bg-slate-950/20">

          {successMessage && (
            <div className="flex items-center gap-2.5 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
              <span>{successMessage}</span>
            </div>
          )}

          {activeTab === "domain" && (
            <div className="space-y-6">
              {/* Subdomain Card */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Globe className="h-4.5 w-4.5 text-blue-500" /> Instant Subdomain Deployment
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 uppercase tracking-wide">
                    Free Included
                  </span>
                </div>
                <p className="text-xs text-slate-500">Your site is instantly accessible worldwide on our lightning-fast global edge network.</p>
                
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 overflow-hidden px-3">
                    <span className="text-xs text-slate-400 font-medium">https://</span>
                    <input 
                      type="text" 
                      value={subdomain}
                      onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                      className="flex-1 bg-transparent py-2.5 text-xs text-slate-900 dark:text-white font-bold focus:outline-none px-1"
                      placeholder="mybusiness"
                    />
                    <span className="text-xs text-slate-400 font-medium">.sitescout.app</span>
                  </div>
                  <div className="flex items-center gap-1 px-3 py-2.5 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 text-xs font-bold">
                    <Check className="h-4 w-4" /> Available
                  </div>
                </div>
              </div>

              {/* Custom Domain Card */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Server className="h-4.5 w-4.5 text-purple-500" /> Custom Domain Mapping (DNS)
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 uppercase tracking-wide">
                    Pro Branding
                  </span>
                </div>
                <p className="text-xs text-slate-500">Connect your own custom domain (e.g. <strong className="text-slate-700 dark:text-slate-300">www.yourbrand.com</strong>) to build professional trust with local customers.</p>
                
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Custom Domain Name</label>
                  <input 
                    type="text"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    placeholder="www.mybusiness.com"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-xs text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {customDomain && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50/50 dark:border-blue-900/30 dark:bg-blue-950/20 p-4 space-y-2 text-xs">
                    <p className="font-bold text-blue-900 dark:text-blue-300">DNS Configuration Records Required:</p>
                    <div className="grid grid-cols-3 gap-2 font-mono text-[11px] bg-white dark:bg-slate-900 p-3 rounded-lg border border-blue-200/50 dark:border-blue-900/50">
                      <div><span className="text-slate-400">Type:</span> CNAME</div>
                      <div><span className="text-slate-400">Name:</span> www</div>
                      <div><span className="text-slate-400">Value:</span> proxy.sitescout.app</div>
                    </div>
                  </div>
                )}
              </div>

              {/* SSL Status Card */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Automated Let's Encrypt SSL Certificate</h4>
                    <p className="text-[11px] text-slate-500">Secure 256-bit encryption automatically provisioned & renewed.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Active & Secured</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "hosting" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Server className="h-4.5 w-4.5 text-blue-500" /> Hosting Provider Integrations
                </h3>
                <p className="text-xs text-slate-500">Select your preferred hosting infrastructure. SiteScout automatically generates optimized static HTML/CSS/JS export packages or direct API deploys.</p>

                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { name: "SiteScout Global CDN", desc: "Lightning fast edge caching with instant global distribution", badge: "Recommended", icon: Globe },
                    { name: "Vercel Enterprise", desc: "Automatic serverless deployment pipelines with preview branches", badge: "Future Sync", icon: Cpu },
                    { name: "Netlify Cloud", desc: "Continuous deployment from Git with form handlers & serverless functions", badge: "Future Sync", icon: Server },
                    { name: "AWS S3 + CloudFront", desc: "Enterprise-grade scalable bucket storage with custom CDN rules", badge: "Future Sync", icon: Server },
                  ].map(hp => {
                    const isSelected = hostingProvider === hp.name;
                    return (
                      <div 
                        key={hp.name}
                        onClick={() => setHostingProvider(hp.name)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                          isSelected 
                            ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 dark:border-blue-500" 
                            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-900 dark:text-white">{hp.name}</span>
                          <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            hp.badge === "Recommended" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                          }`}>
                            {hp.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">{hp.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === "seo" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Monitor className="h-4.5 w-4.5 text-indigo-500" /> Responsive Layouts & SEO Optimization
                </h3>
                <p className="text-xs text-slate-500">Every published website is 100% responsive across mobile, tablet, and desktop screens with built-in schema markup and meta tags.</p>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/40 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                      <Smartphone className="h-4 w-4 text-blue-500" />
                      <span>Mobile-First Fluid Grid</span>
                    </div>
                    <p className="text-[11px] text-slate-500">Optimized touch targets, responsive typography scaling, and instant mobile CTA click-to-call buttons.</p>
                  </div>
                  <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/40 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                      <Globe className="h-4 w-4 text-emerald-500" />
                      <span>Search Engine Optimization (SEO)</span>
                    </div>
                    <p className="text-[11px] text-slate-500">Auto-configured Title tag, Meta Description, OpenGraph tags, and LocalBusiness schema markup.</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active SEO Meta Preview</span>
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg space-y-1 font-sans">
                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">{site.seo.title}</p>
                    <p className="text-[10px] text-emerald-700 dark:text-emerald-400">{finalPublishedUrl}</p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2">{site.seo.description}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "sitemap" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileText className="h-4.5 w-4.5 text-amber-500" /> Automatic Sitemap & Robots.txt Generation
                  </h3>
                  <button 
                    onClick={copySitemapLink}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>{copied ? "Copied!" : "Copy Sitemap URL"}</span>
                  </button>
                </div>
                <p className="text-xs text-slate-500">SiteScout automatically updates your <code className="text-blue-600 dark:text-blue-400">sitemap.xml</code> and <code className="text-blue-600 dark:text-blue-400">robots.txt</code> whenever you publish new edits.</p>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-900 text-slate-200 p-4 font-mono text-[11px] overflow-x-auto space-y-1 shadow-inner">
                  <p className="text-emerald-400">&lt;?xml version="1.0" encoding="UTF-8"?&gt;</p>
                  <p className="text-blue-400">&lt;urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"&gt;</p>
                  <p className="pl-4">&lt;url&gt;&lt;loc&gt;{finalPublishedUrl}/&lt;/loc&gt;&lt;changefreq&gt;weekly&lt;/changefreq&gt;&lt;priority&gt;1.0&lt;/priority&gt;&lt;/url&gt;</p>
                  <p className="pl-4">&lt;url&gt;&lt;loc&gt;{finalPublishedUrl}/services&lt;/loc&gt;&lt;changefreq&gt;monthly&lt;/changefreq&gt;&lt;priority&gt;0.8&lt;/priority&gt;&lt;/url&gt;</p>
                  <p className="pl-4">&lt;url&gt;&lt;loc&gt;{finalPublishedUrl}/contact&lt;/loc&gt;&lt;changefreq&gt;monthly&lt;/changefreq&gt;&lt;priority&gt;0.8&lt;/priority&gt;&lt;/url&gt;</p>
                  <p className="text-blue-400">&lt;/urlset&gt;</p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="text-xs text-slate-500">
            Target URL: <a href={finalPublishedUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1">{finalPublishedUrl} <ExternalLink className="h-3 w-3" /></a>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handlePublishAction}
              disabled={isPublishing}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isPublishing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Publishing & Generating SSL...</span>
                </>
              ) : (
                <>
                  <Globe className="h-4 w-4" />
                  <span>Publish Site Now</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
