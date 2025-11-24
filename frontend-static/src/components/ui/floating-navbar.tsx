"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";


export const FloatingNav = ({
  navItems,
  className,
}: {
  navItems: {
    name: string;
    link: string;
  }[];
  className?: string;
}) => {
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const navRef = useRef<HTMLDivElement | null>(null);
  const [isFixed, setIsFixed] = useState(false);
  const [navHeight, setNavHeight] = useState(0);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const sectionIds = navItems.map((item) => item.link.replace("#", ""));
  const handleNavClick = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveSection(id);
      window.history.replaceState(null, "", `#${id}`);
    }
  }, []);

  useEffect(() => {
    const measureNav = () => {
      if (!navRef.current) return;
      setNavHeight(navRef.current.getBoundingClientRect().height);
    };
    measureNav();
    window.addEventListener("resize", measureNav);
    return () => window.removeEventListener("resize", measureNav);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (!anchorRef.current) return;
      const anchorTop = anchorRef.current.getBoundingClientRect().top;
      setIsFixed(anchorTop <= 10);
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
          "flex max-w-fit rounded-full bg-black border border-white text-white shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),0px_1px_0px_0px_rgba(25,28,33,0.02),0px_0px_0px_1px_rgba(25,28,33,0.08)] z-10 px-1 py-1.5 items-center justify-center gap-[6px]",
          isFixed ? "fixed top-[10px] left-1/2 -translate-x-1/2" : "relative mx-auto",
          className
        )}
        style={{ backgroundColor: "#000" }}
      >
        <div className="flex items-center justify-center gap-[6px]">
          {navItems.map((navItem: any, idx: number) => {
            const id = navItem.link.replace("#", "");
            const isActive = activeSection === id;
            return (
              <motion.button
                key={`link=${idx}`}
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  handleNavClick(id);
                }}
                className={cn(
                  "relative flex items-center justify-center rounded-full bg-transparent px-3 py-2 text-[13px] text-white no-underline min-w-[95px] text-center border-2 border-transparent overflow-visible focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 active:outline-none active:ring-0"
                )}
                style={{
                  textDecoration: "none",
                  backgroundColor: "transparent",
                  color: "#fff",
                  marginRight: idx === navItems.length - 1 ? 0 : 6,
                  outline: "none",
                  boxShadow: "none",
                  borderColor: "transparent",
                }}
                whileTap={{ scale: 1 }}
                animate={{ borderColor: "transparent" }}
                transition={{ type: "tween", duration: 0.15, ease: "easeInOut" }}
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-active-outline"
                    className="absolute rounded-full border-2 border-white pointer-events-none"
                    style={{ inset: "-2px", zIndex: 3 }}
                    transition={{ type: "tween", duration: 0.2, ease: "easeInOut" }}
                    initial={false}
                  />
                )}
                <span className="text-sm relative" style={{ zIndex: 4 }}>{navItem.name}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </>
  );
};
