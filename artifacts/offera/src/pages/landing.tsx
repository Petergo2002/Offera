import React from "react";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { TrustBar } from "@/components/landing/TrustBar";
import { Process } from "@/components/landing/Process";
import { Analytics } from "@/components/landing/Analytics";
import { Pricing } from "@/components/landing/Pricing";
import { Testimonials } from "@/components/landing/Testimonials";
import { Faq } from "@/components/landing/Faq";
import { Cta } from "@/components/landing/Cta";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface selection:bg-primary/20 selection:text-primary antialiased overflow-x-hidden font-body scroll-smooth">
      <Navbar />
      
      <main>
        <Hero />
        <TrustBar />
        <Process />
        <Analytics />
        <Pricing />
        <Testimonials />
        <Faq />
        <Cta />
      </main>

      <Footer />
    </div>
  );
}
