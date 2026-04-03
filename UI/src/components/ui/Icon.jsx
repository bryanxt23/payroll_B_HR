import React from "react";

export default function Icon({ name, size = 18, style }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };

  const svgProps = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    "aria-hidden": true,
    style: { display: "block", ...style },
  };

  switch (name) {
    case "logo":
      return (
        <svg {...svgProps}>
          <path d="M4 12c4-7 12-7 16 0-4 7-12 7-16 0Z" fill="white" opacity=".9" />
          <path d="M8 12c2.2-3.4 5.8-3.4 8 0-2.2 3.4-5.8 3.4-8 0Z" fill="white" />
        </svg>
      );

    case "search":
      return (
        <svg {...svgProps} style={{ ...svgProps.style, color: "rgba(0,0,0,.55)" }}>
          <circle cx="11" cy="11" r="7" {...common} />
          <path d="M20 20l-3.2-3.2" {...common} />
        </svg>
      );

    case "bell":
      return (
        <svg {...svgProps} style={{ ...svgProps.style, color: "rgba(0,0,0,.75)" }}>
          <path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7" {...common} />
          <path d="M13.73 21a2 2 0 01-3.46 0" {...common} />
        </svg>
      );

    case "gear":
      return (
        <svg {...svgProps} style={{ ...svgProps.style, color: "rgba(0,0,0,.75)" }}>
          <path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7Z" {...common} />
          <path
            d="M19.4 15a7.9 7.9 0 0 0 .1-6l-2.1.7a6.2 6.2 0 0 0-1.2-1.2l.7-2.1a7.9 7.9 0 0 0-6-.1l.7 2.1a6.2 6.2 0 0 0-1.2 1.2L6 9a7.9 7.9 0 0 0-.1 6l2.1-.7a6.2 6.2 0 0 0 1.2 1.2L8.5 17.6a7.9 7.9 0 0 0 6 .1l-.7-2.1a6.2 6.2 0 0 0 1.2-1.2l2.1.7Z"
            {...common}
          />
        </svg>
      );

    case "chevDown":
      return (
        <svg {...svgProps} style={{ ...svgProps.style, color: "rgba(0,0,0,.75)" }}>
          <path d="M6 9l6 6 6-6" {...common} />
        </svg>
      );

    case "plus":
      return (
        <svg {...svgProps} style={{ ...svgProps.style, color: "rgba(0,0,0,.75)" }}>
          <path d="M12 5v14M5 12h14" {...common} />
        </svg>
      );

    case "filter":
      return (
        <svg {...svgProps} style={{ ...svgProps.style, color: "rgba(0,0,0,.75)" }}>
          <path d="M4 6h16M7 12h10M10 18h4" {...common} />
        </svg>
      );

    case "left":
      return (
        <svg {...svgProps} style={{ ...svgProps.style, color: "rgba(0,0,0,.75)" }}>
          <path d="M15 18l-6-6 6-6" {...common} />
        </svg>
      );

    case "right":
      return (
        <svg {...svgProps} style={{ ...svgProps.style, color: "rgba(0,0,0,.75)" }}>
          <path d="M9 6l6 6-6 6" {...common} />
        </svg>
      );

    case "cal":
      return (
        <svg {...svgProps} style={{ ...svgProps.style, color: "rgba(0,0,0,.75)" }}>
          <path d="M7 3v3M17 3v3" {...common} />
          <path d="M4 8h16" {...common} />
          <path d="M5 6h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" {...common} />
        </svg>
      );

    case "mail":
      return (
        <svg {...svgProps} style={{ ...svgProps.style, color: "rgba(0,0,0,.65)" }}>
          <path d="M4 6h16v12H4z" {...common} />
          <path d="M4 7l8 6 8-6" {...common} />
        </svg>
      );

    case "pin":
      return (
        <svg {...svgProps} style={{ ...svgProps.style, color: "rgba(0,0,0,.65)" }}>
          <path d="M12 22s7-4.5 7-12a7 7 0 1 0-14 0c0 7.5 7 12 7 12Z" {...common} />
          <circle cx="12" cy="10" r="2.5" {...common} />
        </svg>
      );

    case "phone":
      return (
        <svg {...svgProps} style={{ ...svgProps.style, color: "rgba(0,0,0,.65)" }}>
          <path
            d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.3 19.3 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.8.3 1.6.6 2.3a2 2 0 0 1-.5 2.1L8 9.3a16 16 0 0 0 6.7 6.7l1.2-1.2a2 2 0 0 1 2.1-.5c.7.3 1.5.5 2.3.6a2 2 0 0 1 1.6 2Z"
            {...common}
          />
        </svg>
      );

    case "id":
      return (
        <svg {...svgProps} style={{ ...svgProps.style, color: "rgba(0,0,0,.65)" }}>
          <path d="M3 6h18v14H3z" {...common} />
          <path d="M7 10h6M7 14h10" {...common} />
          <circle cx="16.5" cy="10.5" r="1.5" {...common} />
        </svg>
      );

    case "user":
      return (
        <svg {...svgProps} style={{ ...svgProps.style, color: "rgba(0,0,0,.65)" }}>
          <path d="M20 21a8 8 0 0 0-16 0" {...common} />
          <circle cx="12" cy="8" r="4" {...common} />
        </svg>
      );

    default:
      return null;
  }
}
