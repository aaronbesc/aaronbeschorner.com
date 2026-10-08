// The tools in the claw machine on the second card, in line-up order
// (two rows: data and AI first, then web and design).
export type Tool = {
  name: string;
  logo: string;
  /** Black logo: flipped to white in dark mode. */
  invertInDark?: boolean;
};

export const STACK: Tool[] = [
  { name: "Python", logo: "/icons/stack/python.svg" },
  { name: "Microsoft Fabric", logo: "/icons/fabric.svg" },
  { name: "Azure ML", logo: "/icons/azure-ml.png" },
  { name: "Git", logo: "/icons/stack/git.svg" },
  { name: "GitHub", logo: "/icons/stack/github.svg", invertInDark: true },
  { name: "Claude", logo: "/icons/claude.png" },
  { name: "TypeScript", logo: "/icons/stack/typescript.svg" },
  { name: "React", logo: "/icons/stack/react.svg" },
  { name: "Next.js", logo: "/icons/nextjs.png", invertInDark: true },
  { name: "Tailwind CSS", logo: "/icons/stack/tailwindcss.svg" },
  { name: "Vercel", logo: "/icons/stack/vercel.svg", invertInDark: true },
  { name: "Figma", logo: "/icons/figma.png" },
];
