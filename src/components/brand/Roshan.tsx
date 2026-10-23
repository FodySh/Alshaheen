/**
 * روشان جدّاوي مرسوم: تاج، شبكة مشربية معيّنة، حزام منقوش، دِرف بشرائح أفقية، وكابولي.
 * مطلي بالزيتي على ضوء رملي — العنصر البصري المميز للهوية.
 * مع الصنف motion-roshan: يسقط التاج، تنفتح دِرف الشبكة، ويمر ضوء عبر المشربية (globals.css).
 */
export function Roshan({ className }: { className?: string }) {
  const wood = "var(--color-olive)";
  const woodDeep = "var(--color-olive-deep)";
  const light = "var(--color-paper)";
  return (
    <svg viewBox="0 0 300 470" className={className} role="img" aria-label="روشان من جدة التاريخية">
      <defs>
        <pattern id="mashrabiya" width="18" height="18" patternUnits="userSpaceOnUse">
          <rect width="18" height="18" fill={light} />
          <path d="M0 0 18 18M18 0 0 18" stroke={wood} strokeWidth="3.2" />
          <circle cx="9" cy="9" r="2.4" fill={wood} />
          <circle cx="0" cy="0" r="2.4" fill={wood} />
          <circle cx="18" cy="0" r="2.4" fill={wood} />
          <circle cx="0" cy="18" r="2.4" fill={wood} />
          <circle cx="18" cy="18" r="2.4" fill={wood} />
        </pattern>
        <pattern id="louvers" width="10" height="9" patternUnits="userSpaceOnUse">
          <rect width="10" height="9" fill={wood} />
          <rect y="5.5" width="10" height="2" fill={woodDeep} />
        </pattern>
        <clipPath id="roshan-openings">
          {[0, 1, 2].map((i) => (
            <rect key={i} x={36 + i * 80} y="62" width="68" height="196" />
          ))}
        </clipPath>
        <linearGradient id="roshan-light">
          <stop offset="0" stopColor="#fff6dc" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff6dc" stopOpacity="0.75" />
          <stop offset="1" stopColor="#fff6dc" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* التاج */}
      <path d="M10 46h280l-14-22H24Z" fill={woodDeep} />
      <rect x="40" y="10" width="220" height="14" fill={wood} />
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
        <rect
          key={i}
          className="roshan-crown"
          style={{ "--i": i } as React.CSSProperties}
          x={46 + i * 20}
          y="2"
          width="10"
          height="10"
          fill={woodDeep}
        />
      ))}

      {/* الجسم */}
      <rect x="22" y="46" width="256" height="368" fill={wood} />

      {/* الشبكة العلوية: ثلاث فتحات */}
      {[0, 1, 2].map((i) => (
        <rect key={i} x={36 + i * 80} y="62" width="68" height="196" fill="url(#mashrabiya)" />
      ))}
      <g clipPath="url(#roshan-openings)">
        <rect className="roshan-light" x="0" y="40" width="70" height="240" fill="url(#roshan-light)" />
      </g>

      {/* دِرف الشبكة: مطوية على الجانبين */}
      {[0, 1, 2].map((i) =>
        (["start", "end"] as const).map((side, j) => (
          <rect
            key={`${i}-${side}`}
            className="roshan-shutter"
            data-side={side}
            style={{ "--i": i } as React.CSSProperties}
            x={36 + i * 80 + j * 34}
            y="62"
            width="34"
            height="196"
            fill="url(#louvers)"
            stroke={woodDeep}
            strokeWidth="2"
          />
        )),
      )}

      {/* الحزام المنقوش */}
      <rect x="22" y="270" width="256" height="22" fill={woodDeep} />
      {Array.from({ length: 12 }).map((_, i) => (
        <rect key={i} x={32 + i * 20.5} y="276" width="10" height="10" fill={light} opacity="0.85" />
      ))}

      {/* الدِّرف السفلية */}
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={36 + i * 80} y="304" width="68" height="96" fill="url(#louvers)" />
          <rect x={36 + i * 80} y="304" width="68" height="96" fill="none" stroke={woodDeep} strokeWidth="3" />
        </g>
      ))}

      {/* القاعدة والكابولي */}
      <rect x="10" y="414" width="280" height="14" fill={woodDeep} />
      <path d="M44 428h212l-36 34H80Z" fill={wood} />
      <path d="M92 462h116" stroke={woodDeep} strokeWidth="6" />
    </svg>
  );
}

/** نسخة مصغرة للشعار */
export function RoshanMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 40" className={className} aria-hidden>
      <defs>
        <pattern id="mark-lattice" width="6" height="6" patternUnits="userSpaceOnUse">
          <rect width="6" height="6" fill="var(--color-paper)" />
          <path d="M0 0 6 6M6 0 0 6" stroke="var(--color-olive)" strokeWidth="1.6" />
        </pattern>
      </defs>
      <path d="M1 6h30l-3-5H4Z" fill="var(--color-olive-deep)" />
      <rect x="3" y="6" width="26" height="28" fill="var(--color-olive)" />
      <rect x="6" y="9" width="20" height="14" fill="url(#mark-lattice)" />
      <rect x="6" y="25" width="20" height="6" fill="var(--color-olive-deep)" />
      <path d="M6 34h20l-4 5H10Z" fill="var(--color-olive-deep)" />
    </svg>
  );
}
