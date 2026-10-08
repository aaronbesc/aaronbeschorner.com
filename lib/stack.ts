// The tools in the tank on the second card, in line-up order. Wide cards
// show two rows of eight: building data pipelines (code, databases,
// transformation, orchestration), then the Microsoft platform, AI, shipping
// and design. Square cards show the same order in four rows of four.
export type Tool = {
  name: string;
  logo: string;
  /** Black logo: flipped to white in dark mode. */
  invertInDark?: boolean;
};

export const STACK: Tool[] = [
  { name: "Python", logo: "/icons/stack/python.svg" },
  { name: "Polars", logo: "/icons/stack/polars.svg" },
  { name: "DuckDB", logo: "/icons/stack/duckdb.svg" },
  { name: "PostgreSQL", logo: "/icons/stack/postgresql.svg" },
  { name: "SQL Server", logo: "/icons/stack/sql-server.svg" },
  { name: "dbt", logo: "/icons/stack/dbt.svg" },
  { name: "Airflow", logo: "/icons/stack/airflow.svg" },
  { name: "Docker", logo: "/icons/stack/docker.svg" },
  { name: "Microsoft Fabric", logo: "/icons/fabric.svg" },
  { name: "Power BI", logo: "/icons/stack/power-bi.svg" },
  { name: "Azure ML", logo: "/icons/azure-ml.png" },
  { name: "Claude", logo: "/icons/claude.png" },
  { name: "Git", logo: "/icons/stack/git.svg" },
  { name: "GitHub", logo: "/icons/stack/github.svg", invertInDark: true },
  { name: "Vercel", logo: "/icons/stack/vercel.svg", invertInDark: true },
  { name: "Figma", logo: "/icons/figma.png" },
];
