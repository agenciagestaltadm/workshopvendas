"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { LucideIcon, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  name: string;
  url: string;
  icon: LucideIcon;
  isCta?: boolean;
}

interface NavBarProps {
  items: NavItem[];
  leadingIcon?: LucideIcon;
  leadingLabel?: string;
  leadingImageSrc?: string;
  leadingImageAlt?: string;
  className?: string;
}

export function NavBar({
  items,
  leadingIcon: LeadingIcon,
  leadingLabel = "Logo",
  leadingImageSrc,
  leadingImageAlt,
  className,
}: NavBarProps) {
  const defaultActive = useMemo(() => items.find((item) => !item.isCta)?.name ?? items[0]?.name ?? "", [items]);
  const [activeTab, setActiveTab] = useState(defaultActive);
  const [isMobile, setIsMobile] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [headerOpacity, setHeaderOpacity] = useState(0.7);
  const [headerColor, setHeaderColor] = useState<string | null>(null);
  const [navColors, setNavColors] = useState({
    text: "rgb(248, 250, 252)",
    ctaBg: "rgb(248, 250, 252)",
    ctaText: "rgb(15, 23, 42)",
  });

  useEffect(() => {
    const handleResize = () => {
      const nextIsMobile = window.innerWidth < 768;
      setIsMobile(nextIsMobile);
      if (!nextIsMobile) {
        setIsMenuOpen(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    let rafId = 0;
    const aboutSection = document.querySelector<HTMLElement>("section#sobre");
    const sections = Array.from(document.querySelectorAll<HTMLElement>("section"));
    const observedSections = sections.filter((section) => {
      if (!aboutSection) return true;
      return section.offsetTop >= aboutSection.offsetTop;
    });

    const updateHeaderState = () => {
      const aboutTop = aboutSection?.offsetTop ?? 0;
      const isHero = window.scrollY < Math.max(aboutTop - 20, 0);
      setHeaderOpacity(isHero ? 0.7 : 1);

      if (isHero) {
        setHeaderColor(null);
        setNavColors({
          text: "rgb(248, 250, 252)",
          ctaBg: "rgb(248, 250, 252)",
          ctaText: "rgb(15, 23, 42)",
        });
        return;
      }

      const currentSection = observedSections.find((section) => {
        const rect = section.getBoundingClientRect();
        return rect.top <= 120 && rect.bottom >= 120;
      });

      if (currentSection) {
        const computed = window.getComputedStyle(currentSection);
        const background = computed.backgroundColor || null;
        setHeaderColor(background);
        if (background) {
          const match = background.match(/rgba?\(([^)]+)\)/i);
          if (match) {
            const [r, g, b] = match[1]
              .split(",")
              .slice(0, 3)
              .map((value) => Number.parseFloat(value.trim()));
            const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
            const text = luminance > 0.5 ? "rgb(17, 24, 39)" : "rgb(248, 250, 252)";
            const ctaText = luminance > 0.5 ? "rgb(248, 250, 252)" : "rgb(17, 24, 39)";
            setNavColors({
              text,
              ctaBg: text,
              ctaText,
            });
          }
        }
      }
    };

    const handleScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        updateHeaderState();
        rafId = 0;
      });
    };

    updateHeaderState();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  const handleItemClick = (event: React.MouseEvent, item: NavItem) => {
    if (item.url.startsWith("#")) {
      event.preventDefault();
      const element = document.querySelector(item.url);
      element?.scrollIntoView({ behavior: "smooth" });
    }

    if (!item.isCta) {
      setActiveTab(item.name);
    }

    if (isMobile) {
      setIsMenuOpen(false);
    }
  };

  return (
    <div className={cn("fixed top-0 left-0 right-0 z-50 pt-6 px-5 sm:px-6 lg:px-8", className)}>
      <div className="mx-auto w-full max-w-[50rem]">
        <div
          className="flex w-full items-center justify-between gap-4 border border-border/60 backdrop-blur-lg py-2 px-2 rounded-full shadow-soft transition-all duration-300 sm:justify-center sm:gap-5"
          style={{
            backgroundColor: headerColor ?? undefined,
            opacity: headerOpacity,
            color: navColors.text,
            ["--nav-fg" as string]: navColors.text,
            ["--nav-cta-bg" as string]: navColors.ctaBg,
            ["--nav-cta-fg" as string]: navColors.ctaText,
          }}
        >
        {leadingImageSrc ? (
          <span className="flex items-center justify-center px-4">
            <img
              src={leadingImageSrc}
              alt={leadingImageAlt ?? leadingLabel}
              width={56}
              height={56}
              decoding="async"
              className="h-[60px] w-auto sm:h-[72px] object-contain"
            />
          </span>
        ) : (
          LeadingIcon && (
            <span className="flex items-center justify-center px-4 text-[var(--nav-fg)]">
              <LeadingIcon size={20} strokeWidth={2.2} aria-label={leadingLabel} />
            </span>
          )
        )}
        {!isMobile &&
          items.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.name;

            if (item.isCta) {
              return (
                <button
                  key={item.name}
                  onClick={(event) => handleItemClick(event, item)}
                  className="px-8 py-3 font-semibold rounded-full hover:scale-105 transition-transform shadow-soft"
                  style={{ backgroundColor: "var(--nav-cta-bg)", color: "var(--nav-cta-fg)" }}
                  type="button"
                >
                  {item.name}
                </button>
              );
            }

            return (
              <a
                key={item.name}
                href={item.url}
                onClick={(event) => handleItemClick(event, item)}
                className={cn(
                  "relative cursor-pointer text-sm font-semibold px-9 py-3 rounded-full transition-all",
                  "text-[var(--nav-fg)] hover:opacity-80",
                  isActive && "bg-black/10",
                )}
              >
                <span>{item.name}</span>
                {isActive && (
                  <motion.div
                    layoutId="lamp"
                    className="absolute inset-0 w-full bg-primary/5 rounded-full -z-10"
                    initial={false}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 30,
                    }}
                  >
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-t-full">
                      <div className="absolute w-12 h-6 bg-primary/20 rounded-full blur-md -top-2 -left-2" />
                      <div className="absolute w-8 h-6 bg-primary/20 rounded-full blur-md -top-1" />
                      <div className="absolute w-4 h-4 bg-primary/20 rounded-full blur-sm top-0 left-2" />
                    </div>
                  </motion.div>
                )}
              </a>
            );
          })}
        {isMobile && (
          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            className="mr-3 inline-flex h-11 w-11 items-center justify-center rounded-full border border-border/60 text-[var(--nav-fg)] transition-colors hover:bg-black/10"
            aria-label={isMenuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-nav"
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        )}
        </div>
        {isMobile && (
          <div
            id="mobile-nav"
            className={cn(
              "mt-3 overflow-hidden rounded-2xl border border-border/60 backdrop-blur-lg shadow-soft transition-all duration-300",
              isMenuOpen ? "max-h-[520px] opacity-100" : "max-h-0 opacity-0 pointer-events-none",
            )}
            style={{
              backgroundColor: headerColor ?? "rgba(15, 23, 42, 0.65)",
              color: navColors.text,
            }}
          >
            <div className="flex flex-col gap-2 p-3">
              {items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.name;

                if (item.isCta) {
                  return (
                    <button
                      key={item.name}
                      onClick={(event) => handleItemClick(event, item)}
                      className="w-full px-5 py-3 font-semibold rounded-full shadow-soft transition-transform hover:scale-[1.01]"
                      style={{ backgroundColor: "var(--nav-cta-bg)", color: "var(--nav-cta-fg)" }}
                      type="button"
                    >
                      {item.name}
                    </button>
                  );
                }

                return (
                  <a
                    key={item.name}
                    href={item.url}
                    onClick={(event) => handleItemClick(event, item)}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors",
                      "text-[var(--nav-fg)] hover:bg-black/10",
                      isActive && "bg-black/10",
                    )}
                  >
                    <Icon size={18} strokeWidth={2.5} />
                    <span>{item.name}</span>
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
