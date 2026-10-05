import hero from "@/assets/hero.jpg";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

export function Hero() {
  return (
    <header className="relative flex min-h-[78vh] items-center justify-center overflow-hidden">
      <img src={hero} alt="" width={1600} height={912} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-hero-overlay" />
      <div className="relative z-10 mx-auto max-w-2xl px-6 text-center text-primary-foreground">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-primary-foreground/80">
          Cocina casera · Frutos secos
        </p>
        <h1 className="font-display text-5xl font-bold leading-tight sm:text-7xl">Henry Clarke</h1>
        <p className="mt-4 font-display text-xl italic sm:text-2xl">Sabores que abrazan el alma</p>
        <Button
          size="lg"
          variant="warm"
          className="mt-10"
          onClick={() => document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" })}
        >
          Ver menú <ChevronDown className="size-4" />
        </Button>
      </div>
    </header>
  );
}
