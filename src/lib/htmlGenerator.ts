export function generateStaticHtml(site: any): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${site.seo?.title || site.businessName}</title>
    <meta name="description" content="${site.seo?.description || ''}">
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {
            --primary: ${site.primaryColor || '#000000'};
            --secondary: ${site.secondaryColor || '#666666'};
            --accent: ${site.accentColor || '#3b82f6'};
            --bg: ${site.backgroundColor || '#ffffff'};
            --text: ${site.textColor || '#1f2937'};
        }
        body { 
            background-color: var(--bg); 
            color: var(--text); 
            font-family: ${site.fontStyle === 'sans' ? 'ui-sans-serif, system-ui, sans-serif' : 'ui-serif, Georgia, serif'}; 
        }
    </style>
</head>
<body class="antialiased">
    <!-- Navbar -->
    <header class="p-5 shadow-sm bg-white flex justify-between items-center sticky top-0 z-50">
       <div class="font-bold text-xl tracking-tight" style="color: var(--primary)">${site.businessName}</div>
       <nav class="hidden md:flex gap-6 text-sm font-medium">
          <a href="#hero" class="hover:text-blue-600 transition-colors">Home</a>
          <a href="#services" class="hover:text-blue-600 transition-colors">Services</a>
          <a href="#about" class="hover:text-blue-600 transition-colors">About</a>
          <a href="#contact" class="hover:text-blue-600 transition-colors">Contact</a>
       </nav>
       <a href="tel:${site.phone}" class="px-5 py-2.5 text-white rounded-xl text-sm font-bold shadow-md transition hover:scale-105" style="background-color: var(--accent)">
         <i class="fa-solid fa-phone mr-2"></i>Call Now
       </a>
    </header>

    <!-- Hero Section -->
    <section id="hero" class="relative py-24 text-center px-4" style="background-color: var(--primary); color: white;">
       <h1 class="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight max-w-4xl mx-auto">${site.hero?.title || ''}</h1>
       <p class="text-lg md:text-xl opacity-90 mb-10 max-w-2xl mx-auto leading-relaxed">${site.hero?.subtitle || ''}</p>
       <div class="flex flex-col sm:flex-row gap-4 justify-center">
         <a href="#contact" class="px-8 py-3.5 rounded-xl font-bold text-slate-900 bg-white shadow-lg hover:scale-105 transition">
           ${site.hero?.ctaPrimary || 'Get Started'}
         </a>
         <a href="#services" class="px-8 py-3.5 rounded-xl font-bold text-white border-2 border-white/20 hover:bg-white/10 transition">
           ${site.hero?.ctaSecondary || 'Learn More'}
         </a>
       </div>
    </section>
    
    <!-- Services Section -->
    <section id="services" class="py-20 px-4 max-w-6xl mx-auto">
      <div class="text-center mb-16">
        <h2 class="text-3xl md:text-4xl font-bold mb-4" style="color: var(--primary)">Our Services</h2>
        <p class="text-slate-600 max-w-2xl mx-auto">Professional services tailored to your specific needs.</p>
      </div>
      <div class="grid md:grid-cols-3 gap-8">
         ${(site.services || []).map((s: any) => `
         <div class="p-8 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition">
            <h3 class="font-bold text-xl mb-3" style="color: var(--primary)">${s.title}</h3>
            <p class="text-slate-600 mb-6 leading-relaxed">${s.description}</p>
            <div class="font-bold text-sm px-4 py-2 bg-slate-50 border border-slate-100 inline-block rounded-xl text-slate-700">
               ${s.price}
            </div>
         </div>`).join('')}
      </div>
    </section>

    <!-- About Section -->
    <section id="about" class="py-20 px-4 bg-slate-50 border-y border-slate-100">
      <div class="max-w-4xl mx-auto text-center space-y-6">
        <h2 class="text-3xl md:text-4xl font-bold" style="color: var(--primary)">${site.about?.title || 'About Us'}</h2>
        <p class="text-lg text-slate-700 leading-relaxed font-medium">${site.about?.mission || ''}</p>
        <p class="text-slate-600 leading-relaxed">${site.about?.history || ''}</p>
      </div>
    </section>

    <!-- Contact Section -->
    <section id="contact" class="py-20 px-4 max-w-4xl mx-auto text-center">
       <h2 class="text-3xl md:text-4xl font-bold mb-6" style="color: var(--primary)">${site.contactPage?.title || 'Contact Us'}</h2>
       <p class="text-slate-600 mb-10 text-lg">${site.contactPage?.description || 'Reach out to us today.'}</p>
       
       <div class="flex flex-col sm:flex-row justify-center gap-4 mb-12">
         <a href="mailto:${site.contactPage?.email || ''}" class="px-8 py-4 rounded-xl text-white font-bold shadow-md transition hover:scale-105 flex items-center justify-center gap-2" style="background-color: var(--accent)">
           <i class="fa-solid fa-envelope"></i> Email Us
         </a>
         <a href="tel:${site.phone}" class="px-8 py-4 rounded-xl bg-white border border-slate-200 text-slate-800 font-bold shadow-sm transition hover:scale-105 flex items-center justify-center gap-2">
           <i class="fa-solid fa-phone"></i> Call ${site.phone}
         </a>
       </div>
       
       <div class="inline-flex items-center gap-2 px-6 py-3 bg-slate-50 rounded-2xl text-slate-600 font-medium">
         <i class="fa-solid fa-location-dot text-red-500"></i>
         ${site.address}
       </div>
    </section>
    
    <!-- Footer -->
    <footer class="p-8 text-center text-sm text-slate-500 border-t border-slate-200 bg-white">
       &copy; ${new Date().getFullYear()} ${site.businessName}. All rights reserved.
    </footer>
</body>
</html>`;
}
