import React from "react";

export function RenderIcon(icon: any, props: any = {}) {
  if (!icon) return null;
  if (React.isValidElement(icon)) return icon;
  if (typeof icon === "function") {
    const Comp = icon as React.ComponentType<any>;
    return <Comp {...props} />;
  }
  if (typeof icon === "string") {
    return <img src={icon} {...props} alt="" />;
  }
  if (typeof icon === "object") {
    const maybe = icon as any;
    const comp = maybe.ReactComponent || maybe.default;
    if (typeof comp === "function") return React.createElement(comp, props);
    if (typeof comp === "string") return <img src={comp} {...props} alt="" />;
  }
  return null;
}

