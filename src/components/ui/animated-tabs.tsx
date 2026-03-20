"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface AnimatedTabsProps {
  tabs?: Tab[];
  defaultTab?: string;
  className?: string;
}

const defaultTabs: Tab[] = [
  {
    id: "visao",
    label: "Visão",
    content: (
      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
        <img
          src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80"
          alt="Mulheres celebrando"
          className="h-56 w-full rounded-xl object-cover shadow-[0_0_20px_rgba(0,0,0,0.2)]"
        />
        <div className="flex flex-col justify-center gap-2">
          <h3 className="text-2xl font-bold text-white">Celebração e conexão</h3>
          <p className="text-sm text-white/80">
            Programação inspiradora para fortalecer talentos e criar novas oportunidades.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "impacto",
    label: "Impacto",
    content: (
      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
        <img
          src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80"
          alt="Oficinas colaborativas"
          className="h-56 w-full rounded-xl object-cover shadow-[0_0_20px_rgba(0,0,0,0.2)]"
        />
        <div className="flex flex-col justify-center gap-2">
          <h3 className="text-2xl font-bold text-white">Aprendizado prático</h3>
          <p className="text-sm text-white/80">
            Oficinas e cursos pensados para autonomia, bem-estar e crescimento profissional.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "comunidade",
    label: "Comunidade",
    content: (
      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
        <img
          src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80"
          alt="Mulheres conectadas"
          className="h-56 w-full rounded-xl object-cover shadow-[0_0_20px_rgba(0,0,0,0.2)]"
        />
        <div className="flex flex-col justify-center gap-2">
          <h3 className="text-2xl font-bold text-white">Rede de apoio</h3>
          <p className="text-sm text-white/80">
            Encontros que promovem troca de experiências e fortalecem a comunidade local.
          </p>
        </div>
      </div>
    ),
  },
];

const AnimatedTabs = ({ tabs = defaultTabs, defaultTab, className }: AnimatedTabsProps) => {
  const [activeTab, setActiveTab] = useState<string>(defaultTab || tabs[0]?.id);

  useEffect(() => {
    if (!tabs.length) return;
    const hasActive = tabs.some((tab) => tab.id === activeTab);
    if (hasActive) return;
    const nextActive = tabs.find((tab) => tab.id === defaultTab)?.id ?? tabs[0]?.id;
    if (nextActive) setActiveTab(nextActive);
  }, [tabs, defaultTab, activeTab]);

  if (!tabs?.length) return null;

  return (
    <div className={cn("flex w-full max-w-lg flex-col gap-y-3", className)}>
      <div className="relative min-h-[16rem] overflow-hidden rounded-2xl border border-white/10 bg-[#1B6B6B]/80 px-3 py-4 shadow-[0_12px_30px_rgba(27,107,107,0.35)] backdrop-blur-sm sm:min-h-[11rem] lg:min-h-[7rem]">
        <div className="flex w-full flex-wrap justify-center gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "relative min-w-[7.5rem] flex-1 overflow-hidden rounded-xl px-2.5 py-2 text-center text-xs font-semibold text-white outline-none transition-all hover:-translate-y-0.5 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/40 sm:min-w-[9rem] sm:px-3 sm:text-sm",
            )}
            type="button"
          >
            {activeTab === tab.id && (
              <motion.div
                layoutId="active-tab"
                className="absolute inset-0 !rounded-xl bg-[#0D4D4D]/90 shadow-[0_12px_24px_rgba(0,0,0,0.25)]"
                transition={{ type: "spring", duration: 0.6 }}
              />
            )}
            <span className="relative z-10 block w-full truncate">{tab.label}</span>
          </button>
        ))}
        </div>
      </div>

      <div className="relative min-h-60 h-full overflow-hidden rounded-2xl border border-white/10 bg-[#2D8A8A]/80 p-5 text-white shadow-[0_16px_36px_rgba(27,107,107,0.35)] backdrop-blur-sm sm:p-6">
        {tabs.map(
          (tab) =>
            activeTab === tab.id && (
              <motion.div
                key={tab.id}
                initial={{
                  opacity: 0,
                  scale: 0.95,
                  x: -10,
                  filter: "blur(10px)",
                }}
                animate={{ opacity: 1, scale: 1, x: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 0.95, x: -10, filter: "blur(10px)" }}
                transition={{
                  duration: 0.5,
                  ease: "circInOut",
                  type: "spring",
                }}
              >
                {tab.content}
              </motion.div>
            ),
        )}
      </div>
    </div>
  );
};

export { AnimatedTabs };
