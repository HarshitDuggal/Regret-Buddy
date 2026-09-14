"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";

interface BottomSheetProps {
  onClose: () => void;
  children: React.ReactNode;
  maxHeight?: string;
  style?: React.CSSProperties;
  className?: string;
}

export default function BottomSheet({
  onClose,
  children,
  maxHeight,
  style,
  className = "",
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Touch tracking refs
  const startYRef = useRef(0);
  const currentYRef = useRef(0);
  const startTimeRef = useRef(0);
  const isEligibleForDragRef = useRef(false);

  // Lock body scroll on mount and listen to Escape key
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleDismiss();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleDismiss = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 220);
  }, [isClosing, onClose]);

  // Touch handlers for the handle bar
  const onHandleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    startYRef.current = touch.clientY;
    currentYRef.current = touch.clientY;
    startTimeRef.current = Date.now();
    isEligibleForDragRef.current = true;
    setIsDragging(true);
  };

  const onHandleTouchMove = (e: React.TouchEvent) => {
    if (!isEligibleForDragRef.current) return;
    const touch = e.touches[0];
    currentYRef.current = touch.clientY;
    const deltaY = currentYRef.current - startYRef.current;

    if (deltaY > 0) {
      setDragY(deltaY);
    } else {
      // Rubber banding when dragged up
      setDragY(deltaY * 0.15);
    }
  };

  const onHandleTouchEnd = () => {
    if (!isEligibleForDragRef.current) return;
    setIsDragging(false);
    isEligibleForDragRef.current = false;

    const deltaY = currentYRef.current - startYRef.current;
    const timeTaken = Date.now() - startTimeRef.current;
    const velocity = deltaY / (timeTaken || 1);

    // Dismiss if pulled down > 70px or quick downward flick (> 0.35px/ms)
    if (deltaY > 70 || (deltaY > 20 && velocity > 0.35)) {
      handleDismiss();
    } else {
      setDragY(0);
    }
  };

  // Content area pull-down (only when scrolled to very top)
  const onContentTouchStart = (e: React.TouchEvent) => {
    if (sheetRef.current && sheetRef.current.scrollTop <= 0) {
      const touch = e.touches[0];
      startYRef.current = touch.clientY;
      currentYRef.current = touch.clientY;
      startTimeRef.current = Date.now();
      isEligibleForDragRef.current = true;
    } else {
      isEligibleForDragRef.current = false;
    }
  };

  const onContentTouchMove = (e: React.TouchEvent) => {
    if (!isEligibleForDragRef.current) return;
    const touch = e.touches[0];
    currentYRef.current = touch.clientY;
    const deltaY = currentYRef.current - startYRef.current;

    if (deltaY > 0 && sheetRef.current && sheetRef.current.scrollTop <= 0) {
      setIsDragging(true);
      setDragY(deltaY);
    } else if (deltaY < 0 && isDragging) {
      setDragY(0);
      setIsDragging(false);
    }
  };

  const onContentTouchEnd = () => {
    if (isDragging) {
      onHandleTouchEnd();
    }
  };

  // Backdrop opacity fades slightly as you drag down
  const backdropOpacity = isClosing
    ? 0
    : isDragging && dragY > 0
    ? Math.max(0.2, 1 - dragY / 350)
    : 1;

  const transformStyle = isClosing
    ? "translateY(100%)"
    : dragY !== 0
    ? `translateY(${dragY}px)`
    : undefined;

  return (
    <div
      className={`bottom-sheet-overlay ${isClosing ? "closing" : ""}`}
      style={{
        opacity: backdropOpacity,
        transition: isDragging ? "none" : "opacity 0.22s ease",
      }}
      onClick={handleDismiss}
    >
      <div
        ref={sheetRef}
        className={`bottom-sheet ${className}`}
        style={{
          transform: transformStyle,
          transition: isDragging ? "none" : "transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
          maxHeight: maxHeight || "calc(100dvh - var(--safe-top) - 16px)",
          ...style,
        }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onContentTouchStart}
        onTouchMove={onContentTouchMove}
        onTouchEnd={onContentTouchEnd}
      >
        {/* Swipe Handle Zone */}
        <div
          className="bottom-sheet-handle-zone"
          onTouchStart={(e) => {
            e.stopPropagation();
            onHandleTouchStart(e);
          }}
          onTouchMove={(e) => {
            e.stopPropagation();
            onHandleTouchMove(e);
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
            onHandleTouchEnd();
          }}
        >
          <div className="bottom-sheet-handle" />
        </div>

        {children}
      </div>
    </div>
  );
}
