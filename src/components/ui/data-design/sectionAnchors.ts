export type DataDesignSection = { id: string };

const FALLBACK_ANCHOR_OFFSET = 148;

export function getDataDesignAnchorOffset() {
  if (typeof window === "undefined") return FALLBACK_ANCHOR_OFFSET;

  const value = window
    .getComputedStyle(document.documentElement)
    .scrollPaddingTop;
  const offset = Number.parseFloat(value);
  return Number.isFinite(offset) ? offset : FALLBACK_ANCHOR_OFFSET;
}

export function getActiveDataDesignSection(
  sections: readonly DataDesignSection[],
) {
  let current = sections[0]?.id ?? "";
  const threshold = getDataDesignAnchorOffset() + 1;

  for (const section of sections) {
    const node = document.getElementById(section.id);
    if (node && node.getBoundingClientRect().top <= threshold) {
      current = section.id;
    }
  }

  const atPageEnd =
    window.innerHeight + window.scrollY >=
    document.documentElement.scrollHeight - 8;
  return atPageEnd ? sections.at(-1)?.id ?? current : current;
}

export function scrollToDataDesignSection(
  sectionId: string,
  behavior: ScrollBehavior = "smooth",
) {
  const node = document.getElementById(sectionId);
  if (!node) return false;

  if (window.matchMedia("(max-width: 1279px)").matches) {
    const absoluteTop = node.getBoundingClientRect().top + window.scrollY;
    if (absoluteTop > window.scrollY + getDataDesignAnchorOffset()) {
      document.documentElement.setAttribute("data-de-shell-condensed", "true");
    } else {
      document.documentElement.removeAttribute("data-de-shell-condensed");
    }
  }

  const top =
    node.getBoundingClientRect().top +
    window.scrollY -
    getDataDesignAnchorOffset();
  window.scrollTo({ top: Math.max(0, top), behavior });
  return true;
}

export function alignDataDesignHash(
  sections: readonly DataDesignSection[],
  onAligned?: (sectionId: string) => void,
) {
  let sectionId = window.location.hash.slice(1);
  try {
    sectionId = decodeURIComponent(sectionId);
  } catch {
    return () => {};
  }
  if (!sectionId || !sections.some((section) => section.id === sectionId)) {
    return () => {};
  }

  let secondFrame = 0;
  const firstFrame = window.requestAnimationFrame(() => {
    secondFrame = window.requestAnimationFrame(() => {
      if (scrollToDataDesignSection(sectionId, "auto")) onAligned?.(sectionId);
    });
  });

  return () => {
    window.cancelAnimationFrame(firstFrame);
    window.cancelAnimationFrame(secondFrame);
  };
}
