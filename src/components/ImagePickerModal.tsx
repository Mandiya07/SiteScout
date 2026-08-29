import React, { useState, useEffect } from "react";
import { ImageMetadata, VisualBusinessProfile } from "../types";
import { 
  Search, Sparkles, X, Check, Image as ImageIcon, ExternalLink, 
  Filter, ShieldCheck, User, RefreshCw, AlertCircle 
} from "lucide-react";

interface ImagePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (image: ImageMetadata) => void;
  currentImageUrl?: string;
  industry?: string;
  sectionTarget?: "hero" | "about" | "services" | "gallery";
  serviceName?: string;
  location?: string;
}

export default function ImagePickerModal({
  isOpen,
  onClose,
  onSelectImage,
  currentImageUrl,
  industry = "Professional Services",
  sectionTarget = "gallery",
  serviceName,
  location = ""
}: ImagePickerModalProps) {
  const [query, setQuery] = useState("");
  const [section, setSection] = useState(sectionTarget);
  const [orientation, setOrientation] = useState<"landscape" | "portrait" | "squarish">("landscape");
  const [images, setImages] = useState<ImageMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImageMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize query based on context
  useEffect(() => {
    if (isOpen) {
      const initial = serviceName ? `${industry} ${serviceName}` : `${industry} ${sectionTarget}`;
      setQuery(initial);
      setSection(sectionTarget);
      performSearch(initial, sectionTarget);
    }
  }, [isOpen, industry, sectionTarget, serviceName]);

  const performSearch = async (searchQuery: string, targetSection: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/images/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchQuery,
          industry,
          section: targetSection,
          serviceName,
          orientation,
          limit: 18
        })
      });

      if (!res.ok) {
        throw new Error("Failed to load images");
      }

      const data = await res.json();
      setImages(data.images || []);
    } catch (err: any) {
      console.error("Image search failed:", err);
      setError("Could not search image providers. Please try a different query.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      performSearch(query.trim(), section);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <ImageIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Image Taxonomy & Stock Asset Library
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Industry-verified, high-resolution imagery for <span className="font-semibold text-slate-700 dark:text-slate-300">{industry}</span> ({sectionTarget})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search & Filter Controls */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by keywords, profession, equipment..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
              Search
            </button>
          </form>

          {/* Quick preset chips */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none text-[11px]">
            <span className="text-slate-400 font-semibold text-[10px] uppercase shrink-0">Presets:</span>
            {[
              `${industry} hero`,
              `${industry} craftsman`,
              `${industry} equipment`,
              `${industry} project`,
              `${industry} commercial`,
              `${industry} modern`
            ].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setQuery(preset);
                  performSearch(preset, section);
                }}
                className="shrink-0 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:border-blue-300 text-slate-600 dark:text-slate-300 text-[10px] font-medium cursor-pointer"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Image Grid Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
              <RefreshCw className="h-7 w-7 animate-spin text-blue-500" />
              <p className="text-xs font-medium">Scoring taxonomy images and resolving providers...</p>
            </div>
          ) : images.length === 0 ? (
            <div className="py-20 text-center text-slate-400 space-y-2">
              <ImageIcon className="h-10 w-10 mx-auto text-slate-300" />
              <p className="text-xs font-semibold">No matching images found.</p>
              <p className="text-[11px] text-slate-500">Try broader terms or select one of the category presets above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {images.map((img) => {
                const isSelected = selectedImage?.id === img.id || currentImageUrl === img.fullUrl;
                return (
                  <div
                    key={img.id}
                    onClick={() => setSelectedImage(img)}
                    className={`group relative rounded-xl overflow-hidden border transition-all cursor-pointer aspect-4/3 bg-slate-100 dark:bg-slate-950 ${
                      isSelected
                        ? "border-blue-600 ring-2 ring-blue-500/30 shadow-md"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                    }`}
                  >
                    <img
                      src={img.thumbUrl || img.fullUrl}
                      alt={img.alt}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />

                    {/* Badge Overlay */}
                    <div className="absolute top-1.5 left-1.5 flex flex-wrap gap-1">
                      {img.source === "curated_taxonomy" && (
                        <span className="px-1.5 py-0.5 rounded bg-blue-600/90 text-white text-[9px] font-bold">
                          Taxonomy Match
                        </span>
                      )}
                      {img.relevanceScore && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-900/80 text-emerald-400 text-[9px] font-mono font-bold">
                          {Math.round(img.relevanceScore)}%
                        </span>
                      )}
                    </div>

                    {/* Attribution pill */}
                    <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-slate-950/80 via-slate-950/40 to-transparent p-2 text-left opacity-90 group-hover:opacity-100 transition-opacity">
                      <p className="text-[10px] font-medium text-white line-clamp-1">
                        {img.photographer || "Stock Asset"}
                      </p>
                      <p className="text-[8px] text-slate-300 uppercase tracking-wider">
                        {img.license || "Royalty Free"}
                      </p>
                    </div>

                    {isSelected && (
                      <div className="absolute inset-0 bg-blue-600/20 flex items-center justify-center">
                        <div className="h-7 w-7 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg">
                          <Check className="h-4 w-4" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer with Selection Details */}
        <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-left w-full sm:w-auto">
            {selectedImage ? (
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                  <img src={selectedImage.thumbUrl} alt="Selected" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {selectedImage.alt || selectedImage.photographer}
                  </p>
                  <p className="text-[10px] text-slate-500 flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3 text-emerald-500" />
                    {selectedImage.license} • {selectedImage.source}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                Click any image above to preview and apply to <span className="font-semibold">{sectionTarget}</span>.
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              disabled={!selectedImage}
              onClick={() => {
                if (selectedImage) {
                  onSelectImage(selectedImage);
                  onClose();
                }
              }}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
            >
              <Check className="h-3.5 w-3.5" />
              Apply Image to Site
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
