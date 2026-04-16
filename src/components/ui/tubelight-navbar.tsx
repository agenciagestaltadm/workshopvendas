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
  onItemClick?: (event: React.MouseEvent, item: NavItem) => void;
}

export function NavBar({
  items,
  leadingIcon: LeadingIcon,
  leadingLabel = "Logo",
  leadingImageSrc,
  leadingImageAlt,
  className,
  onItemClick,
}: NavBarProps) {
  const defaultActive = useMemo(() => items.find((item) => !item.isCta)?.name ?? items[0]?.name ?? "", [items]);
  const [activeTab, setActiveTab] = useState(defaultActive);
  const [isMobile, setIsMobile] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

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
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleItemClick = (event: React.MouseEvent, item: NavItem) => {
    if (onItemClick) {
      onItemClick(event, item);
      return;
    }

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
    <div className={cn("fixed top-0 left-0 right-0 z-50 transition-all duration-300", isScrolled ? "pt-3 px-4 sm:px-6 lg:px-8" : "pt-5 px-5 sm:px-6 lg:px-8", className)}>
      <div className="mx-auto w-full max-w-5xl">
        <div
          className={cn(
            "flex w-full items-center justify-between gap-2 backdrop-blur-xl py-2 px-3 rounded-2xl transition-all duration-300",
            isScrolled
              ? "bg-white/95 border border-slate-200/80 shadow-sm"
              : "bg-white/80 border border-slate-200/50"
          )}
        >
          {leadingImageSrc ? (
            <span className="flex items-center justify-center pl-1">
              <img
                src={leadingImageSrc}
                alt={leadingImageAlt ?? leadingLabel}
                width={140}
                height={48}
                decoding="async"
                className="h-[40px] w-auto sm:h-[48px] object-contain"
              />
            </span>
          ) : (
            LeadingIcon && (
              <span className="flex items-center justify-center px-3 text-slate-800">
                <LeadingIcon size={20} strokeWidth={2.2} aria-label={leadingLabel} />
              </span>
            )
          )}

          {!isMobile && (
            <nav className="flex items-center gap-1">
              {items.map((item) => {
                const isActive = activeTab === item.name;

                if (item.isCta) {
                  return (
                    <button
                      key={item.name}
                      onClick={(event) => handleItemClick(event, item)}
                      className="px-6 py-2 bg-blue-500 text-white text-sm font-semibold rounded-full hover:bg-blue-600 transition-colors shadow-sm"
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
                      "relative cursor-pointer text-sm font-medium px-4 py-2 rounded-full transition-colors",
                      "text-slate-600 hover:text-slate-900 hover:bg-slate-100",
                      isActive && "text-blue-600 bg-blue-50"
                    )}
                  >
                    <span>{item.name}</span>
                    {isActive && (
                      <motion.div
                        layoutId="nav-indicator"
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-blue-500 rounded-full"
                        initial={false}
                        transition={{
                          type: "spring",
                          stiffness: 300,
                          damping: 30,
                        }}
                      />
                    )}
                  </a>
                );
              })}
            </nav>
          )}

          {isMobile && (
            <button
              type="button"
              onClick={() => setIsMenuOpen((open) => !open)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100"
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
              "mt-2 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-xl shadow-sm transition-all duration-300",
              isMenuOpen ? "max-h-[520px] opacity-100" : "max-h-0 opacity-0 pointer-events-none",
            )}
          >
            <div className="flex flex-col gap-1 p-2">
              {items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.name;

                if (item.isCta) {
                  return (
                    <button
                      key={item.name}
                      onClick={(event) => handleItemClick(event, item)}
                      className="w-full px-5 py-3 bg-blue-500 text-white font-semibold rounded-xl transition-colors hover:bg-blue-600"
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
                      "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                      "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                      isActive && "text-blue-600 bg-blue-50"
                    )}
                  >
                    <Icon size={18} strokeWidth={2} />
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
