import React from "react";
import { 
  FunnelChart, Funnel, Tooltip, ResponsiveContainer, Cell, LabelList
} from "recharts";
import { 
  TrendingUp, Search, Globe, BookOpen, Trophy, 
  ArrowRight, ShieldCheck, Sparkles, Lightbulb
} from "lucide-react";

interface ConversionFunnelProps {
  stats: {
    found: number;
    generated: number;
    proposals: number;
    won: number;
  };
}

export default function ConversionFunnel({ stats }: ConversionFunnelProps) {
  // Structure funnel data
  const data = [
    { 
      value: stats.found, 
      name: "Business Found", 
      stage: "Leads Scanned",
      fill: "#3b82f6", // Blue
      icon: Search,
      percentage: 100,
      description: "Target businesses discovered with web presence deficits."
    },
    { 
      value: stats.generated, 
      name: "Previews Generated", 
      stage: "Site Drafts Built",
      fill: "#6366f1", // Indigo
      icon: Globe,
      percentage: stats.found > 0 ? Math.round((stats.generated / stats.found) * 100) : 0,
      description: "Tailored mockups compiled instantly with Gemini AI."
    },
    { 
      value: stats.proposals, 
      name: "Proposals Sent", 
      stage: "Quotes Created",
      fill: "#8b5cf6", // Purple
      icon: BookOpen,
      percentage: stats.generated > 0 ? Math.round((stats.proposals / stats.generated) * 100) : 0,
      description: "Customized SaaS packages and service SLA contracts sent."
    },
    { 
      value: stats.won, 
      name: "Client Won", 
      stage: "Contract Signed",
      fill: "#10b981", // Emerald
      icon: Trophy,
      percentage: stats.proposals > 0 ? Math.round((stats.won / stats.proposals) * 100) : 0,
      description: "Digital signatures completed and CRM synced."
    },
  ];

  // Calculate overall metrics
  const totalConversion = stats.found > 0 ? ((stats.won / stats.found) * 100).toFixed(1) : "0.0";
  
  // Custom tooltips
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataInfo = payload[0].payload;
      return (
        <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-[240px] text-left">
          <p className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: dataInfo.fill }} />
            {dataInfo.name}
          </p>
          <div className="mt-2.5 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Active Stage:</span>
              <span className="font-extrabold text-slate-800 dark:text-slate-200">{dataInfo.stage}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total Volume:</span>
              <span className="font-black text-slate-900 dark:text-white font-mono text-sm">{dataInfo.value}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Stage Conv. Rate:</span>
              <span className="font-black text-slate-900 dark:text-white font-mono">{dataInfo.percentage}%</span>
            </div>
          </div>
          <p className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-850 text-[10px] text-slate-400 leading-relaxed">
            {dataInfo.description}
          </p>
        </div>
      );
    }
    return null;
  };

  // Determine key insight/recommendation
  const getFunnelInsight = () => {
    const previewRate = stats.found > 0 ? (stats.generated / stats.found) : 0;
    const proposalRate = stats.generated > 0 ? (stats.proposals / stats.generated) : 0;
    const winRate = stats.proposals > 0 ? (stats.won / stats.proposals) : 0;

    if (previewRate < 0.4) {
      return {
        title: "Boost Preview Velocity",
        desc: "Your Lead-to-Preview rate is below 40%. Generate more high-fidelity layouts immediately for discovered businesses to increase client curiosity.",
        action: "Go to Business Finder",
        tab: "finder"
      };
    } else if (proposalRate < 0.5) {
      return {
        title: "Leverage Custom Proposals",
        desc: "Your Preview-to-Proposal rate indicates a drop-off. Turn design interest into formal business packages. Use our automated quote calculator.",
        action: "Build Custom Quotes",
        tab: "proposals"
      };
    } else if (winRate < 0.4) {
      return {
        title: "Optimize CRM Outreach",
        desc: "Your closing rate is below target. Use the AI Sales Copywriter to draft customized follow-up emails, or sync won clients directly to HubSpot.",
        action: "Craft Pitch Copy",
        tab: "sales"
      };
    } else {
      return {
        title: "Funnel Healthy & Optimized",
        desc: "Excellent! Your sales cycle has ideal conversion rates at every key transition stage. Continue discovering local business leads.",
        action: "Find More Leads",
        tab: "finder"
      };
    }
  };

  const insight = getFunnelInsight();

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 text-left space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-indigo-500" /> B2B Client Acquisition Funnel
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Visualize your agency conversion metrics from discovery to closed-won deals.</p>
        </div>
        <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1.5 rounded-xl border border-indigo-100/50 dark:border-indigo-900/30">
          <Sparkles className="h-4 w-4 text-indigo-500 animate-pulse" />
          <span className="text-xs font-extrabold text-indigo-950 dark:text-indigo-300">
            Overall Conversion: <span className="font-mono text-sm">{totalConversion}%</span>
          </span>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-5 items-center">
        {/* Funnel Chart stage */}
        <div className="lg:col-span-3 h-[300px] w-full flex items-center justify-center relative bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl p-4 border border-dashed border-slate-200 dark:border-slate-800">
          <ResponsiveContainer width="100%" height="100%">
            <FunnelChart>
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "transparent" }} />
              <Funnel
                dataKey="value"
                data={data}
                isAnimationActive
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} className="transition-opacity hover:opacity-90 cursor-pointer" />
                ))}
                <LabelList 
                  position="right" 
                  fill="#64748b" 
                  stroke="none" 
                  dataKey="stage" 
                  className="text-[11px] font-bold fill-slate-500 dark:fill-slate-400"
                />
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        </div>

        {/* Dynamic breakdown table & insights */}
        <div className="lg:col-span-2 space-y-5">
          <div className="space-y-3">
            <h4 className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Conversion Metrics</h4>
            <div className="space-y-2.5">
              {data.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={index} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-50 bg-slate-50/30 dark:border-slate-800/40 dark:bg-slate-900/40">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg text-white" style={{ backgroundColor: item.fill }}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{item.stage}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-slate-900 dark:text-white font-mono">{item.value}</p>
                      <p className="text-[9px] font-bold text-slate-500 mt-0.5">
                        {index === 0 ? "Top of Funnel" : `${item.percentage}% stage conv.`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI/SaaS Insight Panel */}
          <div className="p-4 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-white dark:border-indigo-950/40 dark:from-slate-950/40 dark:to-slate-900/40 space-y-2.5">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <Lightbulb className="h-4.5 w-4.5 shrink-0" />
              <h4 className="text-xs font-black uppercase tracking-wider">{insight.title}</h4>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed dark:text-slate-400">
              {insight.desc}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
