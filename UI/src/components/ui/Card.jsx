import React from "react";

export default function Card({ className = "", children }) {
  return <div className={className}>{children}</div>;
}
