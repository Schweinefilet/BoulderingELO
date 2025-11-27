"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";


export const FloatingNav = ({
  navItems,
  className,
  onNavClick,
  isAuthenticated = true,
}: {
  navItems: {
    name: string;
    link: string;
    disabled?: boolean;
  }[];
  className?: string;
  onNavClick?: (id: string) => void;
  isAuthenticated?: boolean;
}) => {
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const navRef = useRef<HTMLDivElement | null>(null);
  const [isFixed, setIsFixed] = useState(false);
  const [navHeight, setNavHeight] = useState(0);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [showOutline, setShowOutline] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [guideTop, setGuideTop] = useState<number | null>(null);
  const sectionIds = navItems.map((item) => item.link.replace("#", ""));
  const handleNavClick = useCallback((id: string, disabled?: boolean) => {
    if (disabled) return;
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 20;
      window.scrollTo({ top: y, behavior: "smooth" });
      setActiveSection(id);
      setHasInteracted(true);
      setShowOutline(true);
      window.history.replaceState(null, "", `#${id}`);
      onNavClick?.(id);
    }
  }, [onNavClick]);

  useEffect(() => {
    const measureNav = () => {
      if (!navRef.current) return;
      setNavHeight(navRef.current.getBoundingClientRect().height);
    };
    const measureGuide = () => {
      const guideEl = document.getElementById("guide");
      if (guideEl) {
        const rect = guideEl.getBoundingClientRect();
        setGuideTop(rect.top + window.scrollY);
      }
    };
    measureNav();
    measureGuide();
    window.addEventListener("resize", measureNav);
    window.addEventListener("resize", measureGuide);
    return () => {
      window.removeEventListener("resize", measureNav);
      window.removeEventListener("resize", measureGuide);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (!anchorRef.current) return;
      const anchorTop = anchorRef.current.getBoundingClientRect().top;
      setIsFixed(anchorTop <= 10);
      const currentY = window.scrollY;
      const newSessionTop = (document.getElementById("new-session")?.offsetTop ?? 0);
      const leaderboardTop = (document.getElementById("leaderboard")?.offsetTop ?? 0);
      const guideFadePoint = guideTop !== null ? guideTop - 60 : Infinity;
      const pastNewSession = currentY >= newSessionTop - 40;
      const beforeGuide = currentY < guideFadePoint;

      // Logged-out: wait until approaching leaderboard
      if (!isAuthenticated) {
        const atLeaderboard = currentY >= (leaderboardTop - window.innerHeight * 0.3);
        setShowOutline(atLeaderboard && beforeGuide);
        return;
      }

      const shouldShow = pastNewSession && beforeGuide;

      if (currentY < 50) {
        setShowOutline(false);
      } else if (hasInteracted && shouldShow) {
        setShowOutline(true);
      } else if (shouldShow) {
        setShowOutline(true);
      } else {
        setShowOutline(false);
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  useEffect(() => {
    const updateActive = () => {
      const offset = 80; // slight offset to account for viewport top
      let closestId: string | null = null;
      let closestDistance = Number.POSITIVE_INFINITY;

      sectionIds.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const distance = Math.abs(rect.top - offset);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestId = id;
        }
      });

      if (closestId && closestId !== activeSection) {
        setActiveSection(closestId);
      }
    };

    const handleHashChange = () => {
      const id = window.location.hash.replace("#", "");
      if (id) setActiveSection(id);
    };

    updateActive();
    window.addEventListener("scroll", updateActive, { passive: true });
    window.addEventListener("resize", updateActive);
    window.addEventListener("hashchange", handleHashChange);
    return () => {
      window.removeEventListener("scroll", updateActive);
      window.removeEventListener("resize", updateActive);
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, [sectionIds, activeSection]);

  return (
    <>
      <div ref={anchorRef} style={{ height: isFixed ? navHeight : 0 }} />
      <div
        ref={navRef}
        className={cn(
          "flex max-w-full sm:max-w-fit rounded-full bg-black border border-white text-white shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),0px_1px_0px_0px_rgba(25,28,33,0.02),0px_0px_0px_1px_rgba(25,28,33,0.08)] z-10 px-2 py-2 items-center justify-center gap-[8px]",
          isFixed ? "fixed top-[10px] left-1/2 -translate-x-1/2" : "relative mx-auto",
          className
        )}
        style={{ backgroundColor: "#000" }}
      >
        <div className="flex items-center justify-center gap-[6px]">
          {navItems.map((navItem: any, idx: number) => {
            const id = navItem.link.replace("#", "");
            const isActive = activeSection === id;
            const isDisabled = Boolean(navItem.disabled);
            return (
              <motion.button
                key={`link=${idx}`}
                type="button"
                aria-disabled={isDisabled}
                onClick={(e) => {
                  e.currentTarget.blur();
                  handleNavClick(id, isDisabled);
                }}
                data-nav-item={navItem.name}
                className={cn(
                  "relative flex items-center justify-center rounded-full bg-transparent px-3.5 py-2 text-[13px] text-white no-underline min-w-[110px] text-center border-2 border-transparent overflow-visible focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 active:outline-none active:ring-0"
                )}
                style={{
                  textDecoration: "none",
                  backgroundColor: "transparent",
                  color: isDisabled ? "#6b7280" : "#fff",
                  marginRight: idx === navItems.length - 1 ? 0 : 6,
                  outline: "none",
                  boxShadow: "none",
                  borderColor: "transparent",
                  cursor: isDisabled ? "not-allowed" : "pointer",
                  opacity: isDisabled ? 0.55 : 1,
                }}
                whileTap={isDisabled ? undefined : { scale: 1 }}
                animate={{ borderColor: "transparent" }}
                transition={{ type: "tween", duration: 0.15, ease: "easeInOut" }}
              >
                <AnimatePresence>
                  {isActive && showOutline && (
                    <motion.div
                      layoutId="nav-active-outline"
                      className="absolute rounded-full border-2 border-white pointer-events-none"
                      style={{ inset: "-2px", zIndex: 3, borderRadius: "inherit" }}
                      transition={{ type: "tween", duration: 0.2, ease: "easeInOut" }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    />
                  )}
                </AnimatePresence>
                <span className="text-sm relative" style={{ zIndex: 4 }}>{navItem.name}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </>
  );
};
